# Design: Playwright Update Tests for CRM Sales Modules

**Date:** 2026-03-30
**Status:** Approved

## Context

The last commit (`ea58212`) added `AccountDetailActions` + two Playwright specs covering update via list row action and detail page `⋯` menu for accounts. This spec extends the same pattern to **contacts**, **leads**, and **opportunities**.

## Scope

For each of the three modules:
1. Add a `*DetailActions` client component wiring the existing `Update*Form` into a Sheet accessible from a `⋯` dropdown on the detail page.
2. Wire that component into the module's `BasicView.tsx`.
3. Write two Playwright E2E specs: one for list-page row action update, one for detail-page `⋯` menu update.

Also fix a latent Zod schema bug in `UpdateOpportunityForm` (`id: max(30)` → `uuid()`).

---

## Components to Add

### ContactDetailActions
- **File:** `app/[locale]/(routes)/crm/contacts/[contactId]/components/ContactDetailActions.tsx`
- **Pattern:** Identical to `AccountDetailActions`.
- **Props:** `contact: any`, `contactTypes: ConfigItem[]`
- **Renders:** `DropdownMenu` button with `data-testid="contact-detail-actions-btn"` → Sheet → `UpdateContactForm`
- **Integration:** `BasicView.tsx` in contacts — import and render in `CardHeader` alongside the name, replacing the static approach. The `BasicView` is a server component so it fetches `contactTypes` via `getAllCrmData()` and passes them down.

### LeadDetailActions
- **File:** `app/[locale]/(routes)/crm/leads/[leadId]/components/LeadDetailActions.tsx`
- **Props:** `lead: any`, `leadSources: ConfigItem[]`, `leadStatuses: ConfigItem[]`, `leadTypes: ConfigItem[]`
- **Renders:** `DropdownMenu` button with `data-testid="lead-detail-actions-btn"` → Sheet → `UpdateLeadForm`
- **Integration:** `BasicView.tsx` in leads — currently has a static `MoreHorizontal` icon with a TODO comment; replace with this component. The `BasicView` fetches config via `getAllCrmData()`.

### OpportunityDetailActions
- **File:** `app/[locale]/(routes)/crm/opportunities/[opportunityId]/components/OpportunityDetailActions.tsx`
- **Props:** `opportunity: any`
- **Renders:** `DropdownMenu` button with `data-testid="opportunity-detail-actions-btn"` → Sheet → `UpdateOpportunityForm`
- **Integration:** `BasicView.tsx` in opportunities — no config props needed (`UpdateOpportunityForm` fetches its own data via SWR).

---

## Bug Fix

**File:** `app/[locale]/(routes)/crm/opportunities/components/UpdateOpportunityForm.tsx`

**Change:** `id: z.string().min(5).max(30)` → `id: z.string().uuid()`

**Reason:** UUID-format IDs are 36 chars; `max(30)` silently blocks all form submissions. Same bug was fixed for accounts in `ea58212`.

---

## Test Files (6 total)

All tests follow the shared helper pattern from the existing account specs:
- `waitForSheet(page)` — waits for `[role="dialog"][data-state="open"]`
- `assertSuccessToast(page)` — asserts `[data-sonner-toast][data-type="success"]`
- `fillIfEmpty(page, label, value)` — fills only if empty, avoids overwriting + avoids Zod `min()` failures

### contacts

**`tests/e2e/contact-update.spec.ts`**
- Navigate to `/en/crm/contacts`
- Wait for `contacts-table`, get first `tbody tr`
- Click `⋯` button (`button:has(.sr-only)`)
- Click menuitem "Update"
- Wait for Sheet, assert heading `/Update Contact/i`
- Clear and fill `Last name` input with new value
- Submit, assert success toast, assert sheet closes
- Assert updated name visible in table

**`tests/e2e/contact-detail-update.spec.ts`**
- Navigate to `/en/crm/contacts`, wait for table
- Click `contact-row-name` link → wait for `/crm/contacts/.+/`
- Click `data-testid="contact-detail-actions-btn"`
- Click menuitem "Update"
- Wait for Sheet, assert heading `/Update Contact/i`
- Clear and fill `Last name`, submit, assert success toast

### leads

**`tests/e2e/lead-update.spec.ts`**
- Navigate to `/en/crm/leads`
- Wait for `leads-table`, get first `tbody tr`
- Click `⋯` button → click menuitem "Update"
- Wait for Sheet, assert heading `/Update lead/i`
- Clear and fill `Last name` input
- Submit, assert success toast, assert sheet closes

**`tests/e2e/lead-detail-update.spec.ts`**
- Navigate to `/en/crm/leads`, click `lead-row-name` → wait for `/crm/leads/.+/`
- Click `data-testid="lead-detail-actions-btn"`
- Click menuitem "Update"
- Wait for Sheet, assert heading `/Update lead/i`
- Clear and fill `Last name`, submit, assert success toast

### opportunities

**`tests/e2e/opportunity-update.spec.ts`**
- Navigate to `/en/crm/opportunities`
- Wait for `opportunities-table`, get first `tbody tr`
- Click `⋯` button → click menuitem "Update"
- Wait for Sheet, assert heading `/Update/i`
- Clear and fill `Name` input
- Submit, assert success toast, assert sheet closes

**`tests/e2e/opportunity-detail-update.spec.ts`**
- Navigate to `/en/crm/opportunities`, click `opportunity-row-name` → wait for `/crm/opportunities/.+/`
- Click `data-testid="opportunity-detail-actions-btn"`
- Click menuitem "Update"
- Wait for Sheet, wait for form to load (SWR fetch), assert heading `/Update/i`
- Clear and fill `Name`, submit, assert success toast

---

## Implementation Order

1. Fix Zod bug in `UpdateOpportunityForm`
2. Add `ContactDetailActions` + wire into contacts `BasicView`
3. Add `LeadDetailActions` + wire into leads `BasicView`
4. Add `OpportunityDetailActions` + wire into opportunities `BasicView`
5. Write 6 Playwright spec files
6. Run `pnpm playwright test` to verify all pass

---

## Success Criteria

- All 6 spec files pass in CI
- No TypeScript errors (`pnpm tsc --noEmit`)
- Detail page `⋯` menus work for contacts, leads, opportunities matching the accounts pattern
