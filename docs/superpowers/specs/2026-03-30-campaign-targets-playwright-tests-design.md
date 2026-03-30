# Campaign Targets Playwright Tests — Design Spec

**Date:** 2026-03-30
**Scope:** E2E Playwright tests for Targets and Target Lists in the Campaign module

## Overview

Single test file `tests/e2e/campaign-targets.spec.ts` covering CRUD operations, navigation, filtering, and conversion for both Targets and Target Lists. All test data is created through UI interactions (no seed endpoint). Enrichment is excluded — tested separately.

## File Structure

`tests/e2e/campaign-targets.spec.ts` with three `test.describe.serial` blocks.

## Test Cases

### Block 1: Targets (8 tests)

| # | Test | Description |
|---|------|-------------|
| 1 | should display targets page with table | Navigate to `/en/campaigns/targets`, verify heading ("Targets"), "+ New Target" button, and table are visible |
| 2 | should create a new target with all fields | Open new target sheet, fill all field groups: first_name, last_name, email, email_2, mobile_phone, office_phone, home_phone, company, position, company_website, company_website_2, social_x, social_linkedin, social_instagram, social_facebook, city, country, industry, employees, description, status. Submit form, verify success toast |
| 3 | should filter targets by name | Type non-matching text in filter input, verify empty state ("No targets found"), clear filter and verify rows reappear |
| 4 | should navigate to target detail via row action View | Hover first row, open actions dropdown, click "View" menuitem, verify URL matches `/campaigns/targets/[uuid]` |
| 5 | should update a target via row action | Hover first row, open actions dropdown, click "Update", modify a field (e.g. position), save, verify success toast |
| 6 | should navigate to target detail via name link | Click the name cell link in first row, verify URL navigates to target detail page |
| 7 | should display target detail with all fields | Verify header with target name, company info card, contact information card (email, phone), social networks card, and notes section are visible |
| 8 | should convert target to account + contact | Click convert action from the MoreHorizontal menu, confirm dialog, verify success toast |

### Block 2: Target Lists (6 tests)

| # | Test | Description |
|---|------|-------------|
| 1 | should display target lists page with table | Navigate to `/en/campaigns/target-lists`, verify heading ("Target Lists"), create button, and table are visible |
| 2 | should create a new target list | Open create modal, fill name and description fields, submit, verify success toast |
| 3 | should navigate to target list detail | Click on a target list row/name to open detail, verify URL matches `/campaigns/target-lists/[uuid]` and heading is visible |
| 4 | should add a target to the list | On detail page, open add target modal, select a target, confirm, verify target appears in the targets table |
| 5 | should remove a target from the list | Click remove button/action on a target row in the list, confirm removal, verify target disappears from the list |
| 6 | should delete a target list via row action | Navigate back to target lists, hover row, open actions dropdown, click "Delete", confirm AlertModal, verify success toast and row removed |

### Block 3: Target Cleanup (1 test)

| # | Test | Description |
|---|------|-------------|
| 1 | should delete a target via row action | Navigate to `/en/campaigns/targets`, hover the target row, open actions dropdown, click "Delete", confirm AlertModal, verify success toast and row count decreases |

## Data Flow

```
Targets Block:
  Create Target (all fields) → Filter → Row Action View → Update → Name Link → Detail View → Convert

Target Lists Block:
  Create Target List → Navigate to Detail → Add Target to List → Remove Target from List → Delete List

Cleanup Block:
  Delete Target
```

All blocks are `test.describe.serial` — tests within each block depend on data created by earlier tests.

## Technical Patterns

### Auth
- `test.use({ storageState: "playwright/.auth/user.json" })` per describe block

### Helpers
```ts
async function assertSuccessToast(page: Page) {
  await expect(
    page.locator('[data-sonner-toast][data-type="success"]').first()
  ).toBeVisible({ timeout: 15000 });
}

async function waitForRows(page: Page, emptyText: string) {
  await expect(async () => {
    const empty = await page.getByText(emptyText).isVisible();
    expect(empty).toBe(false);
  }).toPass({ timeout: 10000 });
}
```

### Selectors
- Headings: `page.getByRole("heading", { name: /.../ })`
- Buttons/Links: `page.getByRole("link" | "button", { name: /.../ })`
- Table rows: `page.locator("table tbody tr")`
- Action menus: `page.locator("button:has(.sr-only)")` for the trigger, `page.getByRole("menuitem", { name: "..." })` for items
- Form inputs: `page.getByLabel(...)` or `page.getByPlaceholder(...)`
- Toasts: `[data-sonner-toast][data-type="success"]`
- Combobox/Select: `page.locator('[role="combobox"]')`

### Timeouts
- `networkidle`: 15000ms
- Navigation URL waits: 10000ms
- Element visibility: 5000-10000ms
- Toast visibility: 15000ms

## Exclusions

- **Enrichment** (single and bulk) — separate test suite
- **Import targets** — not in scope
- **Target contacts sub-table** — not in scope
- **Pagination** — not in scope (covered implicitly by table rendering)

## Test Data Values

Target creation will use distinctive test values to make assertions reliable:

```
first_name: "PW-Target-First"
last_name: "PW-Target-Last"
email: "pw-target@test.example.com"
company: "PW Test Corp"
position: "QA Engineer"
// ... (all other fields with "PW-" prefix for easy identification)
```

Target list creation:
```
name: "PW-Target-List"
description: "Playwright test target list"
```
