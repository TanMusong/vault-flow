import { Controller, Post, Get, Delete, Param, UseInterceptors, UploadedFile, BadRequestException, InternalServerErrorException, NotFoundException, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import extract from 'extract-zip';
import { Response } from 'express';
import { config, getLocale, setLocale } from '../config/manager';
import { RegistryService } from '../browser/registry.service';
import { VersionCheckService } from '../provider/version-check.service';
import { ProviderStorageService } from '../provider/provider-storage.service';
import { StoreService } from '../database/store.service';
import { EventHubService } from '../events/event-hub.service';

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  destination: string;
  filename: string;
  path: string;
  size: number;
}

@Controller('api/providers')
export class ProvidersController {
  constructor(
    private readonly registry: RegistryService,
    private readonly versionCheck: VersionCheckService,
    private readonly providerStorage: ProviderStorageService,
    private readonly store: StoreService,
    private readonly events: EventHubService,
  ) {}

  @Get('')
  async getList() {
    const providers = this.registry.getAllSites();
    const updates = this.versionCheck.getUpdates();
    return providers.map(p => ({
      ...p,
      update: updates.find(u => u.id === p.id) || null,
    }));
  }

  @Get(':id/icon')
  getIcon(@Param('id') id: string, @Res() res: Response) {
    const iconPath = this.registry.getProviderIconPath(id);
    if (!iconPath) {
      throw new NotFoundException(`Provider icon not found: ${id}`);
    }

    const ext = path.extname(iconPath).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.webp': 'image/webp',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
    };
    const contentType = contentTypes[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    fs.createReadStream(iconPath).pipe(res);
  }

  @Get(':id/tasks')
  getProviderTasks(@Param('id') id: string) {
    const tasks = this.store.getTasks().filter((t: any) => t.site === id);
    return { count: tasks.length, tasks: tasks.map(t => ({ id: t.id, name: t.name })) };
  }

  @Get('updates')
  getUpdates() {
    return this.versionCheck.getUpdates();
  }

  @Post('check-updates')
  async checkUpdates() {
    await this.versionCheck.checkAllProviders();
    return { success: true, updates: this.versionCheck.getUpdates() };
  }

  /**
   * Install a provider from built-in registry.
   * Fetches version info and downloads zip via server.
   */
  @Post(':id/install')
  async installProvider(@Param('id') id: string) {
    const registered = this.registry.getSite(id);
    if (!registered) {
      throw new NotFoundException(`Provider not found: ${id}`);
    }

    if (registered.installed) {
      throw new BadRequestException(`Provider ${id} is already installed`);
    }

    const versionUrl = registered.manifest.version;
    if (!versionUrl) {
      throw new BadRequestException('No version URL configured for this provider');
    }

    // Fetch version info
    const versionInfo = await this.fetchVersionInfo(versionUrl);
    if (!versionInfo || !versionInfo.url) {
      throw new BadRequestException('Failed to fetch version info');
    }

    // Download and install
    await this.downloadAndInstall(id, versionInfo.url);

    this.store.addSystemLog('info', `Provider ${id} installed (v${versionInfo.version})`);

    return { success: true, provider: { id, name: registered.manifest.name, version: versionInfo.version } };
  }

  /**
   * Update an installed provider.
   * Checks for updates, downloads new version, and replaces old files.
   */
  @Post(':id/update')
  async updateProvider(@Param('id') id: string) {
    const updateInfo = this.versionCheck.getUpdate(id);
    if (!updateInfo) {
      throw new BadRequestException('No update available');
    }

    await this.downloadAndInstall(id, updateInfo.updateUrl);

    this.versionCheck.clearUpdate(id);
    this.store.addSystemLog('info', `Provider ${id} updated to v${updateInfo.latestVersion}`);

    return { success: true, provider: { id, version: updateInfo.latestVersion } };
  }

