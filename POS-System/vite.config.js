import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    // Split heavy third-party libraries into their own cacheable chunks so the
    // main app bundle stays small and vendor code isn't re-downloaded on every
    // app update. exceljs + xlsx are especially large and only needed for
    // export features, so isolating them keeps them out of the critical path.
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'redux-vendor': ['@reduxjs/toolkit', 'react-redux'],
          'excel-vendor': ['exceljs', 'xlsx'],
          'ui-vendor': ['framer-motion', 'lucide-react', 'react-hot-toast'],
        },
      },
    },
  },
})
