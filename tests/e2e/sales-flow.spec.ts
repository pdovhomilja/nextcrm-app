import { test, expect, Page } from "@playwright/test";

// Module-level state is safe here because test.describe.serial guarantees
// all tests run in the same worker in order.
const testData = {
  accountId: "",
  contactId: "",
  leadId: "",
  opportunityId: "",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Wait for the Sheet slide-in panel to fully open */
async function waitForSheet(page: Page) {
  await page.waitForSelector('[role="dialog"][data-state="open"]', { timeout: 10000 });
}

/**
 * Open a shadcn Select by clicking its trigger, then pick the first
 * SelectItem in the dropdown. Uses getByLabel() which resolves via the
 * FormLabel htmlFor → SelectTrigger id association.
 */
async function selectFirstOption(page: Page, labelText: string) {
  await page.getByLabel(labelText).click();
  const listbox = page.locator('[role="listbox"][data-state="open"]');
  await listbox.waitFor({ timeout: 3000 });
  await listbox.locator('[role="option"]').first().click();
}

/**
 * Open the UserSearchCombobox (Popover + Command), type a search term,
 * and pick the first matching result.
 * UserSearchCombobox doesn't forward FormControl's id to its Button, so
 * getByLabel() won't find it. Instead navigate: label → parent FormItem → button.
 */
async function selectUserInCombobox(page: Page, labelText: string, searchTerm: string) {
  const comboTrigger = page.locator("label").filter({ hasText: labelText }).locator("..").locator("button").first();
  await comboTrigger.click();
  await page.waitForSelector('[cmdk-input]', { timeout: 3000 });
  await page.locator('[cmdk-input]').fill(searchTerm);
  await page.waitForSelector('[data-state="open"] [cmdk-item]', { timeout: 3000 });
  await page.locator('[data-state="open"] [cmdk-item]').first().click();
}

/** Assert that a Sonner success toast is visible */
async function assertSuccessToast(page: Page) {
  await expect(
    page.locator('[data-sonner-toast][data-type="success"]').first()
  ).toBeVisible({ timeout: 8000 });
}

/**
 * Open the Calendar date-picker popover and click the first available
 * non-disabled day.
 */
async function pickFutureDate(page: Page, closeDateLabel: string) {
  // getByLabel resolves via FormLabel htmlFor → date picker Button id
  await page.getByLabel(closeDateLabel).click();
  await page.waitForSelector('[role="dialog"] table', { timeout: 3000 });
  await page.locator('[role="dialog"] table button:not([disabled])').first().click();
}

// ── Tests ─────────────────────────────────────────────────────────────────────

// Serial mode is intentional: each test depends on IDs extracted by the previous test.
// A failure in Test 1 will skip Tests 2-4, which is correct behaviour for this chain.
test.describe.serial("Sales Flow", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("should create a new Account", async ({ page }) => {
    await page.goto("/crm/accounts");
    await page.waitForURL(/crm\/accounts/, { timeout: 10000 });

    await page.getByTestId("add-account-btn").click();
    await waitForSheet(page);

    // Fill fields — exact label strings from locales/en.json (CrmAccountForm + Common namespaces)
    await page.getByLabel("Account name").fill("Playwright Test Inc.");
    await page.getByLabel("E-mail").fill("playwright@testinc.com");
    await page.getByLabel("Account ID").fill("12345678");
    await page.getByLabel("Billing street").fill("Test Street 1");
    await page.getByLabel("Billing postal code").fill("10000");
    await page.getByLabel("Billing City").fill("Prague");
    await page.getByLabel("Billing country").fill("Czechia");

    await selectFirstOption(page, "Choose industry");
    await selectUserInCombobox(page, "Assigned to", "a");

    await page.getByTestId("account-submit-btn").click();
    await assertSuccessToast(page);

    await expect(
      page.getByTestId("accounts-table").getByText("Playwright Test Inc.").first()
    ).toBeVisible({ timeout: 8000 });

    await page.getByTestId("account-row-name").filter({ hasText: "Playwright Test Inc." }).first().click();
    await page.waitForURL(/crm\/accounts\/.+/, { timeout: 8000 });

    const url = page.url();
    testData.accountId = url.split("/crm/accounts/")[1].split("?")[0];
    expect(testData.accountId).toBeTruthy();
  });

  test("should create a new Contact linked to the Account", async ({ page }) => {
    await page.goto("/crm/contacts");
    await page.waitForURL(/crm\/contacts/, { timeout: 10000 });

    await page.getByTestId("add-contact-btn").click();
    await waitForSheet(page);

    // Exact label strings from locales/en.json (CrmContactForm + Common namespaces)
    await page.getByLabel("Last name").fill("Playwright");
    await page.getByLabel("Email").first().fill("playwright.contact@testinc.com");

    await selectUserInCombobox(page, "Assigned user", "a");

    // Pick the account we created — label is "Assign an Account"
    await page.getByLabel("Assign an Account").click();
    const listbox = page.locator('[role="listbox"][data-state="open"]');
    await listbox.waitFor({ timeout: 3000 });
    await listbox.locator('[role="option"]').filter({ hasText: "Playwright Test Inc." }).first().click();

    await page.getByTestId("contact-submit-btn").click();
    await assertSuccessToast(page);

    await expect(
      page.getByTestId("contacts-table").getByText("Playwright").first()
    ).toBeVisible({ timeout: 8000 });

    await page.getByTestId("contact-row-name").filter({ hasText: "Playwright" }).first().click();
    await page.waitForURL(/crm\/contacts\/.+/, { timeout: 8000 });

    const url = page.url();
    testData.contactId = url.split("/crm/contacts/")[1].split("?")[0];
    expect(testData.contactId).toBeTruthy();
  });

  test("should create a new Lead", async ({ page }) => {
    await page.goto("/crm/leads");
    await page.waitForURL(/crm\/leads/, { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 10000 });

    await page.getByTestId("add-lead-btn").click();
    await waitForSheet(page);

    // Exact label strings from locales/en.json (CrmLeadForm namespace)
    await page.getByLabel("Last name").fill("PlaywrightLead");
    await page.getByLabel("First name").fill("Test");
    await page.getByLabel("Email").fill("playwright.lead@testinc.com");

    await page.getByTestId("lead-submit-btn").click();
    await assertSuccessToast(page);

    await expect(
      page.getByTestId("leads-table").getByText("PlaywrightLead").first()
    ).toBeVisible({ timeout: 8000 });

    await page.getByTestId("lead-row-name").filter({ hasText: "PlaywrightLead" }).first().click();
    await page.waitForURL(/crm\/leads\/.+/, { timeout: 8000 });

    const url = page.url();
    testData.leadId = url.split("/crm/leads/")[1].split("?")[0];
    expect(testData.leadId).toBeTruthy();
  });

  test("should create a new Opportunity linked to Account and Contact", async ({ page }) => {
    await page.goto("/crm/opportunities");
    await page.waitForURL(/crm\/opportunities/, { timeout: 10000 });

    await page.getByTestId("add-opportunity-btn").click();
    await waitForSheet(page);

    // Exact label strings from locales/en.json (CrmOpportunityForm + Common namespaces)
    await page.getByLabel("Opportunity name").fill("Playwright Test Opportunity");

    await pickFutureDate(page, "Expected close date");

    await page.getByLabel("Description").fill("Automated test opportunity");
    await selectFirstOption(page, "Sales type");
    await selectFirstOption(page, "Sale stage");
    await page.getByLabel("Budget").fill("100000");
    await page.getByLabel("Currency").fill("USD");
    await page.getByLabel("Expected revenue").fill("80000");

    await selectUserInCombobox(page, "Assigned to", "a");

    // "Assigned Account" label from CrmOpportunityForm.assignedAccount
    await page.getByLabel("Assigned Account").click();
    const listbox = page.locator('[role="listbox"][data-state="open"]');
    await listbox.waitFor({ timeout: 3000 });
    await listbox.locator('[role="option"]').filter({ hasText: "Playwright Test Inc." }).first().click();

    // "Assigned Contact" is hardcoded in the Opportunity form (no translation key)
    await page.getByLabel("Assigned Contact").click();
    const listbox2 = page.locator('[role="listbox"][data-state="open"]');
    await listbox2.waitFor({ timeout: 3000 });
    await listbox2.locator('[role="option"]').filter({ hasText: "Playwright" }).first().click();

    await page.getByTestId("opportunity-submit-btn").click();
    await assertSuccessToast(page);

    await expect(
      page.getByTestId("opportunities-table").getByText("Playwright Test Opportunity").first()
    ).toBeVisible({ timeout: 8000 });

    await page.getByTestId("opportunity-row-name").filter({ hasText: "Playwright Test Opportunity" }).first().click();
    await page.waitForURL(/crm\/opportunities\/.+/, { timeout: 8000 });

    const url = page.url();
    testData.opportunityId = url.split("/crm/opportunities/")[1].split("?")[0];
    expect(testData.opportunityId).toBeTruthy();
  });
});
