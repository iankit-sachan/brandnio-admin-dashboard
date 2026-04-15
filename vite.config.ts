import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/recharts')) return 'vendor-recharts'
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) return 'vendor-react'
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'https://jigs.brandnio.com',
        changeOrigin: true,
        secure: false,
      },
      '/media': {
        target: 'https://jigs.brandnio.com',
        changeOrigin: true,
        secure: false,
      },
    },
  }
}))
