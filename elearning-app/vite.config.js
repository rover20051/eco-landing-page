import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Configuramos el base path para que coincida con donde va a vivir la app en producción
  base: process.env.NODE_ENV === 'production' ? '/elearning-app/dist/' : '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  // Pre-bundle Clerk so Rollup doesn't fail on its ESM exports
  optimizeDeps: {
    include: ['@clerk/react'],
  },
})

