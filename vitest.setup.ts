import { beforeAll, afterAll } from 'vitest';

// Global test setup
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.USE_EMBEDDING_CACHE = 'false'; // Disable cache during tests
  process.env.USE_EXTRACTION_CACHE = 'false';

  console.log('🧪 Test environment initialized');
});

afterAll(() => {
  console.log('✅ Test suite completed');
});
