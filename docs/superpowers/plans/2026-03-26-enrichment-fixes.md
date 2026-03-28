# Enrichment Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 5 bugs/gaps in the target enrichment pipeline: Inngest field mapping, shared preset module (DRY), skip-list TTL cache, field name validation on enrich routes, and orchestrator timeout.

**Architecture:** All fixes are isolated to the enrichment subsystem. A new shared module `lib/enrichment/presets/target-fields.ts` acts as single source of truth for field definitions and FIELD_MAP. Changes flow from this module outward to Inngest, API routes, and UI components.

**Tech Stack:** TypeScript, Next.js 14 API routes, Prisma, Inngest, React (client components)

**Spec:** `docs/superpowers/specs/2026-03-26-enrichment-fixes-design.md`

---

## File Map

| Action | File |
|--------|------|
| **Create** | `lib/enrichment/presets/target-fields.ts` |
| **Modify** | `inngest/functions/enrich-target.ts` |
| **Modify** | `app/[locale]/(routes)/campaigns/targets/[targetId]/components/EnrichTargetDrawer.tsx` |
| **Modify** | `app/[locale]/(routes)/campaigns/targets/components/BulkEnrichTargetsModal.tsx` |
| **Modify** | `app/api/crm/targets/[id]/route.ts` |
| **Modify** | `app/api/crm/targets/enrich/route.ts` |
| **Modify** | `app/api/crm/targets/enrich-bulk/route.ts` |
| **Modify** | `lib/enrichment/utils/skip-list.ts` |
| **Modify** | `lib/enrichment/strategies/agent-enrichment-strategy.ts` |

---

## Task 1: Create shared target field presets module

**Files:**
- Create: `lib/enrichment/presets/target-fields.ts`

This module consolidates all field definitions and FIELD_MAP in one place. All other tasks depend on it.

- [ ] **Step 1: Create the shared module**

