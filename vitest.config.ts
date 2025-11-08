import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/test/**',
      ],
    },
    testTimeout: 30000, // 30 seconds for LLM tests
  },
  resolve: {
    alias: {
      '@citypass/llm': path.resolve(__dirname, './packages/llm/src'),
      '@citypass/db': path.resolve(__dirname, './packages/db'),
      '@citypass/search': path.resolve(__dirname, './packages/search/src'),
      '@citypass/types': path.resolve(__dirname, './packages/types/src'),
      '@citypass/utils': path.resolve(__dirname, './packages/utils/src'),
    },
  },
});
