import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: [
        'src/**/*.{ts,tsx}',
        '../packages/*/src/**/*.{ts,tsx}',
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.spec.ts',
        'src/**/*.test.ts',
        '**/__tests__/**',
        '**/node_modules/**',
        '**/dist/**',
      ],
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 70,
        lines: 70,
      },
    },
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@citypass/agent': path.resolve(__dirname, '../../packages/agent/src'),
      '@citypass/analytics': path.resolve(__dirname, '../../packages/analytics/src'),
      '@citypass/cag': path.resolve(__dirname, '../../packages/cag/src'),
      '@citypass/db': path.resolve(__dirname, '../../packages/db/src'),
      '@citypass/llm': path.resolve(__dirname, '../../packages/llm/src'),
      '@citypass/rag': path.resolve(__dirname, '../../packages/rag/src'),
      '@citypass/search': path.resolve(__dirname, '../../packages/search/src'),
      '@citypass/social': path.resolve(__dirname, '../../packages/social/src'),
      '@citypass/types': path.resolve(__dirname, '../../packages/types/src'),
      '@citypass/utils': path.resolve(__dirname, '../../packages/utils/src'),
    },
  },
});
