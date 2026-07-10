import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy API calls to FastAPI backend during development
    proxy: {
      '/chat': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
      '/visit': 'http://localhost:8000',
      '/stats': 'http://localhost:8000',
      '/analyze': 'http://localhost:8000',
      '/resume': 'http://localhost:8000',
      '/share': 'http://localhost:8000',
    }
  }
})
