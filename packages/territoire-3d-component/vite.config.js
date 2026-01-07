import { defineConfig } from 'vite';

export default defineConfig({
  base: '/grist-widgets/territoire-3d-component/',
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
    port: 3004,
    open: true
  }
});
