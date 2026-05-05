# Permission-Driven Authorization — Phase F.1 (Dual-Creator-Column Cleanup) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Eliminate the dual `created_by` / `createdBy` columns on `crm_Contacts` and `crm_Opportunities` by repointing their existing creator relations at `createdBy` and dropping `created_by`. Picks up the deferred Task 5 from Phase F.

**Why now:** Phase F descoped this during execution because dropping `created_by` naively breaks the Prisma relation that several detail-page GETs depend on (`crate_by_user` on contacts, `created_by_user` on opportunities). This plan threads through that complication without changing the relation *names* — only their FK target — so caller churn stays minimal.

**Architecture:**
1. Backfill `createdBy` from `created_by` for any row where `createdBy IS NULL`.
2. Switch the Prisma relation `fields:` from `[created_by]` to `[createdBy]` on both models. Relation **names** (`crate_by_user`, `created_by_user`) and the relation strings (`"created_contacts"`, `"created_by_user_relation"`) stay intact, so every existing `include: { crate_by_user: ... }` and `include: { created_by_user: ... }` site keeps working unchanged.
3. Drop the `created_by` column + its index.
4. Update `lib/authz/scopes/crm.ts` and `lib/authz/scopes/report-scope.ts` to drop the legacy `created_by` OR arm on these two models only.
5. Repoint write-side callers that still set `created_by` (`actions/crm/opportunities/create-opportunity.ts:58`) to `createdBy`.

**Spec source:** `docs/specs/2026-05-01-permission-driven-migration-design.md` Section 12 — Phase 6 cleanup, deferred residue.
**Audit source:** `docs/superpowers/plans/2026-05-04-permission-driven-migration-phase-f.md` Task 5 (DEFERRED).

**Depends on:** Phase F merged. PR #206 on `dev`.

**Tech Stack:** Next.js 16, Prisma 7, Better Auth 1.5, Jest 30 + ts-jest, PostgreSQL, TypeScript.

---

## Inventory (grepped at plan time, 2026-05-05)

**Schema state on `dev`:**
- `crm_Contacts`: `created_by String?` + `createdBy String?`. Relation `crate_by_user Users? @relation("created_contacts", fields: [created_by], references: [id])`. Indexes on both columns.
- `crm_Opportunities`: `created_by String?` + `createdBy String?`. Relation `created_by_user Users? @relation("created_by_user_relation", fields: [created_by], references: [id])`. Index on `created_by` only.

**Out of scope (different models, only have `created_by`, no `createdBy` to migrate to):**
- `crm_Targets`, `crm_TargetLists`, `crm_campaigns`, `crm_campaign_templates` — single-column models. Their relation fields (`crate_by_user` on Targets/TargetLists) would need a separate style-pass to rename; explicitly *not* this plan.

**Read-side callers using `crate_by_user` on `crm_Contacts`:**
- `actions/crm/get-contact.ts`
- `actions/crm/get-contacts.ts`
- `actions/crm/get-contacts-by-accountId.ts`
- `actions/crm/get-contacts-by-opportunityId.ts`

These do not change — the relation name stays the same, only its FK target moves.

**Read-side callers using `created_by_user` on `crm_Opportunities`:**
- `actions/crm/get-opportunities.ts`
- `actions/crm/get-opportunity.ts`

These do not change either.

**Write-side caller setting `created_by` (must repoint to `createdBy`):**
- `actions/crm/opportunities/create-opportunity.ts:58` — currently writes `created_by: userId`.

**Authorization helpers using the legacy `created_by` arm on these two models:**
- `lib/authz/scopes/crm.ts`:
  - `contactScopedWhere` (line ~22): drop `{ created_by: user.id }` arm.
  - `findContactInScope` (line ~73): drop `{ created_by: user.id }` arm.
  - `contactReadScopeWhere` (line ~302): drop `{ created_by: user.id }` arm.
  - `opportunityReadScopeWhere` (line ~318): drop `{ created_by: user.id }` arm.
- `lib/authz/scopes/report-scope.ts`:
  - `opportunity` scope (line ~27): replace `{ created_by: user.id }` with `{ createdBy: user.id }`.
  - `contact` scope (line ~40): drop `{ created_by: user.id }` arm.

