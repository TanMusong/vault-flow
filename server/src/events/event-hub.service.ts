import { Injectable } from '@nestjs/common';
import { events } from '../events';

@Injectable()
export class EventHubService {
  private hub = events;

  on(event: string, handler: (data: unknown) => void) { this.hub.on(event, handler); }
  off(event: string, handler: (data: unknown) => void) { this.hub.off(event, handler); }
  emit(event: string, data: unknown) { this.hub.emit(event, data); }

  emitTaskStarted(taskId: string, taskName: string) { this.hub.emitTaskStarted(taskId, taskName); }
  emitTaskCompleted(taskId: string, result: unknown) { this.hub.emitTaskCompleted(taskId, result as any); }
  emitTaskFailed(taskId: string, error: unknown) { this.hub.emitTaskFailed(taskId, error as any); }
  emitDownloadAdded(taskId: string, download: unknown) { this.hub.emitDownloadAdded(taskId, download as any); }
  emitDownloadProgress(taskId: string, postId: string, files: unknown[], state?: unknown) { this.hub.emitDownloadProgress(taskId, postId, files as any, state as any); }
  emitSchedulerUpdated(taskId: string, nextRun: string) { this.hub.emitSchedulerUpdated(taskId, nextRun); }
  emitTaskPaused(taskId: string, paused: boolean) { this.hub.emitTaskPaused(taskId, paused); }
  emitTaskProgress(taskId: string, processed: number, total: number) { this.hub.emitTaskProgress(taskId, processed, total); }
  emitProviderUpdateAvailable(update: unknown) { this.hub.emit('provider:update-available', update); }
  emitProviderProgress(id: string, progress: number) { this.hub.emit('provider:progress', { id, progress }); }
}
