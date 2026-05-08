# Permission-Driven Authorization — Phase F (Cleanup) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Retire the legacy authorization scaffolding now that Phases A–E have established `lib/authz` as the single source of truth. After F:
1. `Users.is_admin` and `Users.is_account_admin` columns are removed from the schema.
2. `Users.role` is a Prisma enum (`AppRole`) — invalid roles cannot enter the DB.
3. Dual `created_by` / `createdBy` columns are reconciled to a single canonical column per model where safe (`crm_Opportunities`, `crm_Contacts`).

This is a schema + cleanup phase, not a security phase. No new authorization rules; only removal of dead surface area and tightening of types.

**Spec source:** `docs/specs/2026-05-01-permission-driven-migration-design.md` Section 12 — Phase 6 (cleanup).
**Audit source:** Phase E4 plan §"Out of E4 scope" — explicitly defers cleanup to F.

**Depends on:** Phases A–E5 merged. PR #205 (Phase E4) merged to `dev`. No active feature branch should still read `is_admin` outside of this plan's modifications.

**Tech Stack:** Next.js 16, Prisma 7, Better Auth 1.5, Jest 30 + ts-jest, PostgreSQL, TypeScript.

---

## Inventory (from grep at plan time)

**`is_admin` runtime references (must be replaced):**
- `app/api/admin/invoices/series/route.ts` — 2 occurrences (GET + POST)
- `app/api/admin/invoices/series/[id]/route.ts` — 2 occurrences (PATCH + DELETE)
- `app/api/admin/invoices/tax-rates/route.ts` — 2 occurrences
- `app/api/admin/invoices/tax-rates/[id]/route.ts` — 2 occurrences
- `actions/admin/users/set-role.ts:25` — writes `is_admin: role === "admin"`
- `actions/admin/users/delete-user.ts:31` — selects `is_admin`

**`is_admin` non-runtime references (also clean up, but not blocking):**
- `app/[locale]/(routes)/components/app-sidebar.tsx:41` — stale comment only
- `__tests__/invoices/lifecycle.test.ts` — seed fixtures (rewrite to use `role`)
- `prisma/seeds/seed.ts` — seed fixtures
- `scripts/migration/backfill-roles.ts` — Mongo→Postgres role backfill (already historical; drop or rewrite as no-op)
- `scripts/migration/transformers/users-transformer.ts` — Mongo migration transformer (drop the field write)

**`is_account_admin` references:**
- `prisma/schema.prisma`
- `prisma/seeds/seed.ts`
- `scripts/migration/backfill-roles.ts`
- `scripts/migration/transformers/users-transformer.ts`
- `actions/admin/users/delete-user.ts` (select only — confirm during implementation)

**Dual `created_by` + `createdBy` models (per `prisma/schema.prisma`):**
- `crm_Opportunities` — both columns present.
- `crm_Contacts` — both columns present.
- `Documents` — has `createdBy` (string) AND a `created_by_user` FK relation; this is **not a duplicate**. Skip.

All other audited models carry only one of the two — no reconciliation needed.

---

## File Structure

**New files:**
- `prisma/migrations/<timestamp>_authz_phase_f_drop_legacy_admin_flags/migration.sql`
- `prisma/migrations/<timestamp>_authz_phase_f_role_enum/migration.sql`
- `prisma/migrations/<timestamp>_authz_phase_f_consolidate_created_by/migration.sql`
- `lib/authz/__tests__/role-enum.test.ts` (tightens `parseRole` against the enum)

**Modified files:**
- `prisma/schema.prisma` — drop `is_admin`, `is_account_admin`; add `enum AppRole`; switch `Users.role` to `AppRole`; drop legacy `created_by` from `crm_Opportunities` and `crm_Contacts`.
- `app/api/admin/invoices/series/route.ts`
- `app/api/admin/invoices/series/[id]/route.ts`
- `app/api/admin/invoices/tax-rates/route.ts`
- `app/api/admin/invoices/tax-rates/[id]/route.ts`
- `actions/admin/users/set-role.ts`
- `actions/admin/users/delete-user.ts`
- `app/[locale]/(routes)/components/app-sidebar.tsx` (comment scrub)
- `__tests__/invoices/lifecycle.test.ts`
- `prisma/seeds/seed.ts`
- `scripts/migration/backfill-roles.ts` (delete or stub)
- `scripts/migration/transformers/users-transformer.ts`
- `lib/authz/roles.ts` — `AppRole` becomes a type-alias of the Prisma enum; `parseRole` tightens.
- Any `actions/crm/contacts/*.ts` and `actions/crm/opportunities/*.ts` that read or write the legacy `created_by` column — replace with `createdBy`.

