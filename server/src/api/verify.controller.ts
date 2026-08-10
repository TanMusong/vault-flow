import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { RunnerService } from '../browser/runner.service';

@Controller('api')
export class VerifyController {
  constructor(private readonly runner: RunnerService) {}

  @Post('verify')
  async verify(@Body() body: { site?: string; config?: Record<string, unknown> }) {
    if (!body.site) throw new BadRequestException('site required');
    try {
      const result = await this.runner.addTask(body.site, body.config || {}, 'verify-temp');
      return { ok: true, username: result.name };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }
}
