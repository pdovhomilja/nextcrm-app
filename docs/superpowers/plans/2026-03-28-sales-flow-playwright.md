# Sales Flow Playwright Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `data-testid` attributes to CRM Sales module components and write a chained Playwright E2E test covering Account → Contact → Lead → Opportunity creation, list verification, and detail page navigation.

**Architecture:** Four tasks add `data-testid` attributes to production components (views, forms, tables, column links). One final task writes `tests/e2e/sales-flow.spec.ts` using `test.describe.serial` with shared state. Contacts and Leads column files also gain `<Link>` wrappers to their name cells, as those detail pages exist but weren't accessible from the table.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Playwright 1.58, Prisma, Sonner (toasts), shadcn/ui (Sheet, Select, Popover/Calendar), tanstack/react-table.

---

## File Map

| File | Change |
|------|--------|
| `app/[locale]/(routes)/crm/components/AccountsView.tsx` | Add `data-testid` to Sheet trigger button |
| `app/[locale]/(routes)/crm/accounts/components/NewAccountForm.tsx` | Add `data-testid` to submit button |
| `app/[locale]/(routes)/crm/accounts/table-components/data-table.tsx` | Add `data-testid` to `<Table>` element |
| `app/[locale]/(routes)/crm/accounts/table-components/columns.tsx` | Add `data-testid` to existing name `<Link>` |
| `app/[locale]/(routes)/crm/components/ContactsView.tsx` | Add `data-testid` to Sheet trigger button |
| `app/[locale]/(routes)/crm/contacts/components/NewContactForm.tsx` | Add `data-testid` to submit button |
| `app/[locale]/(routes)/crm/contacts/table-components/data-table.tsx` | Add `data-testid` to `<Table>` element |
| `app/[locale]/(routes)/crm/contacts/table-components/columns.tsx` | Add `<Link>` + `data-testid` to `last_name` cell |
| `app/[locale]/(routes)/crm/components/LeadsView.tsx` | Add `data-testid` to Sheet trigger button |
| `app/[locale]/(routes)/crm/leads/components/NewLeadForm.tsx` | Add `data-testid` to submit button |
| `app/[locale]/(routes)/crm/leads/table-components/data-table.tsx` | Add `data-testid` to `<Table>` element |
| `app/[locale]/(routes)/crm/leads/table-components/columns.tsx` | Add `<Link>` + `data-testid` to name cell |
| `app/[locale]/(routes)/crm/components/OpportunitiesView.tsx` | Add `data-testid` to Sheet trigger button |
| `app/[locale]/(routes)/crm/opportunities/components/NewOpportunityForm.tsx` | Add `data-testid` to submit button |
| `app/[locale]/(routes)/crm/opportunities/table-components/data-table.tsx` | Add `data-testid` to `<Table>` element |
| `app/[locale]/(routes)/crm/opportunities/table-components/columns.tsx` | Add `data-testid` to existing name `<Link>` |
| `tests/e2e/sales-flow.spec.ts` | Create — full chained test suite |

---

## Task 1: Add data-testid to Accounts components

**Files:**
- Modify: `app/[locale]/(routes)/crm/components/AccountsView.tsx`
- Modify: `app/[locale]/(routes)/crm/accounts/components/NewAccountForm.tsx`
- Modify: `app/[locale]/(routes)/crm/accounts/table-components/data-table.tsx`
- Modify: `app/[locale]/(routes)/crm/accounts/table-components/columns.tsx`

- [ ] **Step 1: Add data-testid to AccountsView Sheet trigger button**

In `app/[locale]/(routes)/crm/components/AccountsView.tsx`, find the Sheet trigger button (around line 57):

```tsx
// Before
<Button size="sm" aria-label={t("accounts.addNew")}>+</Button>

// After
<Button size="sm" aria-label={t("accounts.addNew")} data-testid="add-account-btn">+</Button>
```

- [ ] **Step 2: Add data-testid to NewAccountForm submit button**

In `app/[locale]/(routes)/crm/accounts/components/NewAccountForm.tsx`, find the submit Button (around line 469):

```tsx
// Before
<Button disabled={form.formState.isSubmitting} type="submit">

// After
<Button disabled={form.formState.isSubmitting} type="submit" data-testid="account-submit-btn">
```

- [ ] **Step 3: Add data-testid to accounts data-table Table element**

In `app/[locale]/(routes)/crm/accounts/table-components/data-table.tsx`, find the `<Table>` element (around line 102):

