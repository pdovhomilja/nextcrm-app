import { test, expect, Page } from "@playwright/test";

// Shared state — populated by each test, consumed by later tests
const testData = {
  accountId: "",
  contactId: "",
  leadId: "",
  opportunityId: "",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Wait for the Sheet slide-in panel to fully open */
async function waitForSheet(page: Page) {
  await page.waitForSelector('[data-state="open"]', { timeout: 5000 });
}

/**
 * Open a shadcn Select by clicking its trigger, then pick the first
 * SelectItem in the dropdown. Works for any DB-backed select.
 */
async function selectFirstOption(page: Page, labelText: string) {
  const formItem = page.locator("div").filter({ hasText: new RegExp(`^${labelText}$`) }).locator("..");
  const selectTrigger = formItem.locator('[role="combobox"]').first();
  await selectTrigger.click();
  await page.waitForSelector('[role="option"]', { timeout: 3000 });
  await page.locator('[role="option"]').first().click();
}

/**
 * Open the UserSearchCombobox (Popover + Command), type a search term,
 * and pick the first matching result.
 * The Command input has attribute [cmdk-input] based on the cmdk library.
 */
async function selectUserInCombobox(page: Page, labelText: string, searchTerm: string) {
  const formItem = page.locator("div").filter({ hasText: new RegExp(`^${labelText}$`) }).locator("..");
  const comboTrigger = formItem.locator("button").first();
  await comboTrigger.click();
  await page.waitForSelector('[cmdk-input]', { timeout: 3000 });
  await page.locator('[cmdk-input]').fill(searchTerm);
  await page.waitForSelector('[cmdk-item]', { timeout: 3000 });
  await page.locator('[cmdk-item]').first().click();
}

/** Assert that a Sonner success toast is visible */
async function assertSuccessToast(page: Page) {
  // Try specific data-type first, fall back to any sonner toast
  const specific = page.locator('[data-sonner-toast][data-type="success"]').first();
  const fallback = page.locator('[data-sonner-toast]').first();
  try {
    await expect(specific).toBeVisible({ timeout: 8000 });
  } catch {
    await expect(fallback).toBeVisible({ timeout: 8000 });
  }
}

/**
 * Open the Calendar date-picker popover and click the first available
 * non-disabled day.
 */
async function pickFutureDate(page: Page) {
  // Find the date picker button by its calendar icon sibling
  const datePickerBtn = page.locator('button').filter({ has: page.locator('svg') }).filter({ hasText: /pick a date|select date/i }).first();
  // Fallback: click any button with CalendarIcon that opens a popover
  const calendarTrigger = page.locator('[role="button"]').filter({ has: page.locator('[data-lucide="calendar"]') }).first();
  try {
    await datePickerBtn.click({ timeout: 2000 });
  } catch {
    await calendarTrigger.click({ timeout: 2000 });
  }
  await page.waitForSelector('table[role="grid"], [role="grid"]', { timeout: 3000 });
  await page.locator('[role="grid"] button:not([disabled])').first().click();
}

// ── Tests ─────────────────────────────────────────────────────────────────────

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
      page.getByTestId("accounts-table").getByText("Playwright Test Inc.")
    ).toBeVisible({ timeout: 8000 });

    await page.getByTestId("account-row-name").filter({ hasText: "Playwright Test Inc." }).click();
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
    const accountSelect = page.locator("div").filter({ hasText: /^Assign an Account$/ }).locator("..").locator('[role="combobox"]').first();
    await accountSelect.click();
    await page.waitForSelector('[role="option"]', { timeout: 3000 });
    await page.locator('[role="option"]').filter({ hasText: "Playwright Test Inc." }).click();

    await selectFirstOption(page, "Contact type");

    await page.getByTestId("contact-submit-btn").click();
    await assertSuccessToast(page);

    await expect(
      page.getByTestId("contacts-table").getByText("Playwright")
    ).toBeVisible({ timeout: 8000 });

    await page.getByTestId("contact-row-name").filter({ hasText: "Playwright" }).click();
    await page.waitForURL(/crm\/contacts\/.+/, { timeout: 8000 });

    const url = page.url();
    testData.contactId = url.split("/crm/contacts/")[1].split("?")[0];
    expect(testData.contactId).toBeTruthy();
  });

  test("should create a new Lead", async ({ page }) => {
    await page.goto("/crm/leads");
    await page.waitForURL(/crm\/leads/, { timeout: 10000 });

    await page.getByTestId("add-lead-btn").click();
    await waitForSheet(page);

    // Exact label strings from locales/en.json (CrmLeadForm namespace)
    await page.getByLabel("Last name").fill("PlaywrightLead");
    await page.getByLabel("First name").fill("Test");
    await page.getByLabel("Email").fill("playwright.lead@testinc.com");

    await page.getByTestId("lead-submit-btn").click();
    await assertSuccessToast(page);

    await expect(
      page.getByTestId("leads-table").getByText("PlaywrightLead")
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

    await pickFutureDate(page);

    await page.getByLabel("Description").fill("Automated test opportunity");
    await selectFirstOption(page, "Sales type");
    await page.getByLabel("Budget").fill("100000");
    await page.getByLabel("Currency").fill("USD");
    await page.getByLabel("Expected revenue").fill("80000");

    await selectUserInCombobox(page, "Assigned to", "a");

    // "Assigned Account" is the translated label from CrmOpportunityForm.assignedAccount
    const accountSelect = page.locator("div").filter({ hasText: /^Assigned Account$/ }).locator("..").locator('[role="combobox"]').first();
    await accountSelect.click();
    await page.waitForSelector('[role="option"]', { timeout: 3000 });
    await page.locator('[role="option"]').filter({ hasText: "Playwright Test Inc." }).click();

    // "Assigned Contact" is hardcoded in the Opportunity form (no translation key)
    const contactSelect = page.locator("div").filter({ hasText: /^Assigned Contact$/ }).locator("..").locator('[role="combobox"]').first();
    await contactSelect.click();
    await page.waitForSelector('[role="option"]', { timeout: 3000 });
    await page.locator('[role="option"]').filter({ hasText: "Playwright" }).first().click();

    await page.getByTestId("opportunity-submit-btn").click();
    await assertSuccessToast(page);

    await expect(
      page.getByTestId("opportunities-table").getByText("Playwright Test Opportunity")
    ).toBeVisible({ timeout: 8000 });

    await page.getByTestId("opportunity-row-name").filter({ hasText: "Playwright Test Opportunity" }).click();
    await page.waitForURL(/crm\/opportunities\/.+/, { timeout: 8000 });

    const url = page.url();
    testData.opportunityId = url.split("/crm/opportunities/")[1].split("?")[0];
    expect(testData.opportunityId).toBeTruthy();
  });
});
