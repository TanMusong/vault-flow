<template>
  <div class="layout">
    <aside class="sidebar" :class="{ expanded: sidebarExpanded, animate: sidebarAnimate }">
      <div class="sidebar-logo" @click="toggleSidebar">
        <img src="/icon.png" class="sidebar-logo-icon" alt="Vault Flow">
        <span class="sidebar-logo-text"><span style="color:#fff;">Vault</span> <span style="color:#3175f0;">Flow</span></span>
      </div>
      <nav class="sidebar-nav">
        <router-link to="/" class="sidebar-nav-item" :class="{ active: route.path === '/' }">
          <i class="fa-solid fa-house"></i>
          <span v-show="sidebarExpanded" v-t="'nav.overview'"></span>
        </router-link>
        <router-link to="/tasks" class="sidebar-nav-item" :class="{ active: route.path === '/tasks' }">
          <i class="fa-solid fa-list-check"></i>
          <span v-show="sidebarExpanded" v-t="'nav.tasks'"></span>
        </router-link>
        <router-link to="/logs" class="sidebar-nav-item" :class="{ active: route.path === '/logs' }">
          <i class="fa-solid fa-scroll"></i>
          <span v-show="sidebarExpanded" v-t="'nav.logs'"></span>
        </router-link>
        <router-link to="/providers" class="sidebar-nav-item" :class="{ active: route.path === '/providers' }">
          <i class="fa-solid fa-database"></i>
          <span v-show="sidebarExpanded" v-t="'nav.providers'"></span>
        </router-link>
        <router-link to="/about" class="sidebar-nav-item" :class="{ active: route.path === '/about' }">
          <i class="fa-solid fa-circle-info"></i>
          <span v-show="sidebarExpanded" v-t="'nav.about'"></span>
        </router-link>
      </nav>
      <div class="sidebar-spacer"></div>
      <div v-if="sidebarExpanded && sidebarStats" class="sidebar-info">
        <div class="sidebar-info-status">
          <span class="sidebar-info-dot"></span>
          <span v-t="'sidebar.system_running'"></span>
        </div>
        <div class="sidebar-info-uptime">{{ t('unit.uptime') }} {{ formatUptime(now - serverStartTime) }}</div>
        <div class="sidebar-info-divider"></div>
        <div class="sidebar-info-stats">
          <div class="sidebar-info-stat">
            <div class="sidebar-info-stat-value">{{ sidebarStats.taskRunsSuccess }}</div>
            <div class="sidebar-info-stat-label" v-t="'sidebar.tasks_ok'"></div>
          </div>
          <div class="sidebar-info-stat">
            <div class="sidebar-info-stat-value">{{ sidebarStats.taskRunsFailed }}</div>
            <div class="sidebar-info-stat-label" v-t="'sidebar.tasks_fail'"></div>
          </div>
          <div class="sidebar-info-stat">
            <div class="sidebar-info-stat-value">{{ sidebarStats.totalDownloadsSuccess }}</div>
            <div class="sidebar-info-stat-label" v-t="'sidebar.downloads'"></div>
          </div>
        </div>
      </div>
      <div class="sidebar-footer">
        <div class="sidebar-lang" @click.stop>
          <div class="sidebar-btn" @click="showLangMenu = !showLangMenu"><i class="fa-solid fa-globe"></i></div>
          <div v-if="showLangMenu" class="lang-menu">
            <div v-for="loc in locales" :key="loc.code" class="lang-menu-item" :class="{ active: currentLocale === loc.code }" @click="switchLocale(loc.code)">{{ loc.label }}</div>
          </div>
        </div>
        <div class="sidebar-toggle" @click="toggleSidebar">
          <i class="fa-solid fa-angles-left"></i>
        </div>
      </div>
    </aside>
    <main class="main-content">
      <div class="top-bar">
        <div class="top-bar-left">
          <button v-if="route.name === 'detail'" class="btn-back" @click="router.push('/tasks')">
            <i class="fa-solid fa-arrow-left"></i>
          </button>
          <div>
            <h1 class="top-bar-title" v-t="pageTitle"></h1>
            <p class="top-bar-desc" v-t="pageDesc"></p>
          </div>
        </div>
        <button v-if="showNewTaskBtn" class="btn btn-primary" @click="handleNewTask">
          <i class="fa-solid fa-plus"></i>
          <span v-t="'nav.new_task'"></span>
        </button>
        <button v-if="route.name === 'providers'" class="btn btn-primary" @click="triggerProviderInstall">
          <i class="fa-solid fa-plus"></i>
          <span v-t="'nav.add_provider'"></span>
        </button>
        <a v-if="route.name === 'about'" href="https://github.com/TanMusong/vault-flow" target="_blank" class="btn btn-primary">
          <i class="fa-brands fa-github"></i>
          <span v-t="'page.source_code'"></span>
        </a>
        <div v-if="route.name === 'detail' && detailTask" class="detail-top-actions">
          <button class="btn btn-primary" @click="runDetailTask" :disabled="isDetailDownloading">
            <i class="fa-solid fa-play"></i>
            <span v-t="'btn.run_now'"></span>
          </button>
        </div>
      </div>
      <div class="page-container">
        <router-view :key="route.fullPath" />
      </div>
    </main>
    <CreateTaskModal :visible="showCreateModal" @close="showCreateModal = false" @created="showCreateModal = false" />

    <!-- Provider install overlay -->
    <div v-if="providerUploading" class="provider-overlay">
      <div class="provider-dialog">
        <div class="provider-title">{{ t('provider.installing') }}</div>
        <div class="provider-progress-bar indeterminate">
          <div class="provider-progress-fill"></div>
        </div>
      </div>
    </div>
    <div v-if="providerError" class="provider-error-toast" @click="providerError = ''">
      <i class="fa-solid fa-circle-exclamation"></i>
      <span>{{ providerError }}</span>
    </div>
    <div v-if="noProvidersVisible" class="no-providers-toast" @click="noProvidersVisible = false">
      <i class="fa-solid fa-circle-info"></i>
      <span>{{ noProvidersMessage }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { t, setLocale, getLocale } from './locales/index';
import CreateTaskModal from './components/CreateTaskModal.vue';

const route = useRoute();
const router = useRouter();
const showCreateModal = ref(false);
const showLangMenu = ref(false);
const locales = [{ code: 'zh-CN', label: '简体' }, { code: 'zh-TW', label: '繁體' }, { code: 'en-US', label: 'English' }];
const currentLocale = ref(getLocale());
function switchLocale(code: string) {
  currentLocale.value = code;
  setLocale(code);
  fetch('/api/locale', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locale: code }) });
  showLangMenu.value = false;
}

