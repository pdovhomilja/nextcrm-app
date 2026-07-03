import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env.test") });

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  testIgnore: ["**/units/**", "**/integration/**"],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "on-failure" }]],

  use: {
    baseURL: "http://localhost:3001",
    trace: "on",
    screenshot: "on",
    video: "on",
  },

  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/e2e/.auth/user.json",
      },
      dependencies: ["setup"],
      testMatch: [
        "**/accounts/**/*.spec.ts",
        "**/contacts/**/*.spec.ts",
        "**/leads/**/*.spec.ts",
        "**/opportunities/**/*.spec.ts",
        "**/contracts/**/*.spec.ts",
        "**/products/**/*.spec.ts",
        "**/tasks/**/*.spec.ts",
        "**/targets/**/*.spec.ts",
        "**/target-lists/**/*.spec.ts",
      ],
    },
    // {
    //   name: "firefox",
    //   use: {
    //     ...devices["Desktop Firefox"],
    //     storageState: "tests/e2e/.auth/user.json",
    //   },
    //   dependencies: ["setup"],
    //   testMatch: [
    //     "**/accounts/**/*.spec.ts",
    //     "**/contacts/**/*.spec.ts",
    //     "**/leads/**/*.spec.ts",
    //     "**/opportunities/**/*.spec.ts",
    //     "**/contracts/**/*.spec.ts",
    //     "**/products/**/*.spec.ts",
    //     "**/tasks/**/*.spec.ts",
    //     "**/targets/**/*.spec.ts",
    //     "**/target-lists/**/*.spec.ts",
    //   ],
    // },
    // {
    //   name: "webkit",
    //   use: {
    //     ...devices["Desktop Safari"],
    //     storageState: "tests/e2e/.auth/user.json",
    //   },
    //   dependencies: ["setup"],
    //   testMatch: [
    //     "**/accounts/**/*.spec.ts",
    //     "**/contacts/**/*.spec.ts",
    //     "**/leads/**/*.spec.ts",
    //     "**/opportunities/**/*.spec.ts",
    //     "**/contracts/**/*.spec.ts",
    //     "**/products/**/*.spec.ts",
    //     "**/tasks/**/*.spec.ts",
    //     "**/targets/**/*.spec.ts",
    //     "**/target-lists/**/*.spec.ts",
    //   ],
    // },
  ],
});
