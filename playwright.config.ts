import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
dotenv.config({ path: path.resolve(__dirname, ".env") });
dotenv.config({ path: path.resolve(__dirname, ".env.local"), override: true });

// [fork] Target AI outreach E2E (tests/e2e/target-ai-email.spec.ts): the Anthropic
// and Resend calls happen SERVER-side (server actions), so browser-level
// `page.route` can't intercept them. Point both SDK base URLs at the mock server the
// spec starts, so generation is deterministic and no real email can ever leave. Set
// here (before `webServer` spawns `pnpm dev`) so the dev server inherits them. Kill
// any already-running dev server first: `reuseExistingServer` keeps its old env.
const E2E_MOCK_PORT = process.env.E2E_MOCK_PORT ?? "4010";
process.env.E2E_MOCK_PORT = E2E_MOCK_PORT;
process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${E2E_MOCK_PORT}`;
process.env.RESEND_BASE_URL = `http://127.0.0.1:${E2E_MOCK_PORT}`;
process.env.ANTHROPIC_API_KEY ??= "sk-ant-e2e-mock";
process.env.RESEND_FROM_EMAIL ??= "e2e@example.com";

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./tests",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only. One retry (not two): the suite is not flaky — ~116 tests
   * pass in ~8.5min with no retries used — so a 2nd serial retry is mostly dead
   * weight and a wall-clock multiplier if a real flake ever appears. */
  retries: process.env.CI ? 1 : 0,
  /* Opt out of parallel tests on CI (shared DB/seed state is not isolated for
   * parallel workers). */
  workers: process.env.CI ? 1 : undefined,
  /* Cap the whole suite on CI well under the e2e job's 30min GitHub cap, so a
   * genuine hang fails fast (red + re-run) instead of silently burning toward
   * the cap. Healthy runs are ~8.5min, so 15min is generous headroom. Guards
   * the test phase only — not the browser/deps install steps before it. */
  globalTimeout: process.env.CI ? 15 * 60 * 1000 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: "http://localhost:3000",

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
    
    /* Capture screenshot on failure */
    screenshot: "only-on-failure",
    
    /* Record video on failure */
    video: "retain-on-failure",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
      dependencies: ["setup"],
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      dependencies: ["setup"],
    },

    /* Test against mobile viewports. */
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
      dependencies: ["setup"],
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
      dependencies: ["setup"],
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
