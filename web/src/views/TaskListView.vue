<template>
  <div class="card">
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
            <span v-if="isDownloading(task)" class="task-row-progress-count">{{ task._progress && task._progress !== '0/0' ? task._progress : '' }}</span>
          </div>
          <div class="task-row-bar" :class="isDownloading(task) ? 'active' : 'idle'">
            <div v-if="isDownloading(task)" class="task-row-bar-fill" style="width:0%;"></div>
          </div>
        </div>
        <div class="task-row-buttons">
          <span v-if="task.last_state !== 2" class="task-row-last-result success"><i class="fa-solid fa-check"></i> <span v-t="'status.normal'"></span></span>
          <span v-else class="task-row-last-result error"><i class="fa-solid fa-xmark"></i> <span v-t="'status.error'"></span></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { t, getLocale } from '../locales/index';

const router = useRouter();
const tasks = ref<any[]>([]);
const tasksLoading = ref(true);
const now = ref(Date.now());
const siteNames = ref<Record<string, string | Record<string, string>>>({});

function isDownloading(task: any) { return task.next_run && new Date(task.next_run).getTime() <= now.value && !task.paused; }
function getSiteName(site: string): string {
  const name = siteNames.value[site];
  if (!name) return site;
  if (typeof name === 'string') return name;
  const locale = getLocale();
  if (name[locale]) return name[locale];
  if (name['en-US']) return name['en-US'];
  return Object.values(name)[0] || site;
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
function countdownText(task: any) {
  if (isDownloading(task) || task.paused) return '';
  if (!task.next_run) return '';
  const diff = new Date(task.next_run).getTime() - now.value;
  if (diff <= 0) return t('status.downloading');
  return formatCountdown(diff);
}

let countdownTimer: ReturnType<typeof setInterval>;
let eventSource: EventSource | null = null;

async function refresh() {
  try {
    const [tasksRes, providersRes] = await Promise.all([
      fetch('/api/tasks/all'),
      fetch('/api/providers'),
    ]);
    const oldProgress: Record<string, string> = {};
    for (const t of tasks.value) { if (t._progress) oldProgress[t.id] = t._progress; }
    tasks.value = await tasksRes.json();
    for (const t of tasks.value) { if (oldProgress[t.id]) t._progress = oldProgress[t.id]; }
    const providers = await providersRes.json();
    const map: Record<string, string | Record<string, string>> = {};
    for (const p of providers) { map[p.id] = p.site; }
    siteNames.value = map;
  } catch (e) {}
  tasksLoading.value = false;
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
      const task = tasks.value.find((t: any) => t.id === data.taskId);
      if (task) {
        task._progress = data.processed + '/' + data.total;
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
