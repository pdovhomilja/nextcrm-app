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

test.describe("Update Contact", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("should update contact last name via row action on /crm/contacts", async ({
    page,
  }) => {
    await page.goto("/en/crm/contacts");
    await page.waitForURL(/crm\/contacts/, { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    const firstRow = page
      .getByTestId("contacts-table")
      .locator("tbody tr")
      .first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    // Open the row-actions dropdown
    await firstRow.locator("button:has(.sr-only)").first().click();

    // Click "Update" in the dropdown
    await page.getByRole("menuitem", { name: "Update" }).click();

    // Wait for the Sheet to open
    await waitForSheet(page);
    await expect(
      page.getByRole("heading", { name: /Update Contact/i })
    ).toBeVisible({ timeout: 5000 });

    // Update the last name (required field)
    const lastNameInput = page.getByLabel("Last name", { exact: true });
    await lastNameInput.clear();
    await lastNameInput.fill("UpdatedLastName");

    // Submit
    await page.locator('[role="dialog"] [type="submit"]').click();

    // Assert success
    await assertSuccessToast(page);
    await expect(
      page.locator('[role="dialog"][data-state="open"]')
    ).not.toBeVisible({ timeout: 8000 });
  });
});
