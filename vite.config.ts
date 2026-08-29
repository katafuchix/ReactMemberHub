import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// クライアントは 5173、API は 8000。/api を Express にプロキシする。
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
