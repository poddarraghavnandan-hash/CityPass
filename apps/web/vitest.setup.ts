/**
 * Vitest global setup file
 */

// Set test environment variables
// NODE_ENV is read-only, so we use Object.defineProperty
Object.defineProperty(process.env, 'NODE_ENV', {
  value: 'test',
  writable: true,
});
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing-only';
