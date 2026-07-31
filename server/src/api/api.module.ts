import { Module } from '@nestjs/common';
import { BrowserModule } from '../browser/browser.module';
import { SchedulerModule } from '../scheduler/scheduler.module';
import { ProviderModule } from '../provider/provider.module';
import { TasksController } from './tasks.controller';
import { StatsController } from './stats.controller';
import { ProvidersController } from './providers.controller';
import { DownloadsController } from './downloads.controller';
import { LogsController } from './logs.controller';
import { EventsController } from './events.controller';
import { VerifyController } from './verify.controller';
import { GlobalController } from './global.controller';
import { PreviewController } from './preview.controller';
import { InfoController } from './info.controller';

@Module({
  imports: [BrowserModule, SchedulerModule, ProviderModule],
  controllers: [
    TasksController,
    StatsController,
    ProvidersController,
    DownloadsController,
    LogsController,
    EventsController,
    VerifyController,
    GlobalController,
    PreviewController,
    InfoController,
  ],
})
export class ApiModule {}