```typescript
// lib/enrichment/presets/target-fields.ts
import type { EnrichmentField } from "@/lib/enrichment/types";

export const PERSONAL_PRESET_FIELDS: EnrichmentField[] = [
  { name: "position",         displayName: "Position / Job Title",   description: "The target's job title or role", type: "string", required: false },
  { name: "company",          displayName: "Company Name",            description: "The target's company name", type: "string", required: false },
  { name: "company_website",  displayName: "Company Website",         description: "The company's official website URL", type: "string", required: false },
  { name: "social_linkedin",  displayName: "LinkedIn URL",            description: "The target's LinkedIn profile URL", type: "string", required: false },
  { name: "social_x",         displayName: "Twitter / X URL",         description: "The target's Twitter/X profile URL", type: "string", required: false },
  { name: "mobile_phone",     displayName: "Mobile Phone",            description: "The target's mobile phone number", type: "string", required: false },
  { name: "office_phone",     displayName: "Office Phone",            description: "The target's office phone number", type: "string", required: false },
  { name: "personal_website", displayName: "Personal Website",        description: "The target's personal website URL", type: "string", required: false },
  { name: "personal_email",   displayName: "Personal Email",          description: "The target's personal (non-company) email", type: "string", required: false },
  { name: "social_instagram", displayName: "Instagram URL",           description: "The target's Instagram profile URL", type: "string", required: false },
  { name: "social_facebook",  displayName: "Facebook URL",            description: "The target's Facebook profile URL", type: "string", required: false },
];

export const PERSONAL_DEFAULTS = ["position", "company", "social_linkedin", "company_website"];

export const COMPANY_PRESET_FIELDS: EnrichmentField[] = [
  { name: "company_website",  displayName: "Company Website",         description: "The company's official website URL", type: "string", required: false },
  { name: "industry",         displayName: "Industry",                description: "Company industry / sector", type: "string", required: false },
  { name: "employees",        displayName: "Employees",               description: "Approximate number of employees", type: "string", required: false },
  { name: "description",      displayName: "Description",             description: "Short company description", type: "string", required: false },
  { name: "city",             displayName: "City",                    description: "Company HQ city", type: "string", required: false },
  { name: "country",          displayName: "Country",                 description: "Company HQ country", type: "string", required: false },
  { name: "company_email",    displayName: "Company Email",           description: "Generic company contact email (info@...)", type: "string", required: false },
  { name: "company_phone",    displayName: "Company Phone",           description: "Main company switchboard number", type: "string", required: false },
  { name: "social_linkedin",  displayName: "LinkedIn (Company Page)", description: "The company's LinkedIn page URL", type: "string", required: false },
];

export const COMPANY_DEFAULTS = ["industry", "employees", "description", "city", "country", "company_website"];

// Combined list for bulk enrichment — covers both personal and company scenarios.
// email is included here because BulkEnrichTargetsModal previously listed it; keep for backwards compat.
export const ALL_TARGET_PRESET_FIELDS: EnrichmentField[] = [
  { name: "email",            displayName: "Email",                   description: "The target's direct email address", type: "string", required: false },
  { name: "personal_email",   displayName: "Personal Email",          description: "The target's personal (non-company) email", type: "string", required: false },
  { name: "position",         displayName: "Position / Job Title",   description: "The target's job title or role", type: "string", required: false },
  { name: "company",          displayName: "Company Name",            description: "The target's company name", type: "string", required: false },
  { name: "company_website",  displayName: "Company Website",         description: "The company's official website URL", type: "string", required: false },
  { name: "personal_website", displayName: "Personal Website",        description: "The target's personal website URL", type: "string", required: false },
  { name: "mobile_phone",     displayName: "Mobile Phone",            description: "The target's mobile phone number", type: "string", required: false },
  { name: "office_phone",     displayName: "Office Phone",            description: "The target's office phone number", type: "string", required: false },
  { name: "social_linkedin",  displayName: "LinkedIn URL",            description: "The target's LinkedIn profile URL", type: "string", required: false },
  { name: "social_x",         displayName: "Twitter / X URL",         description: "The target's Twitter/X profile URL", type: "string", required: false },
  { name: "social_instagram", displayName: "Instagram URL",           description: "The target's Instagram profile URL", type: "string", required: false },
  { name: "social_facebook",  displayName: "Facebook URL",            description: "The target's Facebook profile URL", type: "string", required: false },
  { name: "company_email",    displayName: "Company Email",           description: "Generic company contact email (info@...)", type: "string", required: false },
  { name: "company_phone",    displayName: "Company Phone",           description: "Main company switchboard number", type: "string", required: false },
  { name: "city",             displayName: "City",                    description: "Company HQ city", type: "string", required: false },
  { name: "country",          displayName: "Country",                 description: "Company HQ country", type: "string", required: false },
  { name: "industry",         displayName: "Industry",                description: "Company industry / sector", type: "string", required: false },
  { name: "employees",        displayName: "Employees",               description: "Number of employees", type: "string", required: false },
  { name: "description",      displayName: "Description",             description: "Short company description", type: "string", required: false },
];

// Single source of truth for which enrichment field names map to which DB columns.
// Used by PATCH /api/crm/targets/[id] and by field name validation in enrich routes.
export const FIELD_MAP: Record<string, string> = {
  position:         "position",
  company:          "company",
  company_website:  "company_website",
  personal_website: "personal_website",
  mobile_phone:     "mobile_phone",
  office_phone:     "office_phone",
  social_linkedin:  "social_linkedin",
  social_x:         "social_x",
  social_instagram: "social_instagram",
  social_facebook:  "social_facebook",
  personal_email:   "personal_email",
  company_email:    "company_email",
  company_phone:    "company_phone",
  industry:         "industry",
  employees:        "employees",
  description:      "description",
  city:             "city",
  country:          "country",
};
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

Run: `cd /Users/pavel-clawdbot/.openclaw/workspace-chopper/development/nextcrm-app && npx tsc --noEmit 2>&1 | head -30`

Expected: no errors from the new file (it may show unrelated pre-existing errors; that's fine).

- [ ] **Step 3: Commit**

```bash
git add lib/enrichment/presets/target-fields.ts
git commit -m "feat: add shared target enrichment field presets and FIELD_MAP module"
```

---

## Task 2: Fix Inngest field mapping + Prisma select

**Files:**
- Modify: `inngest/functions/enrich-target.ts`

The `targetFieldMap` is missing 8 fields and the Prisma `select` doesn't fetch them, breaking the `isFieldEmpty` guard.

- [ ] **Step 1: Extend `targetFieldMap` with 8 new fields**

In `inngest/functions/enrich-target.ts`, replace:

```typescript
const targetFieldMap = {
  position:         "position",
  company:          "company",
  company_website:  "company_website",
  personal_website: "personal_website",
  mobile_phone:     "mobile_phone",
  office_phone:     "office_phone",
  social_linkedin:  "social_linkedin",
  social_x:         "social_x",
  social_instagram: "social_instagram",
  social_facebook:  "social_facebook",
} as const;
```

With:

```typescript
const targetFieldMap = {
  position:         "position",
  company:          "company",
  company_website:  "company_website",
  personal_website: "personal_website",
  mobile_phone:     "mobile_phone",
  office_phone:     "office_phone",
  social_linkedin:  "social_linkedin",
  social_x:         "social_x",
  social_instagram: "social_instagram",
  social_facebook:  "social_facebook",
  personal_email:   "personal_email",
  company_email:    "company_email",
  company_phone:    "company_phone",
  industry:         "industry",
  employees:        "employees",
  description:      "description",
  city:             "city",
  country:          "country",
} as const;
```

- [ ] **Step 2: Extend Prisma select to fetch the 8 new columns**

In `inngest/functions/enrich-target.ts`, replace:

```typescript
      select: {
        id: true,
        email: true,
        position: true,
        company: true,
        company_website: true,
        personal_website: true,
        mobile_phone: true,
        office_phone: true,
        social_linkedin: true,
        social_x: true,
        social_instagram: true,
        social_facebook: true,
      },
