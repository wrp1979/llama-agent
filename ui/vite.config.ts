import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    proxy: {
      '/v1': {
        target: 'http://llama:8081',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://llama:8081',
        changeOrigin: true,
      },
    },
  },
});
