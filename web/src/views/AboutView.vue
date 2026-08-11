<template>
  <div class="about-wrap">
    <img src="/icon.png" style="width:64px;" alt="Vault Flow">
    <h1>Vault Flow</h1>
    <p class="about-p" v-t="'about.tagline'"></p>
    <p class="about-meta">
      v{{ version }}
      <span v-if="hasUpdate" class="about-new-version">({{ t('about.new_version', { version: latestVersion }) }})</span>
    </p>
    <hr class="about-divider">
    <div style="max-width:600px;width:100%;text-align:left;">
      <h2 v-t="'about.tutorial'"></h2>
      <ol class="about-list">
        <li v-t="'about.step1'"></li>
        <li v-t="'about.step2'"></li>
        <li v-html="t('about.step3')"></li>
        <li v-t="'about.step4'"></li>
        <li v-t="'about.step5'"></li>
      </ol>
    </div>
    <hr class="about-divider">
    <p class="about-p" v-t="'about.donate'"></p>
    <div style="display:flex;gap:12px;justify-content:center;margin-top:8px;">
      <a href="https://www.afdian.com/a/tanmusong" target="_blank"><img src="/afdian.png" height="40"></a>
      <a href="https://ko-fi.com/tanmusong" target="_blank"><img src="/ko-fi.png" height="40"></a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { t } from '../locales/index';

const version = ref('0.0.0');
const latestVersion = ref('');
const hasUpdate = computed(() => !!latestVersion.value);

onMounted(async () => {
  try {
    const res = await fetch('/api/version');
    const data = await res.json();
    if (data.local) version.value = data.local;
    if (data.hasUpdate && data.latest) latestVersion.value = data.latest;
  } catch (e) {}
});
</script>

<style>
.about-wrap { display:flex; flex-direction:column; align-items:center; justify-content:flex-start; width:100%; max-width:1000px; margin:0 auto; padding:24px; gap:16px; text-align:center; }
.about-wrap h1 { font-size:20px; font-weight:600; margin:0; }
.about-wrap h2 { font-size:15px; font-weight:600; margin:8px 0 4px; text-align:left; width:100%; }
.about-meta { font-size:12px; color:#666; }
.about-new-version { color:#f44336; font-weight:500; }
.about-p { font-size:13px; color:#999; line-height:1.6; margin:0; }
.about-link { font-size:13px; color:#1d9bf0; text-decoration:none; display:inline-flex; align-items:center; gap:6px; transition:color 0.15s; }
.about-link:hover { color:#4db8ff; }
.about-list { margin:0; padding-left:20px; font-size:13px; color:#999; line-height:1.8; text-align:left; width:100%; }
.about-list li { margin-bottom:2px; }
.about-list a { color:#1d9bf0; text-decoration:none; }
.about-list a:hover { text-decoration:underline; }
.about-list kbd { background:#282828; padding:1px 5px; border-radius:3px; font-size:11px; color:#ccc; font-family:inherit; }
.about-hint { font-size:11px; color:#555; }
.about-divider { width:100%; border:none; border-top:1px solid #282828; margin:4px 0; }
</style>
