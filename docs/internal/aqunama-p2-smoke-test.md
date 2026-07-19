# AQUNAMA Phase 2 — Manual Smoke Test

Target environment: the **dev deployment** (dev.nextcrm.app) after PR #249 is deployed there.
Time needed: ~30–45 min. The timers span days by design, so this script verifies each
mechanism through the **Inngest dashboard** (runs, sleeps, cancellations) plus optional
**SQL time-travel** snippets for the paths where you want to see the end result today.

## Prerequisites

- [ ] Admin login on the dev deployment (`test@nextcrm.app` or your own admin).
- [ ] Inngest dashboard open: `http://10.100.90.29:8288` (the dev Inngest server). You should
      see the five new functions registered: `CRM: Qualified follow-up cadence`,
      `CRM: 45-day kill rule`, `CRM: Care touchpoints`, `CRM: Recycle exhausted targets`,
      `CRM: Renewal reminders`.
- [ ] Optional (for time-travel steps): psql access to the dev DB
      (`psql postgresql://…@10.100.90.10:5433/nextcrm-dev`).
- [ ] A throwaway test account + contact + deal you don't mind mutating. Create fresh ones
      (e.g. account "Smoke P2", contact, and a deal via the opportunity form) so the kill
      rule can't touch real data.

---

## Scenario 0 — Admin configuration (5 min)

1. Go to **Administration → CRM Settings → Sales stage** tab.
   - [ ] Each stage row shows an outline badge with its automation trigger where set
         (seeded: New→pre_sale, Need analysis→qualified, Signing→purchase_order,
         Realization of the project→delivery).
   - [ ] Edit a stage: the dialog has an **Automation trigger** select (None + 5 kinds).
         Set your Qualified-intent stage to `qualified` and (if missing) a stage to `care`.
         Save → badge updates.
2. Go to **Administration → Funnel Settings** (new sidebar item).
   - [ ] The form shows 4 groups (Kill rule / Recycle / Follow-up cadence / Care & renewals)
         with the defaults 45 / 90 / 3-7-10-15-45 / 30-90-90-8 / 30.
   - [ ] Enter `0` into "Close deal after N days…" and save → red toast
         ("Invalid values…"). Server-side validation works.
   - [ ] Set "Close deal after N days of client silence" to `1` and save → success toast.
         Reload the page → value persisted. **Leave it at 1 for Scenario 3; restore to 45
         at the end.**

## Scenario 1 — Stage change fires the cadence (5 min)

