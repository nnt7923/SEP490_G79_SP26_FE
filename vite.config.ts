import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic', // ✅ thêm dòng này
    })
  ],
  server: {
    port: 5713,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'https://pplp.click',
        changeOrigin: true,
        secure: false,
      },
      // Thêm proxy cho SignalR Hub (WebSocket)
      '/hubs': {
        target: 'https://pplp.click',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            // Keep a few curated groups for better caching
            if (id.includes('react') || id.includes('react-dom')) return 'vendor-react'
            if (id.includes('@microsoft/signalr')) return 'vendor-signalr'

            // Fallback: split by top-level package name
            const parts = id.split('node_modules/')[1]
            const pkg = parts.startsWith('@')
              ? parts.split('/').slice(0, 2).join('/')
              : parts.split('/')[0]
            const safeName = pkg.replace(/^@/, '').replace(/[\/]/g, '-')
            return `vendor-${safeName}`
          }
        },
      },
    },
  },
})