```

With:

```typescript
      select: {
        id: true,
        email: true,
        position: true,
        company: true,
        company_website: true,
        personal_website: true,
        mobile_phone: true,
        office_phone: true,
        social_linkedin: true,
        social_x: true,
        social_instagram: true,
        social_facebook: true,
        personal_email: true,
        company_email: true,
        company_phone: true,
        industry: true,
        employees: true,
        description: true,
        city: true,
        country: true,
      },
```

- [ ] **Step 3: Verify TypeScript compiles cleanly**

Run: `npx tsc --noEmit 2>&1 | grep "enrich-target" | head -20`

Expected: no errors in this file.

- [ ] **Step 4: Commit**

```bash
git add inngest/functions/enrich-target.ts
git commit -m "fix: add 8 missing fields to Inngest targetFieldMap and Prisma select"
```

---

## Task 3: Update EnrichTargetDrawer to import from shared module

**Files:**
- Modify: `app/[locale]/(routes)/campaigns/targets/[targetId]/components/EnrichTargetDrawer.tsx`

Remove the 4 inline constant definitions and replace with imports from the shared module.

- [ ] **Step 1: Add import, remove inline definitions**

Add this import after the existing imports at the top of the file:

```typescript
import {
  PERSONAL_PRESET_FIELDS,
  PERSONAL_DEFAULTS,
  COMPANY_PRESET_FIELDS,
  COMPANY_DEFAULTS,
} from "@/lib/enrichment/presets/target-fields";
```

Then remove the 4 inline constant blocks (lines 48–76 in the current file):
- `const PERSONAL_PRESET_FIELDS: EnrichmentField[] = [...]`
- `const PERSONAL_DEFAULTS = [...]`
- `const COMPANY_PRESET_FIELDS: EnrichmentField[] = [...]`
- `const COMPANY_DEFAULTS = [...]`

**Keep** the `import type { EnrichmentField } from "@/lib/enrichment/types"` line on line 12 — it is still needed by the `TargetCurrentData` interface in this file. The rest of the file is unchanged — `presetFields` and `defaultSelected` already reference the imported names.

- [ ] **Step 2: Verify TypeScript compiles cleanly**

Run: `npx tsc --noEmit 2>&1 | grep "EnrichTargetDrawer" | head -20`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/(routes)/campaigns/targets/[targetId]/components/EnrichTargetDrawer.tsx"
git commit -m "refactor: import field presets from shared module in EnrichTargetDrawer"
```

---

## Task 4: Update BulkEnrichTargetsModal to import from shared module

**Files:**
- Modify: `app/[locale]/(routes)/campaigns/targets/components/BulkEnrichTargetsModal.tsx`

Remove the inline `TARGET_PRESET_FIELDS` array and replace with `ALL_TARGET_PRESET_FIELDS` from the shared module.

