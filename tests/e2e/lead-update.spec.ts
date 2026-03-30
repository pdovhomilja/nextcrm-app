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

test.describe("Update Lead", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("should update lead last name via row action on /crm/leads", async ({
    page,
  }) => {
    await page.goto("/en/crm/leads");
    await page.waitForURL(/crm\/leads/, { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    const firstRow = page
      .getByTestId("leads-table")
      .locator("tbody tr")
      .first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    // Open the row-actions dropdown
    await firstRow.locator("button:has(.sr-only)").first().click();

    await page.getByRole("menuitem", { name: "Update" }).click();

    await waitForSheet(page);
    await expect(
      page.getByRole("heading", { name: /Update lead/i })
    ).toBeVisible({ timeout: 5000 });

    // Update the last name (required, max 30)
    const lastNameInput = page.getByLabel("Last name", { exact: true });
    await lastNameInput.clear();
    await lastNameInput.fill("UpdatedLastName");

    await page.locator('[role="dialog"] [type="submit"]').click();

    await assertSuccessToast(page);
    await expect(
      page.locator('[role="dialog"][data-state="open"]')
    ).not.toBeVisible({ timeout: 8000 });
  });
});
