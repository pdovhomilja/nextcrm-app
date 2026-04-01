import { test as setup, expect } from "@playwright/test";
import path from "path";
import { Pool } from "pg";

const authFile = path.join(__dirname, "../playwright/.auth/user.json");

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || "admin@nextcrm.app";

setup("authenticate", async ({ page }) => {
  // Navigate to sign-in page
  await page.goto("/sign-in");

  // Enter email address
  await page.getByLabel("Email").fill(TEST_USER_EMAIL);

  // Click send verification code
  await page.getByRole("button", { name: /send verification code/i }).click();

  // Wait for OTP to be sent (verification record created in DB)
  await page.waitForTimeout(2000);

  // Retrieve OTP from the verification table
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const result = await pool.query(
      `SELECT value FROM verification
       WHERE identifier = $1
       ORDER BY "createdAt" DESC
       LIMIT 1`,
      [TEST_USER_EMAIL]
    );

    expect(result.rows.length).toBeGreaterThan(0);
    const otp = result.rows[0].value;

    // Enter OTP digits
    const otpInputs = page.locator('[data-input-otp-slot]');
    for (let i = 0; i < otp.length; i++) {
      await otpInputs.nth(i).click();
      await page.keyboard.type(otp[i]);
    }

    // Click verify button
    await page.getByRole("button", { name: /verify and sign in/i }).click();

    // Wait for redirect away from sign-in page
    await page.waitForURL(
      (url) => /^\/(en|cs|de|uk)(\/|$)/.test(url.pathname) && !url.pathname.includes("sign-in"),
      { timeout: 15000 }
    );
  } finally {
    await pool.end();
  }

  // Save auth state
  await page.context().storageState({ path: authFile });
});
