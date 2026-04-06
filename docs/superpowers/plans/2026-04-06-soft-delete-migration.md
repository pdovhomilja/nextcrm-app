# Universal `deletedAt` Soft-Delete Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize soft-delete across all CRM models using `deletedAt DateTime?` + `deletedBy String?`, replacing status-based patterns and enabling 6 previously-stubbed MCP delete tools.

**Architecture:** Add `deletedAt`/`deletedBy` fields to 5 models missing them (3 already have them). Update the shared `isNotDeleted()` helper to return `{ deletedAt: null }`. Update all MCP tool files to use `deletedAt`-based filtering and deletion. Backfill existing status-based soft-deleted records.

**Tech Stack:** Prisma ORM, PostgreSQL, TypeScript

**Spec:** `docs/superpowers/specs/2026-04-06-soft-delete-migration-design.md`

---

## File Map

| File | Status | Change |
|------|--------|--------|
| `prisma/schema.prisma` | Modify | Add `deletedAt`/`deletedBy` + index to 5 models |
| `prisma/migrations/TIMESTAMP_soft_delete/migration.sql` | Create | Auto-generated + manual backfill SQL |
| `lib/mcp/helpers.ts` | Modify | Update `isNotDeleted()` and `softDeleteUpdate()` |
| `lib/mcp/tools/crm-accounts.ts` | Modify | Delete handler: use `deletedAt` instead of `status` |
| `lib/mcp/tools/crm-contacts.ts` | Modify | Add `deletedAt: null` filters, enable delete handler |
| `lib/mcp/tools/crm-leads.ts` | Modify | Add `deletedAt: null` filters, enable delete handler |
| `lib/mcp/tools/crm-targets.ts` | Modify | Add `deletedAt: null` filters, enable delete handler |
| `lib/mcp/tools/crm-activities.ts` | Modify | Add `deletedAt: null` filters, enable delete handler |
| `lib/mcp/tools/campaigns.ts` | Modify | Replace `status: { not: "deleted" }` with `deletedAt: null`, update delete handler |
| `lib/mcp/tools/projects.ts` | Modify | Add `deletedAt: null` to board queries, enable board delete handler |
| `docs/soft-delete-gaps.md` | Modify | Update to reflect completed migration |

---

## Task 1: Add `deletedAt`/`deletedBy` to 5 Prisma Models

**Files:**
- Modify: `prisma/schema.prisma`

The 5 models that need new fields: `crm_Targets`, `crm_Activities`, `crm_campaign_templates`, `crm_campaigns`, `Boards`. (crm_Accounts, crm_Leads, crm_Contacts already have them.)

- [ ] **Step 1: Add fields to `crm_Targets`**

Find the model `crm_Targets` (around line 1190). Add before the relations/indexes:

```prisma
  deletedAt           DateTime?
  deletedBy           String?   @db.Uuid
```

And add an index alongside the existing `@@index` declarations:

```prisma
  @@index([deletedAt])
```

- [ ] **Step 2: Add fields to `crm_Activities`**

Find the model `crm_Activities` (around line 607). Add after `updatedAt`:

```prisma
  deletedAt   DateTime?
  deletedBy   String?              @db.Uuid
```

And add an index alongside existing indexes:

```prisma
  @@index([deletedAt])
```

- [ ] **Step 3: Add fields to `crm_campaign_templates`**

Find the model `crm_campaign_templates` (around line 311). Add after `updatedAt`:

```prisma
  deletedAt   DateTime?
  deletedBy   String?   @db.Uuid
```

And add an index:

```prisma
  @@index([deletedAt])
```

- [ ] **Step 4: Add fields to `crm_campaigns`**

Find the model `crm_campaigns` (around line 287). Add after `updatedAt`:

```prisma
  deletedAt   DateTime?
  deletedBy   String?   @db.Uuid
```

And add an index (this model has no `@@index` yet — add before closing brace):

```prisma
  @@index([deletedAt])
```

- [ ] **Step 5: Add fields to `Boards`**

Find the model `Boards` (around line 645). Add after `updatedBy`:

