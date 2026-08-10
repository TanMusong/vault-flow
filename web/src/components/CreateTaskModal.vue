<template>
  <div class="modal-overlay" :class="{ active: visible }" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h2 v-t="'modal.new_task'"></h2>
        <button class="modal-close" @click="$emit('close')">&times;</button>
      </div>
      <div class="modal-body">
        <div class="create-layout">
          <!-- Provider list (left side) -->
          <div class="provider-list-panel">
            <div class="panel-title" v-t="'modal.select_provider'"></div>
            <div class="provider-list">
              <div v-for="s in sites" :key="s.id" class="provider-item" :class="{ selected: selectedSite && selectedSite.id === s.id }" @click="selectSite(s)">
                <img :src="'/api/providers/' + s.id + '/icon'" class="provider-item-icon">
                <div class="provider-item-name">{{ getLocalizedName(s.name) }}</div>
              </div>
            </div>
          </div>

          <!-- Config panel (right side, expands when provider selected) -->
          <div v-if="selectedSite" class="config-panel">
            <div class="config-scroll">
              <!-- Fixed interval field (server-driven) -->
              <div class="field">
                <label>{{ t('task.interval') }}</label>
                <input type="number" v-model.number="interval" min="60" step="60">
              </div>
              <template v-if="selectedSite.config && selectedSite.config.length > 0">
                <template v-for="item in selectedSite.config" :key="item.key">
                  <!-- text -->
                  <div v-if="item.type === 'text'" class="field">
                    <label>{{ getLocalizedName(item.name) }}</label>
                    <input type="text" v-model="providerConfig[item.key]" :placeholder="item.placeholder ? getLocalizedName(item.placeholder) : ''">
                  </div>
                  <!-- textarea -->
                  <div v-else-if="item.type === 'textarea'" class="field">
                    <label>{{ getLocalizedName(item.name) }}</label>
                    <textarea v-model="providerConfig[item.key]" rows="4" :placeholder="item.placeholder ? getLocalizedName(item.placeholder) : ''"></textarea>
                  </div>
                  <!-- number -->
                  <div v-else-if="item.type === 'number'" class="field">
                    <label>{{ getLocalizedName(item.name) }}</label>
                    <input type="number" v-model.number="providerConfig[item.key]" :placeholder="item.placeholder ? getLocalizedName(item.placeholder) : ''">
                  </div>
                  <!-- select -->
                  <div v-else-if="item.type === 'select'" class="field">
                    <label>{{ getLocalizedName(item.name) }}</label>
                    <select v-model="providerConfig[item.key]">
                      <option v-for="opt in item.values" :key="opt.key" :value="opt.key">{{ getLocalizedName(opt.name) }}</option>
                    </select>
                  </div>
                  <!-- checkbox with on/off sub-items -->
                  <div v-else-if="item.type === 'checkbox'" class="field">
                    <div class="toggle-row" @click="providerConfig[item.key] = !providerConfig[item.key]">
                      <span class="toggle-label">{{ getLocalizedName(item.name) }}</span>
                      <div class="toggle-switch" :class="{ on: providerConfig[item.key] }">
                        <div class="toggle-thumb"></div>
                      </div>
                    </div>
                    <template v-if="item.on && providerConfig[item.key]">
                      <template v-for="subItem in item.on" :key="subItem.key">
                        <div v-if="subItem.type === 'text'" class="field sub-field">
                          <label>{{ getLocalizedName(subItem.name) }}</label>
                          <input type="text" v-model="providerConfig[subItem.key]">
                        </div>
                        <div v-else-if="subItem.type === 'number'" class="field sub-field">
                          <label>{{ getLocalizedName(subItem.name) }}</label>
                          <input type="number" v-model.number="providerConfig[subItem.key]">
                        </div>
                        <div v-else-if="subItem.type === 'textarea'" class="field sub-field">
                          <label>{{ getLocalizedName(subItem.name) }}</label>
                          <textarea v-model="providerConfig[subItem.key]" rows="2"></textarea>
                        </div>
                        <div v-else-if="subItem.type === 'select'" class="field sub-field">
                          <label>{{ getLocalizedName(subItem.name) }}</label>
                          <select v-model="providerConfig[subItem.key]">
                            <option v-for="opt in subItem.values" :key="opt.key" :value="opt.key">{{ getLocalizedName(opt.name) }}</option>
                          </select>
                        </div>
                        <div v-else-if="subItem.type === 'checkbox'" class="field sub-field">
                          <div class="toggle-row" @click="providerConfig[subItem.key] = !providerConfig[subItem.key]">
                            <span class="toggle-label">{{ getLocalizedName(subItem.name) }}</span>
                            <div class="toggle-switch" :class="{ on: providerConfig[subItem.key] }">
                              <div class="toggle-thumb"></div>
                            </div>
                          </div>
                        </div>
                      </template>
                    </template>
                    <template v-if="item.off && !providerConfig[item.key]">
                      <template v-for="subItem in item.off" :key="subItem.key">
                        <div v-if="subItem.type === 'text'" class="field sub-field">
                          <label>{{ getLocalizedName(subItem.name) }}</label>
                          <input type="text" v-model="providerConfig[subItem.key]">
                        </div>
                        <div v-else-if="subItem.type === 'number'" class="field sub-field">
                          <label>{{ getLocalizedName(subItem.name) }}</label>
                          <input type="number" v-model.number="providerConfig[subItem.key]">
                        </div>
                        <div v-else-if="subItem.type === 'textarea'" class="field sub-field">
                          <label>{{ getLocalizedName(subItem.name) }}</label>
                          <textarea v-model="providerConfig[subItem.key]" rows="2"></textarea>
                        </div>
                        <div v-else-if="subItem.type === 'select'" class="field sub-field">
                          <label>{{ getLocalizedName(subItem.name) }}</label>
                          <select v-model="providerConfig[subItem.key]">
                            <option v-for="opt in subItem.values" :key="opt.key" :value="opt.key">{{ getLocalizedName(opt.name) }}</option>
                          </select>
                        </div>
                        <div v-else-if="subItem.type === 'checkbox'" class="field sub-field">
                          <div class="toggle-row" @click="providerConfig[subItem.key] = !providerConfig[subItem.key]">
                            <span class="toggle-label">{{ getLocalizedName(subItem.name) }}</span>
                            <div class="toggle-switch" :class="{ on: providerConfig[subItem.key] }">
                              <div class="toggle-thumb"></div>
                            </div>
                          </div>
                        </div>
                      </template>
                    </template>
                  </div>
                </template>
              </template>
              <div v-else class="no-config">{{ t('modal.no_config') }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <div v-if="errorMsg" class="modal-error">{{ errorMsg }}</div>
        <button class="btn btn-ghost" @click="$emit('close')">{{ t('btn.cancel') }}</button>
        <button class="btn btn-primary" :disabled="!selectedSite || submitting" @click="submit">
          {{ submitting ? t('modal.creating') : t('modal.create') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { t, getLocale } from '../locales/index';

interface ConfigItem {
  key: string;
  name: string | Record<string, string>;
  type: string;
  placeholder?: string | Record<string, string>;
  default?: any;
  values?: { key: string; name: string | Record<string, string> }[];
  on?: ConfigItem[];
  off?: ConfigItem[];
  config?: ConfigItem[];
}

interface Site {
  id: string;
  name: string | Record<string, string>;
  config?: ConfigItem[];
}

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ close: []; created: [] }>();

const sites = ref<Site[]>([]);
const submitting = ref(false);
const selectedSite = ref<Site | null>(null);
const providerConfig = reactive<Record<string, any>>({});
const interval = ref(1800);
const errorMsg = ref('');

function getLocalizedName(name: string | Record<string, string>): string {
  if (typeof name === 'string') return name;
  const locale = getLocale();
  if (name[locale]) return name[locale];
  if (name['zh-CN']) return name['zh-CN'];
  if (name['en-US']) return name['en-US'];
  return Object.values(name)[0] || '';
}

function selectSite(site: Site) {
  selectedSite.value = site;
  errorMsg.value = '';
  Object.keys(providerConfig).forEach(key => delete providerConfig[key]);
  if (site.config) {
    initConfigItems(site.config);
  }
}

function initConfigItems(items: ConfigItem[]) {
  for (const item of items) {
    if (item.default !== undefined) {
      providerConfig[item.key] = item.default;
    } else if (item.type === 'checkbox') {
      providerConfig[item.key] = false;
    } else if (item.type === 'number') {
      providerConfig[item.key] = 0;
    } else {
      providerConfig[item.key] = '';
    }
    if (item.on) initConfigItems(item.on);
    if (item.off) initConfigItems(item.off);
    if (item.config) initConfigItems(item.config);
  }
}

async function submit() {
  if (!selectedSite.value) return;
  submitting.value = true;
  errorMsg.value = '';
  try {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        site: selectedSite.value.id,
        config: {
          interval: interval.value,
          ...providerConfig,
        },
      }),
    });
    if (res.ok) {
      emit('created');
      emit('close');
    } else {
      const data = await res.json();
      errorMsg.value = data.message || 'Failed to create task';
    }
  } catch (e) {
    errorMsg.value = (e as Error).message;
  } finally {
    submitting.value = false;
  }
}

