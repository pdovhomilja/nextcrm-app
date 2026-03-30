# CRM Sales Module Update Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `⋯` detail-page actions menus (contacts, leads, opportunities) and 6 Playwright E2E specs covering update via list row action and detail page menu for each module.

**Architecture:** Replicate the `AccountDetailActions` pattern — a client component per module that renders a `DropdownMenu` → `Sheet` → `Update*Form`. The component is imported into the existing server-side `BasicView` which fetches any needed config. Six Playwright specs follow the exact structure of the existing account specs.

**Tech Stack:** Next.js 14 App Router, TypeScript, Zod, Radix UI (Sheet/DropdownMenu), Playwright, next-intl, Prisma, Sonner toasts

---

## File Map

**New files:**
- `app/[locale]/(routes)/crm/contacts/[contactId]/components/ContactDetailActions.tsx`
- `app/[locale]/(routes)/crm/leads/[leadId]/components/LeadDetailActions.tsx`
- `app/[locale]/(routes)/crm/opportunities/[opportunityId]/components/OpportunityDetailActions.tsx`
- `tests/e2e/contact-update.spec.ts`
- `tests/e2e/contact-detail-update.spec.ts`
- `tests/e2e/lead-update.spec.ts`
- `tests/e2e/lead-detail-update.spec.ts`
- `tests/e2e/opportunity-update.spec.ts`
- `tests/e2e/opportunity-detail-update.spec.ts`

**Modified files:**
- `app/[locale]/(routes)/crm/opportunities/components/UpdateOpportunityForm.tsx` — Zod `id` fix
- `app/[locale]/(routes)/crm/contacts/[contactId]/components/BasicView.tsx` — wire `ContactDetailActions`
- `app/[locale]/(routes)/crm/leads/[leadId]/components/BasicView.tsx` — wire `LeadDetailActions`
- `app/[locale]/(routes)/crm/opportunities/[opportunityId]/components/BasicView.tsx` — wire `OpportunityDetailActions`

---

## Task 1: Fix Opportunity Zod `id` constraint

**Files:**
- Modify: `app/[locale]/(routes)/crm/opportunities/components/UpdateOpportunityForm.tsx:61`

UUID IDs are 36 chars. `max(30)` silently blocks all form submissions. Same bug was fixed for accounts.

- [ ] **Step 1: Apply the fix**

In `UpdateOpportunityForm.tsx`, change line 61:
```ts
// Before
id: z.string().min(5).max(30),

// After
id: z.string().uuid(),
```

- [ ] **Step 2: Check TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | grep UpdateOpportunityForm
```
Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/(routes)/crm/opportunities/components/UpdateOpportunityForm.tsx"
git commit -m "fix: UpdateOpportunityForm Zod id max(30) → uuid() for UUID account IDs"
```

---

## Task 2: ContactDetailActions component

**Files:**
- Create: `app/[locale]/(routes)/crm/contacts/[contactId]/components/ContactDetailActions.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { UpdateContactForm } from "../../components/UpdateContactForm";

type ConfigItem = { id: string; name: string };

interface ContactDetailActionsProps {
  contact: any;
  contactTypes: ConfigItem[];
}

export function ContactDetailActions({
  contact,
  contactTypes,
}: ContactDetailActionsProps) {
  const [updateOpen, setUpdateOpen] = useState(false);

  return (
    <>
      <Sheet open={updateOpen} onOpenChange={setUpdateOpen}>
        <SheetContent className="w-full md:max-w-[771px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              Update Contact - {contact?.first_name} {contact?.last_name}
            </SheetTitle>
            <SheetDescription>Update contact details</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <UpdateContactForm
              initialData={contact}
              setOpen={setUpdateOpen}
              contactTypes={contactTypes}
            />
          </div>
        </SheetContent>
      </Sheet>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
            data-testid="contact-detail-actions-btn"
          >
            <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuItem onClick={() => setUpdateOpen(true)}>
            Update
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
```