1. Open **CRM → Dashboard** (kanban). Drag your test deal into the `qualified`-trigger
   stage (or set the stage via the deal's Update form).
2. In the Inngest dashboard → Runs:
   - [ ] A new run of **CRM: Qualified follow-up cadence** exists for this event.
   - [ ] Its step timeline shows `load-stage`, `load-settings` completed and it is now
         **sleeping at `wait-touch-1`** until ~3 business days from now.
   - [ ] A run of **CRM: Care touchpoints** also triggered and finished immediately with
         `{ skipped: true, reason: "not a care stage" }` (both functions listen to the
         same event — the guard is the point).
3. Move a DIFFERENT deal between two non-qualified stages:
   - [ ] The cadence run for it ends `skipped` — no sleeping run accumulates.

## Scenario 2 — Leaving the stage cancels the cadence (2 min)

1. Move the Scenario-1 deal from the qualified stage to any other stage.
2. In Inngest → Runs:
   - [ ] The sleeping cadence run from Scenario 1 flips to **Cancelled** (cancelOn matched
         the new stage-changed event for the same deal).
   - [ ] If you moved it into the `care` stage: a **CRM: Care touchpoints** run is now
         sleeping at `wait-care-0` (≈30 days out) — that also covers Scenario 4's start.

## Scenario 3 — Kill rule closes a silent deal (10 min, uses the 1-day setting + SQL)

1. Move the test deal (back) into the `qualified` stage. Funnel Settings still has
   kill = 1 day (Scenario 0).
2. Time-travel the deal's clock — in psql (replace the name):

   ```sql
   UPDATE "crm_Opportunities"
   SET stage_entered_at = NOW() - INTERVAL '2 days'
   WHERE name = 'YOUR TEST DEAL NAME';
   ```

3. Trigger the sweep now instead of waiting for 06:00 UTC: Inngest dashboard →
   Functions → **CRM: 45-day kill rule** → Invoke (empty payload `{}`).
   - [ ] The run output shows `{ checked: N, closed: 1 }` (or more if other test deals
         qualified — this is why you use throwaway data).
   - [ ] The deal's status is now CLOSED — it disappears from the active pipeline/kanban.
   - [ ] The rep (assigned user) received the "Deal closed by 1-day rule" email
         (check the Resend dashboard or the inbox).
   - [ ] Administration → Audit Log has an `opportunity / updated` entry with
         status ACTIVE→CLOSED and `close_reason`.
4. Clock-restart check (negative case): repeat with a second qualified test deal but first
   log an activity on it (deal detail → activity, or any inbound synced email from its
   contact) — then Invoke the function again:
   - [ ] `closed` does NOT include this deal (activity restarted the clock).
5. **Restore Funnel Settings kill days to 45.**

## Scenario 4 — Care schedule (verify via Inngest, 2 min)

Covered by Scenario 2 step 2 if you moved the deal to the care stage:
- [ ] The Care run sleeps at `wait-care-0` ~30 days out (or your configured value).
- [ ] Optional end-result proof: temporarily set "Care check-in after N days" to 1,
      re-enter the care stage with a fresh test deal, and either wait a day or accept the
      Inngest sleep as evidence. (sleepUntil timestamps are fixed at entry — changing the
      setting after entry must NOT move the already-sleeping run: verify the sleeping
      run's wake time stays put after you change the setting.)

## Scenario 5 — Target recycle (SQL time-travel, 5 min)

Needs a target that finished a campaign sequence. If dev has an old test campaign whose
sends are `sent`, use it; otherwise send a 1-step campaign to a throwaway target first.

1. Backdate the final send:

   ```sql
   UPDATE "crm_campaign_sends"
   SET sent_at = NOW() - INTERVAL '100 days'
   WHERE email = 'your-throwaway-target@example.com';
   ```

2. Inngest → Functions → **CRM: Recycle exhausted targets** → Invoke.
   - [ ] Run output `{ recycled: 1 }`.
   - [ ] Campaigns → Target lists: a list named **Recycled** exists and contains the target.
   - [ ] Admin users received the "…targets recycled — assign a new sequence" digest email.
3. Invoke the function again:
   - [ ] `{ recycled: 0 }` — list membership makes it idempotent.
4. Negative case: a target with a send in the last 90 days (any active sequence) must NOT
   appear in Recycled even if an older sequence finished long ago.

## Scenario 6 — Renewal reminders (5 min)

1. On your test account, either set a contract's **Renewal reminder date** or assign a
   product with a **renewal date** ~2 weeks from today.
2. Inngest → Functions → **CRM: Renewal reminders** → Invoke.
   - [ ] Run output `{ created: 1 }`.
   - [ ] The account's task list shows a task titled `Renewal 2026-…: …` assigned to the
         account's rep, due on the renewal date; the rep got the notification email.
3. Invoke again → `{ created: 0 }` (idempotent while the task is open).
4. **Complete the task**, then Invoke again:
   - [ ] Still `{ created: 0 }` — completed renewals must not respawn (this was a
         pre-push review fix; regression-check it explicitly).

## Scenario 7 — Task wiring (2 min)

For any auto-created task from Scenarios 3–6:
- [ ] It appears in the account's tasks table (CRM → account detail) with priority high
      and the correct due date.
- [ ] The assignee email arrived with a working link to the task.

## Wrap-up

- [ ] Funnel Settings restored to defaults (45 / 90 / 3-7-10-15-45 / 30-90-90-8 / 30).
- [ ] Test deals/targets cleaned up or clearly named as smoke-test data.
- [ ] Anything unexpected → capture the Inngest run ID + screenshots and report.

## Known limitations (don't file as bugs)

- Cadence/care schedules snapshot Funnel Settings at stage entry — changing settings
  never reshapes already-sleeping runs (by design, see Scenario 4).
- Touch dates use day arithmetic in UTC; across a DST change a task's due time can shift
  by an hour.
- Recycled targets are NOT auto-enrolled in a new sequence — assigning the Recycled list
  to a fresh campaign is a deliberate human step.
- The cadence runs for every qualified deal (no low/high-value distinction yet).