// Provider install
const providerUploading = ref(false);
const providerProgress = ref(0);
const providerError = ref('');
import { loadIcons } from './stores/icon-cache';

function triggerProviderInstall() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.zip';
  input.onchange = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    await installProvider(file);
  };
  input.click();
}

const noProvidersMessage = ref('');
const noProvidersVisible = ref(false);

async function handleNewTask() {
  try {
    const res = await fetch('/api/providers');
    const data = await res.json();
    const installed = data.filter((p: any) => p.installed);
    if (!installed || installed.length === 0) {
      noProvidersMessage.value = t('modal.no_installed_providers');
      noProvidersVisible.value = true;
      setTimeout(() => { noProvidersVisible.value = false; }, 5000);
      return;
    }
    showCreateModal.value = true;
  } catch (_e) {
    showCreateModal.value = true;
  }
}

async function installProvider(file: File) {
  providerUploading.value = true;
  providerProgress.value = 0;
  providerError.value = '';

  const formData = new FormData();
  formData.append('file', file);

  try {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        providerProgress.value = Math.round((e.loaded / e.total) * 100);
      }
    };

    await new Promise<void>((resolve, reject) => {
      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(data.message || 'Installation failed'));
          }
        } catch (_e) {
          reject(new Error('Invalid response from server'));
        }
      };
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.open('POST', '/api/providers/install');
      xhr.send(formData);
    });

    // Refresh providers list by reloading the page component
    router.replace({ path: '/providers', force: true });
  } catch (e) {
    providerError.value = (e as Error).message;
    setTimeout(() => { providerError.value = ''; }, 5000);
  } finally {
    providerUploading.value = false;
  }
}

