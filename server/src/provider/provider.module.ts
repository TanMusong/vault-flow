import { Module } from '@nestjs/common';
import { VersionCheckService } from './version-check.service';
import { ProviderStorageService } from './provider-storage.service';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EventsModule],
  providers: [VersionCheckService, ProviderStorageService],
  exports: [VersionCheckService, ProviderStorageService],
})
export class ProviderModule {}