```prisma
  deletedAt         DateTime?
  deletedBy         String?   @db.Uuid
```

And add an index alongside existing indexes:

```prisma
  @@index([deletedAt])
```

- [ ] **Step 6: Commit schema changes**

```bash
git add prisma/schema.prisma
git commit -m "schema: add deletedAt/deletedBy to Targets, Activities, campaign_templates, campaigns, Boards"
```

---

## Task 2: Create Prisma Migration with Backfill

**Files:**
- Create: Prisma migration directory (auto-generated)

- [ ] **Step 1: Generate the migration (do NOT apply yet)**

```bash
pnpm exec prisma migrate dev --create-only --name soft_delete_universal
```

This creates the migration SQL without running it.

- [ ] **Step 2: Add backfill SQL to the generated migration**

Open the generated migration file at `prisma/migrations/<TIMESTAMP>_soft_delete_universal/migration.sql` and append these backfill statements at the END (after the auto-generated ALTER TABLE statements):

```sql
-- Backfill: Accounts that were soft-deleted via status
UPDATE "crm_Accounts"
SET "deletedAt" = COALESCE("updatedAt", NOW()),
    "deletedBy" = "updatedBy"
WHERE "status" = 'DELETED'
  AND "deletedAt" IS NULL;

-- Backfill: Campaigns that were soft-deleted via status
UPDATE "crm_campaigns"
SET "deletedAt" = COALESCE("updatedAt", NOW()),
    "deletedBy" = "created_by"
WHERE "status" = 'deleted'
  AND "deletedAt" IS NULL;
```

- [ ] **Step 3: Apply the migration**

```bash
pnpm exec prisma migrate dev
```

- [ ] **Step 4: Regenerate Prisma client**

```bash
pnpm exec prisma generate
```

- [ ] **Step 5: Commit**

```bash
git add prisma/migrations/
git commit -m "migration: add deletedAt/deletedBy fields with backfill for Accounts and Campaigns"
```

---

## Task 3: Update Shared Helpers

**Files:**
- Modify: `lib/mcp/helpers.ts`

- [ ] **Step 1: Update `isNotDeleted()` and rename `softDeleteUpdate()`**

In `lib/mcp/helpers.ts`, replace the Soft Delete section:

```typescript
// ── Soft Delete ─────────────────────────────────────────────────

export function softDeleteUpdate(userId: string) {
  return { status: "DELETED", updatedBy: userId, updatedAt: new Date() };
}

export function isNotDeleted() {
  return { status: { not: "DELETED" } };
}
```

With:

```typescript
// ── Soft Delete ─────────────────────────────────────────────────

export function softDeleteData(userId: string) {
  return { deletedAt: new Date(), deletedBy: userId };
}

export function isNotDeleted() {
  return { deletedAt: null };
}
```

- [ ] **Step 2: Verify no callers of old `softDeleteUpdate` remain**

Run: `grep -r "softDeleteUpdate" lib/mcp/ --include="*.ts"`

Expected: no results (it was defined but never actually called — all tools inline their delete logic).

- [ ] **Step 3: Commit**

```bash
git add lib/mcp/helpers.ts
git commit -m "feat(mcp): update helpers to use deletedAt-based soft delete"
```

---

## Task 4: Update Accounts Tools

**Files:**
- Modify: `lib/mcp/tools/crm-accounts.ts`

The `isNotDeleted()` helper change propagates automatically to list/get/search/update (they already call it). Only the delete handler needs manual updating.

- [ ] **Step 1: Import `softDeleteData` and update the delete handler**

In `lib/mcp/tools/crm-accounts.ts`, update the imports — add `softDeleteData`:

```typescript
import {
  paginationSchema,
  paginationArgs,
  listResponse,
  itemResponse,
  ilike,
  isNotDeleted,
  notFound,
  softDeleteData,
} from "../helpers";
```

Then replace the `crm_delete_account` handler:

```typescript
  {
    name: "crm_delete_account",
    description: "Soft-delete a CRM account by ID (sets deletedAt timestamp)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const existing = await prismadb.crm_Accounts.findFirst({
        where: { id: args.id, assigned_to: userId, ...isNotDeleted() },
      });
      if (!existing) notFound("Account");
      const account = await prismadb.crm_Accounts.update({
        where: { id: args.id },
        data: softDeleteData(userId),
      });
      return itemResponse({ id: account.id, deletedAt: account.deletedAt });
    },
  },
```

- [ ] **Step 2: Commit**

```bash
git add lib/mcp/tools/crm-accounts.ts
git commit -m "feat(mcp): accounts delete uses deletedAt instead of status"
```

---

## Task 5: Enable Contacts Delete + Add Filters

**Files:**
- Modify: `lib/mcp/tools/crm-contacts.ts`

- [ ] **Step 1: Update imports and add `deletedAt: null` to all where clauses, enable delete**

In `lib/mcp/tools/crm-contacts.ts`, update the imports:

```typescript
import {
  paginationSchema,
  paginationArgs,
  listResponse,
  itemResponse,
  ilike,
  notFound,
  softDeleteData,
} from "../helpers";
```

Add `deletedAt: null` to the `where` clause in these handlers:
- `crm_list_contacts`: `const where = { assigned_to: userId, deletedAt: null };`
- `crm_get_contact`: `where: { id: args.id, assigned_to: userId, deletedAt: null },`
- `crm_search_contacts`: `{ assigned_to: userId, deletedAt: null, OR: [...] }`
- `crm_update_contact` (findFirst): `where: { id: args.id, assigned_to: userId, deletedAt: null },`

Replace the `crm_delete_contact` handler (currently throws conflict):

```typescript
  {
    name: "crm_delete_contact",
    description: "Soft-delete a CRM contact by ID (sets deletedAt timestamp)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const existing = await prismadb.crm_Contacts.findFirst({
        where: { id: args.id, assigned_to: userId, deletedAt: null },
      });
      if (!existing) notFound("Contact");
      const contact = await prismadb.crm_Contacts.update({
        where: { id: args.id },
        data: softDeleteData(userId),
      });
      return itemResponse({ id: contact.id, deletedAt: contact.deletedAt });
    },
  },
```

- [ ] **Step 2: Commit**

```bash
git add lib/mcp/tools/crm-contacts.ts
git commit -m "feat(mcp): enable contacts soft-delete, add deletedAt filters"
```

---

## Task 6: Enable Leads Delete + Add Filters

**Files:**
- Modify: `lib/mcp/tools/crm-leads.ts`

- [ ] **Step 1: Same pattern as contacts — update imports, add `deletedAt: null`, enable delete**

In `lib/mcp/tools/crm-leads.ts`, update imports:

```typescript
import {
  paginationSchema,
  paginationArgs,
  listResponse,
  itemResponse,
  ilike,
  notFound,
  softDeleteData,
} from "../helpers";
```

Add `deletedAt: null` to where clauses in:
- `crm_list_leads`: `const where = { assigned_to: userId, deletedAt: null };`
- `crm_get_lead`: `where: { id: args.id, assigned_to: userId, deletedAt: null },`
- `crm_search_leads`: `{ assigned_to: userId, deletedAt: null, OR: [...] }`
- `crm_update_lead` (findFirst): `where: { id: args.id, assigned_to: userId, deletedAt: null },`

Replace `crm_delete_lead` handler:

```typescript
  {
    name: "crm_delete_lead",
    description: "Soft-delete a CRM lead by ID (sets deletedAt timestamp)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const existing = await prismadb.crm_Leads.findFirst({
        where: { id: args.id, assigned_to: userId, deletedAt: null },
      });
      if (!existing) notFound("Lead");
      const lead = await prismadb.crm_Leads.update({
        where: { id: args.id },
        data: softDeleteData(userId),
      });
      return itemResponse({ id: lead.id, deletedAt: lead.deletedAt });
    },
  },
```

- [ ] **Step 2: Commit**

```bash
git add lib/mcp/tools/crm-leads.ts
git commit -m "feat(mcp): enable leads soft-delete, add deletedAt filters"
```

---

## Task 7: Enable Targets Delete + Add Filters

