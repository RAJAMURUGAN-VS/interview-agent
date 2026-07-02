import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy API calls to Flask backend
    proxy: {
      '/start-interview': 'http://127.0.0.1:5000',
      '/submit-answer':   'http://127.0.0.1:5000',
      '/get-feedback':    'http://127.0.0.1:5000',
    },
  },
})
