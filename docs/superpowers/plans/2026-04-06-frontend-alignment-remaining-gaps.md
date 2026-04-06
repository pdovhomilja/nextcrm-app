# Frontend Alignment + Remaining Soft-Delete Gaps Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `deletedAt` to Documents and TargetLists, align all frontend server actions with `deletedAt`-based soft delete, and fix the 3 remaining MCP tool files.

**Architecture:** Schema migration for 2 models, then mechanical edits to ~18 server action files (add `deletedAt: null` filters, convert hard deletes to soft deletes) and 3 MCP tool files. All changes follow the `deletedAt`/`deletedBy` pattern established in the previous migration.

**Tech Stack:** Prisma ORM, PostgreSQL, TypeScript, Next.js server actions

**Spec:** `docs/superpowers/specs/2026-04-06-frontend-alignment-remaining-gaps-design.md`

---

## File Map

| File | Status | Change |
|------|--------|--------|
| `prisma/schema.prisma` | Modify | Add `deletedAt`/`deletedBy` to Documents, crm_TargetLists |
| `prisma/migrations/TIMESTAMP/migration.sql` | Create | Migration + backfill |
| `actions/crm/get-crm-data.ts` | Modify | Add `deletedAt: null` to campaigns query |
| `actions/crm/get-targets.ts` | Modify | Add `where: { deletedAt: null }` |
| `actions/crm/targets/delete-target.ts` | Modify | Hard delete → soft delete |
| `actions/crm/targets/update-target.ts` | Modify | Add `deletedAt: null` to where |
| `actions/crm/targets/convert-target.ts` | Modify | Add `deletedAt: null` to findUnique |
| `actions/crm/activities/get-activities-by-entity.ts` | Modify | Add `deletedAt: null` to where |
| `actions/crm/activities/delete-activity.ts` | Modify | Hard delete → soft delete |
| `actions/crm/activities/update-activity.ts` | Modify | Add `deletedAt: null` to findFirst |
| `actions/campaigns/templates/get-templates.ts` | Modify | Add `where: { deletedAt: null }` |
| `actions/campaigns/templates/get-template.ts` | Modify | Add `deletedAt: null` to where |
| `actions/campaigns/templates/update-template.ts` | Modify | Add `deletedAt: null` to where |
| `actions/campaigns/templates/delete-template.ts` | Modify | Hard delete → soft delete |
| `actions/projects/get-boards.ts` | Modify | Add `deletedAt: null` to where |
| `actions/projects/get-board.ts` | Modify | Add `deletedAt: null` to where |
| `actions/projects/delete-project.ts` | Modify | Hard cascade delete → soft delete |
| `actions/crm/get-target-lists.ts` | Modify | Add `where: { deletedAt: null }` |
| `actions/crm/target-lists/delete-target-list.ts` | Modify | Hard delete → soft delete |
| `actions/crm/target-lists/update-target-list.ts` | Modify | Add `deletedAt: null` to where |
| `lib/mcp/tools/crm-opportunities.ts` | Modify | Add `deletedAt: null`, enable delete |
| `lib/mcp/tools/crm-documents.ts` | Modify | Switch from status to deletedAt |
| `lib/mcp/tools/crm-target-lists.ts` | Modify | Switch from status to deletedAt |
| `docs/soft-delete-gaps.md` | Modify | Mark all gaps as resolved |

---

## Task 1: Schema Changes — Documents & TargetLists

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add `deletedAt`/`deletedBy` to `Documents` model**

Find the `Documents` model (around line 702). Add after `parent_document_id`:

```prisma
  deletedAt          DateTime?
  deletedBy          String?   @db.Uuid
```

Add index alongside existing indexes (after `@@index([processing_status])`):

```prisma
  @@index([deletedAt])
```

- [ ] **Step 2: Add `deletedAt`/`deletedBy` to `crm_TargetLists` model**

Find `crm_TargetLists` (around line 1260). Add after `updatedAt`:

```prisma
  deletedAt   DateTime?
  deletedBy   String?   @db.Uuid
```

Add index alongside existing indexes:

