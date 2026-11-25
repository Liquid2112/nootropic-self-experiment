/**
 * Two Jest projects run side by side:
 *
 *  - "data"  : the pure data-layer / domain logic (src/**\/*.test.ts). Runs
 *    under ts-jest in a Node environment with an in-memory better-sqlite3
 *    driver, so it never loads the native expo-sqlite module or a React
 *    Native runtime.
 *
 *  - "ui"    : the design-system render tests (src/ui/**\/*.test.tsx). Also
 *    runs under ts-jest, rendering components with react-test-renderer. The
 *    React Native primitives are mocked to lightweight host components (see
 *    __mocks__/react-native.tsx) so the tests need no metro/babel transform
 *    chain and stay fast and deterministic.
 *
 * Both projects share the `@/` path alias.
 */
const base = {
  preset: 'ts-jest',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

module.exports = {
  projects: [
    {
      ...base,
      displayName: 'data',
      testEnvironment: 'node',
      transform: {
        '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
      },
      roots: ['<rootDir>/src'],
      testMatch: ['**/__tests__/**/*.test.ts'],
    },
    {
      ...base,
      displayName: 'ui',
      testEnvironment: 'node',
      transform: {
        '^.+\\.tsx?$': [
          'ts-jest',
          {
            tsconfig: 'tsconfig.jest.tsx.json',
            // Transpile only. Type-safety for the UI code is enforced by the
            // project-wide `npm run typecheck` (the Expo tsconfig, which knows
            // how to resolve the react-native types export); ts-jest here just
            // needs to turn TSX into runnable JS against the module mocks.
            isolatedModules: true,
          },
        ],
      },
      roots: ['<rootDir>/src/ui'],
      testMatch: ['**/__tests__/**/*.test.tsx'],
      setupFiles: ['<rootDir>/__mocks__/jest.setup.ui.js'],
      moduleNameMapper: {
        ...base.moduleNameMapper,
        '^react-native$': '<rootDir>/__mocks__/react-native.tsx',
        '^react-native-svg$': '<rootDir>/__mocks__/react-native-svg.tsx',
        '^react-native-safe-area-context$':
          '<rootDir>/__mocks__/react-native-safe-area-context.tsx',
      },
    },
  ],
};
