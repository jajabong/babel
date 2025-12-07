import path from 'path'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/setup.ts',
        '**/*.d.ts',
        '**/*.config.*',
        'coverage/',
        '.ado/',
      ],
      thresholds: {
        global: {
          branches: 0,
          functions: 0,
          lines: 0,
          statements: 0,
        },
      },
    },
    include: ['**/*.{test,spec}.{ts,tsx,js,jsx}'],
    exclude: ['node_modules/', 'dist/', 'coverage/'],
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
