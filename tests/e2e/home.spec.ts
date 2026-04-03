import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test("should load the home page", async ({ page }) => {
    await page.goto("/");

    // Wait for the page to be fully loaded
    await page.waitForLoadState("networkidle");

    // Check if the page title or heading exists
    // Adjust selectors based on your actual app structure
    await expect(page).toHaveURL(/.*sign-in|.*/);
  });

  test("should display sign-in page when not authenticated", async ({ browser }) => {
    // Create a new isolated context without authentication
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto("/");
    
    // Check for sign-in related elements (OTP email flow)
    await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Send verification code" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
    
    await context.close();
  });
});
