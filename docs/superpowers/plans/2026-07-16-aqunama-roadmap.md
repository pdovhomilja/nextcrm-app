# AQUNAMA on NextCRM — Implementation Roadmap

**Status:** Plan 1 is fully specified; Plans 2–4 are scoped stubs to be expanded into full plans (via superpowers:writing-plans) when their turn comes.
**Source analysis:** `docs/internal/aqunama-sales-process-gap-analysis.md`
**Decisions made (2026-07-16):** top-of-funnel maps to Targets + target lists (not Leads); SOW/quote approval starts minimal (approval status on the opportunity + attached document, no quote entity); calendar scope is **full two-way sync** (Google Calendar + Calendly); work is split into independently shippable plans.

---

## Plan 1 — Compliance & Flow Glue ✅ specified

Full plan: `docs/superpowers/plans/2026-07-16-aqunama-p1-compliance-flow-glue.md`
Covers gaps G-02 (target→deal conversion), G-06 (global opt-out), G-08 (XLSX import), G-09 (delivery deadline), plus the Phase-0 configuration runbook. Ship this first — the global opt-out is a compliance prerequisite for everything that follows.

## Plan 2 — Timer & Task Engine ✅ implemented (2026-07-18)

Full plan: `docs/superpowers/plans/2026-07-18-aqunama-p2-timer-task-engine.md` — decisions: activity = inbound email OR logged activity; stage kinds connectable in admin (CRM settings); all timing values instance-configurable at Admin → Funnel Settings; weekend-only business days; kill = close + notify.

Original stub (for reference):

The heart of the spec: automated funnel timing on Inngest.

- **Data:** add `funnel_state` tracking to targets/opportunities where needed (e.g. `sequence_exhausted_at`, `paused_until` on the target; task↔opportunity link `opportunity_id` on `crm_Accounts_Tasks`).
- **Recycle timer:** daily Inngest cron — targets whose sequence exhausted ≥ 3 months ago and `do_not_email = false` move into a "Recycled" target list and get re-assigned a campaign.
- **45-day kill rule:** daily cron over ACTIVE opportunities in Qualified stage — if `last_activity` (restarted by inbound synced email or logged activity; exact definition to confirm at plan time) is > 45 days old, set status to CLOSED/Lost and notify the rep.
- **Cadence tasks:** on stage entry to Qualified (quote sent), schedule the 5-touch cadence as auto-created CRM tasks (+3 business days, +7 d, +10 d, day 15 and 45 of the retention window). Requires a business-day helper and a stage-transition event.
- **Care tasks:** on stage entry to Care, schedule +30-day check-in, quarterly check-ins, and the ~90-day referral-ask task.
- **Renewal surfacing:** weekly cron emailing reps contracts/account-products with `renewal_date`/`renewalReminderDate` within 60 days.
- **Prerequisite decision:** precise definition of "client activity" that restarts the 45-day clock.

## Plan 3 — Minimal SOW/Quote Approval ✅ implemented (2026-07-19)

Full plan: `docs/superpowers/plans/2026-07-19-aqunama-p3-approval-workflow.md` — decisions: hard gate on Qualified entry; approvers = manager+admin; queue at /crm/approvals.

Original stub (for reference):

- **Data:** `approval_status` enum on `crm_Opportunities` (`none | pending_approval | approved | rejected`), `approved_by`/`approved_at`; `case_study_candidate` + `case_study_approved` on `crm_Accounts`.
- **Flow:** rep attaches the SOW/quote document to the opportunity and requests approval → manager/admin (CSO) sees a pending-approvals view and approves/rejects (guarded by `isManagerOrAdmin`) → only approved deals can move to the Qualified stage (transition guard) → approval decisions audit-logged and email-notified.
- **Upgrade path:** a structured `crm_Quotes` entity with line items + PDF (reusing the invoice `@react-pdf/renderer` pipeline) stays available as a later enhancement; nothing in the minimal flow blocks it.

## Plan 4 — Calendar Sync ✅ Milestones A+B implemented (2026-07-19)

Full plan: `docs/superpowers/plans/2026-07-19-aqunama-p4-calendar-sync.md` — spec: `docs/superpowers/specs/2026-07-19-aqunama-p4-calendar-sync-design.md`. Decisions: A+B only (outbound two-way deferred); org-scope Calendly webhook; Workspace-internal Google OAuth, readonly scope, 15-min Inngest polling; unmatched Calendly invitees auto-create Targets; synced meetings restart the 45-day kill clock.

Original stub (for reference):

Decision was full sync (not webhook-only). Suggested internal milestones so value ships early:

1. **Milestone A — Calendly inbound:** Calendly webhook endpoint (`invitee.created` / `invitee.canceled`) → match invitee email to target/contact → create a meeting activity + task on the matching record. Small, ships alone.
2. **Milestone B — Google Calendar OAuth + inbound sync:** per-user OAuth (googleapis), store tokens alongside the existing email-account credentials pattern, watch/poll the rep's calendar, link events to CRM records by attendee email.
3. **Milestone C — outbound + true two-way:** create/update calendar events from CRM (booked calls, cadence call tasks), handle reschedules/cancellations both directions, conflict resolution.
- **Data:** `crm_Meetings` (or reuse `crm_Activities` with type MEETING) + external-id mapping table for sync idempotency.
- **Risk:** Google OAuth verification/scopes and token refresh operational burden; Milestone A alone already satisfies "booked calls land in the CRM" if priorities shift.

## Suggested order

Plan 1 → Plan 2 → Plan 3 → Plan 4 (Milestone A of Plan 4 can run in parallel with Plan 3 if capacity allows). AI voice calls (G-12) remain out of scope until later 2026 per the spec.
