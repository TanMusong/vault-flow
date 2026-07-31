import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs';
import * as path from 'path';
import type { ProviderManifest } from '@vault-flow/provider-api';
import { config } from '../config/manager';
import { EventHubService } from '../events/event-hub.service';

interface VersionCheckResponse {
  id: string;
  version: string;
  url: string;
  changes: string[];
}

export interface ProviderUpdateInfo {
  id: string;
  currentVersion: string;
  latestVersion: string;
  updateUrl: string;
  changes: string[];
}

@Injectable()
export class VersionCheckService {
  private readonly logger = new Logger(VersionCheckService.name);
  private updateInfo = new Map<string, ProviderUpdateInfo>();

  constructor(private readonly events: EventHubService) {}

  @Cron(CronExpression.EVERY_12_HOURS)
  async handleCron() {
    this.logger.log('Running periodic version check...');
    await this.checkAllProviders();
  }

  getUpdates(): ProviderUpdateInfo[] {
    return Array.from(this.updateInfo.values());
  }

  getUpdate(id: string): ProviderUpdateInfo | undefined {
    return this.updateInfo.get(id);
  }

  clearUpdate(id: string): void {
    this.updateInfo.delete(id);
  }

  async checkAllProviders(): Promise<void> {
    const providersDir = config.providerDir;
    if (!fs.existsSync(providersDir)) return;

    const entries = fs.readdirSync(providersDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || !fs.existsSync(path.join(providersDir, entry.name, 'manifest.json'))) continue;

      const providerDir = path.join(providersDir, entry.name);
      try {
        await this.checkProvider(providerDir);
      } catch (err) {
        this.logger.error(`Failed to check version for ${entry.name}: ${(err as Error).message}`);
      }
    }
  }

  async checkProvider(providerDir: string): Promise<ProviderUpdateInfo | null> {
    const manifestPath = path.join(providerDir, 'manifest.json');
    const packageJsonPath = path.join(providerDir, 'package.json');

    if (!fs.existsSync(manifestPath) || !fs.existsSync(packageJsonPath)) {
      return null;
    }

    const manifest: ProviderManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const currentVersion = packageJson.version || '0.0.0';

    if (!manifest.version) {
      return null;
    }

    const versionUrls = Array.isArray(manifest.version) ? manifest.version : [manifest.version];
    const remoteInfo = await this.fetchVersionInfo(versionUrls);

    if (!remoteInfo) {
      return null;
    }

    if (remoteInfo.id !== manifest.id) {
      this.logger.warn(`Version check returned different id: ${remoteInfo.id} vs ${manifest.id}, using manifest id`);
    }

    if (remoteInfo.version !== currentVersion) {
      const updateInfo: ProviderUpdateInfo = {
        id: manifest.id,
        currentVersion,
        latestVersion: remoteInfo.version,
        updateUrl: remoteInfo.url,
        changes: remoteInfo.changes || []
      };
      this.updateInfo.set(manifest.id, updateInfo);
      this.logger.log(`Update available for ${manifest.id}: ${currentVersion} -> ${remoteInfo.version}`);
      this.events.emitProviderUpdateAvailable(updateInfo);
      return updateInfo;
    }

    return null;
  }

  private async fetchVersionInfo(urls: string[]): Promise<VersionCheckResponse | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const promises = urls.map(url => this.fetchSingleVersion(url, controller.signal));
      const results = await Promise.allSettled(promises);

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          return result.value;
        }
      }
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async fetchSingleVersion(url: string, signal: AbortSignal): Promise<VersionCheckResponse | null> {
    try {
      const response = await fetch(url, { signal });
      if (!response.ok) return null;

      const data = await response.json();
      if (data.id && data.version && data.url) {
        return data as VersionCheckResponse;
      }
      return null;
    } catch (_err) {
      return null;
    }
  }
}
