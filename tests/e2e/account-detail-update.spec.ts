import { test, expect, Page } from "@playwright/test";

/** Wait for the Sheet slide-in panel to fully open */
async function waitForSheet(page: Page) {
  await page.waitForSelector('[role="dialog"][data-state="open"]', {
    timeout: 10000,
  });
}

/** Assert that a Sonner success toast is visible */
async function assertSuccessToast(page: Page) {
  await expect(
    page.locator('[data-sonner-toast][data-type="success"]').first()
  ).toBeVisible({ timeout: 15000 });
}

/**
 * Fill a text input by its exact label only when the current value is empty —
 * prevents Zod min() validation failures on optional fields stored as "".
 */
async function fillIfEmpty(page: Page, label: string, value: string) {
  const input = page.getByLabel(label, { exact: true });
  const current = await input.inputValue().catch(() => "");
  if (!current.trim()) {
    await input.fill(value);
  }
}

test.describe("Update Account from detail page", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("should update account name via ... menu on /crm/accounts/[id]", async ({
    page,
  }) => {
    // Navigate to the accounts list and click through to the first account
    await page.goto("/en/crm/accounts");
    await page.waitForURL(/crm\/accounts/, { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Click the first account name link to navigate to the detail page
    await page
      .getByTestId("accounts-table")
      .getByTestId("account-row-name")
      .first()
      .click();

    await page.waitForURL(/crm\/accounts\/.+/, { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // The detail page should show the account card with the ⋯ actions button
    const actionsBtn = page.getByTestId("account-detail-actions-btn");
    await expect(actionsBtn).toBeVisible({ timeout: 8000 });
    await actionsBtn.click();

    // Click "Update" in the dropdown
    await page.getByRole("menuitem", { name: "Update" }).click();

    // Wait for the update Sheet to open
    await waitForSheet(page);
    await expect(
      page.getByRole("heading", { name: /Update Account/i })
    ).toBeVisible({ timeout: 5000 });

    // Update the account name
    const nameInput = page.getByLabel("Account name", { exact: true });
    await nameInput.clear();
    await nameInput.fill("Detail Page Updated Name");

    // Fill optional fields that have min() Zod constraints to avoid silent failures
    await fillIfEmpty(page, "Account VAT number", "CZ123");
    await fillIfEmpty(page, "Billing state", "N/A");
    await fillIfEmpty(page, "Description", "Test description");
    await fillIfEmpty(page, "Annual revenue", "100");
    await fillIfEmpty(page, "Is member of", "N/A");

    // Submit the form
    await page.locator('[role="dialog"] [type="submit"]').click();

    // Verify success toast
    await assertSuccessToast(page);

    // Verify the sheet closes
    await expect(
      page.locator('[role="dialog"][data-state="open"]')
    ).not.toBeVisible({ timeout: 8000 });
  });
});
