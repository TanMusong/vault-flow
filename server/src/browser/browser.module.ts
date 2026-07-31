import { Module } from '@nestjs/common';
import { RunnerService } from './runner.service';
import { RegistryService } from './registry.service';

@Module({
  providers: [RunnerService, RegistryService],
  exports: [RunnerService, RegistryService],
})
export class BrowserModule {}