**Files:**
- Modify: `lib/mcp/tools/crm-targets.ts`

- [ ] **Step 1: Same pattern — update imports, add `deletedAt: null`, enable delete**

In `lib/mcp/tools/crm-targets.ts`, update imports:

```typescript
import {
  paginationSchema,
  paginationArgs,
  listResponse,
  itemResponse,
  ilike,
  notFound,
  softDeleteData,
} from "../helpers";
```

Add `deletedAt: null` to where clauses in:
- `crm_list_targets`: `const where = { created_by: userId, deletedAt: null };`
- `crm_get_target`: `where: { id: args.id, created_by: userId, deletedAt: null },`
- `crm_search_targets`: `{ created_by: userId, deletedAt: null, OR: [...] }`
- `crm_update_target` (findFirst): `where: { id: args.id, created_by: userId, deletedAt: null },`

Replace `crm_delete_target` handler:

```typescript
  {
    name: "crm_delete_target",
    description: "Soft-delete a CRM target by ID (sets deletedAt timestamp)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const existing = await prismadb.crm_Targets.findFirst({
        where: { id: args.id, created_by: userId, deletedAt: null },
      });
      if (!existing) notFound("Target");
      const target = await prismadb.crm_Targets.update({
        where: { id: args.id },
        data: softDeleteData(userId),
      });
      return itemResponse({ id: target.id, deletedAt: target.deletedAt });
    },
  },
```

- [ ] **Step 2: Commit**

```bash
git add lib/mcp/tools/crm-targets.ts
git commit -m "feat(mcp): enable targets soft-delete, add deletedAt filters"
```

---

## Task 8: Enable Activities Delete + Add Filters

**Files:**
- Modify: `lib/mcp/tools/crm-activities.ts`

- [ ] **Step 1: Update imports, add `deletedAt: null`, enable delete**

In `lib/mcp/tools/crm-activities.ts`, update imports:

```typescript
import {
  paginationSchema,
  paginationArgs,
  listResponse,
  itemResponse,
  notFound,
  softDeleteData,
} from "../helpers";
```

Add `deletedAt: null` to where clauses in:
- `crm_list_activities`: add `deletedAt: null` to the base where: `createdBy: userId, deletedAt: null,`
- `crm_get_activity`: `where: { id: args.id, createdBy: userId, deletedAt: null },`
- `crm_update_activity` (findFirst): `where: { id: args.id, createdBy: userId, deletedAt: null },`

Replace `crm_delete_activity` handler:

```typescript
  {
    name: "crm_delete_activity",
    description: "Soft-delete a CRM activity by ID (sets deletedAt timestamp)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const existing = await prismadb.crm_Activities.findFirst({
        where: { id: args.id, createdBy: userId, deletedAt: null },
      });
      if (!existing) notFound("Activity");
      const activity = await prismadb.crm_Activities.update({
        where: { id: args.id },
        data: softDeleteData(userId),
      });
      return itemResponse({ id: activity.id, deletedAt: activity.deletedAt });
    },
  },
```

- [ ] **Step 2: Commit**

```bash
git add lib/mcp/tools/crm-activities.ts
git commit -m "feat(mcp): enable activities soft-delete, add deletedAt filters"
```

---

## Task 9: Update Campaigns Tools (status → deletedAt)

**Files:**
- Modify: `lib/mcp/tools/campaigns.ts`

This is the most involved tool update — campaigns currently uses `status: { not: "deleted" }` in many places and `status: "deleted"` for delete.

- [ ] **Step 1: Update imports**

Add `softDeleteData` to imports:

```typescript
import {
  paginationSchema,
  paginationArgs,
  listResponse,
  itemResponse,
  notFound,
  conflict,
  softDeleteData,
} from "../helpers";
```

- [ ] **Step 2: Update `campaigns_list` handler**

Replace the where clause:

```typescript
// Before
const where: any = args.status
  ? { status: args.status }
  : { status: { not: "deleted" } };

// After
const where: any = {
  deletedAt: null,
  ...(args.status && { status: args.status }),
};
```

- [ ] **Step 3: Replace all `status: { not: "deleted" }` with `deletedAt: null` in these handlers**

