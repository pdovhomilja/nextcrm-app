import { test as setup, expect } from "@playwright/test";
import path from "path";
import { Pool } from "pg";

const authFile = path.join(__dirname, "../playwright/.auth/user.json");

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || "test@nextcrm.app";

setup("authenticate", async ({ page }) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // 1. Go to sign-in and request OTP through the UI
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(TEST_USER_EMAIL);
    await page.getByRole("button", { name: /send verification code/i }).click();

    // 2. Wait for the verification record to appear in DB
    //    (email delivery may fail, but the OTP is written to DB first)
    let otp: string | null = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      await new Promise((r) => setTimeout(r, 1000));
      const result = await pool.query(
        `SELECT value FROM verification
         WHERE identifier = $1
         ORDER BY "createdAt" DESC
         LIMIT 1`,
        [TEST_USER_EMAIL]
      );
      if (result.rows.length > 0) {
        otp = result.rows[0].value;
        break;
      }
    }

    expect(otp).not.toBeNull();

    // 3. Wait for OTP input to appear (even if toast shows error about email)
    await page.waitForTimeout(2000);

    // If we're still on the email step (send failed), the UI won't show OTP inputs.
    // In that case, we need to check: did the UI transition to OTP step?
    const hasOtpStep = await page.locator("text=Enter the 6-digit code").isVisible().catch(() => false);

    if (!hasOtpStep) {
      // The OTP send may have errored but the record exists in DB.
      // Use the API directly to verify the OTP and get session cookies.
      const baseURL = page.url().split("/").slice(0, 3).join("/");
      const verifyRes = await fetch(`${baseURL}/api/auth/email-otp/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: TEST_USER_EMAIL, otp }),
      });

      // Extract and set cookies
      const setCookieHeaders = verifyRes.headers.getSetCookie();
      if (setCookieHeaders.length > 0) {
        const cookies = setCookieHeaders
          .filter((c) => c.includes("="))
          .map((cookie) => {
            const parts = cookie.split("; ");
            const [name, ...valueParts] = parts[0]!.split("=");
            const value = valueParts.join("=");
            return {
              name: name!,
              value: value || "",
              domain: "localhost",
              path: "/",
              httpOnly: true,
              secure: false,
              sameSite: "Lax" as const,
            };
          });
        await page.context().addCookies(cookies);
      }
    } else {
      // UI transitioned to OTP step — enter the code through the UI
      // Click the OTP container to focus it, then type the digits
      await page.locator("[data-input-otp]").click();
      await page.keyboard.type(otp!);
      await page.getByRole("button", { name: /verify and sign in/i }).click();
    }

    // 4. Navigate and verify we're authenticated
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

  // Save auth state
  await page.context().storageState({ path: authFile });
});