**Migration transformer (Mongo→Postgres):**
- `scripts/migration/transformers/crm-contacts-transformer.ts:21` — writes `created_by`. Repoint to `createdBy`.
- `scripts/migration/transformers/crm-opportunities-transformer.ts:22` — writes `created_by`. Repoint to `createdBy`.

---

## File Structure

**New files:**
- `prisma/migrations/<timestamp>_authz_phase_f1_drop_legacy_created_by/migration.sql`

**Modified files:**
- `prisma/schema.prisma` — repoint relations, drop `created_by` columns + indexes.
- `lib/authz/scopes/crm.ts`
- `lib/authz/scopes/report-scope.ts`
- `actions/crm/opportunities/create-opportunity.ts`
- `scripts/migration/transformers/crm-contacts-transformer.ts`
- `scripts/migration/transformers/crm-opportunities-transformer.ts`

**Tests touched (all expected to keep passing without modification once helpers are updated, but verify):**
- `actions/crm/__tests__/get-contacts*.test.ts`
- `actions/crm/__tests__/get-opportunities*.test.ts`
- `lib/authz/__tests__/scopes-crm-*.test.ts`
- `lib/authz/__tests__/report-scope.test.ts`

Some of these tests assert the exact OR-arms shape returned by helpers and *will* fail when the legacy arm is removed — they're the contract test, and the assertion update is part of the task.

---

## Task 1: Pre-flight caller audit (no code changes)

Before any schema edit, confirm zero runtime callers write to `crm_Contacts.created_by` or read from it directly (only via the relation):

```bash
grep -rn 'crm_Contacts' --include='*.ts' --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.worktrees \
  | grep -E 'created_by[^_]' | grep -v __tests__ | grep -v scripts/migration
```