  @Delete(':id')
  deleteProvider(@Param('id') id: string) {
    const registered = this.registry.getSite(id);
    if (!registered) {
      throw new NotFoundException(`Provider not found: ${id}`);
    }

    const tasks = this.store.getTasks().filter((t: any) => t.site === id);
    if (tasks.length > 0) {
      throw new BadRequestException(`Cannot delete provider with ${tasks.length} associated task(s). Please delete the tasks first.`);
    }

    const providerDir = path.join(config.providerDir, id);
    if (fs.existsSync(providerDir)) {
      fs.rmSync(providerDir, { recursive: true, force: true });
    }

    this.registry.removeProvider(id);
    this.versionCheck.clearUpdate(id);
    this.providerStorage.deleteStorageFile(id);

    this.store.addSystemLog('info', `Provider ${id} deleted`);

    return { success: true };
  }

  private async fetchVersionInfo(versionUrl: string | string[]): Promise<{ id: string; version: string; url: string; changes: string[] } | null> {
    const urls = Array.isArray(versionUrl) ? versionUrl : [versionUrl];

    for (const url of urls) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) continue;

        const data = await response.json();
        if (data.id && data.version && data.url) {
          return data;
        }
      } catch (_e) {
        continue;
      }
    }
    return null;
  }

  private async downloadAndInstall(id: string, downloadUrl: string): Promise<void> {
    const providerDir = path.join(config.providerDir, id);
    const tmpDir = path.join(os.tmpdir(), `vault-flow-install-${id}-${Date.now()}`);

    try {
      if (!fs.existsSync(config.providerDir)) {
        fs.mkdirSync(config.providerDir, { recursive: true });
      }

      // Download zip with progress
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error('Failed to download provider');
      }
      const totalBytes = Number(response.headers.get('content-length')) || 0;
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Failed to read response body');

      const chunks: Uint8Array[] = [];
      let receivedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        receivedBytes += value.length;
        if (totalBytes > 0) {
          this.events.emitProviderProgress(id, Math.floor((receivedBytes / totalBytes) * 99));
        }
      }

      const buffer = Buffer.concat(chunks.map(c => Buffer.from(c)));
      const zipPath = path.join(tmpDir, `${id}.zip`);
      fs.mkdirSync(tmpDir, { recursive: true });
      fs.writeFileSync(zipPath, buffer);

      // 100% - extracting
      this.events.emitProviderProgress(id, 100);

      // Extract zip
      await extract(zipPath, { dir: tmpDir });

      // Find provider directory in extracted contents
      const extractedItems = fs.readdirSync(tmpDir);
      let sourceDir = tmpDir;
      if (extractedItems.length === 1) {
        const singleItem = path.join(tmpDir, extractedItems[0]);
        if (fs.statSync(singleItem).isDirectory()) {
          sourceDir = singleItem;
        }
      }

      // Validate manifest
      const manifestPath = path.join(sourceDir, 'manifest.json');
      if (!fs.existsSync(manifestPath)) {
        throw new BadRequestException('manifest.json not found in zip');
      }

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      if (!manifest.id || !manifest.name || !manifest.icon) {
        throw new BadRequestException('manifest.json missing required fields');
      }

      if (manifest.id !== id) {
        throw new BadRequestException(`Provider id mismatch: ${manifest.id} vs ${id}`);
      }

      // Delete old provider if exists
      if (fs.existsSync(providerDir)) {
        fs.rmSync(providerDir, { recursive: true, force: true });
      }

      // Copy new provider
      fs.cpSync(sourceDir, providerDir, { recursive: true });

      // Install provider-api dependency
      await this.installProviderApi(providerDir);

      // Load provider
      await this.registry.reloadProvider(id);

      this.logger.log(`Provider ${id} installed/updated successfully`);
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new InternalServerErrorException(`Installation failed: ${(err as Error).message}`);
    } finally {
      try {
        if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch (_e) { /* ignore */ }
    }
  }

  private async installProviderApi(providerDir: string): Promise<void> {
    const packageJsonPath = path.join(providerDir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) return;

    const { execSync } = require('child_process');
    try {
      execSync('npm install --production', { cwd: providerDir, stdio: 'pipe' });
    } catch (_e) {
      this.logger.warn(`Failed to install dependencies for provider`);
    }
  }

  private readonly logger = { log: console.log, error: console.error, warn: console.warn };
}