---

## Task 1: Replace remaining `is_admin` runtime checks with `requireRole(["admin"])`

**Files:**
- Modify: `app/api/admin/invoices/series/route.ts`
- Modify: `app/api/admin/invoices/series/[id]/route.ts`
- Modify: `app/api/admin/invoices/tax-rates/route.ts`
- Modify: `app/api/admin/invoices/tax-rates/[id]/route.ts`
- Create: route-level test files alongside each (4 files) if not present.

Pattern per handler:
```ts
// before
const user = await getUserSession();
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
if (!user.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

// after
const user = await requireRole(["admin"]);   // throws AuthenticationError | AuthorizationError
// ...handle business logic
```
Wrap the handler with the existing route helper (`unauthorizedResponse` / `forbiddenResponse`) or rely on the established `withRoute(...)` pattern used elsewhere in admin routes — match whichever the surrounding module already uses; do not introduce a third pattern.

- [ ] Tests (unauth → 401, user role → 403, manager role → 403, admin → 200), patches, commit:
```bash
git commit -m "fix(authz): replace is_admin checks with requireRole on admin invoice routes"
```

---

## Task 2: Strip `is_admin` writes from admin user actions

**Files:**
- Modify: `actions/admin/users/set-role.ts`
- Modify: `actions/admin/users/delete-user.ts`

`set-role.ts:25`: drop the `is_admin: role === "admin"` field from the update payload — `role` is now the only authorization signal.

