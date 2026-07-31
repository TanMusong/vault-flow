import { Controller, Get, Post, Body } from '@nestjs/common';
import { config, getLocale, setLocale } from '../config/manager';

const APP_VERSION = require('../../package.json').version;

@Controller('api')
export class InfoController {
  @Get('info')
  getInfo() {
    return { version: APP_VERSION, locale: getLocale() };
  }

  @Post('locale')
  setLocaleBody(@Body() body: { locale?: string }) {
    if (body.locale) {
      setLocale(body.locale);
    }
    return { locale: getLocale() };
  }
}
