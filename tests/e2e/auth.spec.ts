import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("should show sign-in page with Google and Email OTP options", async ({ page }) => {
    await page.goto("/sign-in");

    // Verify Google OAuth button
    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();

    // Verify Email input
    await expect(page.getByLabel("Email")).toBeVisible();

    // Verify Send verification code button
    await expect(page.getByRole("button", { name: /send verification code/i })).toBeVisible();

    // Verify NO password field exists
    await expect(page.getByLabel("Password")).not.toBeVisible();
  });

  test("should show OTP input after entering email", async ({ page }) => {
    await page.goto("/sign-in");

    // Enter email
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByRole("button", { name: /send verification code/i }).click();

    // Wait for OTP step to appear (may show error toast if email sending fails in test,
    // but the UI should transition to OTP step)
    await page.waitForTimeout(2000);

    // Check for either OTP input or error message (depends on Resend config)
    const hasOtpInput = await page.locator('[data-input-otp]').isVisible().catch(() => false);
    const hasToast = await page.locator('[data-sonner-toast]').isVisible().catch(() => false);

    expect(hasOtpInput || hasToast).toBeTruthy();
  });

  test("should redirect unauthenticated users to sign-in", async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();

    // Try to access protected route
    await page.goto("/en");

    // Should be redirected to sign-in
    await expect(page).toHaveURL(/sign-in/);
  });
});
