<template>
  <div v-if="task">
    <div class="card detail-tabs-card">
      <div class="detail-tabs">
        <button v-for="tab in tabs" :key="tab.key" class="detail-tab" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
          {{ t(tab.label) }}
        </button>
      </div>
    </div>

    <div v-if="activeTab === 'overview'" class="detail-overview">
      <div class="detail-overview-left">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title" v-t="'detail.task_status'"></h3>
          </div>
          <div class="detail-stats-grid">
            <div class="detail-stat-item">
              <div class="detail-stat-label" v-t="'detail.status_label'"></div>
              <div class="detail-stat-value" :style="{ color: task.last_state === 2 ? '#f44336' : '#4caf50' }">{{ task.last_state === 2 ? t('status.error') : t('status.normal') }}</div>
              <i class="detail-stat-icon" :class="task.last_state === 2 ? 'fa-solid fa-circle-xmark' : 'fa-solid fa-circle-check'" :style="{ color: task.last_state === 2 ? '#f44336' : '#4caf50' }"></i>
            </div>
            <div v-if="!task.paused" class="detail-stat-item">
              <div class="detail-stat-label" v-t="'detail.run_label'"></div>
              <div class="detail-stat-value" :style="{ color: isDownloading ? '#1d9bf0' : task?.run_state === 2 ? '#ff9800' : '#95989e' }">
                {{ isDownloading ? t('detail.running') : task?.run_state === 2 ? t('status.waiting') : t('detail.idle') }}
                <span v-if="!isDownloading && task?.run_state !== 2 && countdownText" class="detail-countdown">{{ countdownText }}</span>
              </div>
              <i class="detail-stat-icon" :class="isDownloading ? 'fa-solid fa-bolt' : task?.run_state === 2 ? 'fa-solid fa-clock' : 'fa-solid fa-clock'" :style="{ color: isDownloading ? '#1d9bf0' : task?.run_state === 2 ? '#ff9800' : '#555' }"></i>
            </div>
            <div class="detail-stat-item">
              <div class="detail-stat-label" v-t="'detail.works_label'"></div>
              <div class="detail-stat-value">{{ task.downloadCount }}</div>
              <i class="detail-stat-icon fa-solid fa-download" style="color:#555"></i>
            </div>
            <div class="detail-stat-item">
              <div class="detail-stat-label" v-t="'detail.size_label'"></div>
              <div class="detail-stat-value">{{ formatSize(task.totalSize) }}</div>
              <i class="detail-stat-icon fa-solid fa-hard-drive" style="color:#555"></i>
            </div>
          </div>
        </div>
        <div class="card detail-overview-info">
          <div class="card-header">
            <h3 class="card-title" v-t="'detail.info_title'"></h3>
          </div>
          <div class="config-list">
            <div class="config-item"><span class="config-label" v-t="'detail.info_task_name'"></span><span class="config-value">{{ task.name }}</span></div>
            <div class="config-item"><span class="config-label" v-t="'detail.info_task_id'"></span><span class="config-value config-value-mono">{{ task.id }}</span></div>
            <div class="config-item"><span class="config-label" v-t="'detail.info_provider'"></span><span class="config-value config-value-site"><img :src="'/api/providers/' + task.site + '/icon'" class="config-site-icon"> {{ providerName }} ({{ task.site }})</span></div>
            <div class="config-item"><span class="config-label" v-t="'detail.info_site'"></span><span class="config-value">{{ getSiteName(task.site) }}</span></div>
            <div class="config-item"><span class="config-label" v-t="'detail.info_interval'"></span><span class="config-value">{{ formatInterval(task.interval) }}</span></div>
          </div>
        </div>
      </div>
      <div class="card detail-overview-downloads">
        <div class="card-header">
          <h3 class="card-title" v-t="'nav.recent_downloads'"></h3>
          <a class="card-link" href="#" @click.prevent="activeTab = 'downloads'" v-t="'nav.view_all'"></a>
        </div>
        <div class="download-list">
          <div v-if="overviewDownloads.length === 0" class="empty-downloads" v-t="'empty.no_downloads'"></div>
          <div v-for="d in overviewDownloads" :key="d.post_id" class="download-row" @click="openDownloadDetail(d)">
            <div class="dl-icon" :style="{ background: 'rgba(149,152,158,0.1)' }">
              <i :class="downloadIcon(d)"></i>
            </div>
            <div class="dl-info">
              <div class="dl-name">{{ d.author || 'Unknown' }}</div>
              <div class="dl-meta">{{ d.desc || 'No description' }}</div>
            </div>
            <div class="dl-status">
              <div class="dl-status-top"><span class="dl-resource">{{ resourceText(d) }}</span> <div :class="d.state === 1 ? 'dl-success' : 'dl-fail'">{{ d.state === 1 ? t('status.completed') : t('status.failed') }}</div></div>
              <div class="dl-time">{{ formatTime(d.created_at) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'downloads'" class="card">
      <div class="downloads-header">
        <h3 v-t="'nav.downloads'"></h3>
        <button v-if="downloads.length > 0" class="btn btn-danger btn-sm" @click="clearDownloads"><i class="fa-solid fa-trash"></i> {{ t('btn.clear') }}</button>
      </div>
      <div class="download-list">
        <div v-if="downloads.length === 0" class="empty-downloads" v-t="'empty.no_downloads'"></div>
        <div v-for="d in downloads" :key="d.post_id" class="download-row" @click="openDownloadDetail(d)">
          <div class="dl-icon" :style="{ background: 'rgba(149,152,158,0.1)' }">
            <i :class="downloadIcon(d)"></i>
          </div>
          <div class="dl-info">
            <div class="dl-name">{{ d.author || 'Unknown' }}</div>
            <div class="dl-meta">{{ d.desc || 'No description' }}</div>
          </div>
          <div class="dl-status">
            <div class="dl-status-top"><span class="dl-resource">{{ resourceText(d) }}</span> <div :class="d.state === 1 ? 'dl-success' : d.state === 2 ? 'dl-fail' : 'dl-downloading'">{{ d.state === 1 ? t('status.completed') : d.state === 2 ? t('status.failed') : t('status.downloading') }}</div></div>
            <div class="dl-time">{{ formatTime(d.created_at) }}</div>
          </div>
        </div>
        <div v-if="hasMore" class="load-more">
          <button class="btn btn-ghost btn-sm" @click="loadMore">Load More</button>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'config'" class="card">
      <div class="config-list">
        <div class="config-item">
          <span class="config-label">{{ t('task.interval') }}</span>
          <input class="config-input" type="number" v-model.number="editInterval" min="600" step="60">
        </div>
        <template v-if="providerConfigItems.length > 0">
          <template v-for="item in providerConfigItems" :key="item.key">
            <div v-if="item.type === 'text'" class="config-item">
              <span class="config-label">{{ getLocalizedName(item.name) }}</span>
              <input class="config-input" type="text" v-model="providerConfig[item.key]" :readonly="isImmutable(item)" :placeholder="item.placeholder ? getLocalizedName(item.placeholder) : ''">
            </div>
            <div v-else-if="item.type === 'textarea'" class="config-item">
              <span class="config-label">{{ getLocalizedName(item.name) }}</span>
              <textarea class="config-input" v-model="providerConfig[item.key]" rows="4" :readonly="isImmutable(item)" :placeholder="item.placeholder ? getLocalizedName(item.placeholder) : ''"></textarea>
            </div>
            <div v-else-if="item.type === 'number'" class="config-item">
              <span class="config-label">{{ getLocalizedName(item.name) }}</span>
              <input class="config-input" type="number" v-model.number="providerConfig[item.key]" :readonly="isImmutable(item)" :placeholder="item.placeholder ? getLocalizedName(item.placeholder) : ''">
            </div>
            <div v-else-if="item.type === 'select'" class="config-item">
              <span class="config-label">{{ getLocalizedName(item.name) }}</span>
              <select class="config-input" v-model="providerConfig[item.key]" :disabled="isImmutable(item)">
                <option v-for="opt in item.values" :key="opt.key" :value="opt.key">{{ getLocalizedName(opt.name) }}</option>
              </select>
            </div>
            <div v-else-if="item.type === 'checkbox'" class="config-item">
              <span class="config-label">{{ getLocalizedName(item.name) }}</span>
              <div class="toggle-row" @click="!isImmutable(item) && (providerConfig[item.key] = !providerConfig[item.key])">
                <div class="toggle-switch" :class="{ on: providerConfig[item.key] }">
                  <div class="toggle-thumb"></div>
                </div>
              </div>
            </div>
            <template v-if="item.type === 'checkbox' && item.on && providerConfig[item.key]">
              <div v-for="sub in item.on" :key="sub.key" class="config-item config-sub">
                <span class="config-label">{{ getLocalizedName(sub.name) }}</span>
                <template v-if="sub.type === 'text'"><input class="config-input" type="text" v-model="providerConfig[sub.key]" :readonly="isImmutable(sub)"></template>
                <template v-else-if="sub.type === 'number'"><input class="config-input" type="number" v-model.number="providerConfig[sub.key]" :readonly="isImmutable(sub)"></template>
                <template v-else-if="sub.type === 'select'">
                  <select class="config-input" v-model="providerConfig[sub.key]" :disabled="isImmutable(sub)">
                    <option v-for="opt in sub.values" :key="opt.key" :value="opt.key">{{ getLocalizedName(opt.name) }}</option>
                  </select>
                </template>
                <template v-else-if="sub.type === 'checkbox'">
                  <div class="toggle-row" @click="!isImmutable(sub) && (providerConfig[sub.key] = !providerConfig[sub.key])">
                    <div class="toggle-switch" :class="{ on: providerConfig[sub.key] }"><div class="toggle-thumb"></div></div>
                  </div>
                </template>
              </div>
            </template>
            <template v-if="item.type === 'checkbox' && item.off && !providerConfig[item.key]">
              <div v-for="sub in item.off" :key="sub.key" class="config-item config-sub">
                <span class="config-label">{{ getLocalizedName(sub.name) }}</span>
                <template v-if="sub.type === 'text'"><input class="config-input" type="text" v-model="providerConfig[sub.key]" :readonly="isImmutable(sub)"></template>
                <template v-else-if="sub.type === 'number'"><input class="config-input" type="number" v-model.number="providerConfig[sub.key]" :readonly="isImmutable(sub)"></template>
                <template v-else-if="sub.type === 'select'">
                  <select class="config-input" v-model="providerConfig[sub.key]" :disabled="isImmutable(sub)">
                    <option v-for="opt in sub.values" :key="opt.key" :value="opt.key">{{ getLocalizedName(opt.name) }}</option>
                  </select>
                </template>
                <template v-else-if="sub.type === 'checkbox'">
                  <div class="toggle-row" @click="!isImmutable(sub) && (providerConfig[sub.key] = !providerConfig[sub.key])">
                    <div class="toggle-switch" :class="{ on: providerConfig[sub.key] }"><div class="toggle-thumb"></div></div>
                  </div>
                </template>
              </div>
            </template>
          </template>
        </template>
        <div v-else class="empty-downloads" v-t="'modal.no_config'"></div>
      </div>
      <div class="config-actions">
        <button v-if="configDirty" class="btn btn-primary" @click="saveConfig"><i class="fa-solid fa-check"></i> {{ t('btn.save') }}</button>
        <button class="btn btn-gray" @click="togglePause"><i :class="task.paused ? 'fa-solid fa-toggle-on' : 'fa-solid fa-toggle-off'"></i> {{ task.paused ? t('btn.enable') : t('btn.disable') }}</button>
        <button class="btn btn-danger" @click="deleteTask"><i class="fa-solid fa-trash"></i> {{ t('btn.delete') }}</button>
      </div>
    </div>

    <div v-if="activeTab === 'logs'" class="card">
      <div class="logs-list">
        <div v-if="taskLogs.length === 0" class="empty-downloads" v-t="'empty.no_logs'"></div>
        <div v-for="log in taskLogs" :key="log.id" class="log-entry" :class="'log-level-bg-' + log.level">
          <span class="log-time">{{ formatTime(log.time) }}</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </div>
    </div>
  </div>
  <div v-if="taskLoading" class="empty-state" v-t="'empty.loading'"></div>
  <div v-else-if="!task" class="empty-state"><p>Task not found</p></div>

  <!-- Confirm Dialog -->
  <div v-if="showConfirm" class="dl-overlay" @click.self="cancelConfirm">
    <div class="confirm-card" @click.stop>
      <p class="confirm-text">{{ t('btn.delete') }}?</p>
      <div class="confirm-actions">
        <button class="btn btn-ghost btn-sm" @click="cancelConfirm">{{ t('btn.cancel') }}</button>
        <button class="btn btn-danger btn-sm" @click="doConfirm"><i class="fa-solid fa-trash"></i> {{ t('btn.delete') }}</button>
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
              <img v-if="currentMedia.type === 'image'" :src="'/api/tasks/' + route.params.id + '/preview/' + selectedDownload.post_id + '/' + currentMedia.filename">
              <video v-else controls :src="'/api/tasks/' + route.params.id + '/preview/' + selectedDownload.post_id + '/' + currentMedia.filename"></video>
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
          <div class="dl-overlay-url" v-if="selectedDownload.post_id"><a :href="getDownloadUrl(selectedDownload)" target="_blank">{{ getDownloadUrl(selectedDownload) }}</a></div>
          <p class="dl-overlay-desc">{{ selectedDownload.desc || 'No description' }}</p>
          <div class="dl-overlay-meta">
            <div class="dl-meta-item"><span class="dl-meta-label" v-t="'overlay.download_time'"></span><span class="dl-meta-value">{{ formatTime(selectedDownload.created_at) }}</span></div>
            <div class="dl-meta-item"><span class="dl-meta-label" v-t="'overlay.resources'"></span><span class="dl-meta-value">{{ selectedDownload.files?.length || 0 }}</span></div>
            <div class="dl-meta-item"><span class="dl-meta-label" v-t="'overlay.total_size'"></span><span class="dl-meta-value">{{ formatSize(selectedDownload.files?.reduce((s: number, f: any) => s + (f.fileSize || 0), 0) || 0) }}</span></div>
            <div class="dl-meta-item"><span class="dl-meta-label" v-t="'overlay.metadata'"></span><span class="dl-meta-value dl-meta-link" @click="showJson = true" v-t="'overlay.view'"></span></div>
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
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { t, getLocale } from '../locales/index';

const route = useRoute();
const router = useRouter();
const task = ref<any>(null);
const taskLoading = ref(true);
const downloads = ref<any[]>([]);
const totalDownloads = ref(0);
const offset = ref(0);
const activeTab = ref('overview');
const taskLogs = ref<any[]>([]);
const providerMap = ref<Record<string, any>>({});

function getSiteName(site: string): string {
  const p = providerMap.value[site];
  if (!p) return site;
  const name = p.site;
  if (typeof name === 'string') return name;
  const locale = getLocale();
  if (name[locale]) return name[locale];
  if (name['en-US']) return name['en-US'];
  return (Object.values(name)[0] as string) || site;
}

const providerName = computed(() => {
  const p = providerMap.value[task.value?.site];
  if (!p) return task.value?.site || '';
  const name = p.name;
  if (typeof name === 'string') return name;
  const locale = getLocale();
  if (name[locale]) return name[locale];
  if (name['en-US']) return name['en-US'];
  return (Object.values(name)[0] as string) || '';
});

const tabs = [
  { key: 'overview', label: 'detail.tab_overview' },
  { key: 'downloads', label: 'detail.tab_downloads' },
  { key: 'config', label: 'detail.tab_config' },
  { key: 'logs', label: 'detail.tab_logs' },
];

const overviewDownloads = computed(() => {
  return downloads.value
    .filter(d => d.state !== 3 && d.state !== 0)
    .slice(0, 10);
});

const selectedDownload = ref<any>(null);
const mediaIndex = ref(0);
const showJson = ref(false);
const jsonPreview = computed(() => {
  if (!selectedDownload.value) return '';
  const raw = selectedDownload.value.data_json?.raw;
  return raw ? JSON.stringify(raw, null, 2) : 'No metadata available';
});
function openDownloadDetail(d: any) { selectedDownload.value = d; mediaIndex.value = 0; }
function closeDownloadDetail() { selectedDownload.value = null; }

const isDownloading = computed(() => {
  if (!task.value || task.value.paused) return false;
  return task.value.next_run && new Date(task.value.next_run).getTime() <= Date.now();
});

const providerConfig = reactive<Record<string, any>>({});
const providerConfigSnapshot = ref<Record<string, any>>({});
const editInterval = ref(1800);
const editIntervalSnapshot = ref(1800);

interface ConfigItem {
  key: string;
  name: string | Record<string, string>;
  type: string;
  placeholder?: string | Record<string, string>;
  default?: any;
  immutable?: boolean;
  values?: { key: string; name: string | Record<string, string> }[];
  on?: ConfigItem[];
  off?: ConfigItem[];
}

const providerConfigItems = computed<ConfigItem[]>(() => {
  return (providerMap.value[task.value?.site]?.config as ConfigItem[]) || [];
});

function isImmutable(item: ConfigItem): boolean {
  return item.immutable === true;
}

const configDirty = computed(() => {
  if (editInterval.value !== editIntervalSnapshot.value) return true;
  for (const item of providerConfigItems.value) {
    if (isImmutable(item)) continue;
    if (providerConfig[item.key] !== providerConfigSnapshot.value[item.key]) return true;
  }
  return false;
});

function getLocalizedName(name: string | Record<string, string>): string {
  if (typeof name === 'string') return name;
  const locale = getLocale();
  if (name[locale]) return name[locale];
  if (name['en-US']) return name['en-US'];
  return (Object.values(name)[0] as string) || '';
}

function initProviderConfig(data: Record<string, any>) {
  editInterval.value = task.value?.interval || 1800;
  editIntervalSnapshot.value = editInterval.value;
  Object.keys(providerConfig).forEach(key => delete providerConfig[key]);
  for (const item of providerConfigItems.value) {
    if ((item as any).password) {
      providerConfig[item.key] = '';
    } else if (data[item.key] !== undefined) {
      providerConfig[item.key] = data[item.key];
    } else if (item.default !== undefined) {
      providerConfig[item.key] = item.default;
    } else if (item.type === 'checkbox') {
      providerConfig[item.key] = false;
    } else if (item.type === 'number') {
      providerConfig[item.key] = 0;
    } else {
      providerConfig[item.key] = '';
    }
    if (item.on) {
      for (const sub of item.on) {
        if (data[sub.key] !== undefined) providerConfig[sub.key] = data[sub.key];
        else if (sub.default !== undefined) providerConfig[sub.key] = sub.default;
        else if (sub.type === 'checkbox') providerConfig[sub.key] = false;
        else if (sub.type === 'number') providerConfig[sub.key] = 0;
        else providerConfig[sub.key] = '';
      }
    }
    if (item.off) {
      for (const sub of item.off) {
        if (data[sub.key] !== undefined) providerConfig[sub.key] = data[sub.key];
        else if (sub.default !== undefined) providerConfig[sub.key] = sub.default;
        else if (sub.type === 'checkbox') providerConfig[sub.key] = false;
        else if (sub.type === 'number') providerConfig[sub.key] = 0;
        else providerConfig[sub.key] = '';
      }
    }
  }
  providerConfigSnapshot.value = { ...providerConfig };
}

async function saveConfig() {
  const id = route.params.id as string;
  const immutableKeys = new Set(providerConfigItems.value.filter(isImmutable).map(item => item.key));
  const configToSave: Record<string, any> = {};
  for (const key of Object.keys(providerConfig)) {
    if (!immutableKeys.has(key)) configToSave[key] = providerConfig[key];
  }
  const body: Record<string, any> = { config: configToSave };
  if (editInterval.value !== editIntervalSnapshot.value) {
    body.interval = editInterval.value;
  }
  try {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      providerConfigSnapshot.value = { ...providerConfig };
      editIntervalSnapshot.value = editInterval.value;
    }
  } catch (e) {}
}

async function togglePause() {
  const id = route.params.id as string;
  try {
    const res = await fetch(`/api/tasks/${id}/pause`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      task.value.paused = data.paused;
    }
  } catch (e) {}
}

const showConfirm = ref(false);
const confirmAction = ref<any>(null);
function openConfirm(action: () => void) { confirmAction.value = action; showConfirm.value = true; }
function doConfirm() { showConfirm.value = false; confirmAction.value?.(); confirmAction.value = null; }
function cancelConfirm() { showConfirm.value = false; confirmAction.value = null; }

async function deleteTask() {
  openConfirm(async () => {
    const id = route.params.id as string;
    try {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      router.push('/tasks');
    } catch (e) {}
  });
}

const countdownText = computed(() => {
  if (!task.value || isDownloading.value || task.value.paused) return '';
  const diff = new Date(task.value.next_run).getTime() - Date.now();
  if (diff <= 0) return '';
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
});

const hasMore = computed(() => downloads.value.length < totalDownloads.value);

function formatInterval(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (d > 0) parts.push(d + t('unit.days'));
  if (h > 0) parts.push(h + t('unit.hours'));
  if (m > 0) parts.push(m + t('unit.minutes'));
  return parts.join(' ') || '0' + t('unit.minutes');
}

function formatSize(bytes: number) {
  if (!bytes) return '0 B';
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
}

function downloadIcon(d: any) {
  if (!d.files || d.files.length === 0) return 'fa-solid fa-file';
  const hasVideo = d.files.some((f: any) => f.type === 'video');
  const hasImage = d.files.some((f: any) => f.type === 'image');
  if (hasVideo && hasImage) return 'fa-solid fa-layer-group';
  if (hasVideo) return 'fa-solid fa-video';
  return 'fa-solid fa-image';
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

function getDownloadUrl(d: any) {
  const dj = d.data_json || {};
  if (dj.detailUrl) return dj.detailUrl;
  return '#';
}

function resourceText(d: any) {
  if (!d.files) return '-';
  let photos = 0, videos = 0;
  d.files.forEach((f: any) => { if (f.type === 'image') photos++; else if (f.type === 'video') videos++; });
  const parts: string[] = [];
  if (photos > 0) parts.push(photos + ' ' + t(photos === 1 ? 'count.photo' : 'count.photos'));
  if (videos > 0) parts.push(videos + ' ' + t(videos === 1 ? 'count.video' : 'count.videos'));
  return parts.join(' · ') || '-';
}

function formatTime(timeStr: string) {
  if (!timeStr) return '';
  return new Date(timeStr + 'Z').toLocaleString();
}

async function loadTaskLogs() {
  const id = route.params.id as string;
  try {
    const res = await fetch(`/api/tasks/${id}/logs?limit=100`);
    const data = await res.json();
    taskLogs.value = data.items;
  } catch (e) {}
}

async function loadTask() {
  const id = route.params.id as string;
  try {
    const [taskRes, providersRes] = await Promise.all([
      fetch(`/api/tasks/${id}`),
      fetch('/api/providers'),
    ]);
    if (taskRes.ok) task.value = await taskRes.json();
    const providers = await providersRes.json();
    const map: Record<string, any> = {};
    for (const p of providers) { map[p.id] = p; }
    providerMap.value = map;
    if (task.value?.config) {
      initProviderConfig(task.value.config);
    }
  } catch (e) {}
  taskLoading.value = false;
}

async function loadDownloads(append = false) {
  const id = route.params.id as string;
  try {
    const res = await fetch(`/api/tasks/${id}/downloads?offset=${offset.value}&limit=20`);
    const data = await res.json();
    totalDownloads.value = data.total;
    const items = data.items.map((d: any) => ({ ...d, _open: d.state === 3 || d.state === 0 }));
    if (append) downloads.value.push(...items);
    else downloads.value = items;
  } catch (e) {}
}

function loadMore() {
  offset.value += 20;
  loadDownloads(true);
}

async function clearDownloads() {
  const id = route.params.id as string;
  await fetch(`/api/tasks/${id}/downloads`, { method: 'DELETE' });
  downloads.value = [];
  totalDownloads.value = 0;
}

let eventSource: EventSource | null = null;

function connectSSE() {
  if (eventSource) eventSource.close();
  const id = route.params.id as string;
  eventSource = new EventSource(`/api/events?taskId=${id}`);
  eventSource.addEventListener('task:started', () => { loadTask(); });
  eventSource.addEventListener('task:completed', () => { loadTask(); loadDownloads(); });
  eventSource.addEventListener('task:failed', () => { loadTask(); loadDownloads(); });
  eventSource.addEventListener('task:paused', () => { loadTask(); });
  eventSource.addEventListener('download:added', () => { loadDownloads(); loadTask(); });
  eventSource.addEventListener('download:progress', () => { loadDownloads(); });
  eventSource.addEventListener('task:progress', (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data);
      if (data.taskId === id) {
        task.value._progress = data.processed + '/' + data.total;
      }
    } catch {}
  });
  eventSource.onerror = () => {
    eventSource?.close();
    setTimeout(connectSSE, 3000);
  };
}

