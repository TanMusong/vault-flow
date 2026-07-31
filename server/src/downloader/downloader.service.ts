import { Injectable } from '@nestjs/common';
import { normalizeFilename, downloadFile } from './downloader';

@Injectable()
export class DownloaderService {
  normalizeFilename = normalizeFilename;
  downloadFile = downloadFile;
}
