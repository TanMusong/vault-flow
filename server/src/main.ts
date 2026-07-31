import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import path from 'path';
loadEnv({ path: path.join(__dirname, '..', '.env') });
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

const SERVER_PORT = parseInt(process.env.SERVER_PORT || '', 10) || 3000;
const WEB_PORT = parseInt(process.env.WEB_PORT || '', 10) || 5000;
const SERVE_STATIC = process.env.SERVE_STATIC === 'true';
const HOST = SERVE_STATIC ? (process.env.WEB_HOST || '0.0.0.0') : (process.env.SERVER_HOST || '127.0.0.1');
const PORT = SERVE_STATIC ? WEB_PORT : SERVER_PORT;

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors();

  // Serve web static files in Docker/production mode
  if (process.env.SERVE_STATIC === 'true') {
    const staticDir = path.join(__dirname, '..', '..', 'web', 'dist');
    app.useStaticAssets(staticDir);
    const expressLib = require('express');
    app.use((req: any, res: any, next: any) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
      res.sendFile(path.join(staticDir, 'index.html'));
    });
  }

  await app.listen(PORT, HOST);
  console.log(`Server running at http://${HOST}:${PORT}`);

  // Check provider versions after server starts
  const versionCheck = app.get(require('./provider/version-check.service').VersionCheckService);
  versionCheck.checkAllProviders();
}

bootstrap();
