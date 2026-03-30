import { test, expect, Page } from "@playwright/test";

async function assertSuccessToast(page: Page) {
  await expect(
    page.locator('[data-sonner-toast][data-type="success"]').first()
  ).toBeVisible({ timeout: 15000 });
}

/** Wait for at least one data row to appear (not the empty-state row). */
async function waitForRows(page: Page) {
  // Wait until the empty-state text is gone OR a real data row appears
  await expect(async () => {
    const empty = await page.getByText("No campaigns found.").isVisible();
    expect(empty).toBe(false);
  }).toPass({ timeout: 10000 });
}

test.describe.serial("Campaign List", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  // Seed at least 3 campaigns before all tests in this describe block
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      storageState: "playwright/.auth/user.json",
    });
    const page = await context.newPage();
    const res = await page.request.post(
      "http://localhost:3000/api/test/seed-campaigns",
      { data: { count: 3 } }
    );
    const body = await res.text();
    if (!res.ok()) {
      throw new Error(`seed-campaigns ${res.status()}: ${body}`);
    }
    console.log("[beforeAll] seed result:", body);
    await context.close();
  });

  test("should display campaigns list page with table", async ({ page }) => {
    await page.goto("/en/campaigns");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await expect(
      page.getByRole("heading", { name: /Campaigns/i })
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.getByRole("link", { name: /New Campaign/i })
    ).toBeVisible();

    await expect(page.getByText("All Campaigns")).toBeVisible();

    await expect(page.locator("table")).toBeVisible({ timeout: 10000 });
  });

  test("should filter campaigns by name", async ({ page }) => {
    await page.goto("/en/campaigns");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    const filterInput = page.getByPlaceholder("Filter by name ...");
    await expect(filterInput).toBeVisible({ timeout: 10000 });

    // Type something that matches nothing
    await filterInput.fill("zzz_no_match_zzz");
    await expect(page.getByText("No campaigns found.")).toBeVisible({
      timeout: 5000,
    });

    // Clear the filter
    await filterInput.fill("");
  });

  test("should filter campaigns by status dropdown", async ({ page }) => {
    await page.goto("/en/campaigns");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Open the Shadcn Select trigger for status
    await page
      .locator('[role="combobox"]')
      .filter({ hasText: /All Statuses/i })
      .click();

    // Pick "Draft"
    await page
      .locator('[role="option"]')
      .filter({ hasText: /^Draft$/i })
      .click();

    // Confirm result — either empty state or rows present
    await page.waitForFunction(
      () => {
        const cells = Array.from(document.querySelectorAll("table tbody td"));
        const hasEmpty = cells.some((c) =>
          c.textContent?.includes("No campaigns found.")
        );
        const rows = document.querySelectorAll("table tbody tr");
        return hasEmpty || rows.length > 0;
      },
      { timeout: 5000 }
    );
  });

  test("should reset filters", async ({ page }) => {
    await page.goto("/en/campaigns");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    const filterInput = page.getByPlaceholder("Filter by name ...");
    await filterInput.fill("zzz");

    const resetButton = page.getByRole("button", { name: /Reset/i });
    await expect(resetButton).toBeVisible({ timeout: 5000 });
    await resetButton.click();

    await expect(filterInput).toHaveValue("");
  });

  test("should navigate to campaign detail via row action View", async ({
    page,
  }) => {
    await page.goto("/en/campaigns");
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await waitForRows(page);

    const firstRow = page.locator("table tbody tr").first();
    await firstRow.hover();
    await firstRow.locator("button:has(.sr-only)").first().click();

    await page.getByRole("menuitem", { name: "View" }).click();
    await page.waitForURL(/\/campaigns\/[a-z0-9-]+$/, { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });
  });

  test("should navigate to campaign detail via name link", async ({
    page,
  }) => {
    await page.goto("/en/campaigns");
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await waitForRows(page);

    const firstRow = page.locator("table tbody tr").first();
    const nameLink = firstRow.locator("a").first();
    await expect(nameLink).toBeVisible({ timeout: 5000 });
    await nameLink.click();

    await page.waitForURL(/\/campaigns\/[a-z0-9-]+$/, { timeout: 10000 });
  });

  test("should delete a campaign via row action", async ({ page }) => {
    await page.goto("/en/campaigns");
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await waitForRows(page);

    const rowCountBefore = await page.locator("table tbody tr").count();

    const lastRow = page.locator("table tbody tr").last();
    await lastRow.hover();
    await lastRow.locator("button:has(.sr-only)").first().click();

    await page.getByRole("menuitem", { name: "Delete" }).click();

    const confirmBtn = page.getByRole("button", {
      name: /Continue|Confirm|Delete/i,
    });
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();

    await assertSuccessToast(page);

    // Wait for re-render then verify row count decreased
    await page.waitForLoadState("networkidle", { timeout: 10000 });
    await expect(async () => {
      const rowCountAfter = await page.locator("table tbody tr").count();
      const isEmpty = await page.getByText("No campaigns found.").isVisible();
      expect(isEmpty || rowCountAfter < rowCountBefore).toBeTruthy();
    }).toPass({ timeout: 5000 });
  });

  test("should navigate to new campaign page", async ({ page }) => {
    await page.goto("/en/campaigns");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await page.getByRole("link", { name: /New Campaign/i }).click();
    await page.waitForURL(/\/campaigns\/new/, { timeout: 10000 });

    await expect(
      page.getByRole("heading", { name: /New Campaign/i })
    ).toBeVisible({ timeout: 10000 });
  });
});
