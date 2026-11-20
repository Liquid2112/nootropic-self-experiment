/**
 * Jest runs the pure data-layer and domain logic under ts-jest in a Node
 * environment. The DB access is written against a minimal driver interface
 * (see src/db/driver.ts) so tests inject an in-memory better-sqlite3 driver
 * and never require the native expo-sqlite module or a React Native runtime.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
  },
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
