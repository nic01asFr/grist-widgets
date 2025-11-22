import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/grist-widgets/smart-gis-v2/',
  build: {
    outDir: 'build',
    rollupOptions: {
      output: {
        manualChunks: {
          // Core (always loaded)
          'vendor-react': ['react', 'react-dom'],
          'vendor-map': ['leaflet', 'react-leaflet']
          // Tool chunks will be added when tools are fully implemented
        }
      }
    },
    minify: false,  // Disable for development
    chunkSizeWarningLimit: 500
  },
  server: {
    port: 3000,
    open: true
  }
});
