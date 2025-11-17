/**
 * Vitest global setup file
 */

// Set test environment variables
// Vitest sets NODE_ENV automatically, so we don't need to set it
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing-only';
