import { test, expect } from "@playwright/test";

test.describe("Campaign Detail Page", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("should navigate to detail page and display campaign info", async ({
    page,
  }) => {
    await page.goto("/en/campaigns");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Click the first campaign name link
    const nameLink = page
      .locator("table tbody tr")
      .first()
      .locator("a.font-medium")
      .first();
    await expect(nameLink).toBeVisible({ timeout: 10000 });

    // Capture the campaign name for assertion on detail page
    const campaignName = await nameLink.textContent();
    await nameLink.click();

    await page.waitForURL(/\/campaigns\//, { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Campaign name should appear as heading
    await expect(
      page.getByRole("heading", { name: campaignName!.trim() })
    ).toBeVisible({ timeout: 10000 });
  });

  test("should display status badge on detail page", async ({ page }) => {
    await page.goto("/en/campaigns");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Navigate to first campaign
    await page
      .locator("table tbody tr")
      .first()
      .locator("a.font-medium")
      .first()
      .click();
    await page.waitForURL(/\/campaigns\//, { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Status badge — rendered as uppercase text inside a span with rounded-full class
    const statusBadge = page.locator("span.rounded-full");
    await expect(statusBadge).toBeVisible({ timeout: 10000 });
  });

  test("should display stats grid with all metric cards", async ({ page }) => {
    await page.goto("/en/campaigns");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await page
      .locator("table tbody tr")
      .first()
      .locator("a.font-medium")
      .first()
      .click();
    await page.waitForURL(/\/campaigns\//, { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Stats grid should show all 5 metric labels (scoped to grid to avoid select option conflicts)
    const statsGrid = page.locator("div.grid");
    const expectedLabels = ["Sent", "Delivered", "Open Rate", "Click Rate", "Bounced"];
    for (const label of expectedLabels) {
      await expect(statsGrid.getByText(label, { exact: true }).first()).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test("should return 404 for non-existent campaign", async ({ page }) => {
    await page.goto("/en/campaigns/00000000-0000-0000-0000-000000000000");

    // Should show 404 page
    await expect(
      page.getByText(/not found|404/i)
    ).toBeVisible({ timeout: 10000 });
  });
});
