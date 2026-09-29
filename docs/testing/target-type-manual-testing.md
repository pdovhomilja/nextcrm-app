# Target Type (Individual vs Company) — Manual Browser Testing Guide

Covers end-user browser testing for the target **type** discriminator: creating a Company
vs an Individual target (type-gated fields + per-type required identity), the list Type
badge / Type filter / adaptive Name column, and the adaptive detail title. Run against your
**local** environment.

## Prerequisites

```bash
# Terminal 1 — local Postgres + Inngest dev server
pnpm inngest:up

# Terminal 2 — apply migrations, then the dev server
pnpm db:migrate
pnpm dev
```

- **Migration:** `20260928130000_target_type` must be applied (`pnpm db:migrate`). **Restart
  `pnpm dev` after applying it / regenerating the Prisma client** — a dev server started before
  the schema change holds a stale client and creates fail with a generic "Failed to create target".
- **Seed:** `pnpm db:seed` — existing/demo targets backfill to `COMPANY`.
- **URL:** http://localhost:3000/en/campaigns/targets

## Test accounts

Sign in as any seeded admin (e.g. `test@nextcrm.app`) — local OTP is printed to the dev
server console (`[Auth] OTP for …`).

Use a recognisable prefix for the records you create (the E2E uses `PWTYPE<run-id>`) so you can
find and delete them afterward.

---

## 1. Create a Company target

**E2E:** `tests/e2e/target-type.spec.ts` › `creates a Company target: only company fields, company name required`

1. Open **Campaigns → Targets** and click **+ New Target**.
2. **Verify:** the **Type** selector defaults to **Company**.
3. **Verify:** company fields show — **Company name \***, **Industry**, **Employees**, **Company website**.
4. **Verify:** person-only fields are **not** shown — **First name**, **Last name**, **Position**, **Personal website**.
5. Click **Create target** without filling anything.
6. **Verify:** an inline **"Company name is required"** error appears and nothing is created.
7. Enter a **Company name** (e.g. `PWTYPE Roofing Co`) and an **Industry**, then click **Create target**.
8. **Verify:** a success toast ("Target created successfully") appears and the sheet closes.

## 2. Create an Individual target

**E2E:** `tests/e2e/target-type.spec.ts` › `creates an Individual target: person fields, last name required`

1. Click **+ New Target**, then change **Type** to **Individual**.
2. **Verify:** person fields show — **First name**, **Last name**, **Position**, **Personal website**, and the company field is relabelled **Employer**.
3. **Verify:** company-only fields are **not** shown — **Industry**, **Employees**, **Company website**.
4. Click **Create target** without filling anything.
5. **Verify:** an inline **"Last name is required"** error appears and nothing is created.
6. Enter a **First name** (e.g. `Jane`) and a **Last name** (e.g. `PWTYPEDoe`), then click **Create target**.
7. **Verify:** a success toast appears and the sheet closes.

## 3. List: Type badge, name search, and Type filter

**E2E:** `tests/e2e/target-type.spec.ts` › `list shows Type badges and the Type filter narrows results`

1. In the targets list, type the shared prefix (e.g. `PWTYPE`) into **Filter by name or company ...**.
2. **Verify:** both new rows appear — the company row shows its company name, the individual row shows the person's full name (`Jane PWTYPEDoe`).
3. **Verify:** the company row has a **Company** badge and the individual row has an **Individual** badge in the **Type** column.
4. Open the **Type** faceted filter and select **Individual**.
5. **Verify:** the company row disappears and the individual row remains; a **Reset** control appears.
6. In the filter, deselect **Individual** and select **Company**.
7. **Verify:** the individual row disappears and the company row is shown again.

## 4. Detail title is type-aware

**E2E:** `tests/e2e/target-type.spec.ts` › `detail title is the company name for a Company target`
and `detail title is the person's full name for an Individual target`

1. Filter to the Company target, open its **⋮** row menu, and click **View**.
2. **Verify:** the detail card title is the **company name** with a **Company** badge, and Industry is shown while Position is not.
3. Go back, filter to the Individual target, and open **View**.
4. **Verify:** the detail card title is the person's **full name** with an **Individual** badge, and Position is shown while Industry is not.

---

## Known gaps

- **Update form / CSV import / MCP** type handling are covered by Jest
  (`__tests__/actions/*-type.test.ts`, `__tests__/mcp/crm-targets-type.test.ts`), not E2E.
- **Detail page header** (`[targetId]/page.tsx`, the outer "Target detail view: …" container title)
  still builds its text from first/last name and is not yet type-aware; the card title asserted above
  is.
