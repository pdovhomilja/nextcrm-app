# Sales Flow Playwright Test Design

**Date:** 2026-03-28
**Status:** Approved

## Overview

A chained Playwright E2E test suite covering the full CRM sales flow: Account → Contact → Lead → Opportunity. Tests run sequentially in serial mode, sharing entity IDs between steps. Test data is left in the dev database after runs (no cleanup). Locale-prefixed URLs (`/en/crm/*`) are matched via regex.

---

## File Structure

```
tests/
  auth.setup.ts              (existing - unchanged)
  e2e/
    auth.spec.ts             (existing - unchanged)
    home.spec.ts             (existing - unchanged)
    crm.spec.ts              (existing - unchanged)
    sales-flow.spec.ts       (NEW)
```

---

## Shared State

```ts
const testData = {
  accountId: "",
  contactId: "",
  leadId: "",
  opportunityId: "",
};
```

Populated incrementally by extracting IDs from the URL after each creation and navigation to the detail page.

---

## Auth

Uses existing `storageState: "playwright/.auth/user.json"` from `tests/auth.setup.ts`. No changes needed to auth setup.

---

## data-testid Additions

These attributes must be added to production components. Form field inputs are targeted via `getByLabel()` (already have `<FormLabel>` wrappers) — no `data-testid` needed on inputs.

### Accounts
| Component | Element | data-testid |
|-----------|---------|-------------|
| `AccountsView.tsx` | Sheet trigger `+` button | `add-account-btn` |
| `NewAccountForm.tsx` | Submit button | `account-submit-btn` |
| `accounts/table-components/data-table.tsx` | Table wrapper | `accounts-table` |
| `accounts/table-components/columns.tsx` | Row name link | `account-row-name` |

### Contacts
| Component | Element | data-testid |
|-----------|---------|-------------|
| Contacts view trigger button | `+` button | `add-contact-btn` |
| `NewContactForm.tsx` | Submit button | `contact-submit-btn` |
| `contacts/table-components/data-table.tsx` | Table wrapper | `contacts-table` |
| `contacts/table-components/columns.tsx` | Row name link | `contact-row-name` |

### Leads
| Component | Element | data-testid |
|-----------|---------|-------------|
| Leads view trigger button | `+` button | `add-lead-btn` |
| Lead new form | Submit button | `lead-submit-btn` |
| `leads/table-components/data-table.tsx` | Table wrapper | `leads-table` |
| `leads/table-components/columns.tsx` | Row name link | `lead-row-name` |

### Opportunities
| Component | Element | data-testid |
|-----------|---------|-------------|
| Opportunities view trigger button | `+` button | `add-opportunity-btn` |
| `NewOpportunityForm.tsx` | Submit button | `opportunity-submit-btn` |
| `opportunities/table-components/data-table.tsx` | Table wrapper | `opportunities-table` |
| `opportunities/table-components/columns.tsx` | Row name link | `opportunity-row-name` |

---

## Test Sequence

All tests live in `test.describe.serial("Sales Flow", () => { ... })` with `test.use({ storageState: "playwright/.auth/user.json" })`.

### Test 1 — Create Account

1. Navigate to `/crm/accounts` (regex match for locale prefix)
2. Click `[data-testid="add-account-btn"]` → Sheet opens
3. Fill required fields via `getByLabel()`:
   - Account name (e.g. `"Playwright Test Inc."`)
   - Email (`"playwright@test.com"`)
   - Company ID (`"12345678"`)
   - Billing street, postal code, city, country
4. Select Industry via combobox
5. Select Assigned To via UserSearchCombobox
6. Click `[data-testid="account-submit-btn"]`
7. Assert sonner success toast is visible
8. Assert `[data-testid="accounts-table"]` contains row with `"Playwright Test Inc."`
9. Click `[data-testid="account-row-name"]` for that row
10. Assert URL matches `/crm/accounts/[id]`
11. Extract ID from URL → `testData.accountId`

### Test 2 — Create Contact linked to Account

1. Navigate to `/crm/contacts`
2. Click `[data-testid="add-contact-btn"]` → Sheet opens
3. Fill required fields:
   - Last name (`"Playwright"`)
   - Email
   - Assigned To
   - Assigned Account → select using `testData.accountId`
4. Click `[data-testid="contact-submit-btn"]`
5. Assert success toast
6. Assert `[data-testid="contacts-table"]` contains the new contact row
7. Click `[data-testid="contact-row-name"]`
8. Assert URL matches `/crm/contacts/[id]`
9. Extract ID → `testData.contactId`

### Test 3 — Create Lead

1. Navigate to `/crm/leads`
2. Click `[data-testid="add-lead-btn"]` → Sheet opens
3. Fill required fields (first name, last name, email, assigned to, linked account)
4. Click `[data-testid="lead-submit-btn"]`
5. Assert success toast
6. Assert `[data-testid="leads-table"]` contains new lead row
7. Click `[data-testid="lead-row-name"]`
8. Assert URL matches `/crm/leads/[id]`
9. Extract ID → `testData.leadId`

### Test 4 — Create Opportunity linked to Account + Contact

1. Navigate to `/crm/opportunities`
2. Click `[data-testid="add-opportunity-btn"]` → Sheet opens
3. Fill required fields:
   - Name (`"Playwright Test Opportunity"`)
   - Close date (via Calendar popover — pick a future date)
   - Sales type, sales stage selects
   - Budget (`"100000"`), currency (`"USD"`), expected revenue (`"80000"`)
   - Assigned To
   - Account → select using `testData.accountId`
   - Contact → select using `testData.contactId`
4. Click `[data-testid="opportunity-submit-btn"]`
5. Assert success toast
6. Assert `[data-testid="opportunities-table"]` contains new opportunity row
7. Click `[data-testid="opportunity-row-name"]`
8. Assert URL matches `/crm/opportunities/[id]`
9. Extract ID → `testData.opportunityId`

---

## Technical Notes

- **Serial mode:** `test.describe.serial` ensures sequential execution; a failure in Test 1 skips Tests 2–4.
- **URL locale:** Use `page.waitForURL(/.*\/crm\/accounts/)` patterns to handle `/en/`, `/cs/` etc.
- **Sheet timing:** After clicking trigger button, wait for `page.waitForSelector('[role="dialog"], [data-state="open"]')` before filling fields.
- **Toast detection:** Sonner renders toasts in a `[data-sonner-toaster]` element — assert `page.locator('[data-sonner-toast]').first()` is visible.
- **UserSearchCombobox:** Requires typing in the combobox input and selecting from dropdown — handle with `page.getByRole("combobox")` then keyboard/click interaction.
- **Calendar date picker:** Click the date button, wait for popover, then click a future date cell.
- **DB-backed selects (Industry, Sales Stage, Sales Type):** Pick the first available `<SelectItem>` in the dropdown — avoids hardcoding values that may differ between dev environments.
- **Lead form fields:** No `NewLeadForm.tsx` was found during design exploration. During implementation, inspect the leads view to confirm which fields are required before writing Test 3.
- **Playwright config:** No changes needed — existing `chromium` project with `setup` dependency covers this.

---

## Success Criteria

- All 4 tests pass end-to-end against the local dev environment
- Each test independently verifiable in the Playwright HTML report
- Test failures give clear indication of which entity/step broke
- No flakiness from timing — all waits use explicit `waitFor*` calls, no `waitForTimeout`
