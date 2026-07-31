<template>
  <div class="providers-view">
    <!-- Confirm dialog -->
    <div v-if="showConfirm" class="confirm-overlay" @click.self="showConfirm = false">
      <div class="confirm-dialog">
        <div class="confirm-title">{{ confirmTitle }}</div>
        <div class="confirm-message">{{ confirmMessage }}</div>
        <div v-if="confirmChanges.length > 0" class="confirm-changes">
          <div class="confirm-changes-title">{{ t('provider.changes') }}</div>
          <ul class="confirm-changes-list">
            <li v-for="(change, i) in confirmChanges" :key="i">{{ change }}</li>
          </ul>
        </div>
        <div class="confirm-actions">
          <button class="confirm-btn confirm-btn-cancel" @click="showConfirm = false">{{ t('btn.cancel') }}</button>
          <button v-if="confirmAction" class="confirm-btn confirm-btn-ok" @click="confirmAction">{{ t('btn.confirm') }}</button>
        </div>
      </div>
    </div>

    <!-- Error toast -->
    <div v-if="errorMsg" class="error-toast" @click="errorMsg = ''">
      <i class="fa-solid fa-circle-exclamation"></i>
      <span>{{ errorMsg }}</span>
    </div>

    <div v-if="loading" class="empty-state" v-t="'empty.loading'"></div>
    <div v-else-if="providers.length === 0" class="empty-state" v-t="'empty.no_providers'"></div>
    <div v-else class="provider-list">
      <div v-for="provider in providers" :key="provider.id" class="provider-card">
        <!-- Download progress bar -->
        <div v-if="downloadingId === provider.id" class="download-progress">
          <div class="download-progress-bar">
            <div class="download-progress-fill" :style="{ width: downloadProgress + '%' }"></div>
          </div>
        </div>

        <div class="provider-icon">
          <img :src="provider.icon" class="provider-icon-img">
        </div>
        <div class="provider-info">
          <div class="provider-name-row">
            <span class="provider-name">{{ getLocalizedName(provider.name) }}</span>
            <span v-if="provider.installed" class="provider-version-tag">v{{ provider.version }}</span>
            <span v-if="!provider.installed" class="provider-not-installed">{{ t('provider.not_installed') }}</span>
          </div>
          <div class="provider-description">{{ getLocalizedDescription(provider.description) }}</div>
        </div>
        <div class="provider-actions">
          <button
            v-if="provider.update"
            class="btn-update"
            :disabled="downloadingId === provider.id"
            @click="handleUpdate(provider)"
          >
            {{ t('btn.update') }}
          </button>
          <button
            v-if="!provider.installed && downloadingId !== provider.id"
            class="btn-install"
            @click="handleInstall(provider)"
          >
            {{ t('btn.install') }}
          </button>
          <button
            v-if="provider.installed"
            class="btn-delete"
            :disabled="downloadingId === provider.id"
            @click="handleDelete(provider)"
          >
            {{ t('btn.delete') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { t, getLocale } from '../locales/index';

interface Provider {
  id: string;
  name: string | Record<string, string>;
  description: string | Record<string, string>;
  site: string | Record<string, string>;
  version: string;
  icon: string;
  installed: boolean;
  enabled: boolean;
  update?: {
    currentVersion: string;
    latestVersion: string;
    updateUrl: string;
    changes: string[];
  } | null;
}

const providers = ref<Provider[]>([]);
const loading = ref(true);
const errorMsg = ref('');
const showConfirm = ref(false);
const confirmTitle = ref('');
const confirmMessage = ref('');
const confirmChanges = ref<string[]>([]);
const confirmAction = ref<(() => void) | null>(null);
const downloadingId = ref<string | null>(null);
const downloadProgress = ref(0);

let eventSource: EventSource | null = null;

function getLocalizedValue(value: string | Record<string, string>): string {
  if (typeof value === 'string') return value;
  const locale = getLocale();
  if (value[locale]) return value[locale];
  if (value['en-US']) return value['en-US'];
  return '--';
}

function getLocalizedName(name: string | Record<string, string>): string {
  return getLocalizedValue(name);
}

function getLocalizedDescription(desc: string | Record<string, string>): string {
  return getLocalizedValue(desc);
}

async function fetchProviders() {
  try {
    const res = await fetch('/api/providers');
    if (res.ok) {
      providers.value = await res.json();
    }
  } catch (e) {
    console.error('Failed to load providers:', e);
  } finally {
    loading.value = false;
  }
}

async function handleInstall(provider: Provider) {
  confirmTitle.value = t('provider.confirm_install');
  confirmMessage.value = t('provider.confirm_install_msg', { name: getLocalizedName(provider.name) });
  confirmChanges.value = [];
  confirmAction.value = () => doInstall(provider);
  showConfirm.value = true;
}

async function doInstall(provider: Provider) {
  showConfirm.value = false;
  downloadingId.value = provider.id;
  downloadProgress.value = 0;

  try {
    const res = await fetch(`/api/providers/${provider.id}/install`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Install failed');
    }
    await fetchProviders();
  } catch (e) {
    errorMsg.value = (e as Error).message;
    setTimeout(() => { errorMsg.value = ''; }, 5000);
  } finally {
    downloadingId.value = null;
  }
}

function handleDelete(provider: Provider) {
  const name = getLocalizedName(provider.name);

  confirmTitle.value = t('provider.confirm_delete');
  confirmMessage.value = t('provider.confirm_delete_msg', { name });
  confirmChanges.value = [];
  confirmAction.value = () => doDelete(provider);
  showConfirm.value = true;
}

async function doDelete(provider: Provider) {
  showConfirm.value = false;

  try {
    const res = await fetch(`/api/providers/${provider.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || 'Delete failed');
    }
    await fetchProviders();
  } catch (e) {
    errorMsg.value = (e as Error).message;
    setTimeout(() => { errorMsg.value = ''; }, 5000);
  }
}

function handleUpdate(provider: Provider) {
  const update = provider.update!;
  confirmTitle.value = t('provider.update_confirm', { from: update.currentVersion, to: update.latestVersion });
  confirmMessage.value = update.changes.length > 0 ? '' : '';
  confirmChanges.value = update.changes;
  confirmAction.value = () => doUpdate(provider);
  showConfirm.value = true;
}

async function doUpdate(provider: Provider) {
  showConfirm.value = false;
  downloadingId.value = provider.id;
  downloadProgress.value = 0;

  try {
    const res = await fetch(`/api/providers/${provider.id}/update`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Update failed');
    }
    await fetchProviders();
  } catch (e) {
    errorMsg.value = (e as Error).message;
    setTimeout(() => { errorMsg.value = ''; }, 5000);
  } finally {
    downloadingId.value = null;
  }
}

function connectSSE() {
  eventSource = new EventSource('/api/events');
  eventSource.addEventListener('provider:progress', (e) => {
    const data = JSON.parse(e.data);
    if (data.id === downloadingId.value) {
      downloadProgress.value = data.progress;
    }
  });
  eventSource.onerror = () => {
    eventSource?.close();
    setTimeout(connectSSE, 5000);
  };
}

onMounted(() => {
  fetchProviders();
  connectSSE();
});

onUnmounted(() => {
  eventSource?.close();
});
</script>

<style scoped>
.providers-view {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.confirm-overlay {
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

.confirm-dialog {
  background: #1a1d21;
  border-radius: 12px;
  padding: 24px;
  min-width: 320px;
  max-width: 400px;
}

.confirm-title {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
}

.confirm-message {
  color: #95989e;
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 12px;
}

.confirm-changes {
  margin-bottom: 16px;
}

.confirm-changes-title {
  color: #95989e;
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 8px;
}

.confirm-changes-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 150px;
  overflow-y: auto;
}

.confirm-changes-list li {
  color: #95989e;
  font-size: 13px;
  padding: 4px 0;
  border-bottom: 1px solid #2a2d31;
}

.confirm-changes-list li:last-child {
  border-bottom: none;
}

.confirm-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.confirm-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.confirm-btn-cancel {
  background: #2a2d31;
  color: #95989e;
}

.confirm-btn-cancel:hover {
  background: #3a3d41;
  color: #fff;
}

.confirm-btn-ok {
  background: #7a2020;
  color: #fff;
}

.confirm-btn-ok:hover {
  background: #a52828;
}

.error-toast {
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

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #95989e;
  font-size: 14px;
}

.provider-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.provider-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px;
  background: #14171b;
  border-radius: 12px;
}

.download-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: transparent;
}

.download-progress-bar {
  height: 100%;
  width: 100%;
}

.download-progress-fill {
  height: 100%;
  background: #3175f0;
  transition: width 0.3s ease;
}

.provider-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.provider-icon-img {
  width: 32px;
  height: 32px;
  object-fit: contain;
  border-radius: 8px;
}

.provider-info {
  flex: 1;
  min-width: 0;
}

.provider-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.provider-name {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
}

.provider-version-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  background: #1e2226;
  border-radius: 6px;
  font-size: 11px;
  color: #95989e;
  font-weight: 500;
}

.provider-not-installed {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  background: rgba(255, 193, 7, 0.2);
  border-radius: 6px;
  font-size: 11px;
  color: #ffc107;
  font-weight: 500;
}

.provider-description {
  font-size: 13px;
  color: #95989e;
  line-height: 1.4;
}

.provider-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btn-install {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  background: #1a3a1a;
  color: #4caf50;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.btn-install:hover {
  background: #2a5a2a;
}

.btn-update {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  background: #1a3a6a;
  color: #4d9fff;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.btn-update:hover:not(:disabled) {
  background: #2a5a8a;
}

.btn-delete {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  background: #7a2020;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.btn-delete:hover:not(:disabled) {
  background: #a52828;
  filter: brightness(1.15);
}

.btn-delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
