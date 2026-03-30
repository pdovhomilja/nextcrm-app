import { test, expect, Page } from "@playwright/test";

async function assertSuccessToast(page: Page) {
  await expect(
    page.locator('[data-sonner-toast][data-type="success"]').first()
  ).toBeVisible({ timeout: 15000 });
}

test.describe.serial("Campaign Detail Page", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("should create a target list for detail tests", async ({ page }) => {
    await page.goto("/en/campaigns/target-lists");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await page.getByRole("button", { name: /\+ New List/i }).click();
    await expect(page.getByText("Create Target List")).toBeVisible({
      timeout: 5000,
    });

    await page.getByLabel("Name *").fill("PW-CD-Target-List");
    await page
      .getByLabel("Description")
      .fill("Target list for campaign detail tests");

    await page.getByRole("button", { name: "Create" }).click();
    await assertSuccessToast(page);
  });

  test("should create a template for detail tests", async ({ page }) => {
    await page.goto("/en/campaigns/templates/new");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await page.getByLabel("Template Name *").fill("PW-CD-Template");
    await page.getByLabel("Subject Line *").fill("PW Detail Test Subject");

    const editor = page.locator(".tiptap, .ProseMirror").first();
    if (await editor.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editor.click();
      await editor.pressSequentially("Detail test email body");
    }

    await page.getByRole("button", { name: /Save Template/i }).click();
    await page.waitForURL(/\/campaigns\/templates$/, { timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });
  });

  test("should create a campaign for detail tests", async ({ page }) => {
    await page.goto("/en/campaigns/new");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Step 1: Details
    await page.getByLabel("Campaign Name *").fill("PW-Campaign-Detail");
    await page
      .getByLabel("Description")
      .fill("Playwright detail test campaign");
    await page.getByLabel("From Name").fill("PW Detail Sender");
    await page.getByLabel("Reply-to Email").fill("pw-detail@example.com");
    await page.getByRole("button", { name: /Next →/ }).click();

    // Step 2: Template — use "Choose Existing" tab
    await page.getByText("Subject Line").waitFor({ timeout: 5000 });
    await page.getByRole("tab", { name: /Choose Existing/i }).click();

    const templateBtn = page
      .locator('[role="tabpanel"] button.text-left')
      .filter({ hasText: /PW-CD-Template/i })
      .first();
    await expect(templateBtn).toBeVisible({ timeout: 5000 });
    await templateBtn.click();

    const subjectInput = page.locator(
      'input[placeholder="Your email subject..."]'
    );
    await expect(subjectInput).not.toHaveValue("", { timeout: 3000 });

    await page.getByRole("button", { name: /Next →/ }).click();

    // Step 3: Audience
    await page.waitForTimeout(500);
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    expect(checkboxCount).toBeGreaterThan(0);
    await checkboxes.first().check();
    await page.getByRole("button", { name: /Next →/ }).click();

    // Step 4: Schedule — send now
    await expect(page.getByText("When to send")).toBeVisible({
      timeout: 5000,
    });
    await page.getByText("Send now").click();
    await page.getByRole("button", { name: /Submit Campaign/i }).click();

    // Should redirect to campaign list
    await page.waitForURL(/\/campaigns$/, { timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });
  });

  test("should navigate to detail page and display campaign info", async ({
    page,
  }) => {
    await page.goto("/en/campaigns");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Click the first campaign name link
    const nameLink = page
      .locator("table tbody tr")
      .first()
      .locator("a.font-medium")
      .first();
    await expect(nameLink).toBeVisible({ timeout: 10000 });

    // Capture the campaign name for assertion on detail page
    const campaignName = await nameLink.textContent();
    await nameLink.click();

    await page.waitForURL(/\/campaigns\//, { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Campaign name should appear as heading
    await expect(
      page.getByRole("heading", { name: campaignName!.trim() })
    ).toBeVisible({ timeout: 10000 });
  });

  test("should display status badge on detail page", async ({ page }) => {
    await page.goto("/en/campaigns");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Navigate to first campaign
    await page
      .locator("table tbody tr")
      .first()
      .locator("a.font-medium")
      .first()
      .click();
    await page.waitForURL(/\/campaigns\//, { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Status badge — rendered as uppercase text inside a span with rounded-full class
    const statusBadge = page.locator("span.rounded-full");
    await expect(statusBadge).toBeVisible({ timeout: 10000 });
  });

  test("should display stats grid with all metric cards", async ({ page }) => {
    await page.goto("/en/campaigns");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await page
      .locator("table tbody tr")
      .first()
      .locator("a.font-medium")
      .first()
      .click();
    await page.waitForURL(/\/campaigns\//, { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Stats grid should show all 5 metric labels
    const statsGrid = page.locator("div.grid");
    const expectedLabels = [
      "Sent",
      "Delivered",
      "Open Rate",
      "Click Rate",
      "Bounced",
    ];
    for (const label of expectedLabels) {
      await expect(
        statsGrid.getByText(label, { exact: true }).first()
      ).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test("should return 404 for non-existent campaign", async ({ page }) => {
    await page.goto("/en/campaigns/00000000-0000-0000-0000-000000000000");

    // Should show 404 page
    await expect(page.getByText(/not found|404/i)).toBeVisible({
      timeout: 10000,
    });
  });
});