- [ ] **Step 1: Replace import and inline definition**

Replace the existing `EnrichmentField` import line:

```typescript
import type { EnrichmentField } from "@/lib/enrichment/types";
```

With:

```typescript
import type { EnrichmentField } from "@/lib/enrichment/types";
import { ALL_TARGET_PRESET_FIELDS } from "@/lib/enrichment/presets/target-fields";
```

Then remove the entire `TARGET_PRESET_FIELDS` constant block (lines 16–36).

Then in the `<EnrichFieldSelector>` JSX, replace `presetFields={TARGET_PRESET_FIELDS}` with `presetFields={ALL_TARGET_PRESET_FIELDS}`.

- [ ] **Step 2: Verify TypeScript compiles cleanly**

Run: `npx tsc --noEmit 2>&1 | grep "BulkEnrich" | head -20`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/(routes)/campaigns/targets/components/BulkEnrichTargetsModal.tsx"
git commit -m "refactor: import ALL_TARGET_PRESET_FIELDS from shared module in BulkEnrichTargetsModal"
```

---

## Task 5: Update [id]/route.ts to import FIELD_MAP from shared module

**Files:**
- Modify: `app/api/crm/targets/[id]/route.ts`

Remove the local `FIELD_MAP` definition and import from the shared module.

- [ ] **Step 1: Add import, remove local definition**

Add this import at the top of `app/api/crm/targets/[id]/route.ts`:

```typescript
import { FIELD_MAP } from "@/lib/enrichment/presets/target-fields";
```

Then remove the local `FIELD_MAP` constant block (lines 6–25) — the exact block to delete:

```typescript
const FIELD_MAP: Record<string, string> = {
  position:         "position",
  company:          "company",
  company_website:  "company_website",
  personal_website: "personal_website",
  mobile_phone:     "mobile_phone",
  office_phone:     "office_phone",
  social_linkedin:  "social_linkedin",
  social_x:         "social_x",
  social_instagram: "social_instagram",
  social_facebook:  "social_facebook",
  personal_email:   "personal_email",
  company_email:    "company_email",
  company_phone:    "company_phone",
  industry:         "industry",
  employees:        "employees",
  description:      "description",
  city:             "city",
  country:          "country",
};
```

The rest of the file is unchanged — `FIELD_MAP` is already referenced by name.

- [ ] **Step 2: Verify TypeScript compiles cleanly**

Run: `npx tsc --noEmit 2>&1 | grep "targets/\[id\]" | head -20`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/api/crm/targets/[id]/route.ts"
git commit -m "refactor: import FIELD_MAP from shared module in targets PATCH route"
```

---

## Task 6: Add field name validation to enrich routes

**Files:**
- Modify: `app/api/crm/targets/enrich/route.ts`
- Modify: `app/api/crm/targets/enrich-bulk/route.ts`

Both routes currently accept any strings in `fields`. Unknown names must now return 400.

- [ ] **Step 1: Add validation to `enrich/route.ts`**

Add this import at the top of `app/api/crm/targets/enrich/route.ts`:

```typescript
import { FIELD_MAP } from "@/lib/enrichment/presets/target-fields";
```

Then after the `validateEnrichRequest` block (after line 32), add:

```typescript
  const validFieldNames = new Set(Object.keys(FIELD_MAP));
  const invalidFields = (fields as EnrichmentField[]).filter((f) => !validFieldNames.has(f.name));
  if (invalidFields.length > 0) {
    return NextResponse.json(
      { error: `Unknown fields: ${invalidFields.map((f) => f.name).join(", ")}` },
      { status: 400 }
    );
  }
```

- [ ] **Step 2: Add validation to `enrich-bulk/route.ts`**

Add these imports at the top of `app/api/crm/targets/enrich-bulk/route.ts`:

```typescript
import { FIELD_MAP } from "@/lib/enrichment/presets/target-fields";
import type { EnrichmentField } from "@/lib/enrichment/types";
```

Then after the fields array check (after line 23), add:

```typescript
  const validFieldNames = new Set(Object.keys(FIELD_MAP));
  // fields is `any` here (destructured from request.json()) — cast before filtering
  const invalidFields = (fields as EnrichmentField[]).filter((f) => !validFieldNames.has(f.name));
  if (invalidFields.length > 0) {
    return NextResponse.json(
      { error: `Unknown fields: ${invalidFields.map((f) => f.name).join(", ")}` },
      { status: 400 }
    );
  }
```