interface SidebarStats { serverStartTime: number; taskRunsSuccess: number; taskRunsFailed: number; totalDownloadsSuccess: number }
const sidebarStats = ref<SidebarStats | null>(null);
const serverStartTime = ref(Date.now());

watch(() => route.fullPath, () => {
  const el = document.querySelector('.page-container');
  if (el) el.scrollTop = 0;
});

const sidebarExpanded = ref(false);
const sidebarAnimate = ref(false);

function isWideScreen() {
  return window.innerWidth > 768;
}

function toggleSidebar() {
  if (!isWideScreen()) return;
  if (!sidebarAnimate.value) sidebarAnimate.value = true;
  sidebarExpanded.value = !sidebarExpanded.value;
  localStorage.setItem('sidebar_expanded', String(sidebarExpanded.value));
}

let eventSource: EventSource | null = null;
let nowTimer: ReturnType<typeof setInterval>;

function onResize() {
  if (!isWideScreen()) {
    sidebarExpanded.value = false;
  } else {
    sidebarExpanded.value = localStorage.getItem('sidebar_expanded') === 'true';
  }
}

onMounted(async () => {
  if (isWideScreen()) {
    sidebarExpanded.value = localStorage.getItem('sidebar_expanded') === 'true';
  } else {
    sidebarExpanded.value = false;
  }
  window.addEventListener('resize', onResize);
  document.addEventListener('click', () => { showLangMenu.value = false; });
  // Initial fetch
  fetch('/api/locale', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locale: currentLocale.value }) });
  fetchSidebarStats();
  loadIcons();
  // Local countdown timer (1s)
  nowTimer = setInterval(() => { now.value = Date.now(); }, 1000);
  // SSE connection
  connectSSE();
});
onUnmounted(() => {
  clearInterval(nowTimer);
  eventSource?.close();
  window.removeEventListener('resize', onResize);
});

async function fetchSidebarStats() {
  try {
    const res = await fetch('/api/stats/sidebar');
    const data = await res.json();
    sidebarStats.value = data;
    if (data.serverStartTime) serverStartTime.value = data.serverStartTime;
  } catch {}
}

function formatUptime(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const parts = [];
  if (d > 0) parts.push(d + t('unit.days'));
  if (h > 0) parts.push(h + t('unit.hours'));
  if (m > 0) parts.push(m + t('unit.minutes'));
  if (s > 0 || parts.length === 0) parts.push(s + t('unit.seconds'));
  return parts.join(' ');
}

function connectSSE() {
  if (eventSource) eventSource.close();
  eventSource = new EventSource('/api/events');
  // Sidebar stats update on task completion/failure
  eventSource.addEventListener('task:completed', () => { fetchSidebarStats(); if (route.name === 'detail' && detailTask.value) fetchDetailTask(detailTask.value.id); });
  eventSource.addEventListener('task:failed', () => { fetchSidebarStats(); if (route.name === 'detail' && detailTask.value) fetchDetailTask(detailTask.value.id); });
  // Detail page updates
  eventSource.addEventListener('task:started', () => { if (route.name === 'detail' && detailTask.value) fetchDetailTask(detailTask.value.id); });
  eventSource.addEventListener('task:paused', () => { if (route.name === 'detail' && detailTask.value) fetchDetailTask(detailTask.value.id); });
  eventSource.addEventListener('scheduler:updated', () => { if (route.name === 'detail' && detailTask.value) fetchDetailTask(detailTask.value.id); });
  eventSource.onerror = () => {
    eventSource?.close();
    setTimeout(connectSSE, 3000);
  };
}

