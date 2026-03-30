# Campaign Tests Refactor — UI-Based Data Creation

**Date:** 2026-03-30
**Scope:** Remove seed-campaigns API endpoint, rewrite campaign E2E tests to create data through UI forms

## Overview

Replace API-seeded test data with UI-created data in all campaign Playwright tests. Each test file becomes fully self-contained — no seed endpoints, no cross-file dependencies.

## Changes

### Delete
- `app/api/test/seed-campaigns/route.ts` — test seed endpoint no longer needed

### Rewrite: `campaign-list.spec.ts`

Remove the `beforeAll` seed call. Add a campaign creation test at the start of the serial block that:
1. Creates a target list via the CreateTargetListModal (`/en/campaigns/target-lists`)
2. Navigates to `/en/campaigns/new` and completes the 4-step wizard:
   - Step 1: Fill campaign name ("PW-Campaign-List"), description, from name, reply-to email
   - Step 2: Fill subject line ("PW Test Subject"), type body content into TipTap editor
   - Step 3: Select the target list created in step 1
   - Step 4: Choose "Send Now" or submit
3. Verify success (redirect to campaign detail or success toast)
4. Navigate back to `/en/campaigns` and verify the campaign appears in the table

Remaining tests stay the same:
- should display campaigns list page with table
- should filter campaigns by name
- should filter campaigns by status dropdown
- should reset filters
- should navigate to campaign detail via row action View
- should navigate to campaign detail via name link
- should delete a campaign via row action
- should navigate to new campaign page

### Rewrite: `campaign-detail.spec.ts`

Add a campaign creation test at the start (same wizard flow as above, with distinct test data: "PW-Campaign-Detail", target list "PW-CD-Target-List"). This makes the detail tests self-contained.

Remaining tests stay the same:
- should navigate to detail page and display campaign info
- should display status badge on detail page
- should display stats grid with all metric cards
- should return 404 for non-existent campaign

### No Changes: `campaign-create.spec.ts`

Already tests the wizard form directly. Does not depend on seed data.

## Test Data Values

| File | Campaign Name | Target List Name | Subject |
|------|--------------|-----------------|---------|
| campaign-list.spec.ts | PW-Campaign-List | PW-CL-Target-List | PW List Test Subject |
| campaign-detail.spec.ts | PW-Campaign-Detail | PW-CD-Target-List | PW Detail Test Subject |

## Technical Patterns

- Same helpers: `assertSuccessToast()`, `waitForRows()`
- Same auth: `storageState: "playwright/.auth/user.json"`
- Same selectors: shadcn/ui roles, data-sonner-toast, table locators
- Campaign wizard selectors (from campaign-create.spec.ts):
  - Step 1: `getByLabel("Campaign Name *")`, `getByLabel("Description")`, `getByLabel("From Name")`, `getByLabel("Reply-to Email")`
  - Step 2: `locator('input[placeholder="Your email subject..."]')`, `.tiptap, .ProseMirror` for TipTap editor
  - Step 3: `locator('input[type="checkbox"]')` for target list selection
  - Step 4: `getByRole("button", { name: /Submit Campaign/i })` or send now option
- Target list creation: `getByRole("button", { name: /\+ New List/i })`, `getByLabel("Name *")`, `getByLabel("Description")`, `getByRole("button", { name: "Create" })`
