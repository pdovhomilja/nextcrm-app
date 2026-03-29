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
 * Fill a text input identified by its label only when the current value is
 * empty — avoids overwriting meaningful existing data while ensuring that
 * optional fields with `min()` Zod constraints are not left as empty strings,
 * which would cause silent client-side validation failures.
 */
async function fillIfEmpty(page: Page, label: string, value: string) {
  const input = page.getByLabel(label, { exact: true });
  const current = await input.inputValue().catch(() => "");
  if (!current.trim()) {
    await input.fill(value);
  }
}

test.describe("Update Account", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("should update account name via row action on /crm/accounts", async ({
    page,
  }) => {
    await page.goto("/en/crm/accounts");
    await page.waitForURL(/crm\/accounts/, { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Confirm at least one account row is visible
    const firstRow = page
      .getByTestId("accounts-table")
      .locator("tbody tr")
      .first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    // Open the row-actions dropdown (⋯ button with sr-only "Open menu" text)
    await firstRow.locator("button:has(.sr-only)").first().click();

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
    await nameInput.fill("Updated Account Name");

    // Fill optional fields that have min() Zod constraints — these fail
    // validation when stored as empty strings instead of null.
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

    // Verify the updated name appears in the table
    await expect(
      page
        .getByTestId("accounts-table")
        .getByText("Updated Account Name")
        .first()
    ).toBeVisible({ timeout: 8000 });
  });
});
