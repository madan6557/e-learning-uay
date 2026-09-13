import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
export default defineConfig({ root: fileURLToPath(new URL('.', import.meta.url)), plugins: [react()], server: { host: '127.0.0.1', port: 5173, strictPort: true, watch: { awaitWriteFinish: { stabilityThreshold: 250, pollInterval: 50 } }, proxy: { '/api': process.env.API_PROXY_TARGET??'http://127.0.0.1:3000' } }, build: { outDir: 'dist', chunkSizeWarningLimit: 1100 } });
