# Authz Migration — Manual Smoke Test (Phases A–F.1)

Walk-through smoke test for the full permission-driven authorization migration on **staging dev**. Run after `dev` is deployed and the schema migrations applied. Each scenario lists the expected outcome — anything different is a regression.

---

## 0. Pre-flight

### 0.1 Three test users

Create or confirm three users in staging with these exact roles. The test assumes you can log in as each.

| Alias  | Role      | Notes |
|--------|-----------|-------|
| `admin1` | `admin`   | full access |
| `mgr1`   | `manager` | bare reads, no admin pages |
| `user1`  | `user`    | only sees what they own / are assigned / are linked to |
| `user2`  | `user`    | second user, used to check cross-user isolation |

Set roles via the admin UI (`/admin/users`) or directly:

```sql
UPDATE "Users" SET role = 'admin'   WHERE email = 'admin1@…';
UPDATE "Users" SET role = 'manager' WHERE email = 'mgr1@…';
UPDATE "Users" SET role = 'user'    WHERE email IN ('user1@…','user2@…');
```

### 0.2 Database sanity (one-time, not per-scenario)

Connect to the staging DB and confirm schema state:

```sql
\d "Users"
-- Expect: NO is_admin column, NO is_account_admin column.
-- Expect: role column with type "AppRole" (the enum), default 'user'.

\dT+ "AppRole"
-- Expect: enum with values user, manager, admin.

\d "crm_Contacts"
-- Expect: NO created_by column; createdBy column present; FK on createdBy.

\d "crm_Opportunities"
-- Expect: NO created_by column; createdBy column present; FK on createdBy;
--         "crm_Opportunities_createdBy_idx" present.

-- Try to insert a bad role — must fail.
INSERT INTO "Users"(id, email, role) VALUES (gen_random_uuid(),'x@x','foo');
-- Expect: ERROR — invalid input value for enum "AppRole": "foo"
```

If any of those don't hold, **stop here** and tell me. The rest of the checks assume schema is correct.

### 0.3 Seed test data (as `admin1`)

Easiest path: create one of each entity owned by `user1`, plus a few owned by `user2` so the cross-user isolation check has something to reject.

| Entity | Owned-by | Notes |
|--------|----------|-------|
| Account A1 | assigned to `user1` | watcher: `user1` |
| Account A2 | assigned to `user2` | for isolation tests |
| Contact C1 | linked to A1 (createdBy `user1`) | |
| Contact C2 | linked to A2 (createdBy `user2`) | |
| Lead L1 | createdBy `user1` | |
| Opportunity O1 | linked to A1, createdBy `user1` | |
| Opportunity O2 | linked to A2, createdBy `user2` | |
| Target T1 | createdBy `user1` | |
| Target list TL1 | createdBy `user1` | |
| Campaign Camp1 | createdBy `user1` | |
| Product P1 | created by anyone | catalog is global-read |
| Board B1 | owner `user1`, sharedWith []  | private |
| Board B2 | owner `user2`, visibility public | for cross-user-public test |
| Document D1 | owner `user1`, linked to A1 | |

---

## 1. Role enforcement (A + F)

### 1.1 Role enum at the DB layer
- [x] **0.2 already covered.** Bad role insert → enum constraint rejects.

### 1.2 Admin-only pages
- [ ] As `admin1`: `/admin/users` loads.
- [ ] As `mgr1`: `/admin/users` → 403 / redirected away.
- [ ] As `user1`: `/admin/users` → 403 / redirected away.

Repeat for `/admin/currencies`, `/admin/crm-settings`, `/admin/invoices/series`, `/admin/invoices/tax-rates`.

### 1.3 Admin-only API routes (Phase F migration)
- [ ] As `admin1`: `GET /api/admin/invoices/series` → **200**.
- [ ] As `mgr1`:   `GET /api/admin/invoices/series` → **403**.
- [ ] As `user1`:  `GET /api/admin/invoices/series` → **403**.
- [ ] Logged out:  `GET /api/admin/invoices/series` → **401**.

Same matrix for: `series/{id}` PATCH/DELETE, `tax-rates`, `tax-rates/{id}`.

### 1.4 setUserRole writes only `role` (Phase F)
- [ ] As `admin1`, change `user2`'s role from `user` → `manager` via the UI.
- [ ] Verify in DB: `SELECT role FROM "Users" WHERE email = 'user2@…';` → `manager`.
- [ ] Confirm there is no `is_admin` / `is_account_admin` column to fall out of sync.
- [ ] Reset back to `user` for the rest of the test plan.

### 1.5 Self-demotion guard
- [ ] As `admin1`, try to demote yourself: `setUserRole(admin1.id, "user")`.
- [ ] Expect: error "Cannot remove your own admin role" — UI shows toast or 4xx.

---

## 2. CRM read scoping (B + D + E)

### 2.1 Contacts list
- [ ] As `admin1`: `/crm/contacts` shows **C1 and C2**.
- [ ] As `mgr1`: shows **C1 and C2**.
- [ ] As `user1`: shows **C1 only** (creator + linked to A1).
- [ ] As `user2`: shows **C2 only**.

### 2.2 Direct contact navigation
- [ ] As `user1`, navigate directly to `/crm/contacts/{C2.id}` → **404 / forbidden**.
- [ ] As `user1`, navigate to `/crm/contacts/{C1.id}` → loads, creator name shows in detail panel (this exercises the F.1 relation repointing).

