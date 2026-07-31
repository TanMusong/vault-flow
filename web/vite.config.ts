import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    host: process.env.WEB_HOST || '0.0.0.0',
    port: parseInt(process.env.WEB_PORT || '', 10) || 5000,
    proxy: {
      '/api': {
        target: process.env.SERVER_URL || 'http://127.0.0.1:3000',
        changeOrigin: true,
        // Disable proxy timeout for SSE connections
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.error('[vite proxy error]', err.message);
          });
        }
      }
    }
  }
});