onMounted(() => {
  loadTask();
  loadDownloads();
  connectSSE();
});

watch(() => route.params.id, () => {
  offset.value = 0;
  activeTab.value = 'overview';
  loadTask();
  loadDownloads();
  taskLogs.value = [];
  connectSSE();
});

watch(activeTab, (tab) => {
  if (tab === 'logs' && taskLogs.value.length === 0) loadTaskLogs();
  if (tab === 'downloads' && downloads.value.length === 0) loadDownloads();
});

onUnmounted(() => {
  eventSource?.close();
});
</script>

<style>
.detail-overview { display: grid; grid-template-columns: 1fr 2fr; gap: 16px; margin-bottom: 16px; align-items: start; overflow: hidden; }
@media (max-width: 768px) { .detail-overview { grid-template-columns: 1fr; }
  .detail-overview > * { min-width: 0; }
}
.detail-overview-left { display: flex; flex-direction: column; }
.detail-overview-downloads { overflow: hidden; }
.detail-overview-info .config-list { max-height: 400px; overflow-y: auto; }
.config-value-mono { font-family: monospace; font-size: 11px; word-break: break-all; }
.config-value-site { display: flex; align-items: center; gap: 8px; }
.config-site-icon { width: 20px; height: 20px; border-radius: 4px; object-fit: contain; }
.detail-info-top { display: flex; align-items: center; gap: 16px; padding-bottom: 16px; }
.detail-site-icon { width: 64px; height: 64px; border-radius: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.detail-site-icon-img { width: 44px; height: 44px; object-fit: contain; }
.detail-user-info { display: flex; flex-direction: column; gap: 4px; min-width: 0; flex: 1; }
.detail-user-name { font-size: 18px; font-weight: 600; color: #fff; }
.detail-user-id { font-size: 12px; color: #95989e; }
.detail-user-tags { display: flex; gap: 6px; margin-top: 4px; flex-wrap: wrap; }
.detail-tag { font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 500; background: rgba(149,152,158,0.15); color: #95989e; }
.detail-stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; flex: 1; min-width: 200px; }
.detail-stat-item { display: flex; flex-direction: column; gap: 2px; padding: 12px; background: rgba(149,152,158,0.06); border: 1px solid #1e2226; border-radius: 10px; position: relative; }
.detail-stat-label { font-size: 11px; color: #95989e; }
.detail-stat-value { font-size: 14px; font-weight: 600; color: #fff; }
.detail-stat-icon { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: 20px; opacity: 0.5; }
.detail-countdown { font-size: 11px; font-weight: 400; margin-left: 4px; }
.detail-actions { display: flex; gap: 8px; }
.downloads-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.downloads-header h3 { font-size: 14px; font-weight: 500; color: #aaa; }
.download-row { display: flex; align-items: center; gap: 16px; padding: 12px 16px; border-bottom: 1px solid #1e2226; border-radius: 8px; cursor: pointer; transition: background 0.15s; }
.download-row:hover { background: rgba(149,152,158,0.06); }
.download-row:last-child { border-bottom: none; }
.dl-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 16px; color: #95989e; flex-shrink: 0; }
.dl-info { flex: 1; min-width: 0; }
.dl-name { font-size: 13px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dl-meta { font-size: 12px; color: #95989e; margin-top: 2px; }
.dl-status { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.dl-status-top { display: flex; align-items: center; gap: 6px; }
.dl-success { font-size: 12px; color: #4caf50; font-weight: 500; }
.dl-fail { font-size: 12px; color: #f44336; font-weight: 500; }
.dl-downloading { font-size: 12px; color: #ff9800; font-weight: 500; }
.dl-resource { font-size: 11px; color: #95989e; }
.dl-time { font-size: 11px; color: #95989e; }
.empty-downloads { text-align: center; padding: 40px; color: #555; font-size: 13px; }
.load-more { text-align: center; padding: 12px; }

.detail-tabs-card { padding: 0 16px 0; }
.detail-tabs { display: flex; gap: 0; overflow-x: auto; }
.detail-tab { flex: none; width: 100px; padding: 12px 0; border: none; border-bottom: 2px solid transparent; background: transparent; color: #95989e; font-size: 13px; font-weight: 500; cursor: pointer; text-align: center; transition: color 0.15s, border-color 0.15s; }
.detail-tab:hover { color: #fff; }
.detail-tab.active { color: #3b82f6; border-bottom-color: #3b82f6; }

.config-list { display: flex; flex-direction: column; }
.config-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #1e2226; }
.config-item:last-child { border-bottom: none; }
.config-label { font-size: 12px; color: #95989e; }
.config-value { font-size: 13px; color: #fff; }
.config-input { background: transparent; border: none; border-bottom: 1px solid #282828; border-radius: 0; color: #fff; font-size: 13px; padding: 4px 2px; max-width: 200px; width: 100%; text-align: right; outline: none; }
.config-input:focus { border-bottom-color: #3b82f6; }
.config-input[readonly] { color: #666; cursor: default; }
.config-input-wrap { display: inline-flex; align-items: baseline; }
.config-input-unit { font-size: 13px; color: #95989e; margin-left: 2px; white-space: nowrap; }
textarea.config-input { max-width: 200px; width: 100%; resize: vertical; font-family: monospace; text-align: left; }
select.config-input { max-width: 200px; width: 100%; text-align: right; appearance: none; cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23666' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 8px center; padding-right: 28px; }
select.config-input option { background: #0b0d10; color: #fff; }
select.config-input:disabled { color: #666; cursor: default; opacity: 0.7; }
.config-sub { padding-left: 20px; }
.toggle-row { display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 4px 0; }
.toggle-switch { position: relative; width: 36px; height: 20px; background: #2a2d31; border-radius: 10px; transition: background 0.2s; flex-shrink: 0; }
.toggle-switch.on { background: #3175f0; }
.toggle-thumb { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; background: #fff; border-radius: 50%; transition: transform 0.2s; }
.toggle-switch.on .toggle-thumb { transform: translateX(16px); }
.config-actions { display: flex; gap: 8px; margin-top: 16px; padding-top: 16px; border-top: 1px solid #1e2226; }
.confirm-card { background: #14171a; border: 1px solid #16181b; border-radius: 12px; padding: 24px; width: 360px; max-width: 90vw; }
.confirm-text { font-size: 15px; color: #fff; margin-bottom: 16px; text-align: center; }
.confirm-actions { display: flex; gap: 8px; justify-content: flex-end; }

.logs-list { display: flex; flex-direction: column; }
.log-entry { padding: 8px 0; border-bottom: 1px solid #1e2226; font-size: 12px; font-family: monospace; display: flex; gap: 10px; align-items: flex-start; }
.log-entry:last-child { border-bottom: none; }
.log-level-bg-error { color: #f44336; }
.log-level-bg-warn { color: #ff9800; }
.log-level-bg-info { color: #1d9bf0; }
.log-time { opacity: 0.6; min-width: 140px; flex-shrink: 0; }
.log-message { word-break: break-all; }

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
