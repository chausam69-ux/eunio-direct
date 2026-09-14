import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Served from https://<user>.github.io/eunio-direct/ — base must match repo name.
export default defineConfig({
  base: '/eunio-direct/',
  plugins: [react(), tailwindcss()],
})
