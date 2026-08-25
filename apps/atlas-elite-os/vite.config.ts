import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@hvcg/atlas-design-system': resolve(__dirname, '../../packages/atlas-design-system/src/index.ts'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5180,
    // Entra SPA redirect is registered for :5180 only. Do not silently hop ports.
    strictPort: true,
  },
});
