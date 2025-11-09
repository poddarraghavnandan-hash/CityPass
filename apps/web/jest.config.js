module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__', '<rootDir>/tests'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup.ts',
    '<rootDir>/tests/setup.ts',
  ],
};
