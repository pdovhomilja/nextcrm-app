import { test as setup, expect } from "@playwright/test";
import path from "path";
import { Pool } from "pg";

const authFile = path.join(__dirname, "../playwright/.auth/user.json");
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || "test@nextcrm.app";

setup("authenticate", async ({ page, context }) => {
  // Use context.request so cookies are shared with the browser page
  const api = context.request;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // 1. Clean up old test OTP records
    await pool.query(
      `DELETE FROM verification WHERE identifier = $1`,
      [`test-otp-${TEST_USER_EMAIL}`]
    );

    // 2. Send OTP
    const sendRes = await api.post("/api/auth/email-otp/send-verification-otp", {
      data: { email: TEST_USER_EMAIL, type: "sign-in" },
    });
    expect(sendRes.ok()).toBeTruthy();

    // 3. Retrieve captured OTP from testUtils plugin
    let otp: string | null = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      const otpRes = await api.get(`/api/auth/test-otp?email=${encodeURIComponent(TEST_USER_EMAIL)}`);
      if (otpRes.ok()) {
        const data = await otpRes.json();
        otp = data.otp;
        break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    expect(otp).not.toBeNull();

    // 4. Sign in with OTP — cookies shared with browser context via context.request
    const signInRes = await api.post("/api/auth/sign-in/email-otp", {
      data: { email: TEST_USER_EMAIL, otp },
    });
    expect(signInRes.ok()).toBeTruthy();

    // 5. Navigate to protected page
    await page.goto("/en");
    await page.waitForURL(
      (url) =>
        /^\/(en|cs|de|uk)(\/|$)/.test(url.pathname) &&
        !url.pathname.includes("sign-in"),
      { timeout: 15000 }
    );
  } finally {
    await pool.end();
  }

  await context.storageState({ path: authFile });
});
