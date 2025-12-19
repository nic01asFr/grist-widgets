import { defineConfig } from 'vite';

export default defineConfig({
  base: '/grist-widgets/territoire-3d/',
  build: {
    outDir: 'build',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-three': ['three'],
          'vendor-giro3d': ['@giro3d/giro3d'],
          'vendor-ol': ['ol', 'proj4']
        }
      }
    },
    chunkSizeWarningLimit: 2000
  },
  server: {
    port: 3003,
    open: true
  },
  optimizeDeps: {
    include: ['three', '@giro3d/giro3d', 'ol', 'proj4']
  }
});
