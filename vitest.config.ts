import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    passWithNoTests: true,
    include: [
      '**/src/**/*.test.ts',
      '**/src/**/*.test.tsx',
      '**/app/**/*.test.ts',
      '**/app/**/*.test.tsx',
      'tests/**/*.spec.ts',
    ],
  },
});
