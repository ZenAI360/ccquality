import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command }) => ({
  // Dev server always uses '/' — GitHub Pages build uses /ccquality/
  base: command === 'serve' ? '/' : (process.env['VITE_BASE_PATH'] ?? '/ccquality/'),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  worker: {
    format: 'es',
  },
}))
