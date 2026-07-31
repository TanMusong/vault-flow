import { Global, Module } from '@nestjs/common';
import { EventHubService } from './event-hub.service';

@Global()
@Module({
  providers: [EventHubService],
  exports: [EventHubService],
})
export class EventsModule {}
