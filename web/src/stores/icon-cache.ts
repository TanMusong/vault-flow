import { ref } from 'vue';

const iconCache = new Map<string, string>();
const loaded = ref(false);

export function loadIcons() {
  if (loaded.value) return Promise.resolve();
  return fetch('/api/providers')
    .then(r => r.json())
    .then(providers => {
      for (const p of providers) {
        if (p.icon) iconCache.set(p.id, p.icon);
      }
      loaded.value = true;
    })
    .catch(() => {});
}

export function getIcon(id: string): string {
  return iconCache.get(id) || '';
}
