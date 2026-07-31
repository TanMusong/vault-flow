import { Controller, Get } from '@nestjs/common';
import { getGlobal } from '../config/manager';
import fs from 'fs';
import path from 'path';

const TAG_URLS = [
  'https://gh-proxy.org/https://api.github.com/repos/TanMusong/vault-flow/tags?per_page=1',
  'https://v4.gh-proxy.org/https://api.github.com/repos/TanMusong/vault-flow/tags?per_page=1',
  'https://v6.gh-proxy.org/https://api.github.com/repos/TanMusong/vault-flow/tags?per_page=1',
  'https://cdn.gh-proxy.org/https://api.github.com/repos/TanMusong/vault-flow/tags?per_page=1',
  'https://api.github.com/repos/TanMusong/vault-flow/tags?per_page=1',
];

function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

function getLocalVersion(): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));
    return pkg.version || '0.0.0';
  } catch { return '0.0.0'; }
}

interface VersionCache { latest: string; checkedAt: number; }
let versionCache: VersionCache | null = null;
const VERSION_CACHE_TTL = 3600000;

async function fetchLatestTag(): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const results = await Promise.allSettled(TAG_URLS.map(url =>
      fetch(url, { signal: controller.signal }).then(r => {
        if (!r.ok) throw new Error('not ok');
        return r.json();
      })
    ));
    clearTimeout(timer);
    for (const r of results) {
      if (r.status === 'fulfilled' && Array.isArray(r.value) && r.value.length > 0) {
        const latest = r.value[0]?.name?.replace(/^v/, '');
        if (latest) return latest;
      }
    }
  } catch { clearTimeout(timer); }
  return null;
}

@Controller('api')
export class GlobalController {
  @Get('global')
  getGlobalConfig() {
    return getGlobal();
  }

  @Get('version')
  async getVersion() {
    const local = getLocalVersion();
    const now = Date.now();
    if (!versionCache || now - versionCache.checkedAt > VERSION_CACHE_TTL) {
      const latest = await fetchLatestTag();
      if (latest) versionCache = { latest, checkedAt: now };
    }
    const latest = versionCache?.latest || null;
    const hasUpdate = !!(latest && compareSemver(latest, local) > 0);
    return { local, latest, hasUpdate };
  }
}
