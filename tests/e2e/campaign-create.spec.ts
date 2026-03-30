import { test, expect } from "@playwright/test";

test.describe("Campaign Creation Wizard", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("Step 1: should show validation error when name is empty", async ({
    page,
  }) => {
    await page.goto("/en/campaigns/new");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Verify we're on step 1
    await expect(page.getByLabel("Campaign Name *")).toBeVisible({
      timeout: 10000,
    });

    // Click Next without filling name
    await page.getByRole("button", { name: /Next →/ }).click();

    // Should show validation error
    await expect(page.getByText("Campaign name is required")).toBeVisible({
      timeout: 5000,
    });
  });

  test("Step 1: should fill details and advance to step 2", async ({
    page,
  }) => {
    await page.goto("/en/campaigns/new");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await page.getByLabel("Campaign Name *").fill("PW Test Campaign");
    await page.getByLabel("Description").fill("Playwright test description");
    await page.getByLabel("From Name").fill("Test Sender");
    await page.getByLabel("Reply-to Email").fill("test@example.com");

    await page.getByRole("button", { name: /Next →/ }).click();

    // Should be on step 2 — "Subject Line" label visible
    await expect(page.getByText("Subject Line")).toBeVisible({
      timeout: 5000,
    });
  });

  test("Step 2: should show validation error when subject is empty", async ({
    page,
  }) => {
    await page.goto("/en/campaigns/new");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Advance past step 1
    await page.getByLabel("Campaign Name *").fill("PW Validation Test");
    await page.getByRole("button", { name: /Next →/ }).click();

    await expect(page.getByText("Subject Line")).toBeVisible({
      timeout: 5000,
    });

    // Click Next without filling subject
    await page.getByRole("button", { name: /Next →/ }).click();

    await expect(page.getByText("Subject line is required")).toBeVisible({
      timeout: 5000,
    });
  });

  test("Step 2: should navigate back to step 1 with preserved data", async ({
    page,
  }) => {
    await page.goto("/en/campaigns/new");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Fill step 1
    await page.getByLabel("Campaign Name *").fill("PW Back Test");
    await page.getByLabel("Description").fill("Should persist");
    await page.getByRole("button", { name: /Next →/ }).click();

    // On step 2, click Back
    await expect(page.getByText("Subject Line")).toBeVisible({
      timeout: 5000,
    });
    await page.getByRole("button", { name: /Back/ }).click();

    // Step 1 should have preserved values
    await expect(page.getByLabel("Campaign Name *")).toHaveValue("PW Back Test");
    await expect(page.getByLabel("Description")).toHaveValue("Should persist");
  });

  test("Step 2: should show Choose Existing tab with templates", async ({
    page,
  }) => {
    await page.goto("/en/campaigns/new");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await page.getByLabel("Campaign Name *").fill("PW Template Test");
    await page.getByRole("button", { name: /Next →/ }).click();

    // Click "Choose Existing" tab
    await page.getByRole("tab", { name: /Choose Existing/i }).click();

    // Should see either template buttons or "No templates yet." message
    const noTemplates = page.getByText("No templates yet.");
    const templateButton = page.locator(
      '[role="tabpanel"] button.text-left'
    ).first();
    await expect(noTemplates.or(templateButton)).toBeVisible({ timeout: 5000 });
  });

  test("Step 3: should show validation error when no list selected", async ({
    page,
  }) => {
    await page.goto("/en/campaigns/new");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Step 1
    await page.getByLabel("Campaign Name *").fill("PW Audience Test");
    await page.getByRole("button", { name: /Next →/ }).click();

    // Step 2 — fill subject and add minimal content to TipTap
    await page.getByText("Subject Line").waitFor({ timeout: 5000 });
    const subjectInput = page.locator('input[placeholder="Your email subject..."]');
    await subjectInput.fill("Test Subject");

    // Type into TipTap editor (contenteditable div)
    const editor = page.locator(".tiptap, .ProseMirror").first();
    if (await editor.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editor.click();
      await editor.pressSequentially("Test email body content");
    }

    await page.getByRole("button", { name: /Next →/ }).click();

    // Step 3 — click Next without selecting any target list
    await page.waitForTimeout(500);
    // If "No target lists found." is shown, the Next button still exists
    await page.getByRole("button", { name: /Next →/ }).click();

    // Should show validation
    await expect(
      page.getByText("Select at least one target list")
    ).toBeVisible({ timeout: 5000 });
  });

  test("Step 4: should show validation when no schedule chosen", async ({
    page,
  }) => {
    await page.goto("/en/campaigns/new");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Step 1
    await page.getByLabel("Campaign Name *").fill("PW Schedule Test");
    await page.getByRole("button", { name: /Next →/ }).click();

    // Step 2
    const subjectInput = page.locator('input[placeholder="Your email subject..."]');
    await subjectInput.fill("Schedule Test Subject");
    const editor = page.locator(".tiptap, .ProseMirror").first();
    if (await editor.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editor.click();
      await editor.pressSequentially("Body content");
    }
    await page.getByRole("button", { name: /Next →/ }).click();

    // Step 3 — select a target list if available; if not, this test won't reach step 4
    await page.waitForTimeout(500);
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();

    if (checkboxCount > 0) {
      // Select the first target list
      await checkboxes.first().check();
      await page.getByRole("button", { name: /Next →/ }).click();

      // Step 4 — "Schedule for later" is default, but no date set
      await expect(page.getByText("When to send")).toBeVisible({
        timeout: 5000,
      });

      // Click Submit without choosing a date (default is "Schedule for later" with empty date)
      await page.getByRole("button", { name: /Submit Campaign/i }).click();

      await expect(
        page.getByText("Pick a date or choose Send Now")
      ).toBeVisible({ timeout: 5000 });
    } else {
      // No target lists available — skip this test gracefully
      test.skip(true, "No target lists seeded — cannot reach step 4");
    }
  });
});