In `campaigns_get`:
```typescript
where: { id: args.id, deletedAt: null },
```

In `campaigns_update` (findFirst):
```typescript
where: { id: args.id, deletedAt: null },
```

In `campaigns_send` (findFirst):
```typescript
where: { id: args.id, deletedAt: null },
```

In `campaigns_create_step` (campaign check):
```typescript
where: { id: args.campaign_id, deletedAt: null },
```

In `campaigns_assign_target_list` (campaign check):
```typescript
where: { id: args.campaign_id, deletedAt: null },
```

In `campaigns_get_stats` (campaign check):
```typescript
where: { id: args.id, deletedAt: null },
```

- [ ] **Step 4: Update `campaigns_delete` handler**

```typescript
  {
    name: "campaigns_delete",
    description: "Soft-delete a campaign (sets deletedAt timestamp)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const existing = await prismadb.crm_campaigns.findFirst({
        where: { id: args.id, deletedAt: null },
      });
      if (!existing) notFound("Campaign");
      if (existing.status === "sending") conflict("Cannot delete a campaign that is currently sending");
      await prismadb.crm_campaigns.update({
        where: { id: args.id },
        data: softDeleteData(userId),
      });
      return itemResponse({ id: args.id, deletedAt: new Date().toISOString() });
    },
  },
```

- [ ] **Step 5: Enable `campaigns_delete_template` handler**

Replace the conflict-throwing stub:

```typescript
  {
    name: "campaigns_delete_template",
    description: "Soft-delete a campaign template (sets deletedAt timestamp)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const existing = await prismadb.crm_campaign_templates.findUnique({ where: { id: args.id } });
      if (!existing) notFound("Template");
      await prismadb.crm_campaign_templates.update({
        where: { id: args.id },
        data: softDeleteData(userId),
      });
      return itemResponse({ id: args.id, deletedAt: new Date().toISOString() });
    },
  },
```

Also add `deletedAt: null` filter to `campaigns_list_templates`:
```typescript
// In the findMany and count:
const where = { deletedAt: null };
```

And `campaigns_get_template`:
```typescript
const template = await prismadb.crm_campaign_templates.findFirst({
  where: { id: args.id, deletedAt: null },
});
```

And `campaigns_update_template` (findFirst):
```typescript
const existing = await prismadb.crm_campaign_templates.findFirst({
  where: { id: args.id, deletedAt: null },
});
```

- [ ] **Step 6: Commit**

```bash
git add lib/mcp/tools/campaigns.ts
git commit -m "feat(mcp): campaigns use deletedAt instead of status for soft-delete"
```

---

## Task 10: Enable Board Delete in Projects Tools

**Files:**
- Modify: `lib/mcp/tools/projects.ts`

- [ ] **Step 1: Update imports**

Add `softDeleteData`:

```typescript
import {
  paginationSchema,
  paginationArgs,
  listResponse,
  itemResponse,
  notFound,
  conflict,
  softDeleteData,
} from "../helpers";
```

- [ ] **Step 2: Add `deletedAt: null` to board queries**

Update `userBoardWhere` helper at top of file:
```typescript
function userBoardWhere(userId: string) {
  return {
    deletedAt: null,
    OR: [
      { user: userId },
      { sharedWith: { has: userId } },
    ],
  };
}
```

This propagates to `projects_list_boards`, `projects_get_board`, `projects_update_board`, and `projects_list_tasks` (via board relation filter) automatically.

- [ ] **Step 3: Enable `projects_delete_board` handler**

Replace the conflict-throwing stub:

```typescript
  {
    name: "projects_delete_board",
    description: "Soft-delete a project board (sets deletedAt timestamp)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const existing = await prismadb.boards.findFirst({
        where: { id: args.id, ...userBoardWhere(userId) },
      });
      if (!existing) notFound("Board");
      const board = await prismadb.boards.update({
        where: { id: args.id },
        data: softDeleteData(userId),
      });
      return itemResponse({ id: board.id, deletedAt: board.deletedAt });
    },
  },
```

- [ ] **Step 4: Commit**