- [ ] **Step 3: Verify TypeScript compiles cleanly**

Run: `npx tsc --noEmit 2>&1 | grep "enrich" | head -30`

Expected: no errors in the enrich routes.

- [ ] **Step 4: Commit**

```bash
git add "app/api/crm/targets/enrich/route.ts" "app/api/crm/targets/enrich-bulk/route.ts"
git commit -m "feat: validate field names against FIELD_MAP in enrich routes"
```

---

## Task 7: Add TTL to skip-list cache

**Files:**
- Modify: `lib/enrichment/utils/skip-list.ts`

The spec describes adding a `getCachedSkipList()` wrapper in `agent-enrichment-strategy.ts`. However, `skip-list.ts` already has its own module-level `skipListCache` with no TTL. Fixing it at source is cleaner — any future callers of `loadSkipList()` benefit automatically, and no wrapper is needed. The end result is equivalent to the spec's intent.

The existing `skipListCache` in this file is permanent — it never expires. Replace the simple flag with a timestamp-based TTL of 5 minutes.

- [ ] **Step 1: Add TTL to the existing cache**

In `lib/enrichment/utils/skip-list.ts`, replace:

```typescript
let skipListCache: Set<string> | null = null;

export async function loadSkipList(): Promise<Set<string>> {
  if (skipListCache) {
    return skipListCache;
  }
```

With:

```typescript
let skipListCache: { data: Set<string>; loadedAt: number } | null = null;
const SKIP_LIST_TTL_MS = 5 * 60 * 1000;

export async function loadSkipList(): Promise<Set<string>> {
  if (skipListCache && Date.now() - skipListCache.loadedAt < SKIP_LIST_TTL_MS) {
    return skipListCache.data;
  }
```

Then replace:

```typescript
    skipListCache = skipDomains;
    return skipDomains;
```

With:

```typescript
    skipListCache = { data: skipDomains, loadedAt: Date.now() };
    return skipDomains;
```

Note: The error handler at the bottom returns a fallback `Set` without setting the cache — this is correct, leaving it unchanged so transient file errors retry next call.

- [ ] **Step 2: Verify TypeScript compiles cleanly**

Run: `npx tsc --noEmit 2>&1 | grep "skip-list" | head -20`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/enrichment/utils/skip-list.ts
git commit -m "fix: add 5-minute TTL to skip-list cache"
```

---

## Task 8: Add orchestrator timeout to AgentEnrichmentStrategy

**Files:**
- Modify: `lib/enrichment/strategies/agent-enrichment-strategy.ts`

Wrap the `this.orchestrator.enrichRow(...)` call in a 90-second timeout. On timeout, return a structured error result — never throw — so the SSE stream closes cleanly.

- [ ] **Step 1: Add `withTimeout` helper and wrap orchestrator call**

In `lib/enrichment/strategies/agent-enrichment-strategy.ts`, add these two constants after the imports (before the class definition):

```typescript
const ENRICHMENT_TIMEOUT_MS = 90_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}
```

Then inside `enrichRow()`, replace:

```typescript
      const result = await this.orchestrator.enrichRow(
        row,
        fields,
        emailColumn,
        onProgress,
        onAgentProgress,
        identityOverride
      );
```

With:

```typescript
      const result = await withTimeout(
        this.orchestrator.enrichRow(
          row,
          fields,
          emailColumn,
          onProgress,
          onAgentProgress,
          identityOverride
        ),
        ENRICHMENT_TIMEOUT_MS,
        "Enrichment"
      );
```

The existing `catch` block already converts any thrown error (including the timeout) into a structured `RowEnrichmentResult` with `status: 'error'`, so no further changes are needed.

- [ ] **Step 2: Verify TypeScript compiles cleanly**

Run: `npx tsc --noEmit 2>&1 | grep "agent-enrichment-strategy" | head -20`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/enrichment/strategies/agent-enrichment-strategy.ts
git commit -m "feat: add 90s timeout to AgentEnrichmentStrategy orchestrator call"
```

---

## Done

All 8 tasks complete. Verify the full build:

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -40
```

Expected: only pre-existing errors (if any), nothing new from the changed files.
