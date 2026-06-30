import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    passWithNoTests: true,
    include: [
      'tests/**/*.spec.ts',
      '**/src/**/*.test.ts',
      '**/src/**/*.test.tsx',
      '**/app/**/*.test.ts',
      '**/app/**/*.test.tsx',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/tests/e2e/**',
      '**/.kanbots/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/admin-portal'),
    },
  },
  esbuild: {
    jsx: 'automatic',
  },
});


