import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false, // Отключить sourcemap для production
  },
  server: {
    host: true,
    allowedHosts: ['.trycloudflare.com'],
  },
})
