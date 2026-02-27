import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
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
})
