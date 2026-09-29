import { test, expect, Page } from "@playwright/test";

async function assertSuccessToast(page: Page) {
  await expect(
    page.locator('[data-sonner-toast][data-type="success"]').first()
  ).toBeVisible({ timeout: 15000 });
}

async function waitForRows(page: Page) {
  await expect(async () => {
    const empty = await page.getByText("No results.").isVisible();
    expect(empty).toBe(false);
  }).toPass({ timeout: 10000 });
}

async function openFirstRowMenu(page: Page) {
  const firstRow = page.locator("table tbody tr").first();
  await expect(firstRow).toBeVisible({ timeout: 10000 });
  await firstRow.hover();
  await firstRow.locator("button:has(.sr-only)").first().click();
}

test.describe.serial("Target Triage", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("approves a target from the row action", async ({ page }) => {
    await page.goto("/en/campaigns/targets");
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await waitForRows(page);

    await openFirstRowMenu(page);
    await page.getByRole("menuitem", { name: "Approve" }).click();

    await assertSuccessToast(page);
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // The Approved badge now appears in the triage column.
    await expect(page.getByText("Approved").first()).toBeVisible({ timeout: 10000 });
  });

  test("passes a target with a reason via the dialog", async ({ page }) => {
    await page.goto("/en/campaigns/targets");
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await waitForRows(page);

    await openFirstRowMenu(page);
    await page.getByRole("menuitem", { name: /^Pass/ }).click();

    // Pass dialog
    await expect(page.getByText(/Pass on /)).toBeVisible({ timeout: 5000 });

    // Choose a reason (shadcn/radix Select)
    await page.getByLabel("Reason").click();
    await page.getByRole("option", { name: "Bad timing" }).click();

    await page.getByLabel("Note (optional)").fill("Circle back after their busy season");

    await page.getByRole("button", { name: "Pass target" }).click();

    await assertSuccessToast(page);
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await expect(page.getByText("Passed").first()).toBeVisible({ timeout: 10000 });
  });

  test("filters targets by triage status", async ({ page }) => {
    await page.goto("/en/campaigns/targets");
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await waitForRows(page);

    // Open the faceted Triage filter (the popover trigger, not the sortable
    // column header which shares the "Triage" label) and pick "Approved".
    await page.locator('button[aria-haspopup="dialog"]', { hasText: "Triage" }).click();
    await page.getByRole("option", { name: "Approved" }).click();
    // Dismiss the popover.
    await page.keyboard.press("Escape");

    // A reset control appears once a column filter is active.
    await expect(page.getByRole("button", { name: /Reset/ })).toBeVisible({
      timeout: 10000,
    });
  });
});