const pageTitle = computed(() => {
  if (route.name === 'tasks') return 'page.tasks';
  if (route.name === 'logs') return 'page.logs';
  if (route.name === 'settings') return 'page.settings';
  if (route.name === 'providers') return 'page.providers';
  if (route.name === 'about') return 'page.about';
  if (route.name === 'detail') return 'page.detail_title';
  return 'page.overview';
});

const pageDesc = computed(() => {
  if (route.name === 'tasks') return 'page.tasks_desc';
  if (route.name === 'logs') return 'page.logs_desc';
  if (route.name === 'settings') return 'page.settings_desc';
  if (route.name === 'providers') return 'page.providers_desc';
  if (route.name === 'about') return 'page.about_desc';
  if (route.name === 'detail') return 'page.detail_desc';
  return 'page.overview_desc';
});

const showNewTaskBtn = computed(() => {
  return route.name === 'overview' || route.name === 'tasks';
});

// Detail page task data
const detailTask = ref<any>(null);
const now = ref(Date.now());

const isDetailDownloading = computed(() => {
  if (!detailTask.value || detailTask.value.paused) return false;
  return detailTask.value.next_run && new Date(detailTask.value.next_run).getTime() <= now.value;
});

watch(() => route.params.id, (id) => {
  if (route.name === 'detail' && id) {
    fetchDetailTask(id as string);
  } else {
    detailTask.value = null;
  }
}, { immediate: true });

async function fetchDetailTask(id: string) {
  try {
    const res = await fetch(`/api/tasks/${id}`);
    if (res.ok) detailTask.value = await res.json();
  } catch {}
}

async function runDetailTask() {
  if (!detailTask.value) return;
  await fetch(`/api/tasks/${detailTask.value.id}/run`, { method: 'POST' });
  await fetchDetailTask(detailTask.value.id);
}
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #0b0d10;
  color: #e0e0e0;
  overflow: hidden;
  height: 100vh;
}

.layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  width: 64px;
  background: #0f1215;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  z-index: 100;
}
.sidebar.expanded { width: 220px; }
.sidebar.animate { transition: width 0.2s ease; }

.sidebar-logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  font-size: 20px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
}
.sidebar-logo-icon { width: 28px; height: 28px; flex-shrink: 0; margin-right: 10px; transition: margin 0.2s; }
.sidebar.expanded .sidebar-logo-icon { margin-right: 10px; }
.sidebar:not(.expanded) .sidebar-logo-icon { margin-right: 0; }
.sidebar-logo-text { font-size: 18px; font-weight: 700; transition: opacity 0.2s, width 0.2s; overflow: hidden; }
.sidebar.expanded .sidebar-logo-text { opacity: 1; width: auto; }
.sidebar:not(.expanded) .sidebar-logo-text { opacity: 0; width: 0; }

.sidebar-nav {
  flex: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 8px;
}