```tsx
// Before
<Table>

// After
<Table data-testid="accounts-table">
```

- [ ] **Step 4: Add data-testid to accounts columns name Link**

In `app/[locale]/(routes)/crm/accounts/table-components/columns.tsx`, find the `name` accessorKey cell (around line 47–50):

```tsx
// Before
cell: ({ row }) => (
  <Link href={`/crm/accounts/${row.original?.id}`}>
    <div className="w-[250px]">{row.original.name}</div>
  </Link>
),

// After
cell: ({ row }) => (
  <Link href={`/crm/accounts/${row.original?.id}`} data-testid="account-row-name">
    <div className="w-[250px]">{row.original.name}</div>
  </Link>
),
```

- [ ] **Step 5: Commit**

```bash
git add app/\[locale\]/\(routes\)/crm/components/AccountsView.tsx \
        app/\[locale\]/\(routes\)/crm/accounts/components/NewAccountForm.tsx \
        app/\[locale\]/\(routes\)/crm/accounts/table-components/data-table.tsx \
        app/\[locale\]/\(routes\)/crm/accounts/table-components/columns.tsx
git commit -m "test: add data-testid attributes to Accounts components"
```

---

## Task 2: Add data-testid to Contacts components

**Files:**
- Modify: `app/[locale]/(routes)/crm/components/ContactsView.tsx`
- Modify: `app/[locale]/(routes)/crm/contacts/components/NewContactForm.tsx`
- Modify: `app/[locale]/(routes)/crm/contacts/table-components/data-table.tsx`
- Modify: `app/[locale]/(routes)/crm/contacts/table-components/columns.tsx`

- [ ] **Step 1: Add data-testid to ContactsView Sheet trigger button**

In `app/[locale]/(routes)/crm/components/ContactsView.tsx`, find the Sheet trigger button (around line 58):

```tsx
// Before
<Button size="sm" aria-label={t("contacts.addNew")}>+</Button>

// After
<Button size="sm" aria-label={t("contacts.addNew")} data-testid="add-contact-btn">+</Button>
```

- [ ] **Step 2: Add data-testid to NewContactForm submit button**

In `app/[locale]/(routes)/crm/contacts/components/NewContactForm.tsx`, find the submit Button (around line 567):

```tsx
// Before
<Button disabled={form.formState.isSubmitting} type="submit">

// After
<Button disabled={form.formState.isSubmitting} type="submit" data-testid="contact-submit-btn">
```

- [ ] **Step 3: Add data-testid to contacts data-table Table element**

In `app/[locale]/(routes)/crm/contacts/table-components/data-table.tsx`, find the `<Table>` element and add the attribute:

```tsx
// Before
<Table>

// After
<Table data-testid="contacts-table">
```

- [ ] **Step 4: Add Link + data-testid to contacts columns last_name cell**

The contacts table has no link to the detail page. In `app/[locale]/(routes)/crm/contacts/table-components/columns.tsx`, add `import Link from "next/link"` at the top if not present, then update the `last_name` accessorKey cell:

```tsx
// Add import at top of file (after existing imports)
import Link from "next/link";

// Find the last_name column cell (around line 86–90) and change:
// Before
cell: ({ row }) => <div className="">{row.getValue("last_name")}</div>,

// After
cell: ({ row }) => (
  <Link href={`/crm/contacts/${(row.original as any).id}`} data-testid="contact-row-name">
    <div className="">{row.getValue("last_name")}</div>
  </Link>
),
```

- [ ] **Step 5: Commit**

```bash
git add app/\[locale\]/\(routes\)/crm/components/ContactsView.tsx \
        app/\[locale\]/\(routes\)/crm/contacts/components/NewContactForm.tsx \
        app/\[locale\]/\(routes\)/crm/contacts/table-components/data-table.tsx \
        app/\[locale\]/\(routes\)/crm/contacts/table-components/columns.tsx
git commit -m "test: add data-testid attributes to Contacts components"
```

---

## Task 3: Add data-testid to Leads components

**Files:**
- Modify: `app/[locale]/(routes)/crm/components/LeadsView.tsx`
- Modify: `app/[locale]/(routes)/crm/leads/components/NewLeadForm.tsx`
- Modify: `app/[locale]/(routes)/crm/leads/table-components/data-table.tsx`
- Modify: `app/[locale]/(routes)/crm/leads/table-components/columns.tsx`

- [ ] **Step 1: Add data-testid to LeadsView Sheet trigger button**