- [ ] **Step 2: Check TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | grep ContactDetailActions
```
Expected: no output.

---

## Task 3: Wire ContactDetailActions into contacts BasicView

**Files:**
- Modify: `app/[locale]/(routes)/crm/contacts/[contactId]/components/BasicView.tsx`

The `BasicView` is a server component — it can call `getAllCrmData()` directly.

- [ ] **Step 1: Add import and fetch contactTypes**

At the top of `BasicView.tsx`, add the import:
```tsx
import { ContactDetailActions } from "./ContactDetailActions";
import { getAllCrmData } from "@/actions/crm/get-crm-data";
```

Inside the `BasicView` function body (it is already `async`), add after the existing `prismadb.users.findMany()` call:
```tsx
const crmData = await getAllCrmData();
const contactTypes = crmData.contactTypes;
```

- [ ] **Step 2: Replace the static area in CardHeader**

Find the `CardHeader` section. The current header renders the contact name and the `EnrichButton`. Add `ContactDetailActions` next to the `EnrichButton` in the same flex container:

```tsx
<div className="flex items-center gap-2">
  <EnrichButton
    contactId={data.id}
    contactEmail={data.email ?? null}
    contactCurrentData={{
      position:         data.position ?? null,
      website:          data.website ?? null,
      social_linkedin:  data.social_linkedin ?? null,
      social_twitter:   data.social_twitter ?? null,
      social_facebook:  data.social_facebook ?? null,
      social_instagram: data.social_instagram ?? null,
      description:      data.description ?? null,
      office_phone:     data.office_phone ?? null,
    }}
  />
  <ContactDetailActions contact={data} contactTypes={contactTypes} />
</div>
```

- [ ] **Step 3: Check TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | grep -E "contacts.*BasicView|ContactDetailActions"
```
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/(routes)/crm/contacts/[contactId]/components/ContactDetailActions.tsx" \
        "app/[locale]/(routes)/crm/contacts/[contactId]/components/BasicView.tsx"
git commit -m "feat: add ContactDetailActions — update sheet on contact detail page"
```

---

## Task 4: LeadDetailActions component

**Files:**
- Create: `app/[locale]/(routes)/crm/leads/[leadId]/components/LeadDetailActions.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { UpdateLeadForm } from "../../components/UpdateLeadForm";

type ConfigItem = { id: string; name: string };

interface LeadDetailActionsProps {
  lead: any;
  leadSources: ConfigItem[];
  leadStatuses: ConfigItem[];
  leadTypes: ConfigItem[];
}

