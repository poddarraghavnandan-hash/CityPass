// Test setup
import 'dotenv/config';

// Ensure we're running with test environment variables
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set for tests');
}

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY must be set for tests');
}

// Set longer timeout for LLM calls
jest.setTimeout(90000);
