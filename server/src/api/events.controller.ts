import { Controller, Sse, Query, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { EventHubService } from '../events/event-hub.service';

@Controller('api')
export class EventsController {
  private readonly eventNames = [
    'task:started', 'task:completed', 'task:failed', 'download:added',
    'download:progress', 'scheduler:updated', 'task:paused', 'task:progress',
    'provider:progress',
  ];

  constructor(private readonly eventHub: EventHubService) {}

  @Sse('events')
  sse(@Query('taskId') taskId?: string): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      const listeners: Array<{ event: string; handler: (data: unknown) => void }> = [];

      for (const eventName of this.eventNames) {
        const handler = (data: unknown) => {
          const event = data as Record<string, unknown>;
          if (taskId && event.taskId !== taskId) return;
          subscriber.next({ type: eventName, data: JSON.stringify(data) });
        };
        listeners.push({ event: eventName, handler });
        this.eventHub.on(eventName, handler);
      }

      const heartbeat = setInterval(() => {
        subscriber.next({ type: 'heartbeat', data: '' });
      }, 30000);

      return () => {
        clearInterval(heartbeat);
        for (const { event, handler } of listeners) {
          this.eventHub.off(event, handler);
        }
      };
    });
  }
}
