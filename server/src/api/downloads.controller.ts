import { Controller, Get, Query } from '@nestjs/common';
import { StoreService } from '../database/store.service';

@Controller('api')
export class DownloadsController {
  constructor(private readonly store: StoreService) {}

  @Get('downloads/recent')
  getRecentDownloads() {
    return this.store.getUnifiedDownloads(8).items;
  }

  @Get('downloads/all')
  getAllDownloads(@Query('limit') limit?: string, @Query('cursor') cursor?: string) {
    const l = Math.min(parseInt(limit || '20', 10) || 20, 50);
    return this.store.getUnifiedDownloads(l, cursor || undefined);
  }
}
