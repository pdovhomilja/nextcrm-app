# Target Triage — Manual Browser Testing Guide

Covers end-user browser testing for the target triage gate (Approve / Pass with a
reason + optional revisit date, and the triage status filter). Run against your
**local** environment.

## Prerequisites

```bash
# Terminal 1 — local Postgres + Inngest dev server
pnpm inngest:up

# Terminal 2 — dev server
pnpm dev
```

- **Seed:** `pnpm db:seed` — needs at least one target (seed provides demo targets, all
  `NEW` by default).
- **URL:** http://localhost:3000/en/campaigns/targets
- **Migration:** the `20260928120000_add_target_triage` migration must be applied
  (`pnpm db:migrate`).

## Test accounts

Sign in as any seeded admin (e.g. `test@nextcrm.app`) — local OTP is printed to the dev
server console (`[Auth] OTP for …`).

---

## 1. Approve a target for outreach

**E2E:** `tests/e2e/target-triage.spec.ts` › `approves a target from the row action`

1. Open **Campaigns → Targets**.
2. On any row, open the **⋮** row-action menu and click **Approve**.
3. **Verify:** a success toast ("Target approved for outreach") appears.
4. **Verify:** that row's **Triage** column now shows an **Approved** badge.

## 2. Pass a target with a reason (and optional revisit date)

**E2E:** `tests/e2e/target-triage.spec.ts` › `passes a target with a reason via the dialog`

1. On any row, open the **⋮** menu and click **Pass…**.
2. **Verify:** the "Pass on <name>" dialog opens with Reason, Note, and Revisit-on fields.
3. Select a **Reason** (e.g. *Bad timing*), optionally add a **Note** and a **Revisit on** date.
4. Click **Pass target**.
5. **Verify:** a success toast ("Target passed") appears and the row's **Triage** column shows a **Passed** badge.
6. Open the target's detail page → **Verify:** a "Passed" block shows the reason (and revisit date/note if set).

### 2a. Pass requires a reason

1. Open the **Pass…** dialog and click **Pass target** without selecting a reason.
2. **Verify:** submission is blocked (the button is disabled / an error toast asks for a reason); no badge change.

## 3. Filter by triage status

**E2E:** `tests/e2e/target-triage.spec.ts` › `filters targets by triage status`

1. In the toolbar, click the **Triage** faceted filter.
2. **Verify:** options **New / Approved / Passed** appear with live counts.
3. Select **Approved**.
4. **Verify:** the table narrows to approved targets and a **Reset** control appears.

---

## Known gaps

- **Auto-resurface of snoozed passes** is not implemented yet (deferred follow-up):
  `revisit_at` is stored but no cron flips a `PASSED` target back to `NEW` when the date
  arrives. No E2E until the cron lands.
- **Detail-page Approve/Pass control** (`TriageControl`) shares the same action/dialog as
  the row action; covered transitively by scenarios 1–2 rather than a separate spec.
