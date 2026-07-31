import { Controller, Get, Param, Res, HttpException } from '@nestjs/common';
import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { StoreService } from '../database/store.service';
import { config } from '../config/manager';

@Controller('api')
export class PreviewController {
  constructor(
    private readonly store: StoreService,
  ) {}

  @Get('tasks/:id/preview/:postId/:filename')
  preview(
    @Param('id') taskId: string,
    @Param('postId') postId: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const task = this.store.getTask(taskId);
    if (!task) throw new HttpException('task not found', 404);
    const { items: downloads } = this.store.getDownloads(taskId);
    const dl = downloads.find(d => d.post_id === postId);
    if (!dl) throw new HttpException('download not found', 404);
    const file = dl.files.find(f => f.filename === filename && f.fileStatus === 'success');
    if (!file) throw new HttpException('file not found', 404);

    // Search for the file in download directory and provider config directories
    let filePath = this.findFile(config.downloadDir, filename);
    if (!filePath) {
      const providerDir = path.join(config.providerDir, task.site);
      for (const subdir of ['config', 'config/downloads']) {
        const searchDir = path.join(providerDir, subdir);
        if (fs.existsSync(searchDir)) {
          filePath = this.findFile(searchDir, filename);
          if (filePath) break;
        }
      }
    }
    if (!filePath) throw new HttpException('file not found', 404);

    const ext = path.extname(file.filename).toLowerCase();
    const mimeMap: Record<string, string> = { '.mp4': 'video/mp4', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif' };
    res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    fs.createReadStream(filePath).pipe(res);
  }

  private findFile(dir: string, filename: string): string | null {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isFile() && entry.name === filename) return fullPath;
        if (entry.isDirectory()) {
          const found = this.findFile(fullPath, filename);
          if (found) return found;
        }
      }
    } catch (_e) { /* */ }
    return null;
  }
}