export function LeadDetailActions({
  lead,
  leadSources,
  leadStatuses,
  leadTypes,
}: LeadDetailActionsProps) {
  const [updateOpen, setUpdateOpen] = useState(false);

  return (
    <>
      <Sheet open={updateOpen} onOpenChange={setUpdateOpen}>
        <SheetContent className="w-full md:max-w-[771px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              Update lead - {lead?.firstName} {lead?.lastName}
            </SheetTitle>
            <SheetDescription>Update lead details</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <UpdateLeadForm
              initialData={lead}
              setOpen={setUpdateOpen}
              leadSources={leadSources}
              leadStatuses={leadStatuses}
              leadTypes={leadTypes}
            />
          </div>
        </SheetContent>
      </Sheet>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
            data-testid="lead-detail-actions-btn"
          >
            <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuItem onClick={() => setUpdateOpen(true)}>
            Update
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
```

- [ ] **Step 2: Check TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | grep LeadDetailActions
```
Expected: no output.

---

## Task 5: Wire LeadDetailActions into leads BasicView

**Files:**
- Modify: `app/[locale]/(routes)/crm/leads/[leadId]/components/BasicView.tsx`

- [ ] **Step 1: Add imports and fetch config**

Add imports at the top:
```tsx
import { LeadDetailActions } from "./LeadDetailActions";
import { getAllCrmData } from "@/actions/crm/get-crm-data";
```

Inside the `BasicView` function body (already `async`), add after the existing `prismadb.users.findMany()` call:
```tsx
const crmData = await getAllCrmData();
const { leadSources, leadStatuses, leadTypes } = crmData;
```

- [ ] **Step 2: Replace the static MoreHorizontal icon in CardHeader**

Find this block in `BasicView.tsx` (around the `<MoreHorizontal>` TODO area):
```tsx
<div>
  {
    //TODO: Add menu
    //TODO: Add edit button
  }
  <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
</div>
```

Replace with:
```tsx
<LeadDetailActions
  lead={data}
  leadSources={leadSources}
  leadStatuses={leadStatuses}
  leadTypes={leadTypes}
/>
```

- [ ] **Step 3: Remove unused MoreHorizontal import** (if it's no longer used elsewhere in the file)

Check: `grep -n "MoreHorizontal" app/[locale]/\(routes\)/crm/leads/[leadId]/components/BasicView.tsx`

If only used in the block you just replaced, remove `MoreHorizontal` from the lucide import line.

- [ ] **Step 4: Check TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | grep -E "leads.*BasicView|LeadDetailActions"
```
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/(routes)/crm/leads/[leadId]/components/LeadDetailActions.tsx" \
        "app/[locale]/(routes)/crm/leads/[leadId]/components/BasicView.tsx"
git commit -m "feat: add LeadDetailActions — update sheet on lead detail page"
```

---

## Task 6: OpportunityDetailActions component

**Files:**
- Create: `app/[locale]/(routes)/crm/opportunities/[opportunityId]/components/OpportunityDetailActions.tsx`

Note: `UpdateOpportunityForm` fetches its own data via SWR (`/api/crm/opportunity`), so no config props are needed here.

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { UpdateOpportunityForm } from "../../components/UpdateOpportunityForm";

interface OpportunityDetailActionsProps {
  opportunity: any;
}

export function OpportunityDetailActions({
  opportunity,
}: OpportunityDetailActionsProps) {
  const [updateOpen, setUpdateOpen] = useState(false);

  return (
    <>
      <Sheet open={updateOpen} onOpenChange={setUpdateOpen}>
        <SheetContent className="w-full md:max-w-[771px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Update Opportunity - {opportunity?.name}</SheetTitle>
            <SheetDescription>Update opportunity details</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <UpdateOpportunityForm
              initialData={opportunity}
              setOpen={setUpdateOpen}
            />
          </div>
        </SheetContent>
      </Sheet>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
            data-testid="opportunity-detail-actions-btn"
          >
            <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuItem onClick={() => setUpdateOpen(true)}>
            Update
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
```

- [ ] **Step 2: Check TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | grep OpportunityDetailActions
```
Expected: no output.

---

## Task 7: Wire OpportunityDetailActions into opportunities BasicView

**Files:**
- Modify: `app/[locale]/(routes)/crm/opportunities/[opportunityId]/components/BasicView.tsx`

- [ ] **Step 1: Add import**

Add at the top of `BasicView.tsx`:
```tsx
import { OpportunityDetailActions } from "./OpportunityDetailActions";
```

- [ ] **Step 2: Replace CardHeader title area**

Find the `CardHeader` block:
```tsx
<CardHeader className="pb-3">
  <CardTitle>{data.name}</CardTitle>
  <CardDescription>ID:{data.id}</CardDescription>
</CardHeader>
```

Replace with:
```tsx
<CardHeader className="pb-3">
  <div className="flex w-full justify-between">
    <div>
      <CardTitle>{data.name}</CardTitle>
      <CardDescription>ID:{data.id}</CardDescription>
    </div>
    <OpportunityDetailActions opportunity={data} />
  </div>
</CardHeader>
```

- [ ] **Step 3: Check TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | grep -E "opportunities.*BasicView|OpportunityDetailActions"
```
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/(routes)/crm/opportunities/[opportunityId]/components/OpportunityDetailActions.tsx" \
        "app/[locale]/(routes)/crm/opportunities/[opportunityId]/components/BasicView.tsx"
git commit -m "feat: add OpportunityDetailActions — update sheet on opportunity detail page"
```

---

## Task 8: Playwright spec — contact list update

**Files:**
- Create: `tests/e2e/contact-update.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { test, expect, Page } from "@playwright/test";

async function waitForSheet(page: Page) {
  await page.waitForSelector('[role="dialog"][data-state="open"]', {
    timeout: 10000,
  });
}

async function assertSuccessToast(page: Page) {
  await expect(
    page.locator('[data-sonner-toast][data-type="success"]').first()
  ).toBeVisible({ timeout: 15000 });
}

test.describe("Update Contact", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("should update contact last name via row action on /crm/contacts", async ({
    page,
  }) => {
    await page.goto("/en/crm/contacts");
    await page.waitForURL(/crm\/contacts/, { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    const firstRow = page
      .getByTestId("contacts-table")
      .locator("tbody tr")
      .first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    // Open the row-actions dropdown
    await firstRow.locator("button:has(.sr-only)").first().click();

    // Click "Update" in the dropdown
    await page.getByRole("menuitem", { name: "Update" }).click();

    // Wait for the Sheet to open
    await waitForSheet(page);
    await expect(
      page.getByRole("heading", { name: /Update Contact/i })
    ).toBeVisible({ timeout: 5000 });

    // Update the last name (required field)
    const lastNameInput = page.getByLabel("Last name", { exact: true });
    await lastNameInput.clear();
    await lastNameInput.fill("UpdatedLastName");

    // Submit
    await page.locator('[role="dialog"] [type="submit"]').click();

    // Assert success
    await assertSuccessToast(page);
    await expect(
      page.locator('[role="dialog"][data-state="open"]')
    ).not.toBeVisible({ timeout: 8000 });
  });
});
```

- [ ] **Step 2: Run the spec**

```bash
pnpm playwright test tests/e2e/contact-update.spec.ts --reporter=line
```
Expected: 1 passed.

---

## Task 9: Playwright spec — contact detail update

**Files:**
- Create: `tests/e2e/contact-detail-update.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { test, expect, Page } from "@playwright/test";

async function waitForSheet(page: Page) {
  await page.waitForSelector('[role="dialog"][data-state="open"]', {
    timeout: 10000,
  });
}

async function assertSuccessToast(page: Page) {
  await expect(
    page.locator('[data-sonner-toast][data-type="success"]').first()
  ).toBeVisible({ timeout: 15000 });
}

test.describe("Update Contact from detail page", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("should update contact last name via ⋯ menu on /crm/contacts/[id]", async ({
    page,
  }) => {
    await page.goto("/en/crm/contacts");
    await page.waitForURL(/crm\/contacts/, { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Navigate to the first contact's detail page
    await page
      .getByTestId("contacts-table")
      .getByTestId("contact-row-name")
      .first()
      .click();

    await page.waitForURL(/crm\/contacts\/.+/, { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Open the ⋯ actions menu
    const actionsBtn = page.getByTestId("contact-detail-actions-btn");
    await expect(actionsBtn).toBeVisible({ timeout: 8000 });
    await actionsBtn.click();

    await page.getByRole("menuitem", { name: "Update" }).click();

    await waitForSheet(page);
    await expect(
      page.getByRole("heading", { name: /Update Contact/i })
    ).toBeVisible({ timeout: 5000 });

    // Update last name
    const lastNameInput = page.getByLabel("Last name", { exact: true });
    await lastNameInput.clear();
    await lastNameInput.fill("DetailUpdatedLastName");

    await page.locator('[role="dialog"] [type="submit"]').click();

    await assertSuccessToast(page);
    await expect(
      page.locator('[role="dialog"][data-state="open"]')
    ).not.toBeVisible({ timeout: 8000 });
  });
});
```

- [ ] **Step 2: Run the spec**

```bash
pnpm playwright test tests/e2e/contact-detail-update.spec.ts --reporter=line
```
Expected: 1 passed.

- [ ] **Step 3: Commit both contact specs**

```bash
git add tests/e2e/contact-update.spec.ts tests/e2e/contact-detail-update.spec.ts
git commit -m "test: Playwright update tests for contacts — list row action and detail page"
```

---

## Task 10: Playwright spec — lead list update

**Files:**
- Create: `tests/e2e/lead-update.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { test, expect, Page } from "@playwright/test";

async function waitForSheet(page: Page) {
  await page.waitForSelector('[role="dialog"][data-state="open"]', {
    timeout: 10000,
  });
}

async function assertSuccessToast(page: Page) {
  await expect(
    page.locator('[data-sonner-toast][data-type="success"]').first()
  ).toBeVisible({ timeout: 15000 });
}

test.describe("Update Lead", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("should update lead last name via row action on /crm/leads", async ({
    page,
  }) => {
    await page.goto("/en/crm/leads");
    await page.waitForURL(/crm\/leads/, { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    const firstRow = page
      .getByTestId("leads-table")
      .locator("tbody tr")
      .first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    // Open the row-actions dropdown
    await firstRow.locator("button:has(.sr-only)").first().click();

    await page.getByRole("menuitem", { name: "Update" }).click();

    await waitForSheet(page);
    await expect(
      page.getByRole("heading", { name: /Update lead/i })
    ).toBeVisible({ timeout: 5000 });

    // Update the last name (required, max 30)
    const lastNameInput = page.getByLabel("Last name", { exact: true });
    await lastNameInput.clear();
    await lastNameInput.fill("UpdatedLastName");

    await page.locator('[role="dialog"] [type="submit"]').click();

    await assertSuccessToast(page);
    await expect(
      page.locator('[role="dialog"][data-state="open"]')
    ).not.toBeVisible({ timeout: 8000 });
  });
});
```

- [ ] **Step 2: Run the spec**

```bash
pnpm playwright test tests/e2e/lead-update.spec.ts --reporter=line
```
Expected: 1 passed.

---

## Task 11: Playwright spec — lead detail update

**Files:**
- Create: `tests/e2e/lead-detail-update.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { test, expect, Page } from "@playwright/test";

async function waitForSheet(page: Page) {
  await page.waitForSelector('[role="dialog"][data-state="open"]', {
    timeout: 10000,
  });
}

async function assertSuccessToast(page: Page) {
  await expect(
    page.locator('[data-sonner-toast][data-type="success"]').first()
  ).toBeVisible({ timeout: 15000 });
}

test.describe("Update Lead from detail page", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("should update lead last name via ⋯ menu on /crm/leads/[id]", async ({
    page,
  }) => {
    await page.goto("/en/crm/leads");
    await page.waitForURL(/crm\/leads/, { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Navigate to the first lead's detail page
    await page
      .getByTestId("leads-table")
      .getByTestId("lead-row-name")
      .first()
      .click();

    await page.waitForURL(/crm\/leads\/.+/, { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Open the ⋯ actions menu
    const actionsBtn = page.getByTestId("lead-detail-actions-btn");
    await expect(actionsBtn).toBeVisible({ timeout: 8000 });
    await actionsBtn.click();

    await page.getByRole("menuitem", { name: "Update" }).click();

    await waitForSheet(page);
    await expect(
      page.getByRole("heading", { name: /Update lead/i })
    ).toBeVisible({ timeout: 5000 });

    const lastNameInput = page.getByLabel("Last name", { exact: true });
    await lastNameInput.clear();
    await lastNameInput.fill("DetailUpdatedLastName");

    await page.locator('[role="dialog"] [type="submit"]').click();

    await assertSuccessToast(page);
    await expect(
      page.locator('[role="dialog"][data-state="open"]')
    ).not.toBeVisible({ timeout: 8000 });
  });
});
```

- [ ] **Step 2: Run the spec**

```bash
pnpm playwright test tests/e2e/lead-detail-update.spec.ts --reporter=line
```
Expected: 1 passed.

- [ ] **Step 3: Commit both lead specs**

```bash
git add tests/e2e/lead-update.spec.ts tests/e2e/lead-detail-update.spec.ts
git commit -m "test: Playwright update tests for leads — list row action and detail page"
```

---

## Task 12: Playwright spec — opportunity list update

**Files:**
- Create: `tests/e2e/opportunity-update.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { test, expect, Page } from "@playwright/test";

async function waitForSheet(page: Page) {
  await page.waitForSelector('[role="dialog"][data-state="open"]', {
    timeout: 10000,
  });
}

async function assertSuccessToast(page: Page) {
  await expect(
    page.locator('[data-sonner-toast][data-type="success"]').first()
  ).toBeVisible({ timeout: 15000 });
}

test.describe("Update Opportunity", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("should update opportunity name via row action on /crm/opportunities", async ({
    page,
  }) => {
    await page.goto("/en/crm/opportunities");
    await page.waitForURL(/crm\/opportunities/, { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    const firstRow = page
      .getByTestId("opportunities-table")
      .locator("tbody tr")
      .first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    // Open the row-actions dropdown
    await firstRow.locator("button:has(.sr-only)").first().click();

    await page.getByRole("menuitem", { name: "Update" }).click();

    // Wait for Sheet AND for the SWR fetch inside the form to complete
    await waitForSheet(page);
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Update the opportunity name (required)
    const nameInput = page.getByLabel("Opportunity name", { exact: true });
    await nameInput.clear();
    await nameInput.fill("Updated Opportunity Name");

    await page.locator('[role="dialog"] [type="submit"]').click();

    await assertSuccessToast(page);
    await expect(
      page.locator('[role="dialog"][data-state="open"]')
    ).not.toBeVisible({ timeout: 8000 });
  });
});
```

- [ ] **Step 2: Run the spec**

```bash
pnpm playwright test tests/e2e/opportunity-update.spec.ts --reporter=line
```
Expected: 1 passed.

---

## Task 13: Playwright spec — opportunity detail update

**Files:**
- Create: `tests/e2e/opportunity-detail-update.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { test, expect, Page } from "@playwright/test";

async function waitForSheet(page: Page) {
  await page.waitForSelector('[role="dialog"][data-state="open"]', {
    timeout: 10000,
  });
}

async function assertSuccessToast(page: Page) {
  await expect(
    page.locator('[data-sonner-toast][data-type="success"]').first()
  ).toBeVisible({ timeout: 15000 });
}

test.describe("Update Opportunity from detail page", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("should update opportunity name via ⋯ menu on /crm/opportunities/[id]", async ({
    page,
  }) => {
    await page.goto("/en/crm/opportunities");
    await page.waitForURL(/crm\/opportunities/, { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Navigate to the first opportunity's detail page
    await page
      .getByTestId("opportunities-table")
      .getByTestId("opportunity-row-name")
      .first()
      .click();

    await page.waitForURL(/crm\/opportunities\/.+/, { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Open the ⋯ actions menu
    const actionsBtn = page.getByTestId("opportunity-detail-actions-btn");
    await expect(actionsBtn).toBeVisible({ timeout: 8000 });
    await actionsBtn.click();

    await page.getByRole("menuitem", { name: "Update" }).click();

    // Wait for Sheet AND SWR data fetch inside UpdateOpportunityForm
    await waitForSheet(page);
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    const nameInput = page.getByLabel("Opportunity name", { exact: true });
    await nameInput.clear();
    await nameInput.fill("Detail Updated Opportunity Name");

    await page.locator('[role="dialog"] [type="submit"]').click();

    await assertSuccessToast(page);
    await expect(
      page.locator('[role="dialog"][data-state="open"]')
    ).not.toBeVisible({ timeout: 8000 });
  });
});
```

- [ ] **Step 2: Run the spec**

```bash
pnpm playwright test tests/e2e/opportunity-detail-update.spec.ts --reporter=line
```
Expected: 1 passed.

- [ ] **Step 3: Commit both opportunity specs**

```bash
git add tests/e2e/opportunity-update.spec.ts tests/e2e/opportunity-detail-update.spec.ts
git commit -m "test: Playwright update tests for opportunities — list row action and detail page"
```

---

## Task 14: Final verification

- [ ] **Step 1: Run all 6 new specs together**

```bash
pnpm playwright test tests/e2e/contact-update.spec.ts tests/e2e/contact-detail-update.spec.ts tests/e2e/lead-update.spec.ts tests/e2e/lead-detail-update.spec.ts tests/e2e/opportunity-update.spec.ts tests/e2e/opportunity-detail-update.spec.ts --reporter=line
```
Expected: 6 passed.

- [ ] **Step 2: Run full TypeScript check**

```bash
pnpm tsc --noEmit
```
Expected: no errors.