```prisma
  @@index([deletedAt])
```

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "schema: add deletedAt/deletedBy to Documents and crm_TargetLists"
```

---

## Task 2: Create Prisma Migration with Backfill

**Files:**
- Create: `prisma/migrations/20260406190000_soft_delete_documents_target_lists/migration.sql`

- [ ] **Step 1: Create migration directory**

```bash
mkdir -p prisma/migrations/20260406190000_soft_delete_documents_target_lists
```

- [ ] **Step 2: Write migration SQL**

Create `prisma/migrations/20260406190000_soft_delete_documents_target_lists/migration.sql`:

```sql
-- Add deletedAt/deletedBy to Documents
ALTER TABLE "Documents" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Documents" ADD COLUMN "deletedBy" UUID;
CREATE INDEX "Documents_deletedAt_idx" ON "Documents"("deletedAt");

-- Add deletedAt/deletedBy to crm_TargetLists
ALTER TABLE "crm_TargetLists" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "crm_TargetLists" ADD COLUMN "deletedBy" UUID;
CREATE INDEX "crm_TargetLists_deletedAt_idx" ON "crm_TargetLists"("deletedAt");

-- Backfill: Documents with status = 'DELETED'
UPDATE "Documents"
SET "deletedAt" = COALESCE("updatedAt", NOW())
WHERE "status" = 'DELETED'
  AND "deletedAt" IS NULL;

-- Backfill: TargetLists with status = false (soft-deleted)
UPDATE "crm_TargetLists"
SET "deletedAt" = COALESCE("updatedAt", NOW())
WHERE "status" = false
  AND "deletedAt" IS NULL;
