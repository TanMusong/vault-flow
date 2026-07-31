import { Controller, Get } from '@nestjs/common';
import { StoreService } from '../database/store.service';

const SERVER_START_TIME = Date.now();

function formatUptime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

@Controller('api')
export class StatsController {
  constructor(private readonly store: StoreService) {}

  @Get('stats')
  getStats() {
    const now = Date.now();
    const tasks = this.store.getTasks();
    let enabled = 0;
    let running = 0;
    let waiting = 0;
    for (const t of tasks) {
      if (!t.paused) enabled++;
      if (!t.paused && t.next_run && new Date(t.next_run).getTime() <= now) running++;
      if (!t.paused && t.run_state === 2) waiting++;
    }
    const { totalCompleted, totalSize } = this.store.getAllTaskStats();
    let sizeStr = '';
    if (totalSize >= 1073741824) sizeStr = (totalSize / 1073741824).toFixed(1) + ' GB';
    else if (totalSize >= 1048576) sizeStr = (totalSize / 1048576).toFixed(1) + ' MB';
    else if (totalSize >= 1024) sizeStr = (totalSize / 1024).toFixed(1) + ' KB';
    else sizeStr = totalSize + ' B';
    return { total: tasks.length, enabled, running, waiting, completed: totalCompleted, totalSize: sizeStr };
  }

  @Get('stats/sidebar')
  getSidebarStats() {
    const { totalCompleted, taskRunsSuccess, taskRunsFailed } = this.store.getAllTaskStats();
    return {
      serverStartTime: SERVER_START_TIME,
      taskRunsSuccess,
      taskRunsFailed,
      totalDownloadsSuccess: totalCompleted,
    };
  }
}