.sidebar-nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  color: #95989e;
  font-size: 14px;
  transition: all 0.15s;
  white-space: nowrap;
  overflow: hidden;
  text-decoration: none;
}
.sidebar-nav-item i { width: 20px; text-align: center; font-size: 16px; flex-shrink: 0; }
.sidebar-nav-item span { transition: opacity 0.2s; }
.sidebar-nav-item:hover { background: rgba(255,255,255,0.05); }
.sidebar-nav-item.active { background: #0f2f74; color: #fff; }

.sidebar-spacer { flex: 1; }

.sidebar-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-top: 1px solid #1e2226;
}
.sidebar-btn {
  padding: 6px 8px;
  color: #95989e;
  cursor: pointer;
  border-radius: 6px;
  transition: color 0.15s;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sidebar-btn:hover { color: #fff; }
.sidebar-lang { position: relative; }
.lang-menu {
  position: absolute;
  bottom: 100%;
  left: 0;
  background: #1a1d21;
  border: 1px solid #2a2d31;
  border-radius: 8px;
  padding: 4px;
  min-width: 90px;
  z-index: 200;
  margin-bottom: 6px;
  box-shadow: 0 -4px 12px rgba(0,0,0,0.3);
}
.lang-menu-item {
  padding: 6px 12px;
  font-size: 13px;
  color: #95989e;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}
.lang-menu-item:hover { color: #fff; background: rgba(255,255,255,0.05); }
.lang-menu-item.active { color: #fff; background: #0f2f74; }

.sidebar-toggle {
  padding: 6px 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #95989e;
  transition: color 0.15s;
  border-radius: 6px;
}
.sidebar-toggle:hover { color: #fff; }
.sidebar.expanded .sidebar-toggle i { transform: rotate(0deg); }
.sidebar:not(.expanded) .sidebar-toggle i { transform: rotate(180deg); }

.sidebar-info {
  margin: 0 8px 8px;
  background: #14171b;
  border-radius: 10px;
  padding: 12px;
  color: #e0e0e0;
}
.sidebar-info-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
}
.sidebar-info-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4caf50;
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.sidebar-info-uptime {
  font-size: 11px;
  color: #95989e;
  margin-top: 2px;
}
.sidebar-info-divider {
  height: 1px;
  background: #1e2226;
  margin: 10px 0;
}
.sidebar-info-stats {
  display: flex;
  gap: 0;
}
.sidebar-info-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.sidebar-info-stat-value { color: #fff; font-weight: 700; font-size: 16px; }
.sidebar-info-stat-label { color: #95989e; font-size: 10px; }

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.top-bar {
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}
.top-bar-left { display: flex; align-items: center; gap: 12px; }
.btn-back { background: none; border: none; color: #95989e; font-size: 18px; cursor: pointer; padding: 4px 8px; border-radius: 6px; transition: all 0.15s; }
.btn-back:hover { color: #fff; background: rgba(255,255,255,0.05); }
.top-bar-title { font-size: 18px; font-weight: 600; color: #fff; margin-bottom: 2px; }
.top-bar-desc { font-size: 12px; color: #95989e; }

.btn { padding: 8px 16px; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.15s; display: inline-flex; align-items: center; gap: 6px; text-decoration: none; }
.btn:hover { filter: brightness(1.15); }
.btn-primary { background: #0f2f74; color: #fff; }
.btn-primary:disabled { background: #333; color: #666; cursor: not-allowed; }
.btn-ghost { background: transparent; color: #888; border: 1px solid #333; }
.btn-ghost:hover { color: #fff; border-color: #555; }
.btn-sm { padding: 6px 12px; font-size: 12px; }
.btn-danger { background: #f44336; color: #fff; }
.btn-danger:hover { filter: brightness(1.15); }
.btn-gray { background: #333; color: #fff; }
.btn-gray:hover { filter: brightness(1.15); }

.detail-top-actions { display: flex; gap: 8px; }

.page-container {
  flex: 1;
  overflow-y: auto;
  padding: 0 24px 24px;
}

@media (max-width: 768px) {
  .sidebar-footer .sidebar-toggle { display: none; }
  .sidebar-footer { justify-content: center; }
}

/* Provider install overlay */
.provider-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.provider-dialog {
  background: #1a1d21;
  border-radius: 12px;
  padding: 24px;
  min-width: 300px;
  text-align: center;
}
.provider-title {
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 16px;
}
.provider-progress-bar {
  height: 4px;
  background: #2a2d31;
  border-radius: 2px;
  overflow: hidden;
}
.provider-progress-bar.indeterminate .provider-progress-fill {
  width: 40%;
  animation: indeterminate 1.5s ease-in-out infinite;
}
.provider-progress-fill {
  height: 100%;
  background: #3175f0;
  border-radius: 2px;
}
@keyframes indeterminate {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(350%); }
}
.provider-progress-text {
  color: #95989e;
  font-size: 13px;
}
.provider-error-toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #7a2020;
  color: #fff;
  padding: 12px 20px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  cursor: pointer;
  z-index: 1001;
}
.no-providers-toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #2a5a2a;
  color: #fff;
  padding: 12px 20px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  cursor: pointer;
  z-index: 1001;
}
</style>
