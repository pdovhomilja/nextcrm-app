import { test, expect, type Page } from "@playwright/test";

test.use({ storageState: "playwright/.auth/user.json" });

test.describe("Reports Module", () => {
  test("dashboard page loads", async ({ page }) => {
    await page.goto("/en/reports");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await expect(page).toHaveURL(/reports/);
    await expect(
      page.getByRole("heading", { name: "Reports" })
    ).toBeVisible({ timeout: 10000 });

    // Verify at least one KPI card is rendered
    const kpiCards = page.locator('[class*="tremor"]').filter({ hasText: /\d/ });
    await expect(kpiCards.first()).toBeVisible({ timeout: 10000 });
  });

  test("dashboard KPI cards are clickable", async ({ page }) => {
    await page.goto("/en/reports");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // KPI cards are wrapped in links
    const kpiLink = page.locator("a[href*='/reports/']").first();
    await expect(kpiLink).toBeVisible({ timeout: 10000 });
    await kpiLink.click();
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Should navigate to a sub-page
    await expect(page).toHaveURL(/\/en\/reports\//);
  });

  test("sales report page loads", async ({ page }) => {
    await page.goto("/en/reports/sales");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await expect(page).toHaveURL(/reports\/sales/);
    await expect(
      page.getByRole("heading", { name: "Sales Reports" })
    ).toBeVisible({ timeout: 10000 });

    // Verify at least one chart card is rendered
    const cards = page.locator('[class*="tremor"]');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
  });

  test("leads report page loads", async ({ page }) => {
    await page.goto("/en/reports/leads");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await expect(page).toHaveURL(/reports\/leads/);
    await expect(
      page.getByRole("heading", { name: "Leads & Contacts Reports" })
    ).toBeVisible({ timeout: 10000 });
  });

  test("accounts report page loads", async ({ page }) => {
    await page.goto("/en/reports/accounts");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await expect(page).toHaveURL(/reports\/accounts/);
    await expect(
      page.getByRole("heading", { name: "Accounts Reports" })
    ).toBeVisible({ timeout: 10000 });
  });

  test("activity report page loads", async ({ page }) => {
    await page.goto("/en/reports/activity");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await expect(page).toHaveURL(/reports\/activity/);
    await expect(
      page.getByRole("heading", { name: "Activity Reports" })
    ).toBeVisible({ timeout: 10000 });
  });

  test("campaigns report page loads", async ({ page }) => {
    await page.goto("/en/reports/campaigns");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await expect(page).toHaveURL(/reports\/campaigns/);
    await expect(
      page.getByRole("heading", { name: "Campaigns Reports" })
    ).toBeVisible({ timeout: 10000 });
  });

  test("users report page loads", async ({ page }) => {
    await page.goto("/en/reports/users");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await expect(page).toHaveURL(/reports\/users/);
    await expect(
      page.getByRole("heading", { name: "Users Reports" })
    ).toBeVisible({ timeout: 10000 });
  });

  test("date range picker works", async ({ page }) => {
    await page.goto("/en/reports/sales");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Click the "Last 7 days" preset button
    const last7DaysButton = page.getByRole("button", {
      name: "Last 7 days",
    });
    await expect(last7DaysButton).toBeVisible({ timeout: 10000 });
    await last7DaysButton.click();

    // Verify URL updates with from and to params
    await expect(page).toHaveURL(/from=/, { timeout: 10000 });
    await expect(page).toHaveURL(/to=/);
  });

  test("export CSV button exists", async ({ page }) => {
    await page.goto("/en/reports/sales");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    const exportButton = page.getByRole("button", { name: "Export CSV" });
    await expect(exportButton).toBeVisible({ timeout: 10000 });
  });

  test("navigation between reports", async ({ page }) => {
    await page.goto("/en/reports");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Click a KPI card to navigate to a sub-page
    const kpiLink = page.locator("a[href*='/reports/']").first();
    await expect(kpiLink).toBeVisible({ timeout: 10000 });

    const href = await kpiLink.getAttribute("href");
    await kpiLink.click();
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Verify sub-page renders with a heading
    await expect(page).toHaveURL(/\/en\/reports\//);
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });
});
