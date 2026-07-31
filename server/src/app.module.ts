import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DatabaseModule } from './database/database.module';
import { EventsModule } from './events/events.module';
import { BrowserModule } from './browser/browser.module';
import { DownloaderModule } from './downloader/downloader.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { ApiModule } from './api/api.module';
import { StoreService } from './database/store.service';
import { SchedulerService } from './scheduler/scheduler.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    DatabaseModule,
    EventsModule,
    BrowserModule,
    DownloaderModule,
    SchedulerModule,
    ApiModule,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(
    private readonly store: StoreService,
    private readonly scheduler: SchedulerService,
  ) {}

  onModuleInit() {
    // Fix stale downloading records on startup
    const tasks = this.store.getTasks();
    for (const t of tasks) {
      const fixed = this.store.fixStaleDownloading(t.id);
      if (fixed > 0) console.log(`[startup] Fixed ${fixed} stale downloading record(s) for task "${t.name}"`);
    }

    // Start scheduler for all non-paused tasks
    this.scheduler.startAll();
  }
}
