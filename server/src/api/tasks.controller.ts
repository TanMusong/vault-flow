import { Controller, Get, Post, Put, Delete, Body, Param, Query, BadRequestException, NotFoundException } from '@nestjs/common';
import { StoreService } from '../database/store.service';
import { RunnerService } from '../browser/runner.service';
import { SchedulerService } from '../scheduler/scheduler.service';
import { EventHubService } from '../events/event-hub.service';
import { ProviderStorageService } from '../provider/provider-storage.service';
import { RegistryService } from '../browser/registry.service';

function parseTaskInterval(value: unknown, fallback: number): number | null {
  if (value === undefined) return fallback;
  const interval = Number(value);
  if (!Number.isFinite(interval) || interval < 600) return null;
  return Math.floor(interval);
}

@Controller('api')
export class TasksController {
  constructor(
    private readonly store: StoreService,
    private readonly runner: RunnerService,
    private readonly scheduler: SchedulerService,
    private readonly events: EventHubService,
    private readonly providerStorage: ProviderStorageService,
    private readonly registry: RegistryService,
  ) {}

  @Get('tasks')
  getTasks() {
    return this.store.getTasks();
  }

  @Get('tasks/all')
  getAllTasks() {
    const now = Date.now();
    let tasks = this.store.getTasks();
    tasks.sort(function(a, b) {
      var aRunning = !a.paused && a.next_run && new Date(a.next_run).getTime() <= now;
      var bRunning = !b.paused && b.next_run && new Date(b.next_run).getTime() <= now;
      if (aRunning && !bRunning) return -1;
      if (!aRunning && bRunning) return 1;
      return 0;
    });
    return tasks;
  }

  @Get('tasks/active')
  getActiveTasks() {
    const now = Date.now();
    let tasks = this.store.getTasks();
    tasks = tasks.filter(function(t) { return !t.paused; });
    tasks.sort(function(a, b) {
      var aRunning = a.next_run && new Date(a.next_run).getTime() <= now;
      var bRunning = b.next_run && new Date(b.next_run).getTime() <= now;
      if (aRunning && !bRunning) return -1;
      if (!aRunning && bRunning) return 1;
      return 0;
    });
    return tasks.slice(0, 4);
  }

  @Get('tasks/:id')
  getTask(@Param('id') id: string) {
    const task = this.store.getTask(id);
    if (!task) throw new NotFoundException('Task not found');
    // Mask password fields in config before sending to frontend
    const registered = this.registry.getSite(task.site);
    if (registered?.manifest?.config && task.config) {
      const masked = { ...task.config };
      const findPasswordFields = (items: unknown[]) => {
        for (const item of items) {
          if (item && typeof item === 'object') {
            if ((item as any).password && masked[(item as any).key] !== undefined) {
              masked[(item as any).key] = '';
            }
            if ((item as any).on) findPasswordFields((item as any).on);
            if ((item as any).off) findPasswordFields((item as any).off);
          }
        }
      };
      findPasswordFields(registered.manifest.config);
      return { ...task, config: masked };
    }
    return task;
  }

  @Post('tasks')
  async createTask(@Body() body: { site?: string; config?: Record<string, unknown> }) {
    if (!body.site) throw new BadRequestException('site required');
    const configData = body.config || {};

    try {
      const taskId = this.store.generateTaskId();
      const { name } = await this.runner.addTask(body.site, configData, taskId);

      this.store.addTask({
        id: taskId,
        name,
        site: body.site,
        interval: Number(configData.interval) || 1800,
        config: configData,
      });

      this.scheduler.scheduleTask(this.store.getTask(taskId)!);
      this.store.addLog(taskId, 'info', `Task created for ${body.site}`);
      return this.store.getTask(taskId);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
  }

  @Put('tasks/:id')
  async updateTask(@Param('id') id: string, @Body() body: { name?: string; interval?: number; paused?: boolean; config?: Record<string, unknown> }) {
    const task = this.store.getTask(id);
    if (!task) throw new NotFoundException('Task not found');

    if (body.interval !== undefined) {
      const interval = parseTaskInterval(body.interval, 1800);
      if (interval === null) throw new BadRequestException('interval must be at least 600 seconds');
      body.interval = interval;
    }

    // Restore password fields that frontend sent as empty (masked) values
    if (body.config) {
      const registered = this.registry.getSite(task.site);
      if (registered?.manifest?.config) {
        const findPasswordFields = (items: unknown[]) => {
          for (const item of items) {
            if (item && typeof item === 'object') {
              if ((item as any).password && body.config![(item as any).key] === '') {
                body.config![(item as any).key] = task.config[(item as any).key];
              }
              if ((item as any).on) findPasswordFields((item as any).on);
              if ((item as any).off) findPasswordFields((item as any).off);
            }
          }
        };
        findPasswordFields(registered.manifest.config);
      }
    }

    const updated = this.store.updateTask(id, body);
    if (!updated) throw new NotFoundException('Task not found');

    if (body.config !== undefined) {
      await this.runner.updateTaskConfig(id);
    }

    this.store.addLog(id, 'info', 'Task config updated');
    this.scheduler.rescheduleTask(updated.id);
    return updated;
  }

  @Delete('tasks/:id')
  async deleteTask(@Param('id') id: string) {
    const task = this.store.getTask(id);
    if (!task) throw new NotFoundException('Task not found');

    await this.runner.deleteTask(id);

    this.store.addLog(id, 'info', 'Task deleted');
    this.scheduler.clearTask(id);
    this.providerStorage.deleteStorageFile(id);
    this.store.deleteTask(id);
    return { ok: true };
  }

  @Post('tasks/:id/run')
  runTask(@Param('id') id: string) {
    if (this.runner.isRunning(id)) {
      this.store.addLog(id, 'warn', 'Duplicate run ignored, task already running');
      return { error: 'error.task_running', statusCode: 409 };
    }
    this.store.addLog(id, 'info', 'Manual run triggered');
    this.store.setTaskRunState(id, { nextRun: new Date().toISOString() });
    this.scheduler.rescheduleTask(id, true);
    return { ok: true };
  }

  @Post('tasks/:id/pause')
  pauseTask(@Param('id') id: string) {
    const paused = this.store.toggleTaskPause(id);
    if (paused) {
      this.scheduler.clearTask(id);
      this.store.setTaskRunState(id, { nextRun: null });
    } else {
      this.scheduler.rescheduleTask(id);
    }
    this.store.addLog(id, 'info', paused ? 'Task paused' : 'Task resumed');
    this.events.emitTaskPaused(id, paused);
    return { ok: true, paused };
  }

  @Get('tasks/:id/downloads')
  getTaskDownloads(@Param('id') id: string, @Query('offset') offset?: string, @Query('limit') limit?: string) {
    const o = parseInt(offset || '0', 10) || 0;
    const l = parseInt(limit || '20', 10) || 20;
    const all = this.store.getDownloads(id, l, o);
    return { total: all.total, items: all.items };
  }

  @Delete('tasks/:id/downloads')
  clearTaskDownloads(@Param('id') id: string) {
    this.store.clearDownloads(id);
    return { ok: true };
  }

  @Get('tasks/:id/logs')
  getTaskLogs(@Param('id') id: string, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    const l = parseInt(limit || '50', 10) || 50;
    const o = parseInt(offset || '0', 10) || 0;
    return this.store.getLogs(id, l, o);
  }
}
