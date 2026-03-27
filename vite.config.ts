import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    basicSsl(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true, 
    proxy: {
      // 1. API requests ke liye proxy
      '/api': {
        target: 'http://172.27.16.252:5050',
        changeOrigin: true,
        secure: false, // Backend pe SSL nahi hai, isliye false
      },
      // 2. Socket.io / WebSockets ke liye proxy (Yeh WSS wala error fix karega)
      '/socket.io': {
        target: 'http://172.27.16.252:5050',
        ws: true, // Yeh tag zaroori hai WebSocket enable karne ke liye!
        changeOrigin: true,
      }
    }
  }
})
