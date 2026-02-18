import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, "../playwright/.auth/user.json");

// Use environment variables for test credentials
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || "admin@nextcrm.app";
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || "password";

setup("authenticate", async ({ page }) => {
  // Perform authentication steps using environment variables
  await page.goto("/sign-in");
  await page.getByLabel("E-mail").fill(TEST_USER_EMAIL);
  await page.getByLabel("Password").fill(TEST_USER_PASSWORD);
  await page.getByRole("button", { name: "Login" }).click();

  // Wait for the final URL to ensure that the cookies are actually set.
  // The app uses next-intl with locale prefix (e.g., /en)
  await page.waitForURL(/\/(en|cs|de|uk)/);

  // End of authentication steps.
  await page.context().storageState({ path: authFile });
});
