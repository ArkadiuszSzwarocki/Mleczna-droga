import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['filipinka.myqnapcloud.com', 'mlecznadroga.mycloudnas.com'],
    port: 5178,
    proxy: {
      '/api': {
        target: 'http://filipinka.myqnapcloud.com',
        changeOrigin: true,
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    css: false,
  },
} as any);