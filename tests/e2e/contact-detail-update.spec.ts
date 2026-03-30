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

test.describe("Update Contact from detail page", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("should update contact last name via ⋯ menu on /crm/contacts/[id]", async ({
    page,
  }) => {
    await page.goto("/en/crm/contacts");
    await page.waitForURL(/crm\/contacts/, { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Navigate to the first contact's detail page
    await page
      .getByTestId("contacts-table")
      .getByTestId("contact-row-name")
      .first()
      .click();

    await page.waitForURL(/crm\/contacts\/.+/, { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Open the ⋯ actions menu
    const actionsBtn = page.getByTestId("contact-detail-actions-btn");
    await expect(actionsBtn).toBeVisible({ timeout: 8000 });
    await actionsBtn.click();

    await page.getByRole("menuitem", { name: "Update" }).click();

    await waitForSheet(page);
    await expect(
      page.getByRole("heading", { name: /Update Contact/i })
    ).toBeVisible({ timeout: 5000 });

    // Update last name
    const lastNameInput = page.getByLabel("Last name", { exact: true });
    await lastNameInput.clear();
    await lastNameInput.fill("DetailUpdatedLastName");

    await page.locator('[role="dialog"] [type="submit"]').click();

    await assertSuccessToast(page);
    await expect(
      page.locator('[role="dialog"][data-state="open"]')
    ).not.toBeVisible({ timeout: 8000 });
  });
});