### 2.3 Opportunities list
- [ ] As `user1`: shows **O1 only**.
- [ ] As `user2`: shows **O2 only**.
- [ ] As `mgr1`: shows both.
- [ ] Navigate to `O1` detail page as `user1`. **Creator name renders** (F.1 relation check).
- [ ] Navigate to `O2` as `user1` → **404**.

### 2.4 Accounts list
- [ ] As `user1`: shows **A1 only** (assigned + watcher).
- [ ] Add `user1` as watcher on `A2` (do this as `admin1` or `user2`).
- [ ] Refresh as `user1`: now shows **A1 and A2**.
- [ ] Remove the watcher; A2 disappears from `user1`'s list.

### 2.5 Leads
- [ ] As `user1`: `/crm/leads` shows **L1 only**.
- [ ] As `user2`: doesn't see L1.

### 2.6 Targets / TargetLists / Campaigns
- [ ] As `user1`: `/campaigns` shows Camp1, `/campaigns/targets` shows T1, `/campaigns/target-lists` shows TL1.
- [ ] As `user2`: none of those.
- [ ] Convert T1 to a contact (as `user1`). **Resulting contact's creator (`createdBy`) is `user1`.** This exercises the `convert-target.ts` fix from F.1.

### 2.7 Documents
- [ ] As `user1`: `/documents` shows D1.
- [ ] As `user2`: doesn't see D1.
- [ ] As `mgr1` / `admin1`: see D1.
- [ ] Try bulk-delete D1 plus a fake document id (`bulk-delete-documents` action) as `user1` — **all-or-nothing**: nothing deletes, error returned. (Fail-closed: Phase E3.)

### 2.8 Products (catalog)
- [ ] As `user1`: `/crm/products` shows P1 (catalog is read-by-anyone in E1).
- [ ] As `user1`: try to **create** a product → forbidden (manager/admin only).
- [ ] As `mgr1`: create a product → succeeds.

### 2.9 Projects (boards/sections/tasks — E4)
- [ ] As `user1`: `/projects` shows B1 (owner) and B2 (public visibility).
- [ ] As `user1`: navigate to B2 → loads (public read scope).
- [ ] As `user1`: try to **edit** B2 (rename board) → **forbidden**.
- [ ] Add a task on B2 (do this as `user2`) and assign it to `user1`.
- [ ] As `user1`: open that task. `markTaskDone` → **succeeds** (assignee soft-write).
- [ ] As `user1`: try to fully edit the task title → **forbidden** (board write required).
- [ ] As `user1`: try to add a comment to the task → **forbidden** (comments are content; board-write).

---

## 3. CRM write scoping (B + D + E)

### 3.1 Update someone else's contact via API
- [ ] As `user1`, send `PATCH /api/crm/contacts/{C2.id}` with `{first_name: "hacked"}`.
- [ ] Expect: **404 or 403**, no DB write. Verify `C2.first_name` unchanged.

### 3.2 Update someone else's target via API
- [ ] As `user1`, `PATCH /api/crm/targets/{a target T2 owned by user2}` → **404/403**, no write.

### 3.3 Bulk enrichment fail-closed (C)
- [ ] As `user1`, trigger bulk contact enrichment with **2 contacts: C1 (yours) + C2 (user2's)**.
- [ ] Expect: **403 / "Forbidden"**, neither row enriched. The whole batch fails because one id is out of scope.

### 3.4 Watch / unwatch a board
- [ ] As `user1`: watch B2 (public) → succeeds.
- [ ] As `user1`: try to watch a private board owned by `user2` → forbidden (you can only watch what you can read).

---

## 4. Schema-only sanity

### 4.1 Creator relation includes still work (F.1)
On any contact / opportunity / target detail page, the **creator's name** should render. If you see "—" or a missing-relation error, the F.1 relation repoint broke something.

- [ ] Open contact C1 → creator name renders.
- [ ] Open opportunity O1 → creator name renders.
- [ ] Open target T1 → creator name renders.
- [ ] Open target list TL1 → creator name renders.

### 4.2 New-contact / new-opportunity creator population
- [ ] As `user1`, create a brand-new contact via the UI.
- [ ] Verify in DB: `SELECT "createdBy" FROM "crm_Contacts" WHERE id = '<new>';` → `user1.id`.
- [ ] Same for a new opportunity.

### 4.3 Reports
- [ ] As `user1`, open `/reports/sales` → shows only `user1`-scoped opportunities (O1, not O2).
- [ ] As `user1`, open `/reports/dashboard` KPIs → numbers reflect user-scope.
- [ ] As `mgr1`, same pages → global numbers.
- [ ] Trigger a scheduled-report send (if you have one configured) → no errors in Inngest logs.

---

## 5. Negative / smoke-only

### 5.1 No 500s
- [ ] Watch the Coolify / Inngest logs while running through this checklist. **Zero** unhandled exceptions related to: missing `is_admin`, missing `created_by`, undefined relation. If you see one, screenshot it and send.

### 5.2 No regressions in non-authz flows
Quick sanity that unrelated features still work (we didn't touch them, but the schema change rippled through Prisma):
- [ ] Create an account, create an opportunity on it, add a line item, save → all 200.
- [ ] Upload a document → 200, attached to the entity.
- [ ] Create an invoice from an opportunity → 200.

---

## Pass criteria

If every checkbox above is marked, Phases A–F.1 are good on dev. Promote to main when ready.

If any check fails, capture: (1) what you did, (2) what you expected, (3) what actually happened, (4) any console / server logs. Bring it back here and we'll diagnose.
