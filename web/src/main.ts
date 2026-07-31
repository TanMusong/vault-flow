import { createApp, watch } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import './styles.css';
import { t, currentLocale } from './locales/index';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'overview', component: () => import('./views/HomeView.vue') },
    { path: '/tasks', name: 'tasks', component: () => import('./views/TaskListView.vue') },
    { path: '/detail/:id', name: 'detail', component: () => import('./views/DetailView.vue') },
    { path: '/logs', name: 'logs', component: () => import('./views/LogsView.vue') },
    { path: '/providers', name: 'providers', component: () => import('./views/ProvidersView.vue') },
    { path: '/about', name: 'about', component: () => import('./views/AboutView.vue') },
  ]
});

const app = createApp(App);
app.directive('t', {
  mounted(el, binding) {
    el.textContent = t(binding.value);
    el._localeUnwatch = watch(currentLocale, () => {
      el.textContent = t(binding.value);
    });
  },
  updated(el, binding) {
    el.textContent = t(binding.value);
  },
  unmounted(el) {
    el._localeUnwatch?.();
  }
});
app.use(router).mount('#app');