Expected: only `lib/authz/scopes/crm.ts` (helpers we're updating) and zero direct write sites. If any other caller surfaces, fold it into Task 4 below.

Same for opportunities:

```bash
grep -rn 'crm_Opportunities\|prismadb\.crm_Opportunities' --include='*.ts' \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.worktrees \
  | grep -E 'created_by[^_]' | grep -v __tests__ | grep -v scripts/migration
```

Expected: `lib/authz/scopes/crm.ts`, `lib/authz/scopes/report-scope.ts`, and `actions/crm/opportunities/create-opportunity.ts`.

- [ ] Run the greps above; if surprises appear, update this plan and re-share before continuing.

---

## Task 2: Repoint Prisma relations from `created_by` to `createdBy`

**Files:**
- Modify: `prisma/schema.prisma`

For `crm_Contacts`:

```diff
-  crate_by_user     Users?                    @relation("created_contacts", fields: [created_by], references: [id])
+  crate_by_user     Users?                    @relation("created_contacts", fields: [createdBy], references: [id])
```

For `crm_Opportunities`:

```diff
-  created_by_user      Users?                          @relation("created_by_user_relation", fields: [created_by], references: [id])
+  created_by_user      Users?                          @relation("created_by_user_relation", fields: [createdBy], references: [id])
```

Generate the Prisma client and confirm it compiles:

```bash
DATABASE_URL='postgres://x' npx prisma validate
DATABASE_URL='postgres://x' npx prisma generate
npx tsc --noEmit
```

The relation name and string label do not change, so all `include: { crate_by_user: ... }` and `include: { created_by_user: ... }` sites continue to typecheck.

- [ ] Validate, generate, typecheck. No commit yet — combined with Task 3.

---

## Task 3: Drop `created_by` columns + indexes from schema

**Files:**
- Modify: `prisma/schema.prisma`

For `crm_Contacts` — remove the `created_by` column and its index:

```diff
-  created_by       String?   @db.Uuid
   createdBy        String?   @db.Uuid
...
-  @@index([created_by])
   @@index([createdBy])
```

For `crm_Opportunities` — remove the `created_by` column and its index:

```diff
-  created_by       String?                 @db.Uuid
   createdBy        String?                 @db.Uuid
...
-  @@index([created_by])
```

Note: `crm_Opportunities` does **not** currently have an `@@index([createdBy])`. Add one — without it, every authorization check that filters by `createdBy` does a sequential scan:

```diff
   @@index([createdAt])
+  @@index([createdBy])
```

Re-validate + generate + typecheck.

- [ ] Validate, generate, typecheck. No commit yet — combined with the migration in Task 4.

---

## Task 4: Hand-write the migration

**Files:**
- Create: `prisma/migrations/<timestamp>_authz_phase_f1_drop_legacy_created_by/migration.sql`

Pick a timestamp after the most recent migration on `dev`. Migration body:

```sql
-- Phase F.1: consolidate dual created_by / createdBy on crm_Contacts and crm_Opportunities.
--
-- The Prisma relations crate_by_user (contacts) and created_by_user (opportunities)
-- previously joined on created_by; their FK target moves to createdBy in this same
-- deployment via the schema change.

-- 1. crm_Contacts.
UPDATE "crm_Contacts"
   SET "createdBy" = "created_by"
 WHERE "createdBy" IS NULL AND "created_by" IS NOT NULL;

-- Drop the FK constraint so we can drop the column. Constraint name follows
-- Prisma's default: <table>_<column>_fkey.
ALTER TABLE "crm_Contacts" DROP CONSTRAINT IF EXISTS "crm_Contacts_created_by_fkey";

-- Add the new FK on createdBy (matches the relation we're repointing to).
ALTER TABLE "crm_Contacts"
  ADD CONSTRAINT "crm_Contacts_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "Users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop the old index, then the column itself.
DROP INDEX IF EXISTS "crm_Contacts_created_by_idx";
ALTER TABLE "crm_Contacts" DROP COLUMN "created_by";

-- 2. crm_Opportunities.
UPDATE "crm_Opportunities"
   SET "createdBy" = "created_by"
 WHERE "createdBy" IS NULL AND "created_by" IS NOT NULL;

ALTER TABLE "crm_Opportunities" DROP CONSTRAINT IF EXISTS "crm_Opportunities_created_by_fkey";

ALTER TABLE "crm_Opportunities"
  ADD CONSTRAINT "crm_Opportunities_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "Users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

DROP INDEX IF EXISTS "crm_Opportunities_created_by_idx";
ALTER TABLE "crm_Opportunities" DROP COLUMN "created_by";

-- 3. Add createdBy index on crm_Opportunities (contacts already has it).
CREATE INDEX IF NOT EXISTS "crm_Opportunities_createdBy_idx" ON "crm_Opportunities"("createdBy");
```

Verify the actual FK constraint names and ON DELETE behavior against the existing migrations directory before committing — Prisma's defaults can differ subtly across major versions. Run:

```bash
grep -rn 'crm_Contacts_created_by_fkey\|crm_Opportunities_created_by_fkey' prisma/migrations/
```

If a constraint was created with a different name in an older migration, update the `DROP CONSTRAINT IF EXISTS` lines to match. The `IF EXISTS` is defensive but only helps if the name *actually* matches — a no-op on a mismatch leaves a dangling FK that blocks the column drop.

- [ ] Schema + migration committed together:
```bash
git commit -m "refactor(schema): consolidate created_by into createdBy on contacts and opportunities"
```

---

## Task 5: Repoint write-side callers

**Files:**
- Modify: `actions/crm/opportunities/create-opportunity.ts`
- Modify: `scripts/migration/transformers/crm-contacts-transformer.ts`
- Modify: `scripts/migration/transformers/crm-opportunities-transformer.ts`

In `create-opportunity.ts`:

```diff
-        created_by: userId,
+        createdBy: userId,
```

In both transformers, replace `created_by:` with `createdBy:` in the output object. The Mongo source still has `mongoRecord.created_by` — only the Postgres-side write changes.

- [ ] Tests + patches + commit:
```bash
git commit -m "refactor(crm): repoint creator-column writes to createdBy on contacts and opportunities"
```

---

## Task 6: Update `lib/authz` helpers

**Files:**
- Modify: `lib/authz/scopes/crm.ts`
- Modify: `lib/authz/scopes/report-scope.ts`
- Modify (test assertions): `lib/authz/__tests__/scopes-crm-*.test.ts`, `lib/authz/__tests__/report-scope.test.ts`

In `lib/authz/scopes/crm.ts`:

```diff
 function contactScopedWhere(user: AuthzUser, contactId: string): ContactWhere {
   if (user.role === "admin" || user.role === "manager") {
     return { id: contactId };
   }
-  // user role: own contact (assigned, created_by, or legacy createdBy).
-  // TODO(phase-4): include linked account scope (assigned/creator/watcher).
+  // user role: own contact (assigned or creator).
   return {
     id: contactId,
     OR: [
       { assigned_to: user.id },
-      { created_by: user.id },
       { createdBy: user.id },
     ],
   };
 }
```

Same edit pattern in `findContactInScope`, `contactReadScopeWhere`, and `opportunityReadScopeWhere` — drop the `{ created_by: user.id }` arm.

In `lib/authz/scopes/report-scope.ts`:

```diff
     opportunity: {
-      OR: [{ assigned_to: user.id }, { created_by: user.id }],
+      OR: [{ assigned_to: user.id }, { createdBy: user.id }],
     },
     ...
     contact: {
       OR: [
         { assigned_to: user.id },
-        { created_by: user.id },
         { createdBy: user.id },
       ],
     },
```

Test assertions that explicitly checked for the old OR shape will fail; update them to the new shape. Do **not** weaken the assertion — keep it `toEqual` or `toMatchObject` against the precise new shape.

- [ ] Tests + patches + commit:
```bash
git commit -m "fix(authz): drop legacy created_by OR arm on contact and opportunity scopes"
```

---

## Task 7: Verification + PR

- [ ] Full Jest suite green (excluding pre-existing failures documented in Phase F's PR — confirm nothing new broke):
  ```bash
  npx jest --testPathIgnorePatterns='__tests__/invoices/lifecycle|__tests__/enrichment/enrich-target-job|__tests__/enrichment/enrich-contact-job|__tests__/crm-settings-actions.test|actions/documents/__tests__/search-documents-scope.test'
  ```

- [ ] `npx tsc --noEmit` clean.

- [ ] Final grep sweep — `created_by` should now appear only on the four single-column models (Targets, TargetLists, campaigns, campaign_templates) and Mongo-source code:
  ```bash
  grep -rn 'created_by[^_]' --include='*.ts' \
    --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.worktrees --exclude-dir=prisma/migrations \
    actions/crm/contacts actions/crm/opportunities lib/authz/scopes/crm.ts lib/authz/scopes/report-scope.ts
  ```
  Expected: zero hits.

- [ ] Apply the migration on a staging DB clone. Verify:
  - `\d "crm_Contacts"` shows no `created_by` column, FK on `createdBy` present.
  - `\d "crm_Opportunities"` same.
  - Sample creator-name display on a contact and opportunity detail page still renders correctly (relation now resolves through `createdBy`).
  - Creating a new opportunity populates `createdBy` and the creator name shows up in the detail panel.

- [ ] Push branch `feat/authz-phase-f1` → PR `dev → main`:
  ```bash
  gh pr create --base dev --head feat/authz-phase-f1 --title "refactor(schema): consolidate dual creator columns on contacts and opportunities (Phase F.1)"
  ```

---

## Acceptance Criteria

- `crm_Contacts.created_by` and `crm_Opportunities.created_by` columns dropped from the database.
- `crate_by_user` (contacts) and `created_by_user` (opportunities) Prisma relations both resolve through `createdBy`. Existing `include` callers unchanged.
- All write-side callers populate `createdBy`, not `created_by`.
- `lib/authz/scopes/crm.ts` and `lib/authz/scopes/report-scope.ts` no longer reference `created_by` for these two models.
- Full test suite green; manual checklist passes on staging.
- No relation name renames — that style pass is deferred to a future plan.

## Out of Phase F.1 scope

- Renaming `crate_by_user` → `creator` (or any other name) on contacts. Touches every `include` site; pure cosmetics.
- Renaming `created_by_user` → `creator` on opportunities/products. Same reasoning.
- Renaming `created_by` columns on `crm_Targets`, `crm_TargetLists`, `crm_campaigns`, `crm_campaign_templates` to `createdBy`. Single-column models, no security benefit, large caller churn.
- Replacing the relation FK ON DELETE behavior — keep whatever existed before (`SET NULL` per Prisma default for nullable FKs).
- Backfilling historical audit logs that recorded the legacy column name. Out of authz scope.
