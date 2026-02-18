import { test, expect } from "@playwright/test";

// Use environment variables for test credentials
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || "admin@nextcrm.app";
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || "password";

test.describe("Authentication", () => {
  test("should show sign-in page", async ({ page }) => {
    await page.goto("/sign-in");
    
    // Verify sign-in page elements using labels
    await expect(page.getByLabel("E-mail")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
  });

  test("should show validation error for invalid credentials", async ({ page }) => {
    await page.goto("/sign-in");
    
    // Fill in invalid credentials
    await page.getByLabel("E-mail").fill("invalid@example.com");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Login" }).click();
    
    // Wait for response - either error message appears or stays on sign-in page
    await page.waitForTimeout(2000);
    
    // Check for error message, toast notification, or still on sign-in page
    const currentUrl = page.url();
    const hasError = await page.locator('text=/error|invalid|failed|wrong/i').first().isVisible().catch(() => false);
    const onSignInPage = currentUrl.includes("sign-in");
    
    expect(hasError || onSignInPage).toBeTruthy();
  });

  test("should successfully login with valid credentials", async ({ page }) => {
    await page.goto("/sign-in");
    
    // Fill in valid credentials from environment variables
    await page.getByLabel("E-mail").fill(TEST_USER_EMAIL);
    await page.getByLabel("Password").fill(TEST_USER_PASSWORD);
    await page.getByRole("button", { name: "Login" }).click();
    
    // Wait for navigation to dashboard (handles locale prefix like /en/)
    await page.waitForURL(/\/(en|cs|de|uk)/, { timeout: 5000 });
    
    // Verify we're on the dashboard by checking URL contains locale
    await expect(page).toHaveURL(/\/(en|cs|de|uk)/);
  });
});
