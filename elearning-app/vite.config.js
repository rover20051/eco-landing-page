import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  // Pre-bundle Clerk so Rollup doesn't fail on its ESM exports
  optimizeDeps: {
    include: ['@clerk/react'],
  },
})

