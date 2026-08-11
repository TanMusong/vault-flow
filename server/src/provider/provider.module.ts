import { Module } from '@nestjs/common';
import { VersionCheckService } from './version-check.service';
import { CoreVersionCheckService } from './core-version-check.service';
import { ProviderStorageService } from './provider-storage.service';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EventsModule],
  providers: [VersionCheckService, CoreVersionCheckService, ProviderStorageService],
  exports: [VersionCheckService, CoreVersionCheckService, ProviderStorageService],
})
export class ProviderModule {}