In `app/[locale]/(routes)/crm/components/LeadsView.tsx`, find the Sheet trigger button (around line 55):

```tsx
// Before
<Button size="sm" aria-label={t("leads.addNew")}>+</Button>

// After
<Button size="sm" aria-label={t("leads.addNew")} data-testid="add-lead-btn">+</Button>
```

- [ ] **Step 2: Add data-testid to NewLeadForm submit button**

In `app/[locale]/(routes)/crm/leads/components/NewLeadForm.tsx`, find the submit Button near the bottom of the form and add the attribute:

```tsx
// Before
<Button disabled={form.formState.isSubmitting} type="submit">

// After
<Button disabled={form.formState.isSubmitting} type="submit" data-testid="lead-submit-btn">
```

- [ ] **Step 3: Add data-testid to leads data-table Table element**

In `app/[locale]/(routes)/crm/leads/table-components/data-table.tsx`, find the `<Table>` element:

```tsx
// Before
<Table>

// After
<Table data-testid="leads-table">
```

- [ ] **Step 4: Add Link + data-testid to leads columns name cell**

The leads table has no link to the detail page. In `app/[locale]/(routes)/crm/leads/table-components/columns.tsx`, add `import Link from "next/link"` at the top, then update the `firstName` accessorKey cell:

```tsx
// Add import at top of file (after existing imports)
import Link from "next/link";

// Find the firstName column cell (around line 88–96) and change:
// Before
cell: ({ row }) => (
  <div>
    {row.original.firstName
      ? row.getValue("firstName")
      : "" + " " + row.original.lastName}
  </div>
),

// After
cell: ({ row }) => (
  <Link href={`/crm/leads/${(row.original as any).id}`} data-testid="lead-row-name">
    <div>
      {row.original.firstName
        ? row.getValue("firstName")
        : "" + " " + row.original.lastName}
    </div>
  </Link>
),
```

- [ ] **Step 5: Commit**

```bash
git add app/\[locale\]/\(routes\)/crm/components/LeadsView.tsx \
        app/\[locale\]/\(routes\)/crm/leads/components/NewLeadForm.tsx \
        app/\[locale\]/\(routes\)/crm/leads/table-components/data-table.tsx \
        app/\[locale\]/\(routes\)/crm/leads/table-components/columns.tsx
git commit -m "test: add data-testid attributes to Leads components"
```

---

## Task 4: Add data-testid to Opportunities components

**Files:**
- Modify: `app/[locale]/(routes)/crm/components/OpportunitiesView.tsx`
- Modify: `app/[locale]/(routes)/crm/opportunities/components/NewOpportunityForm.tsx`
- Modify: `app/[locale]/(routes)/crm/opportunities/table-components/data-table.tsx`
- Modify: `app/[locale]/(routes)/crm/opportunities/table-components/columns.tsx`

- [ ] **Step 1: Add data-testid to OpportunitiesView Sheet trigger button**

In `app/[locale]/(routes)/crm/components/OpportunitiesView.tsx`, find the Sheet trigger button (around line 63):

```tsx
// Before
<Button className="my-2 cursor-pointer" aria-label={t("opportunities.addNew")}>+</Button>

// After
<Button className="my-2 cursor-pointer" aria-label={t("opportunities.addNew")} data-testid="add-opportunity-btn">+</Button>
```

- [ ] **Step 2: Add data-testid to NewOpportunityForm submit button**

In `app/[locale]/(routes)/crm/opportunities/components/NewOpportunityForm.tsx`, find the submit Button (around line 485):

```tsx
// Before
<Button disabled={form.formState.isSubmitting} type="submit">

// After
<Button disabled={form.formState.isSubmitting} type="submit" data-testid="opportunity-submit-btn">
```

- [ ] **Step 3: Add data-testid to opportunities data-table Table element**

In `app/[locale]/(routes)/crm/opportunities/table-components/data-table.tsx`, find the `<Table>` element:

```tsx
// Before
<Table>

// After
<Table data-testid="opportunities-table">
```

- [ ] **Step 4: Add data-testid to opportunities columns name Link**

In `app/[locale]/(routes)/crm/opportunities/table-components/columns.tsx`, find the `name` accessorKey cell (around line 93–95):

```tsx
// Before
cell: ({ row }) => (
  <Link href={`/crm/opportunities/${row.original.id}`}>
    <div className="w-[250px] overflow-hidden">{row.getValue("name")}</div>
  </Link>
),

// After
cell: ({ row }) => (
  <Link href={`/crm/opportunities/${row.original.id}`} data-testid="opportunity-row-name">
    <div className="w-[250px] overflow-hidden">{row.getValue("name")}</div>
  </Link>
),
```

