<template>
  <div class="logs-view">
    <div class="card" style="display:flex;flex-direction:column;height:100%;overflow:hidden;">
      <div class="logs-toolbar">
      <button :class="['btn', 'btn-ghost', 'btn-sm', 'logs-filter', { active: filter === 'all' }]" @click="filter = 'all'; loadLogs()">All</button>
      <button :class="['btn', 'btn-ghost', 'btn-sm', 'logs-filter', 'filter-error', { active: filter === 'error' }]" @click="filter = 'error'; loadLogs()">Error</button>
      <button :class="['btn', 'btn-ghost', 'btn-sm', 'logs-filter', 'filter-warn', { active: filter === 'warn' }]" @click="filter = 'warn'; loadLogs()">Warn</button>
      <button :class="['btn', 'btn-ghost', 'btn-sm', 'logs-filter', 'filter-info', { active: filter === 'info' }]" @click="filter = 'info'; loadLogs()">Info</button>
      <div style="flex:1"></div>
      <button class="btn btn-ghost btn-sm" @click="clearLogs" style="color:#f44"><i class="fa-solid fa-trash"></i></button>
    </div>
    <div class="logs-list">
      <div v-for="log in logs" :key="log.id" class="log-entry" :class="'log-level-bg-' + log.level">
        <span class="log-time">{{ formatTime(log.time) }}</span>
        <span class="log-message"><span v-if="log.taskName" class="log-task-prefix">[{{ log.taskName }}]</span>{{ log.message }}</span>
      </div>
      <div v-if="logsLoading" class="empty-downloads" v-t="'empty.loading'"></div>
      <div v-else-if="logs.length === 0" class="empty-downloads" v-t="'empty.no_logs'"></div>
      <div v-if="hasMore" class="load-more">
        <button class="btn btn-ghost btn-sm" @click="loadMore">Load More</button>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const logs = ref<any[]>([]);
const logsLoading = ref(true);
const totalLogs = ref(0);
const offset = ref(0);
const filter = ref('all');
const hasMore = ref(false);

function formatTime(timeStr: string) {
  if (!timeStr) return '';
  return new Date(timeStr + 'Z').toLocaleString();
}

async function loadLogs(append = false) {
  try {
    const params = new URLSearchParams({ limit: '50', offset: String(offset.value) });
    if (filter.value !== 'all') params.set('level', filter.value);
    const res = await fetch(`/api/logs?${params}`);
    const data = await res.json();
    totalLogs.value = data.total;
    if (append) logs.value.push(...data.items);
    else logs.value = data.items;
    hasMore.value = logs.value.length < totalLogs.value;
  } catch (e) {}
  logsLoading.value = false;
}

function loadMore() {
  offset.value += 50;
  loadLogs(true);
}

async function clearLogs() {
  await fetch('/api/logs', { method: 'DELETE' });
  logs.value = [];
  totalLogs.value = 0;
}

let timer: ReturnType<typeof setInterval>;
onMounted(() => {
  loadLogs();
  timer = setInterval(() => { offset.value = 0; loadLogs(); }, 5000);
});
onUnmounted(() => clearInterval(timer));
</script>

<style>
.logs-view { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
.logs-toolbar { display: flex; gap: 8px; padding: 8px 16px; border-bottom: 1px solid #222; flex-shrink: 0; align-items: center; }
.logs-filter { font-size: 12px; padding: 4px 12px; border-radius: 6px; line-height: 1.4; }
.logs-filter.active { background: #ffffff15; color: #fff !important; border-color: #ffffff33; }
.logs-filter.filter-error.active { background: #f4433622; color: #f44336 !important; border-color: #f4433644; }
.logs-filter.filter-warn.active { background: #ff980022; color: #ff9800 !important; border-color: #ff980044; }
.logs-filter.filter-info.active { background: #1d9bf022; color: #1d9bf0 !important; border-color: #1d9bf044; }
.logs-list { flex: 1; overflow-y: auto; padding: 0; }
.log-entry { padding: 8px 16px; border-bottom: 1px solid #1a1a1a; font-size: 12px; font-family: monospace; display: flex; gap: 12px; align-items: flex-start; }
.log-level-bg-error { color: #f44336; }
.log-level-bg-warn { color: #ff9800; }
.log-level-bg-info { color: #1d9bf0; }
.log-time { opacity: 0.6; min-width: 140px; flex-shrink: 0; }
.log-task-prefix { opacity: 0.8; margin-right: 6px; }
.log-message { word-break: break-all; }
.empty-downloads { text-align: center; padding: 40px; color: #555; font-size: 13px; }
.load-more { text-align: center; padding: 12px; }
</style>
