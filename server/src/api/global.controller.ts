import { Controller, Get } from '@nestjs/common';
import { getGlobal } from '../config/manager';
import { CoreVersionCheckService } from '../provider/core-version-check.service';

@Controller('api')
export class GlobalController {
  constructor(private readonly coreVersionCheck: CoreVersionCheckService) {}

  @Get('global')
  getGlobalConfig() {
    return getGlobal();
  }

  @Get('version')
  async getVersion() {
    // Return cached info immediately, check in background
    return this.coreVersionCheck.getVersionInfoWithCheck();
  }
}
