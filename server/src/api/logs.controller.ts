import { Controller, Get, Delete, Query } from '@nestjs/common';
import { StoreService } from '../database/store.service';
import { LogLevel } from '../types';

const VALID_LOG_LEVELS = Object.values(LogLevel);

@Controller('api')
export class LogsController {
  constructor(private readonly store: StoreService) {}

  @Get('logs')
  getAllLogs(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('level') level?: string
  ) {
    const l = Math.min(Math.max(parseInt(limit || '50', 10) || 50, 1), 500);
    const o = Math.max(parseInt(offset || '0', 10) || 0, 0);
    const validLevel = level && VALID_LOG_LEVELS.includes(level as LogLevel)
      ? (level as LogLevel)
      : undefined;
    return this.store.getAllLogs(l, o, validLevel);
  }

  @Delete('logs')
  clearLogs() {
    this.store.clearLogs();
    return { ok: true };
  }
}