watch(() => props.visible, (v) => {
  if (v) {
    fetch('/api/providers').then(r => r.json()).then(data => {
      sites.value = data.filter((p: any) => p.installed);
    });
    selectedSite.value = null;
    Object.keys(providerConfig).forEach(key => delete providerConfig[key]);
  }
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}
.modal-overlay.active { opacity: 1; pointer-events: auto; }
.modal {
  background: #14171b;
  border-radius: 12px;
  width: 640px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #1e2226;
}
.modal-header h2 { font-size: 16px; font-weight: 600; color: #fff; }
.modal-close { background: none; border: none; color: #666; font-size: 20px; cursor: pointer; }
.modal-close:hover { color: #fff; }
.modal-body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
}
.modal-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid #1e2226;
}
.modal-error {
  flex: 1;
  color: #f44336;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.create-layout {
  display: flex;
  gap: 16px;
  min-height: 300px;
}
.provider-list-panel {
  width: 200px;
  flex-shrink: 0;
  border-right: 1px solid #1e2226;
  padding-right: 16px;
}
.panel-title {
  font-size: 12px;
  color: #95989e;
  margin-bottom: 12px;
  font-weight: 500;
}
.provider-list {
  height: 300px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.provider-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}
.provider-item:hover { background: rgba(255,255,255,0.05); }
.provider-item.selected { background: rgba(49,117,240,0.15); }
.provider-item-icon { width: 24px; height: 24px; border-radius: 4px; }
.provider-item-name { font-size: 13px; color: #fff; }
.config-panel {
  flex: 1;
  overflow-y: auto;
}
.config-scroll {
  max-height: 300px;
  overflow-y: auto;
}
.field { margin-bottom: 12px; }
.field label { display: block; font-size: 12px; color: #95989e; margin-bottom: 4px; }
.field input, .field textarea {
  width: 100%;
  padding: 8px 12px;
  background: #0b0d10;
  border: 1px solid #282828;
  border-radius: 8px;
  color: #fff;
  font-size: 13px;
  outline: none;
}
.field textarea { font-family: monospace; resize: vertical; }
.field input:focus, .field textarea:focus, .field select:focus { border-color: #3175f0; }
.field select {
  width: 100%;
  padding: 8px 12px;
  background: #0b0d10;
  border: 1px solid #282828;
  border-radius: 8px;
  color: #fff;
  font-size: 13px;
  outline: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23666' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 30px;
}
.field select option {
  background: #0b0d10;
  color: #fff;
}
.no-config { color: #666; font-size: 13px; padding: 20px 0; }
.sub-field { padding-left: 12px; }

/* Toggle switch */
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  cursor: pointer;
}
.toggle-label { font-size: 13px; color: #fff; }
.toggle-switch {
  position: relative;
  width: 36px;
  height: 20px;
  background: #2a2d31;
  border-radius: 10px;
  transition: background 0.2s;
  flex-shrink: 0;
}
.toggle-switch.on { background: #3175f0; }
.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
}
.toggle-switch.on .toggle-thumb { transform: translateX(16px); }

.field-group { margin-bottom: 12px; }
.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  cursor: pointer;
  color: #fff;
  font-size: 13px;
}
.group-header i { font-size: 10px; color: #666; transition: transform 0.2s; }
.group-header i.open { transform: rotate(180deg); }
.group-content { padding-left: 12px; }

@media (max-width: 600px) {
  .modal { width: 95vw; max-height: 90vh; }
  .create-layout {
    flex-direction: column;
    gap: 0;
  }
  .provider-list-panel {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #1e2226;
    padding-right: 0;
    padding-bottom: 12px;
  }
  .provider-list {
    height: auto;
    max-height: 40vh;
  }
  .config-panel {
    max-height: 50vh;
  }
}
</style>
