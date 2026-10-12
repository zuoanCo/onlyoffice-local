import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  // Build against the adapter source so the playground reflects edits without
  // a separate library build.
  resolve: {
    alias: {
      '@onlyoffice-local/vanilla': resolve(__dirname, '../../packages/vanilla/src/index.ts'),
      '@onlyoffice-local/core': resolve(__dirname, '../../packages/core/src/index.ts'),
    },
  },
  server: {
    port: 5180,
    host: '127.0.0.1',
    fs: { allow: [resolve(__dirname, '../..')] },
  },
  build: { outDir: 'dist', emptyOutDir: true },
})
