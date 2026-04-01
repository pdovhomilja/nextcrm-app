import { test as setup, expect } from "@playwright/test";
import path from "path";
import { Pool } from "pg";
import crypto from "crypto";

const authFile = path.join(__dirname, "../playwright/.auth/user.json");

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || "test@nextcrm.app";

setup("authenticate", async ({ page }) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Find the test user
    const userResult = await pool.query(
      `SELECT id FROM "Users" WHERE email = $1`,
      [TEST_USER_EMAIL]
    );
    expect(userResult.rows.length).toBeGreaterThan(0);
    const userId = userResult.rows[0].id;

    // Create a better-auth session directly in the DB
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await pool.query(
      `INSERT INTO session (id, token, "userId", "expiresAt", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [sessionId, sessionToken, userId, expiresAt]
    );

    // Navigate to app and set the session cookie
    await page.goto("/sign-in");

    // Set the better-auth session cookie
    await page.context().addCookies([
      {
        name: "better-auth.session_token",
        value: sessionToken,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);

    // Navigate to a protected page to verify auth works
    await page.goto("/en");

    // Should NOT be redirected to sign-in
    await page.waitForURL(
      (url) =>
        /^\/(en|cs|de|uk)(\/|$)/.test(url.pathname) &&
        !url.pathname.includes("sign-in"),
      { timeout: 15000 }
    );
  } finally {
    await pool.end();
  }

  // Save auth state (cookies)
  await page.context().storageState({ path: authFile });
});
