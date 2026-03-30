import { test, expect, Page } from "@playwright/test";

async function waitForSheet(page: Page) {
  await page.waitForSelector('[role="dialog"][data-state="open"]', {
    timeout: 10000,
  });
}

async function assertSuccessToast(page: Page) {
  await expect(
    page.locator('[data-sonner-toast][data-type="success"]').first()
  ).toBeVisible({ timeout: 15000 });
}

test.describe("Update Opportunity", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("should update opportunity name via row action on /crm/opportunities", async ({
    page,
  }) => {
    await page.goto("/en/crm/opportunities");
    await page.waitForURL(/crm\/opportunities/, { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    const firstRow = page
      .getByTestId("opportunities-table")
      .locator("tbody tr")
      .first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    // Open the row-actions dropdown
    await firstRow.locator("button:has(.sr-only)").first().click();

    await page.getByRole("menuitem", { name: "Update" }).click();

    // Wait for Sheet AND for the SWR fetch inside the form to complete
    await waitForSheet(page);
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Update the opportunity name (required)
    const nameInput = page.getByLabel("Opportunity name", { exact: true });
    await nameInput.clear();
    await nameInput.fill("Updated Opportunity Name");

    await page.locator('[role="dialog"] [type="submit"]').click();

    await assertSuccessToast(page);
    await expect(
      page.locator('[role="dialog"][data-state="open"]')
    ).not.toBeVisible({ timeout: 8000 });
  });
});
