import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    watch: {
      awaitWriteFinish: { stabilityThreshold: 250, pollInterval: 50 },
    },
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:3000',
        xfwd: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        app: fileURLToPath(new URL('./index.html', import.meta.url)),
        panduan: fileURLToPath(new URL('./Panduan/panduan.html', import.meta.url)),
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('katex')) {
              return 'vendor-katex';
            }
            if (id.includes('highlight.js')) {
              return 'vendor-highlight';
            }
            if (id.includes('oidc-client-ts')) {
              return 'vendor-oidc';
            }
          }
        },
      },
    },
  },
});
