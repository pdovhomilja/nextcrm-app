/**
 * Jest Configuration for Unit and Integration Tests
 */

module.exports = {
  displayName: 'Unit Tests',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '!**/__tests__/uat/**/*.ts'],
  roots: ['<rootDir>/__tests__'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  testTimeout: 10000,
  maxWorkers: '50%',
  collectCoverage: false,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  globals: {
    'ts-jest': {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    },
  },
};
