import { defineConfig } from 'vite';

export default defineConfig({
  base: '/grist-widgets/smart-map-3d/',
  build: {
    outDir: 'build',
    target: 'esnext',
    chunkSizeWarningLimit: 3000
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext'
    }
  },
  server: {
    port: 3005,
    open: true
  }
});
