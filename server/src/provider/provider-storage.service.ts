import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config/manager';

interface StorageData {
  [key: string]: unknown;
}

@Injectable()
export class ProviderStorageService {
  private getStoragePath(providerId: string): string {
    const storageDir = path.join(config.databaseDir, 'provider-storage');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    return path.join(storageDir, `${providerId}.json`);
  }

  private load(providerId: string): StorageData {
    const filePath = this.getStoragePath(providerId);
    if (!fs.existsSync(filePath)) {
      return {};
    }
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (_e) {
      return {};
    }
  }

  private save(providerId: string, data: StorageData): void {
    const filePath = this.getStoragePath(providerId);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  get<T = unknown>(providerId: string, key: string): T | undefined {
    const data = this.load(providerId);
    return data[key] as T | undefined;
  }

  set<T = unknown>(providerId: string, key: string, value: T): void {
    const data = this.load(providerId);
    data[key] = value;
    this.save(providerId, data);
  }

  remove(providerId: string, key: string): void {
    const data = this.load(providerId);
    delete data[key];
    this.save(providerId, data);
  }

  keys(providerId: string): string[] {
    const data = this.load(providerId);
    return Object.keys(data);
  }

  clear(providerId: string): void {
    const filePath = this.getStoragePath(providerId);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  deleteStorageFile(providerId: string): void {
    this.clear(providerId);
  }
}
