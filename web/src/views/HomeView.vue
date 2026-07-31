<template>
  <div class="home-view">
    <div class="stat-cards">
      <div class="stat-card">
        <div class="stat-card-info">
          <div class="stat-card-title" v-t="'stat.tasks'"></div>
          <div class="stat-card-value">{{ statsLoading ? '--' : stats.enabled + ' / ' + stats.total }}</div>
        </div>
        <div class="stat-card-icon gray"><i class="fa-solid fa-layer-group"></i></div>
      </div>
      <div class="stat-card">
        <div class="stat-card-info">
          <div class="stat-card-title" v-t="'stat.running'"></div>
          <div class="stat-card-value">{{ statsLoading ? '--' : stats.running }}</div>
        </div>
        <div class="stat-card-icon blue"><i class="fa-solid fa-bolt"></i></div>
      </div>
      <div class="stat-card">
        <div class="stat-card-info">
          <div class="stat-card-title" v-t="'stat.completed'"></div>
          <div class="stat-card-value">{{ statsLoading ? '--' : stats.completed }}</div>
        </div>
        <div class="stat-card-icon green"><i class="fa-solid fa-check"></i></div>
      </div>
      <div class="stat-card">
        <div class="stat-card-info">
          <div class="stat-card-title" v-t="'stat.total_downloaded'"></div>
          <div class="stat-card-value">{{ statsLoading ? '--' : stats.totalSize }}</div>
        </div>
        <div class="stat-card-icon purple"><i class="fa-solid fa-hard-drive"></i></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title" v-t="'nav.active_tasks'"></h2>
        <router-link to="/tasks" class="card-link" v-t="'nav.view_all'"></router-link>
      </div>
      <div class="task-list">
        <div v-if="tasksLoading" class="empty-state" v-t="'empty.loading'"></div>
        <div v-else-if="tasks.length === 0" class="empty-state" v-t="'empty.no_tasks'"></div>
        <div v-for="task in tasks" :key="task.id" class="task-row" @click="router.push('/detail/' + task.id)">
          <div class="task-row-icon">
            <img :src="'/api/providers/' + task.site + '/icon'" class="task-row-icon-img">
          </div>
          <div class="task-row-info">
            <div class="task-row-name">{{ task.name }}</div>
            <div class="task-row-meta">
              <span>{{ getSiteName(task.site) }}</span>
              <span v-if="task.interval" class="task-row-interval">{{ formatInterval(task.interval) }}</span>
            </div>
          </div>
          <div class="task-row-progress">
            <div class="task-row-status" :style="{ color: isDownloading(task) ? '#4caf50' : task.run_state === 2 ? '#ff9800' : '#95989e' }">
              {{ isDownloading(task) ? t('status.downloading') : task.run_state === 2 ? t('status.waiting') : task.paused ? t('status.paused') : t('status.idle') }}
              <span v-if="!isDownloading(task) && !task.paused && task.next_run && task.run_state !== 2" class="task-row-countdown">{{ countdownText(task) }}</span>
              <span v-if="isDownloading(task)" class="task-row-progress-count">{{ task._progress || '0/0' }}</span>
            </div>
            <div class="task-row-bar" :class="isDownloading(task) ? 'active' : 'idle'">
              <div v-if="isDownloading(task)" class="task-row-bar-fill" :style="{ width: progressPercent(task) }"></div>
            </div>
          </div>
          <div class="task-row-buttons">
            <span v-if="task.last_state === 1" class="task-row-last-result success"><i class="fa-solid fa-check"></i> <span v-t="'status.normal'"></span></span>
            <span v-else-if="task.last_state === 2" class="task-row-last-result error"><i class="fa-solid fa-xmark"></i> <span v-t="'status.error'"></span></span>
            <span v-else class="task-row-last-result pending">--</span>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title" v-t="'nav.recent_downloads'"></h2>
      </div>
      <div class="task-list">
        <div v-if="downloadsLoading" class="empty-state" v-t="'empty.loading'"></div>
        <div v-else-if="downloads.length === 0" class="empty-state" v-t="'empty.no_downloads'"></div>
        <div v-for="d in downloads" :key="d.id" class="download-row" @click="openDownloadDetail(d)">
          <div class="dl-icon" :style="{ background: 'rgba(149,152,158,0.1)' }">
            <i :class="downloadIcon(d)"></i>
          </div>
          <div class="dl-info">
            <div class="dl-name">{{ d.author || d.taskName }}</div>
            <div class="dl-meta">{{ d.desc || 'No description' }}</div>
          </div>
          <div class="dl-status">
            <div class="dl-status-top"><span class="dl-resource">{{ resourceText(d) }}</span> <div :class="d.state === 1 ? 'dl-success' : 'dl-fail'">{{ d.state === 1 ? t('status.completed') : t('status.failed') }}</div></div>
            <div class="dl-time">{{ formatTime(d.created_at) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Download Detail Overlay -->
    <div v-if="selectedDownload" class="dl-overlay" @click.self="closeDownloadDetail">
      <div class="dl-overlay-card" @click.stop>
        <button class="dl-overlay-close" @click="closeDownloadDetail"><i class="fa-solid fa-xmark"></i></button>
        <div class="dl-overlay-layout">
          <div class="dl-overlay-preview">
            <div v-if="selectedDownload.state === 0 || selectedDownload.state === 3" class="dl-preview-loading">
              <div class="dl-spinner"></div>
            </div>
            <div v-else-if="selectedDownload.state === 2" class="dl-preview-failed">
              <i class="fa-solid fa-xmark"></i>
            </div>
            <template v-else-if="currentMedia">
              <button v-if="overlayFiles.length > 1 && mediaIndex > 0" class="dl-arrow dl-arrow-left" @click.stop="prevMedia"><i class="fa-solid fa-chevron-left"></i></button>
              <div class="dl-preview-media">
                <img v-if="currentMedia.type === 'image'" :src="'/api/tasks/' + selectedDownload.taskId + '/preview/' + selectedDownload.post_id + '/' + currentMedia.filename">
                <video v-else controls :src="'/api/tasks/' + selectedDownload.taskId + '/preview/' + selectedDownload.post_id + '/' + currentMedia.filename"></video>
              </div>
              <button v-if="overlayFiles.length > 1 && mediaIndex < overlayFiles.length - 1" class="dl-arrow dl-arrow-right" @click.stop="nextMedia"><i class="fa-solid fa-chevron-right"></i></button>
              <div v-if="overlayFiles.length > 1" class="dl-counter">{{ mediaIndex + 1 }} / {{ overlayFiles.length }}</div>
            </template>
            <div v-else class="dl-preview-failed">
              <i class="fa-solid fa-file"></i>
            </div>
          </div>
          <div class="dl-overlay-info">
            <h3 class="dl-overlay-title">{{ selectedDownload.author || 'Unknown' }}</h3>
            <div class="dl-overlay-url" v-if="selectedDownload.data_json?.detailUrl"><a :href="selectedDownload.data_json.detailUrl" target="_blank">{{ selectedDownload.data_json.detailUrl }}</a></div>
            <p class="dl-overlay-desc">{{ selectedDownload.desc || 'No description' }}</p>
            <div class="dl-overlay-meta">
              <div class="dl-meta-item"><span class="dl-meta-label" v-t="'overlay.download_time'"></span><span class="dl-meta-value">{{ formatTime(selectedDownload.created_at) }}</span></div>
              <div class="dl-meta-item"><span class="dl-meta-label" v-t="'overlay.resources'"></span><span class="dl-meta-value">{{ selectedDownload.files?.length || 0 }}</span></div>
              <div class="dl-meta-item"><span class="dl-meta-label" v-t="'overlay.total_size'"></span><span class="dl-meta-value">{{ formatSize(selectedDownload.files?.reduce((s: any, f: any) => s + (f.fileSize || 0), 0) || 0) }}</span></div>
              <div class="dl-meta-item"><span class="dl-meta-label" v-t="'overlay.metadata'"></span><span class="dl-meta-value dl-meta-link" @click="showJson = true" v-t="'overlay.view'"></span></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- JSON Viewer Overlay -->
    <div v-if="showJson" class="dl-overlay" @click.self="showJson = false">
      <div class="json-overlay-card" @click.stop>
        <div class="json-overlay-header"><button class="dl-overlay-close" @click="showJson = false"><i class="fa-solid fa-xmark"></i></button></div>
        <pre class="json-viewer">{{ jsonPreview }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { t, getLocale } from '../locales/index';

const router = useRouter();

interface Stat { total: number; enabled: number; running: number; completed: number; totalSize: string }
interface Task { id: string; name: string; site: string; paused: boolean; next_run: string; last_state: number; run_state: number; interval: number; downloadCount: number; _progress?: string; _nextRun?: number }
interface Download { id: string; taskId: string; taskName: string; taskSite: string; author: string; desc: string; state: number; files: { type: string; fileSize: number }[]; created_at: string }

const statsLoading = ref(true);
const tasksLoading = ref(true);
const downloadsLoading = ref(true);
const stats = ref<Stat>({ total: 0, enabled: 0, running: 0, completed: 0, totalSize: '0 B' });
const tasks = ref<Task[]>([]);
const downloads = ref<Download[]>([]);
const now = ref(Date.now());
const selectedDownload = ref<any>(null);
const mediaIndex = ref(0);
const showJson = ref(false);
const siteNames = ref<Record<string, string | Record<string, string>>>({});

function getSiteName(site: string): string {
  const name = siteNames.value[site];
  if (!name) return site;
  if (typeof name === 'string') return name;
  const locale = getLocale();
  if (name[locale]) return name[locale];
  if (name['en-US']) return name['en-US'];
  return Object.values(name)[0] || site;
}
const jsonPreview = computed(() => {
  if (!selectedDownload.value) return '';
  const raw = selectedDownload.value.data_json?.raw;
  return raw ? JSON.stringify(raw, null, 2) : 'No metadata available';
});
function openDownloadDetail(d: any) { selectedDownload.value = d; mediaIndex.value = 0; }
function closeDownloadDetail() { selectedDownload.value = null; }
function formatTime(timeStr: string) {
  if (!timeStr) return '';
  return new Date(timeStr.includes('T') ? timeStr : timeStr.replace(' ', 'T') + 'Z').toLocaleString();
}
function formatSize(bytes: number) {
  if (!bytes) return '0 B';
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
}

const overlayFiles = computed(() => {
  if (!selectedDownload.value?.files) return [];
  return selectedDownload.value.files.filter((f: any) => f.fileStatus === 'success');
});
const currentMedia = computed(() => {
  return overlayFiles.value[mediaIndex.value] || null;
});
function prevMedia() { if (mediaIndex.value > 0) mediaIndex.value--; }
function nextMedia() { if (mediaIndex.value < overlayFiles.value.length - 1) mediaIndex.value++; }

function isDownloading(task: Task) { return task.next_run && new Date(task.next_run).getTime() <= now.value && !task.paused; }
function progressPercent(task: Task): string {
  if (!task._progress) return '0%';
  const [done, total] = task._progress.split('/').map(Number);
  if (!total || total === 0) return '0%';
  return Math.min(100, Math.round((done / total) * 100)) + '%';
}

function formatCountdown(ms: number) {
  if (ms <= 0) return t('status.downloading');
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return h + 'h ' + m + 'm';
  if (m > 0) return m + 'm ' + s + 's';
  return s + 's';
}

function countdownText(task: Task) {
  if (isDownloading(task) || task.paused) return '';
  if (!task.next_run) return '';
  const diff = new Date(task.next_run).getTime() - now.value;
  if (diff <= 0) return t('status.downloading');
  return formatCountdown(diff);
}

function downloadIcon(d: Download) {
  if (!d.files || d.files.length === 0) return 'fa-solid fa-file';
  const hasVideo = d.files.some(f => f.type === 'video');
  const hasImage = d.files.some(f => f.type === 'image');
  if (hasVideo && hasImage) return 'fa-solid fa-layer-group';
  if (hasVideo) return 'fa-solid fa-video';
  return 'fa-solid fa-image';
}

function resourceText(d: Download) {
  if (!d.files) return '-';
  let photos = 0, videos = 0;
  d.files.forEach(f => { if (f.type === 'image') photos++; else if (f.type === 'video') videos++; });
  const parts: string[] = [];
  if (photos > 0) parts.push(photos + ' ' + t(photos === 1 ? 'count.photo' : 'count.photos'));
  if (videos > 0) parts.push(videos + ' ' + t(videos === 1 ? 'count.video' : 'count.videos'));
  return parts.join(' · ') || '-';
}

function formatInterval(s: number) {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const parts = [];
  if (d > 0) parts.push(d + t('unit.days'));
  if (h > 0) parts.push(h + t('unit.hours'));
  if (m > 0) parts.push(m + t('unit.minutes'));
  return parts.join(' ') || '0' + t('unit.minutes');
}

let countdownTimer: ReturnType<typeof setInterval>;
let eventSource: EventSource | null = null;

async function refresh() {
  try {
    const [statsRes, tasksRes, dlRes, providersRes] = await Promise.all([
      fetch('/api/stats'),
      fetch('/api/tasks/active'),
      fetch('/api/downloads/recent'),
      fetch('/api/providers'),
    ]);
    stats.value = await statsRes.json();
    const oldProgress: Record<string, string> = {};
    for (const t of tasks.value) { if (t._progress) oldProgress[t.id] = t._progress; }
    tasks.value = await tasksRes.json();
    for (const t of tasks.value) { if (oldProgress[t.id]) t._progress = oldProgress[t.id]; }
    downloads.value = await dlRes.json();
    const providers = await providersRes.json();
    const map: Record<string, string | Record<string, string>> = {};
    for (const p of providers) { map[p.id] = p.site; }
    siteNames.value = map;
  } catch (e) {}
  statsLoading.value = false;
  tasksLoading.value = false;
  downloadsLoading.value = false;
}

function connectSSE() {
  if (eventSource) eventSource.close();
  eventSource = new EventSource('/api/events');

  eventSource.addEventListener('task:started', () => { refresh(); });
  eventSource.addEventListener('task:completed', () => { refresh(); });
  eventSource.addEventListener('task:failed', () => { refresh(); });
  eventSource.addEventListener('task:paused', () => { refresh(); });
  eventSource.addEventListener('scheduler:updated', () => { refresh(); });

  eventSource.addEventListener('task:progress', (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data);
      const task = tasks.value.find(t => t.id === data.taskId);
      if (task) {
        task._progress = data.processed + '/' + data.total;
        // Trigger reactivity
        tasks.value = [...tasks.value];
      }
    } catch {}
  });

  eventSource.onerror = () => {
    eventSource?.close();
    setTimeout(connectSSE, 3000);
  };
}

onMounted(() => {
  refresh();
  countdownTimer = setInterval(() => { now.value = Date.now(); }, 1000);
  connectSSE();
});
onUnmounted(() => {
  clearInterval(countdownTimer);
  eventSource?.close();
});
</script>

<style>
.stat-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
@media (max-width: 900px) { .stat-cards { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 480px) { .stat-cards { grid-template-columns: 1fr; } }
@media (max-width: 768px) { .stat-card-value { font-size: 20px; } }
.stat-card { background: #14171a; border: 1px solid #16181b; border-radius: 12px; padding: 20px; display: flex; justify-content: space-between; align-items: center; min-height: 100px; }
.stat-card-info { display: flex; flex-direction: column; gap: 4px; }
.stat-card-title { font-size: 12px; color: #95989e; font-weight: 500; }
.stat-card-value { font-size: 28px; font-weight: 700; color: #fff; }
.stat-card-icon { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; }
.stat-card-icon.gray { background: rgba(149,152,158,0.15); color: #95989e; }
.stat-card-icon.blue { background: rgba(15,47,116,0.3); color: #4d8bff; }
.stat-card-icon.green { background: rgba(76,175,80,0.15); color: #4caf50; }
.stat-card-icon.purple { background: rgba(156,39,176,0.15); color: #ce93d8; }

.download-row { display: flex; align-items: center; gap: 16px; padding: 12px 16px; border-bottom: 1px solid #1e2226; border-radius: 8px; cursor: pointer; transition: background 0.15s; }
.download-row:hover { background: rgba(149,152,158,0.06); }
.download-row:last-child { border-bottom: none; }
.dl-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 16px; color: #95989e; flex-shrink: 0; }
.dl-info { flex: 1; min-width: 0; }
.dl-name { font-size: 13px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dl-meta { font-size: 12px; color: #95989e; margin-top: 2px; }
.dl-status { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; min-width: 60px; }
.dl-status-top { display: flex; align-items: center; gap: 6px; }
.dl-success { font-size: 12px; color: #4caf50; font-weight: 500; }
.dl-fail { font-size: 12px; color: #f44336; font-weight: 500; }
.dl-resource { font-size: 11px; color: #95989e; }
.dl-time { font-size: 11px; color: #95989e; }

.dl-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 100; backdrop-filter: blur(4px); }
.dl-overlay-card { background: #14171a; border: 1px solid #16181b; border-radius: 12px; width: 90%; max-width: 1100px; max-height: 90vh; display: flex; overflow: hidden; position: relative; }
@media (max-width: 768px) { .dl-overlay-card { flex-direction: column; width: 95%; max-height: 90vh; } .dl-overlay-layout { flex-direction: column; height: 100%; } .dl-overlay-preview { flex: 1; min-height: 0; max-height: calc(90vh - 200px); } .dl-overlay-info { flex: none; } }
.dl-overlay-close { position: absolute; top: 12px; right: 12px; background: rgba(0,0,0,0.5); border: none; color: #fff; font-size: 18px; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; z-index: 1; display: flex; align-items: center; justify-content: center; }
.dl-overlay-close:hover { background: rgba(255,255,255,0.2); }
.dl-overlay-layout { display: flex; width: 100%; }
.dl-overlay-preview { flex: 2; background: #0b0d10; display: flex; align-items: center; justify-content: center; min-width: 0; min-height: 0; overflow: hidden; position: relative; }
.dl-preview-media { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.dl-preview-media img, .dl-preview-media video { max-width: 100%; max-height: 100%; object-fit: contain; }
.dl-arrow { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.5); border: none; color: #fff; font-size: 20px; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 2; transition: background 0.15s; }
.dl-arrow:hover { background: rgba(0,0,0,0.8); }
.dl-arrow-left { left: 12px; }
.dl-arrow-right { right: 12px; }
.dl-counter { position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.5); color: #fff; font-size: 12px; padding: 4px 10px; border-radius: 12px; z-index: 2; }
.dl-preview-loading, .dl-preview-failed { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; color: #555; font-size: 48px; }
.dl-spinner { width: 48px; height: 48px; border: 3px solid #333; border-top-color: #ff9800; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.dl-overlay-info { flex: 1; padding: 24px; display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.dl-overlay-title { font-size: 16px; font-weight: 600; color: #fff; }
.dl-overlay-url { font-size: 11px; color: #3b82f6; word-break: break-all; }
.dl-overlay-url a { color: #3b82f6; text-decoration: none; }
.dl-overlay-url a:hover { text-decoration: underline; }
.dl-overlay-desc { font-size: 13px; color: #95989e; line-height: 1.5; }
.dl-overlay-meta { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; padding-top: 12px; border-top: 1px solid #1e2226; }
.dl-meta-item { display: flex; justify-content: space-between; align-items: center; }
.dl-meta-label { font-size: 12px; color: #95989e; }
.dl-meta-value { font-size: 13px; color: #fff; }
.dl-meta-link { color: #3b82f6; cursor: pointer; text-decoration: underline; }
.json-viewer { padding: 24px; font-size: 12px; font-family: monospace; color: #ccc; white-space: pre-wrap; word-break: break-all; line-height: 1.5; overflow-y: auto; }
.json-overlay-card { background: #14171a; border: 1px solid #16181b; border-radius: 12px; width: 70%; max-width: 900px; max-height: 80vh; display: flex; flex-direction: column; overflow: hidden; position: relative; }
.json-overlay-header { position: relative; height: 0; }
.json-overlay-header .dl-overlay-close { position: absolute; top: 8px; right: 8px; }
</style>
