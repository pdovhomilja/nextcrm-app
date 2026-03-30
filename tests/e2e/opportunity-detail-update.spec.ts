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

test.describe("Update Opportunity from detail page", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("should update opportunity name via ⋯ menu on /crm/opportunities/[id]", async ({
    page,
  }) => {
    await page.goto("/en/crm/opportunities");
    await page.waitForURL(/crm\/opportunities/, { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Navigate to the first opportunity's detail page
    await page
      .getByTestId("opportunities-table")
      .getByTestId("opportunity-row-name")
      .first()
      .click();

    await page.waitForURL(/crm\/opportunities\/.+/, { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Open the ⋯ actions menu
    const actionsBtn = page.getByTestId("opportunity-detail-actions-btn");
    await expect(actionsBtn).toBeVisible({ timeout: 8000 });
    await actionsBtn.click();

    await page.getByRole("menuitem", { name: "Update" }).click();

    // Wait for Sheet AND SWR data fetch inside UpdateOpportunityForm
    await waitForSheet(page);
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    const nameInput = page.getByLabel("Opportunity name", { exact: true });
    await nameInput.clear();
    await nameInput.fill("Detail Updated Opportunity Name");

    await page.locator('[role="dialog"] [type="submit"]').click();

    await assertSuccessToast(page);
    await expect(
      page.locator('[role="dialog"][data-state="open"]')
    ).not.toBeVisible({ timeout: 8000 });
  });
});
