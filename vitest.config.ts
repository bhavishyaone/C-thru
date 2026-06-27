import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['./src/lib/__tests__/setup.ts'],
    testTimeout: 15000,
    env: {
      DATABASE_URL: 'postgres://cthru:cthru@localhost:5433/cthru_test',
    },
  },
})