```bash
git add lib/mcp/tools/projects.ts
git commit -m "feat(mcp): enable board soft-delete, add deletedAt filters to board queries"
```

---

## Task 11: Update Soft-Delete Gaps Report

**Files:**
- Modify: `docs/soft-delete-gaps.md`

- [ ] **Step 1: Update the report to reflect completed migration**

Replace the entire content of `docs/soft-delete-gaps.md`:

```markdown
# Soft-Delete Gaps Report

Generated: 2026-04-06 (updated after universal deletedAt migration)

## Completed — Using `deletedAt` Pattern

All major CRM models now use `deletedAt DateTime?` + `deletedBy String?`:

| Model | Pattern | MCP Delete Tool |
|-------|---------|-----------------|
| `crm_Accounts` | `deletedAt` (migrated from status) | `crm_delete_account` |
| `crm_Contacts` | `deletedAt` | `crm_delete_contact` |
| `crm_Leads` | `deletedAt` | `crm_delete_lead` |
| `crm_Targets` | `deletedAt` | `crm_delete_target` |
| `crm_Activities` | `deletedAt` | `crm_delete_activity` |
| `crm_Products` | `deletedAt` (pre-existing) | `crm_delete_product` |
| `crm_Contracts` | `deletedAt` (pre-existing) | `crm_delete_contract` |
| `crm_campaigns` | `deletedAt` (migrated from status) | `campaigns_delete` |
| `crm_campaign_templates` | `deletedAt` | `campaigns_delete_template` |
| `Boards` | `deletedAt` | `projects_delete_board` |

## Remaining — Different Patterns

| Model | Current Pattern | MCP Behavior |
|-------|----------------|-------------|
| `crm_Opportunities` | Enum status (no DELETED value) | `crm_delete_opportunity` throws CONFLICT |
| `Tasks` | `taskStatus: COMPLETE` | `projects_delete_task` sets COMPLETE (semantic: completed, not deleted) |
| `Documents` | `status: "DELETED"` (String) | `crm_delete_document` sets status |
| `crm_TargetLists` | `status: Boolean` (false = deleted) | `crm_delete_target_list` sets false |

These use legacy patterns that still work but could be migrated to `deletedAt` in a future cleanup.
```

- [ ] **Step 2: Commit**

```bash
git add docs/soft-delete-gaps.md
git commit -m "docs: update soft-delete gaps report after universal deletedAt migration"
```

---

## Task 12: TypeScript Verification

- [ ] **Step 1: Run full TypeScript check**

```bash
pnpm exec tsc --noEmit 2>&1 | grep -v "deprecated" | head -30
```

Expected: no output (clean).

- [ ] **Step 2: Verify no references to old patterns remain**

```bash
grep -r "softDeleteUpdate" lib/mcp/ --include="*.ts"
grep -r 'status.*"DELETED"' lib/mcp/tools/ --include="*.ts"
grep -r 'status.*"deleted"' lib/mcp/tools/ --include="*.ts"
grep -r "Soft delete not yet supported" lib/mcp/tools/ --include="*.ts"
```

Expected: no results for any of these (except possibly Documents which is out of scope).

- [ ] **Step 3: Fix any issues found and commit**

```bash
git add -A
git commit -m "fix(mcp): resolve any remaining type errors from soft-delete migration"
```

Only create this commit if there were actual fixes needed.

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Schema changes (5 models) | `schema.prisma` |
| 2 | Prisma migration + backfill | migration SQL |
| 3 | Update helpers | `helpers.ts` |
| 4 | Accounts: deletedAt | `crm-accounts.ts` |
| 5 | Contacts: enable delete | `crm-contacts.ts` |
| 6 | Leads: enable delete | `crm-leads.ts` |
| 7 | Targets: enable delete | `crm-targets.ts` |
| 8 | Activities: enable delete | `crm-activities.ts` |
| 9 | Campaigns: status → deletedAt | `campaigns.ts` |
| 10 | Boards: enable delete | `projects.ts` |
| 11 | Update gaps report | `soft-delete-gaps.md` |
| 12 | TypeScript verification | all |
