/**
 * UAT Test Suite Setup
 * Initializes environment and global test utilities
 */

import { config } from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.resolve(__dirname, '../../.env.local');
config({ path: envPath });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.AWMS_TEST_URL = process.env.AWMS_TEST_URL || 'http://localhost:3000';

// Global test configuration
global.TEST_TIMEOUT = 60000; // 60 seconds for browser automation

// Setup Jest timeout
jest.setTimeout(60000);

// Suppress console noise during tests (optional)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Not implemented: HTMLFormElement.prototype.submit')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});

export {};
