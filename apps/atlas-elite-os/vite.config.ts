import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@hvcg/atlas-design-system': resolve(__dirname, '../../packages/atlas-design-system/src/index.ts'),
      '@hvcg/atlas-plaid-contracts': resolve(__dirname, '../../packages/atlas-plaid-contracts/src/index.ts'),
      '@hvcg/atlas-qbo-contracts': resolve(__dirname, '../../packages/atlas-qbo-contracts/src/index.ts'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5180,
  },
});