- [ ] **Step 5: Commit**

```bash
git add app/\[locale\]/\(routes\)/crm/components/OpportunitiesView.tsx \
        app/\[locale\]/\(routes\)/crm/opportunities/components/NewOpportunityForm.tsx \
        app/\[locale\]/\(routes\)/crm/opportunities/table-components/data-table.tsx \
        app/\[locale\]/\(routes\)/crm/opportunities/table-components/columns.tsx
git commit -m "test: add data-testid attributes to Opportunities components"
```

---

## Task 5: Write the sales-flow Playwright test

**Files:**
- Create: `tests/e2e/sales-flow.spec.ts`

- [ ] **Step 1: Create the test file with helpers and the Account test**

Create `tests/e2e/sales-flow.spec.ts`:

```typescript
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
async function selectFirstOption(page: Page, triggerLabel: string) {
  // Click the SelectTrigger that follows the label
  const trigger = page.locator(`[role="combobox"]`).filter({
    has: page.locator(`..`).filter({ hasText: triggerLabel }),
  });
  // Fallback: find by proximity — click the trigger inside the FormItem that has the label
  const formItem = page.locator(".space-y-2, form").filter({ hasText: triggerLabel }).first();
  const selectTrigger = formItem.locator('[role="combobox"]').first();
  await selectTrigger.click();
  // Wait for the listbox to appear and pick first option
  await page.waitForSelector('[role="option"]', { timeout: 3000 });
  await page.locator('[role="option"]').first().click();
}

/**
 * Open the UserSearchCombobox (Popover + Command), type a search term,
 * and pick the first matching result.
 */
async function selectUserInCombobox(page: Page, labelText: string, searchTerm: string) {
  // The UserSearchCombobox renders as a Button inside a Popover.
  // Find the FormItem that contains the label, then click its Button.
  const formItem = page.locator("div").filter({ hasText: new RegExp(`^${labelText}$`) }).locator("..");
  const comboTrigger = formItem.locator("button").first();
  await comboTrigger.click();
  // CommandInput appears inside the Popover
  await page.waitForSelector('[cmdk-input]', { timeout: 3000 });
  await page.locator('[cmdk-input]').fill(searchTerm);
  // Wait for results and click the first one
  await page.waitForSelector('[cmdk-item]', { timeout: 3000 });
  await page.locator('[cmdk-item]').first().click();
}

/** Assert that a Sonner success toast is visible */
async function assertSuccessToast(page: Page) {
  await expect(page.locator('[data-sonner-toast][data-type="success"]').first()).toBeVisible({
    timeout: 8000,
  });
}

/**
 * Open the Calendar date-picker popover and click the next available
 * day (first day cell that is not disabled).
 */
async function pickFutureDate(page: Page, buttonLabel: string) {
  // The close_date field renders as a Button with a calendar icon
  const dateButton = page.getByRole("button", { name: new RegExp(buttonLabel, "i") });
  await dateButton.click();
  await page.waitForSelector('[role="dialog"] table', { timeout: 3000 });
  // Click the first enabled day button in the calendar
  await page.locator('[role="dialog"] table button:not([disabled])').first().click();
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe.serial("Sales Flow", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  // ── Test 1: Create Account ────────────────────────────────────────────────
  test("should create a new Account", async ({ page }) => {
    await page.goto("/crm/accounts");
    await page.waitForURL(/crm\/accounts/, { timeout: 10000 });

    // Open the "New Account" Sheet
    await page.getByTestId("add-account-btn").click();
    await waitForSheet(page);

    // Fill required fields
    await page.getByLabel("Account Name").fill("Playwright Test Inc.");
    await page.getByLabel("E-mail").fill("playwright@testinc.com");
    await page.getByLabel("Company ID").fill("12345678");
    await page.getByLabel("Billing Street").fill("Test Street 1");
    await page.getByLabel("Billing Postal Code").fill("10000");
    await page.getByLabel("Billing City").fill("Prague");
    await page.getByLabel("Billing Country").fill("Czechia");

    // Industry — DB-backed Select: pick the first available option
    await selectFirstOption(page, "Industry");

    // Assigned To — UserSearchCombobox
    await selectUserInCombobox(page, "Assigned To", "a");

    // Submit
    await page.getByTestId("account-submit-btn").click();
    await assertSuccessToast(page);

    // Verify the row appears in the table
    await expect(
      page.getByTestId("accounts-table").getByText("Playwright Test Inc.")
    ).toBeVisible({ timeout: 8000 });

    // Navigate to the detail page via the row link
    await page.getByTestId("account-row-name").filter({ hasText: "Playwright Test Inc." }).click();
    await page.waitForURL(/crm\/accounts\/.+/, { timeout: 8000 });

    // Extract the accountId from the URL
    const url = page.url();
    testData.accountId = url.split("/crm/accounts/")[1].split("?")[0];
    expect(testData.accountId).toBeTruthy();
  });

  // ── Test 2: Create Contact linked to Account ──────────────────────────────
  test("should create a new Contact linked to the Account", async ({ page }) => {
    await page.goto("/crm/contacts");
    await page.waitForURL(/crm\/contacts/, { timeout: 10000 });

    // Open the "New Contact" Sheet
    await page.getByTestId("add-contact-btn").click();
    await waitForSheet(page);

    // Fill required fields
    await page.getByLabel("Last Name").fill("Playwright");
    await page.getByLabel("E-mail").first().fill("playwright.contact@testinc.com");

    // Assigned To — UserSearchCombobox
    await selectUserInCombobox(page, "Assigned User", "a");

    // Assign to Account — Select the account we created
    const accountSelect = page.locator("div").filter({ hasText: /Assign Account/ }).locator('[role="combobox"]').first();
    await accountSelect.click();
    await page.waitForSelector('[role="option"]', { timeout: 3000 });
    // Pick the option matching our account name
    await page.locator('[role="option"]').filter({ hasText: "Playwright Test Inc." }).click();

    // Contact Type — pick first available
    await selectFirstOption(page, "Contact Type");

    // Submit
    await page.getByTestId("contact-submit-btn").click();
    await assertSuccessToast(page);

    // Verify row appears
    await expect(
      page.getByTestId("contacts-table").getByText("Playwright")
    ).toBeVisible({ timeout: 8000 });

    // Navigate to detail page
    await page.getByTestId("contact-row-name").filter({ hasText: "Playwright" }).click();
    await page.waitForURL(/crm\/contacts\/.+/, { timeout: 8000 });

    const url = page.url();
    testData.contactId = url.split("/crm/contacts/")[1].split("?")[0];
    expect(testData.contactId).toBeTruthy();
  });

  // ── Test 3: Create Lead ───────────────────────────────────────────────────
  test("should create a new Lead", async ({ page }) => {
    await page.goto("/crm/leads");
    await page.waitForURL(/crm\/leads/, { timeout: 10000 });

    // Open the "New Lead" Sheet
    await page.getByTestId("add-lead-btn").click();
    await waitForSheet(page);

    // Fill required field (only last_name is required per the Zod schema)
    await page.getByLabel("Last Name").fill("PlaywrightLead");
    await page.getByLabel("First Name").fill("Test");
    await page.getByLabel("E-mail").fill("playwright.lead@testinc.com");

    // Submit
    await page.getByTestId("lead-submit-btn").click();
    await assertSuccessToast(page);

    // Verify row appears — leads table shows firstName/lastName
    await expect(
      page.getByTestId("leads-table").getByText("PlaywrightLead")
    ).toBeVisible({ timeout: 8000 });

    // Navigate to detail page
    await page.getByTestId("lead-row-name").filter({ hasText: "PlaywrightLead" }).first().click();
    await page.waitForURL(/crm\/leads\/.+/, { timeout: 8000 });

    const url = page.url();
    testData.leadId = url.split("/crm/leads/")[1].split("?")[0];
    expect(testData.leadId).toBeTruthy();
  });

  // ── Test 4: Create Opportunity linked to Account + Contact ────────────────
  test("should create a new Opportunity linked to Account and Contact", async ({ page }) => {
    await page.goto("/crm/opportunities");
    await page.waitForURL(/crm\/opportunities/, { timeout: 10000 });

    // Open the "New Opportunity" Sheet
    await page.getByTestId("add-opportunity-btn").click();
    await waitForSheet(page);

    // Fill required fields
    await page.getByLabel("Name").fill("Playwright Test Opportunity");

    // Close date — Calendar popover
    await pickFutureDate(page, "Pick a date");

    // Description
    await page.getByLabel("Description").fill("Automated test opportunity");

    // Sales Type — pick first available
    await selectFirstOption(page, "Sales Type");

    // Budget and currency
    await page.getByLabel("Budget").fill("100000");
    await page.getByLabel("Currency").fill("USD");
    await page.getByLabel("Expected Revenue").fill("80000");

    // Assigned To
    await selectUserInCombobox(page, "Assigned To", "a");

    // Assigned Account — pick from dropdown using the accountId
    const accountSelect = page
      .locator("div")
      .filter({ hasText: /Assigned Account/ })
      .locator('[role="combobox"]')
      .first();
    await accountSelect.click();
    await page.waitForSelector('[role="option"]', { timeout: 3000 });
    await page.locator('[role="option"]').filter({ hasText: "Playwright Test Inc." }).click();

    // Assigned Contact
    const contactSelect = page
      .locator("div")
      .filter({ hasText: /Assigned Contact/ })
      .locator('[role="combobox"]')
      .first();
    await contactSelect.click();
    await page.waitForSelector('[role="option"]', { timeout: 3000 });
    await page.locator('[role="option"]').filter({ hasText: "Playwright" }).first().click();

    // Submit
    await page.getByTestId("opportunity-submit-btn").click();
    await assertSuccessToast(page);

    // Verify row appears
    await expect(
      page.getByTestId("opportunities-table").getByText("Playwright Test Opportunity")
    ).toBeVisible({ timeout: 8000 });

    // Navigate to detail page
    await page
      .getByTestId("opportunity-row-name")
      .filter({ hasText: "Playwright Test Opportunity" })
      .click();
    await page.waitForURL(/crm\/opportunities\/.+/, { timeout: 8000 });

    const url = page.url();
    testData.opportunityId = url.split("/crm/opportunities/")[1].split("?")[0];
    expect(testData.opportunityId).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the tests against the local dev server**

Make sure the dev server is running first (`pnpm dev` in the project directory), then:

```bash
cd /Users/pdovhomilja/development/Next.js/nextcrm-app
pnpm exec playwright test tests/e2e/sales-flow.spec.ts --project=chromium --reporter=list
```

Expected: all 4 tests pass. If a test fails, check the HTML report:

```bash
pnpm exec playwright show-report
```

- [ ] **Step 3: Fix any selector mismatches found during the run**

Common issues and fixes:

**Label text mismatch** — The forms use `next-intl` translations. If `getByLabel("Account Name")` fails, the actual label text comes from the translation key `CrmAccountForm.accountName`. Check `messages/en.json` for the exact English string and update the test.

**`selectFirstOption` doesn't find trigger** — The `selectFirstOption` helper uses a heuristic locator. If it fails, replace the call with an explicit locator:
```typescript
// Example for Industry select
await page.locator('label:has-text("Industry")').locator('..').locator('[role="combobox"]').click();
await page.locator('[role="option"]').first().click();
```

**Toast not matching** — If Sonner doesn't add `data-type="success"`, check what attributes it actually renders:
```typescript
// More permissive fallback
await expect(page.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 8000 });
```

**Sheet not opening** — If `waitForSheet` times out, check if the Sheet uses a different attribute. Inspect with:
```typescript
await page.pause(); // opens Playwright Inspector — examine the DOM
```

- [ ] **Step 4: Verify all 4 tests pass, then commit**

```bash
pnpm exec playwright test tests/e2e/sales-flow.spec.ts --project=chromium --reporter=list
```

Expected output:
```
✓ Sales Flow › should create a new Account
✓ Sales Flow › should create a new Contact linked to the Account
✓ Sales Flow › should create a new Lead
✓ Sales Flow › should create a new Opportunity linked to Account and Contact
```

```bash
git add tests/e2e/sales-flow.spec.ts
git commit -m "test: add chained E2E sales flow Playwright tests"
```

---

## Notes for the Implementer

- **Translation keys:** All form labels come from `next-intl`. If `getByLabel()` doesn't find a field, open `messages/en.json` and search for the field name to find the exact translated string.
- **Sonner toast selector:** Sonner renders `<li data-sonner-toast data-type="success">`. If the attribute is absent, fall back to `page.locator('[data-sonner-toast]').first()`.
- **`data-testid` on `<Table>`:** The shadcn `<Table>` component forwards props to the underlying `<table>` HTML element, so `data-testid` will appear on the DOM `<table>` tag.
- **Contact and Lead detail pages exist** at `/crm/contacts/[contactId]` and `/crm/leads/[leadId]` — the columns changes in Tasks 2 and 3 add the navigation links that were missing.
- **Run only chromium** during development (`--project=chromium`) to keep iteration fast. Run all browsers before merging.
