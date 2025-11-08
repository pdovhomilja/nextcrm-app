/**
 * Jest Configuration for UAT Tests
 * Specialized test runner for User Acceptance Testing
 */

module.exports = {
  displayName: 'UAT',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/uat/**/*.ts'],
  roots: ['<rootDir>/__tests__/uat'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  testTimeout: 60000, // Extended timeout for browser automation
  maxWorkers: 1, // Run sequentially to avoid race conditions
  collectCoverage: true,
  collectCoverageFrom: [
    'lib/**/*.ts',
    '!lib/**/*.d.ts',
    '!lib/**/*.test.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/__tests__/uat/setup.ts'],
  globals: {
    'ts-jest': {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    },
  },
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './test-results',
        outputName: 'uat-results.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathAsClassName: true,
      },
    ],
    [
      'jest-html-reporters',
      {
        publicPath: './test-results',
        filename: 'uat-report.html',
        pageTitle: 'AWMS UAT Test Report',
        expand: true,
        openReport: false,
      },
    ],
  ],
};