`delete-user.ts`: drop `is_admin` from the `select` clause and from any branching that uses it (confirm there is no behavioral dependency — currently it's only selected, not read into a decision).

- [ ] Tests confirm `set-role` writes only `role`; `delete-user` no longer selects the column. Patch, commit:
```bash
git commit -m "refactor(admin): stop writing is_admin column from user actions"
```

---

## Task 3: Convert `Users.role` to a Prisma enum

**Files:**
- Modify: `prisma/schema.prisma` (add enum, switch column type)
- Create: `prisma/migrations/<timestamp>_authz_phase_f_role_enum/migration.sql`
- Modify: `lib/authz/roles.ts` — re-export the Prisma `AppRole` enum as `AppRole`; adjust `parseRole` to validate against `Object.values(AppRole)`.
- Modify: `lib/authz/__tests__/roles.test.ts` and add `role-enum.test.ts` if needed.

Schema change:
```prisma
enum AppRole {
  user
  manager
  admin
}

model Users {
  // ...
  role AppRole @default(user)
  // is_admin and is_account_admin removed in Task 4
}
```

Migration SQL outline:
```sql
-- Create enum.
CREATE TYPE "AppRole" AS ENUM ('user', 'manager', 'admin');

-- Defensive backfill: any rogue role value coerces to 'user'.
UPDATE "Users" SET role = 'user' WHERE role NOT IN ('user', 'manager', 'admin');

-- Switch column type.
ALTER TABLE "Users"
  ALTER COLUMN role DROP DEFAULT,
  ALTER COLUMN role TYPE "AppRole" USING role::"AppRole",
  ALTER COLUMN role SET DEFAULT 'user';
```

Pre-flight check: `SELECT DISTINCT role FROM "Users";` — must return only the three canonical values before this migration runs. Phase A's backfill should have ensured this; verify in staging first.

- [ ] Tests (`parseRole` rejects non-enum strings, `APP_ROLES` matches enum members), generate Prisma client, patch, commit:
```bash
git commit -m "feat(authz): switch Users.role to Prisma enum AppRole"
```

---

## Task 4: Drop `is_admin` and `is_account_admin` columns

**Files:**
- Modify: `prisma/schema.prisma` — remove both fields from `model Users`.
- Create: `prisma/migrations/<timestamp>_authz_phase_f_drop_legacy_admin_flags/migration.sql`
- Modify: `prisma/seeds/seed.ts` — rewrite seed users to set `role` directly; drop `is_admin` / `is_account_admin` keys.
- Modify: `__tests__/invoices/lifecycle.test.ts` — replace `is_admin: true` fixtures with `role: "admin"`.
- Modify: `scripts/migration/transformers/users-transformer.ts` — drop the `is_admin` / `is_account_admin` writes; instead emit `role`.
- Delete or stub: `scripts/migration/backfill-roles.ts` — its purpose was to backfill `role` from `is_admin`; that path is no longer reachable. Prefer deletion with a note in the commit message; stubbing only if other scripts import it.
- Modify: `app/[locale]/(routes)/components/app-sidebar.tsx:41` — update comment to reference `role === "admin"`.

Migration SQL:
```sql
ALTER TABLE "Users" DROP COLUMN "is_admin";
ALTER TABLE "Users" DROP COLUMN "is_account_admin";
```

Order matters: this migration must run **after** Task 3's enum migration. Verify by inspecting the generated migration timestamp — Prisma auto-orders by name, so create them sequentially.

- [ ] Full grep for any surviving `is_admin` / `is_account_admin` reference (must return zero outside of historical migrations under `prisma/migrations/`):
  ```bash
  grep -rn 'is_admin\|is_account_admin' --include='*.ts' --include='*.tsx' --include='*.prisma' \
    --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.worktrees \
    --exclude-dir=prisma/migrations . | grep -v __tests__/fixtures
  ```
- [ ] Tests + patches + commit:
```bash
git commit -m "refactor(schema): drop legacy is_admin and is_account_admin columns"
```

---

## Task 5: Reconcile dual `created_by` / `createdBy` on `crm_Opportunities` and `crm_Contacts` — DEFERRED

**Status:** Deferred from Phase F during execution. Both models also carry a Prisma relation field keyed to `created_by` (`crate_by_user` on `crm_Contacts`, `created_by_user` on `crm_Opportunities`) that is used by many GET endpoints via Prisma `include`. Dropping the column requires dropping the relation and updating every caller — a much larger refactor than originally scoped. Follow-up plan to be written separately.

### Original task (preserved for the follow-up plan)

**Decision:** keep `createdBy` (camelCase) as canonical to match the rest of the schema (Boards, Tasks, Invoices, Products, etc. — all already `createdBy`). Drop `created_by` after backfilling missing values into `createdBy`.

**Files:**
- Modify: `prisma/schema.prisma` — remove `created_by` field from `crm_Opportunities` and `crm_Contacts`.
- Create: `prisma/migrations/<timestamp>_authz_phase_f_consolidate_created_by/migration.sql`
- Modify: `lib/authz/scopes/crm.ts` — the contact scope helper currently OR-matches both `created_by` and `createdBy` (see Phase B1 helper). Drop the `created_by` arm.
- Modify: any `actions/crm/contacts/*.ts` and `actions/crm/opportunities/*.ts` that read or write `created_by`. Confirm via grep before patching:
  ```bash
  grep -rn 'created_by' actions/crm/contacts actions/crm/opportunities lib/authz \
    --include='*.ts' | grep -v __tests__
  ```

Migration SQL:
```sql
-- crm_Contacts: backfill createdBy where it's null but created_by is not.
UPDATE "crm_Contacts"
   SET "createdBy" = "created_by"
 WHERE "createdBy" IS NULL AND "created_by" IS NOT NULL;
ALTER TABLE "crm_Contacts" DROP COLUMN "created_by";

-- crm_Opportunities: same pattern.
UPDATE "crm_Opportunities"
   SET "createdBy" = "created_by"
 WHERE "createdBy" IS NULL AND "created_by" IS NOT NULL;
ALTER TABLE "crm_Opportunities" DROP COLUMN "created_by";
```

**Risk:** if any callers still write to `created_by` and not `createdBy`, dropping the column breaks them at runtime. Mitigate by:
1. Doing the codepath audit (grep above) **before** the migration.
2. Running the migration on a staging clone first.
3. Keeping the `lib/authz/scopes/crm.ts` change in the **same commit** as the column drop, so the migration is atomic with the helper update.

**Out of scope for F:** `crm_Targets`, `crm_TargetLists`, `crm_campaigns`, `crm_campaign_templates` — these only have `created_by` (snake). Renaming them to `createdBy` would be a much larger churn pass with no security benefit. Tracked for a future style-only refactor, **not** Phase F.

- [ ] Tests (contact/opportunity creator-scope tests still pass after the helper drops the `created_by` arm), patches, commit:
```bash
git commit -m "refactor(schema): consolidate created_by into createdBy on contacts and opportunities"
```

---

## Task 6: Verification + PR

- [ ] Full test suite: `npm test` (no timeouts; all green).
- [ ] Prisma client regenerated and committed: `npx prisma generate` — verify `node_modules/.prisma/client` is gitignored and only `prisma/schema.prisma` + new migrations are staged.
- [ ] `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --exit-code` should be clean.
- [ ] Final grep sweep:
  ```bash
  grep -rn 'is_admin\|is_account_admin' --include='*.ts' --include='*.tsx' --include='*.prisma' \
    --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.worktrees --exclude-dir=prisma/migrations . | wc -l
  # expected: 0
  ```
- [ ] Manual checklist on a staging DB clone:
  - Login as `admin` → invoice series + tax-rate routes return 200.
  - Login as `manager` → same routes return 403.
  - `set-role`: switch a user `user → admin → user`; verify `Users.role` toggles and no `is_admin` column exists in the DB (`\d "Users"` in psql).
  - Insert a row with `role = 'foo'` directly via psql → DB rejects (enum constraint).
  - Create a contact via the app; confirm `createdBy` populated and no `created_by` column exists.
- [ ] Push branch `feat/authz-phase-f` to remote `dev` → test on remote dev → PR `dev → main`:
  ```bash
  gh pr create --base main --head dev --title "fix(security): authz cleanup — drop is_admin, role enum, consolidate created_by (Phase F)"
  ```

---

## Acceptance Criteria

- `Users.is_admin` and `Users.is_account_admin` columns removed from the database and from all runtime code (only historical migration files retain references).
- `Users.role` is a Prisma `AppRole` enum; the database rejects out-of-band values.
- `crm_Contacts.created_by` and `crm_Opportunities.created_by` columns dropped; their data lives in `createdBy`.
- `lib/authz/scopes/crm.ts` no longer OR-matches the legacy `created_by` arm for these two models.
- Full test suite green; manual checklist passes on a staging DB clone.
- No new authorization rules introduced — Phase F is removal, not policy.

## Out of Phase F scope

- Renaming `created_by` → `createdBy` on `crm_Targets`, `crm_TargetLists`, `crm_campaigns`, `crm_campaign_templates`. These have only the snake-case column and the rename adds churn without security benefit. Tracked separately as a style-pass.
- Better Auth `Session.role` reshaping — Better Auth stores its admin role as a string; aligning it with the new `AppRole` enum is a Better Auth integration change, not a schema change. Defer.
- Deleting `scripts/migration/backfill-roles.ts` history — only delete the script file; do not rewrite git history.
- Per-role visibility rules on documents (referenced as a possible future item in E3 §"Out of E3 scope") — feature work, not cleanup.

---

## Phase summary (A through F)

After Phase F merges, the authorization migration is complete:
- **A** — `lib/authz/` foundation; canonical roles; CRM contact + target IDOR fix.
- **B1–B3** — CRM scope helpers; account/lead/opportunity hardening.
- **C** — admin route audit + bulk-enrichment fail-closed.
- **D1–D3** — invoice + line-item + activity scoping.
- **E1** — products + account-products + invoice-by-account.
- **E2** — campaigns + templates + send/schedule.
- **E3** — documents (read scope, write scope, fail-closed bulk).
- **E4** — projects (boards/sections/tasks/comments).
- **F** — drop legacy admin flags, role enum, consolidate dual creator columns.

Total migration: ~75 hardened actions/routes, ~14 helper functions in `lib/authz`, ~70 new tests, 4 schema migrations.