```

- [ ] **Step 3: Apply migration**

```bash
pnpm exec prisma migrate deploy
```

- [ ] **Step 4: Regenerate Prisma client**

```bash
pnpm exec prisma generate
```

- [ ] **Step 5: Commit**

```bash
git add prisma/migrations/20260406190000_soft_delete_documents_target_lists/
git commit -m "migration: add deletedAt to Documents and TargetLists with backfill"
```

---

## Task 3: Frontend — Targets Actions

**Files:**
- Modify: `actions/crm/get-targets.ts`
- Modify: `actions/crm/targets/delete-target.ts`
- Modify: `actions/crm/targets/update-target.ts`
- Modify: `actions/crm/targets/convert-target.ts`

- [ ] **Step 1: Update `get-targets.ts` — add `deletedAt: null` filter**

```typescript
// Before (line 5):
const targets = await prismadb.crm_Targets.findMany({
  orderBy: { created_on: "desc" },

// After:
const targets = await prismadb.crm_Targets.findMany({
  where: { deletedAt: null },
  orderBy: { created_on: "desc" },
```

- [ ] **Step 2: Update `delete-target.ts` — soft delete instead of hard delete**

Replace the entire delete call (line 13):

```typescript
// Before:
await prismadb.crm_Targets.delete({ where: { id: targetId } });

// After:
await prismadb.crm_Targets.update({
  where: { id: targetId },
  data: { deletedAt: new Date(), deletedBy: session.user.id },
});
```

- [ ] **Step 3: Update `update-target.ts` — add `deletedAt: null` to findFirst**

Find the `findFirst` or `update` call and add `deletedAt: null` to the where clause. If the file uses `prismadb.crm_Targets.update({ where: { id } })` directly, wrap it with a findFirst check:

Add `deletedAt: null` to any where clause that looks up a target by ID.

- [ ] **Step 4: Update `convert-target.ts` — add `deletedAt: null` to findUnique**

Find the target lookup (findUnique/findFirst) and add `deletedAt: null`:

```typescript
// Change findUnique to findFirst with deletedAt check:
const target = await prismadb.crm_Targets.findFirst({
  where: { id: targetId, deletedAt: null },
});
```

- [ ] **Step 5: Commit**

```bash
git add actions/crm/get-targets.ts actions/crm/targets/
git commit -m "feat: align target actions with deletedAt soft delete"
```

---

## Task 4: Frontend — Activities Actions

**Files:**
- Modify: `actions/crm/activities/get-activities-by-entity.ts`
- Modify: `actions/crm/activities/delete-activity.ts`
- Modify: `actions/crm/activities/update-activity.ts`

- [ ] **Step 1: Update `get-activities-by-entity.ts` — add `deletedAt: null`**

Find the `where` clause in the findMany and add `deletedAt: null`:

```typescript
// Add to the where clause:
deletedAt: null,
```

This goes alongside the existing `links: { some: { entityType, entityId } }` filter.

- [ ] **Step 2: Update `delete-activity.ts` — soft delete instead of hard delete**

Replace the hard delete (line 24):

```typescript
// Before:
await (prismadb as any).crm_Activities.delete({
  where: { id: activityId },
});

// After:
await (prismadb as any).crm_Activities.update({
  where: { id: activityId },
  data: { deletedAt: new Date(), deletedBy: session.user.id },
});
```

Note: Activity links should NOT be cascade-deleted since the activity still exists (just soft-deleted). The links remain for audit trail.

- [ ] **Step 3: Update `update-activity.ts` — add `deletedAt: null` to findFirst**

Find the activity lookup and add `deletedAt: null` to its where clause.

- [ ] **Step 4: Commit**

```bash
git add actions/crm/activities/
git commit -m "feat: align activity actions with deletedAt soft delete"
```

---

## Task 5: Frontend — Campaign Templates Actions

**Files:**
- Modify: `actions/campaigns/templates/get-templates.ts`
- Modify: `actions/campaigns/templates/get-template.ts`
- Modify: `actions/campaigns/templates/update-template.ts`
- Modify: `actions/campaigns/templates/delete-template.ts`

- [ ] **Step 1: Update `get-templates.ts` — add `deletedAt: null`**

```typescript
// Before (line 5):
const templates = await prismadb.crm_campaign_templates.findMany({
  orderBy: { created_on: "desc" },

// After:
const templates = await prismadb.crm_campaign_templates.findMany({
  where: { deletedAt: null },
  orderBy: { created_on: "desc" },
```

- [ ] **Step 2: Update `get-template.ts` — add `deletedAt: null`**

```typescript
// Before:
prismadb.crm_campaign_templates.findUnique({ where: { id } })

// After:
prismadb.crm_campaign_templates.findFirst({ where: { id, deletedAt: null } })
```

(Change from `findUnique` to `findFirst` because `findUnique` doesn't support non-unique where fields.)

- [ ] **Step 3: Update `update-template.ts` — add `deletedAt: null`**

Add `deletedAt: null` to the where clause of the update or its preceding find.

- [ ] **Step 4: Update `delete-template.ts` — soft delete**

Replace the entire file:

```typescript
"use server";
import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";

export const deleteTemplate = async (id: string) => {
  const session = await getSession();
  return prismadb.crm_campaign_templates.update({
    where: { id },
    data: { deletedAt: new Date(), deletedBy: session?.user.id },
  });
};
```

- [ ] **Step 5: Commit**

```bash
git add actions/campaigns/templates/
git commit -m "feat: align campaign template actions with deletedAt soft delete"
```

---

## Task 6: Frontend — Boards/Projects Actions

**Files:**
- Modify: `actions/projects/get-boards.ts`
- Modify: `actions/projects/get-board.ts`
- Modify: `actions/projects/delete-project.ts`

- [ ] **Step 1: Update `get-boards.ts` — add `deletedAt: null`**

Find the board query where clause and add `deletedAt: null`. The file uses an OR condition for board access (owned, public, watched) — add `deletedAt: null` at the top level alongside the OR.

- [ ] **Step 2: Update `get-board.ts` — add `deletedAt: null`**

Add `deletedAt: null` to the `findFirst` where clause.

- [ ] **Step 3: Update `delete-project.ts` — soft delete instead of cascade hard delete**

Replace the entire cascade delete logic with a simple soft delete:

```typescript
"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const deleteProject = async (projectId: string) => {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  if (!projectId) return { error: "Missing project ID" };

  try {
    await prismadb.boards.update({
      where: { id: projectId },
      data: { deletedAt: new Date(), deletedBy: session.user.id },
    });

    revalidatePath("/[locale]/(routes)/projects", "page");
    return { success: true };
  } catch (error) {
    console.log("[DELETE_PROJECT]", error);
    return { error: "Failed to delete project" };
  }
};
```

No need to delete sections/tasks — they remain but the board is hidden.

- [ ] **Step 4: Commit**

```bash
git add actions/projects/get-boards.ts actions/projects/get-board.ts actions/projects/delete-project.ts
git commit -m "feat: align board/project actions with deletedAt soft delete"
```

---

## Task 7: Frontend — CRM Data & Target Lists Actions

**Files:**
- Modify: `actions/crm/get-crm-data.ts`
- Modify: `actions/crm/get-target-lists.ts`
- Modify: `actions/crm/target-lists/delete-target-list.ts`
- Modify: `actions/crm/target-lists/update-target-list.ts`

- [ ] **Step 1: Update `get-crm-data.ts` — add `deletedAt: null` to campaigns query**

Line 31 currently:
```typescript
prismadb.crm_campaigns.findMany({}),
```

Change to:
```typescript
prismadb.crm_campaigns.findMany({ where: { deletedAt: null } }),
```

- [ ] **Step 2: Update `get-target-lists.ts` — add `deletedAt: null`**

```typescript
// Before:
const targetLists = await prismadb.crm_TargetLists.findMany({
  orderBy: { created_on: "desc" },

// After:
const targetLists = await prismadb.crm_TargetLists.findMany({
  where: { deletedAt: null },
  orderBy: { created_on: "desc" },
```

- [ ] **Step 3: Update `delete-target-list.ts` — soft delete**

Replace hard delete (line 13):
```typescript
// Before:
await prismadb.crm_TargetLists.delete({ where: { id: targetListId } });

// After:
await prismadb.crm_TargetLists.update({
  where: { id: targetListId },
  data: { deletedAt: new Date(), deletedBy: session.user.id },
});
```

- [ ] **Step 4: Update `update-target-list.ts` — add `deletedAt: null`**

Add `deletedAt: null` to the where clause of the update operation.

- [ ] **Step 5: Commit**

```bash
git add actions/crm/get-crm-data.ts actions/crm/get-target-lists.ts actions/crm/target-lists/
git commit -m "feat: align crm-data and target-list actions with deletedAt soft delete"
```

---

## Task 8: MCP — Opportunities Tools

**Files:**
- Modify: `lib/mcp/tools/crm-opportunities.ts`

- [ ] **Step 1: Add `deletedAt: null` to all where clauses and enable delete**

Update imports — add `softDeleteData`:
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
- `crm_list_opportunities`: `const where = { assigned_to: userId, deletedAt: null };`
- `crm_get_opportunity`: `where: { id: args.id, assigned_to: userId, deletedAt: null },`
- `crm_search_opportunities`: `{ assigned_to: userId, deletedAt: null, OR: [...] }`
- `crm_update_opportunity` (findFirst): `where: { id: args.id, assigned_to: userId, deletedAt: null },`

Replace `crm_delete_opportunity` handler:
```typescript
  {
    name: "crm_delete_opportunity",
    description: "Soft-delete a CRM opportunity by ID (sets deletedAt timestamp)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const existing = await prismadb.crm_Opportunities.findFirst({
        where: { id: args.id, assigned_to: userId, deletedAt: null },
      });
      if (!existing) notFound("Opportunity");
      const opp = await prismadb.crm_Opportunities.update({
        where: { id: args.id },
        data: softDeleteData(userId),
      });
      return itemResponse({ id: opp.id, deletedAt: opp.deletedAt });
    },
  },
```

- [ ] **Step 2: Commit**

```bash
git add lib/mcp/tools/crm-opportunities.ts
git commit -m "feat(mcp): enable opportunities soft-delete, add deletedAt filters"
```

---

## Task 9: MCP — Documents Tools

**Files:**
- Modify: `lib/mcp/tools/crm-documents.ts`

- [ ] **Step 1: Switch from status-based to deletedAt-based filtering**

Add `softDeleteData` to imports.

Replace all `status: { not: "DELETED" }` with `deletedAt: null` in:
- `crm_list_documents`: change `status: { not: "DELETED" }` to `deletedAt: null`
- `crm_get_document`: change `status: { not: "DELETED" }` to `deletedAt: null`
- `crm_delete_document`: change `status: { not: "DELETED" }` to `deletedAt: null` in findFirst, and replace `{ status: "DELETED" }` with `softDeleteData(userId)` in update

Update `crm_delete_document` handler:
```typescript
  {
    name: "crm_delete_document",
    description: "Soft-delete a document (sets deletedAt timestamp)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const existing = await prismadb.documents.findFirst({
        where: { id: args.id, created_by_user: userId, deletedAt: null },
      });
      if (!existing) notFound("Document");
      const doc = await prismadb.documents.update({
        where: { id: args.id },
        data: softDeleteData(userId),
      });
      return itemResponse({ id: doc.id, deletedAt: doc.deletedAt });
    },
  },
```

- [ ] **Step 2: Commit**

```bash
git add lib/mcp/tools/crm-documents.ts
git commit -m "feat(mcp): documents use deletedAt instead of status for soft-delete"
```

---

## Task 10: MCP — Target Lists Tools

**Files:**
- Modify: `lib/mcp/tools/crm-target-lists.ts`

- [ ] **Step 1: Switch from boolean status to deletedAt**

Add `softDeleteData` to imports. Remove `conflict` if no longer used.

Replace all `status: true` with `deletedAt: null` in:
- `crm_list_target_lists`: `const where = { deletedAt: null };`
- `crm_get_target_list`: `where: { id: args.id, deletedAt: null },`
- `crm_update_target_list`: `where: { id: args.id, deletedAt: null },`
- `crm_add_to_target_list`: `where: { id: args.target_list_id, deletedAt: null },`

Update `crm_delete_target_list` handler:
```typescript
  {
    name: "crm_delete_target_list",
    description: "Soft-delete a target list (sets deletedAt timestamp)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const existing = await prismadb.crm_TargetLists.findFirst({
        where: { id: args.id, deletedAt: null },
      });
      if (!existing) notFound("TargetList");
      await prismadb.crm_TargetLists.update({
        where: { id: args.id },
        data: softDeleteData(userId),
      });
      return itemResponse({ id: args.id, deletedAt: new Date().toISOString() });
    },
  },
```

- [ ] **Step 2: Commit**

```bash
git add lib/mcp/tools/crm-target-lists.ts
git commit -m "feat(mcp): target lists use deletedAt instead of boolean status"
```

---

## Task 11: Update Gaps Report & Verify

**Files:**
- Modify: `docs/soft-delete-gaps.md`

- [ ] **Step 1: Update the report**

Replace content to reflect that all models now use `deletedAt`:

```markdown
# Soft-Delete Report

Updated: 2026-04-06 — All models migrated to `deletedAt` pattern.

## All Models — Using `deletedAt DateTime?` + `deletedBy String?`

| Model | MCP Delete Tool | Frontend Action |
|-------|-----------------|-----------------|
| crm_Accounts | crm_delete_account | ✓ |
| crm_Contacts | crm_delete_contact | ✓ |
| crm_Leads | crm_delete_lead | ✓ |
| crm_Opportunities | crm_delete_opportunity | ✓ |
| crm_Targets | crm_delete_target | ✓ |
| crm_Products | crm_delete_product | ✓ |
| crm_Contracts | crm_delete_contract | ✓ |
| crm_Activities | crm_delete_activity | ✓ |
| crm_campaigns | campaigns_delete | ✓ |
| crm_campaign_templates | campaigns_delete_template | ✓ |
| Boards | projects_delete_board | ✓ |
| Documents | crm_delete_document | ✓ |
| crm_TargetLists | crm_delete_target_list | ✓ |

## Models Without Soft Delete (by design)

| Model | Reason |
|-------|--------|
| Tasks | Uses `taskStatus: COMPLETE` (completion semantic, not deletion) |
| Sections | Hard delete allowed when empty |
| crm_campaign_steps | Hard delete (cascade from campaign) |
| tasksComments | No delete exposed |
```

- [ ] **Step 2: Run TypeScript check**

```bash
pnpm exec tsc --noEmit 2>&1 | grep -v "deprecated" | head -30
```

- [ ] **Step 3: Verify no old patterns remain**

```bash
grep -r 'status.*"DELETED"\|status.*"deleted"\|status: false\|status: true' lib/mcp/tools/ actions/ --include="*.ts" | grep -v node_modules | grep -v ".md"
```

Should return no results from files we modified (may have results from unrelated files).

- [ ] **Step 4: Commit**

```bash
git add docs/soft-delete-gaps.md
git commit -m "docs: update soft-delete report — all models migrated to deletedAt"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Schema (2 models) | `schema.prisma` |
| 2 | Migration + backfill | migration SQL |
| 3 | Frontend: targets | 4 action files |
| 4 | Frontend: activities | 3 action files |
| 5 | Frontend: templates | 4 action files |
| 6 | Frontend: boards | 3 action files |
| 7 | Frontend: crm-data + target lists | 4 action files |
| 8 | MCP: opportunities | 1 tool file |
| 9 | MCP: documents | 1 tool file |
| 10 | MCP: target lists | 1 tool file |
| 11 | Report + verify | docs |
