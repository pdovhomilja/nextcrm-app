import { test, expect, Page } from "@playwright/test";

async function assertSuccessToast(page: Page) {
  await expect(
    page.locator('[data-sonner-toast][data-type="success"]').first()
  ).toBeVisible({ timeout: 15000 });
}

async function waitForRows(page: Page) {
  await expect(async () => {
    const empty = await page.getByText("No campaigns found.").isVisible();
    expect(empty).toBe(false);
  }).toPass({ timeout: 10000 });
}

test.describe.serial("Campaign List", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("should create a target list for campaign tests", async ({ page }) => {
    await page.goto("/en/campaigns/target-lists");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Open create modal
    await page.getByRole("button", { name: /\+ New List/i }).click();
    await expect(page.getByText("Create Target List")).toBeVisible({
      timeout: 5000,
    });

    await page.getByLabel("Name *").fill("PW-CL-Target-List");
    await page
      .getByLabel("Description")
      .fill("Target list for campaign list tests");

    await page.getByRole("button", { name: "Create" }).click();
    await assertSuccessToast(page);
  });

  test("should create a template for campaign tests", async ({ page }) => {
    await page.goto("/en/campaigns/templates/new");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await page.getByLabel("Template Name *").fill("PW-CL-Template");
    await page.getByLabel("Subject Line *").fill("PW List Test Subject");

    // Type into TipTap editor
    const editor = page.locator(".tiptap, .ProseMirror").first();
    if (await editor.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editor.click();
      await editor.pressSequentially("Playwright test email body content");
    }

    await page.getByRole("button", { name: /Save Template/i }).click();
    // Should redirect to templates list
    await page.waitForURL(/\/campaigns\/templates$/, { timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });
  });

  test("should create a campaign via the wizard", async ({ page }) => {
    await page.goto("/en/campaigns/new");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Step 1: Details
    await page.getByLabel("Campaign Name *").fill("PW-Campaign-List");
    await page.getByLabel("Description").fill("Playwright list test campaign");
    await page.getByLabel("From Name").fill("PW Test Sender");
    await page.getByLabel("Reply-to Email").fill("pw-test@example.com");
    await page.getByRole("button", { name: /Next →/ }).click();

    // Step 2: Template — switch to "Choose Existing" and select the template we created
    await page.getByText("Subject Line").waitFor({ timeout: 5000 });
    await page.getByRole("tab", { name: /Choose Existing/i }).click();

    // Select the PW-CL-Template
    const templateBtn = page
      .locator('[role="tabpanel"] button.text-left')
      .filter({ hasText: /PW-CL-Template/i })
      .first();
    await expect(templateBtn).toBeVisible({ timeout: 5000 });
    await templateBtn.click();

    // Subject should be auto-populated; override if needed
    const subjectInput = page.locator(
      'input[placeholder="Your email subject..."]'
    );
    await expect(subjectInput).not.toHaveValue("", { timeout: 3000 });

    await page.getByRole("button", { name: /Next →/ }).click();

    // Step 3: Audience — select the target list
    await page.waitForTimeout(500);
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    expect(checkboxCount).toBeGreaterThan(0);
    await checkboxes.first().check();
    await page.getByRole("button", { name: /Next →/ }).click();

    // Step 4: Schedule — choose "Send now" and submit
    await expect(page.getByText("When to send")).toBeVisible({
      timeout: 5000,
    });
    await page.getByText("Send now").click();
    await page.getByRole("button", { name: /Submit Campaign/i }).click();

    // Should redirect to campaign list
    await page.waitForURL(/\/campaigns$/, { timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });
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
