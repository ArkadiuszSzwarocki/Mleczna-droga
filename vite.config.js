import react from '@vitejs/plugin-react'

export default {
  plugins: [react()],
  server: {
    allowedHosts: ['filipinka.myqnapcloud.com', 'mlecznadroga.mycloudnas.com'],
    port: 5178,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000/',
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
}
