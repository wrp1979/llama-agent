import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    // SECURITY: Only bind to localhost - never expose to network
    host: process.env.VITE_HOST || '127.0.0.1',
    fs: {
      // Allow serving files from config directory
      allow: ['..', 'config'],
    },
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
