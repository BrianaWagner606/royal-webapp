import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom', // <--- THIS is the missing link
    setupFiles: './src/setupTests.js', // We will create this next
  },
})
