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

  // Wait for redirect away from sign-in page to confirm login succeeded.
  // Using a function predicate to exclude sign-in URLs — the previous regex
  // /\/(en|cs|de|uk)/ matched /en/sign-in immediately, saving empty cookies.
  await page.waitForURL(
    (url) => /^\/(en|cs|de|uk)(\/|$)/.test(url.pathname) && !url.pathname.includes("sign-in"),
    { timeout: 15000 }
  );

  // End of authentication steps.
  await page.context().storageState({ path: authFile });
});
