/// <reference types="node" />
import type { UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import type { InlineConfig } from 'vitest/node'

// https://vitejs.dev/config/
export default {
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:8081',
        changeOrigin: false,
        secure: false
      },
      '/ws': {
        target: process.env.VITE_WS_PROXY_TARGET || process.env.VITE_API_PROXY_TARGET || 'http://localhost:8081',
        changeOrigin: false,
        secure: false,
        ws: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'src/test/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/**',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
      ],
    },
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './test-results/junit.xml',
    },
  },
} satisfies UserConfig & { test: InlineConfig }

