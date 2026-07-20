# AQUNAMA Phase 4 — Milestone C: Outbound + Two-Way Calendar Sync — Design

**Date:** 2026-07-19
**Builds on:** `2026-07-19-aqunama-p4-calendar-sync-design.md` (Milestones A+B, shipped via PR #253)

## Scope decisions (2026-07-19)

- **Outbound source: meeting activities only.** A CRM `meeting` activity created/edited/cancelled by a rep flows to their Google Calendar. Cadence call tasks stay CRM-only (no clean time-slot mapping; avoids automation clutter).
- **Real invites.** The counterparty email from the activity's linked record is added as an attendee and the Google event is written with `sendUpdates: "all"` — the customer receives an actual calendar invitation; their accept/decline is visible on the event (not mirrored into the CRM in this milestone).
- **Trigger: event-driven via Inngest** (`crm/calendar.outbound-sync`), emitted by the CRM activity writers — durable, retried, keeps Google latency out of the request path. No polling for outbound.
- **Write scope is opt-in per rep.** Inbound-only connections keep working unchanged; outbound requires a per-rep scope upgrade (re-consent).

## Scope model

- `CalendarConnection` gains `scopeLevel` (`"readonly" | "readwrite"`, default `readonly`), derived from the scopes Google actually grants at token exchange (`tokens.scope`).
- OAuth authorize route accepts an upgrade variant that requests `https://www.googleapis.com/auth/calendar.events` in addition to `calendar.readonly`; the callback upserts the existing connection row in place with the new tokens + `scopeLevel: "readwrite"`.
- Profile Calendar tab: readonly connections show an **"Enable two-way sync"** button (same authorize endpoint, upgrade variant); readwrite connections are labeled "Two-way".

## Outbound flow

Emit `crm/calendar.outbound-sync` `{ activityId, action: "upsert" | "cancel" }` from every writer that creates, updates (date/duration/title/status), soft-deletes, or cancels a `meeting` activity (writer inventory happens at plan time).

Inngest function `calendar-outbound-sync`:

1. **Guard — skip unless all hold:**
   - activity exists, `type: "meeting"`, has a `date`, not soft-deleted (cancel action exempt from the date/status checks);
   - creator (`createdBy`) has an active `readwrite` `CalendarConnection`;
   - the activity's existing mapping (if any) is **not** `source: "calendly"` — Calendly owns its events, outbound never touches them.
2. **Build the event:** summary = activity title; start = `date`; end = `date + duration` minutes (default 30 when null); attendees = counterparty email(s) resolved from the activity's `crm_ActivityLinks` (contact → email, target → email, lead → email; first linked entity with an email). No linked email → push as a private block with no attendees.
3. **Write to Google** with the creator's connection:
   - no mapping row → `events.insert` (`sendUpdates: "all"`) → create `crm_CalendarEvents` mapping (`source: "google"`, `externalId` = event id, `connectionId`, `iCalUID`, startAt/endAt/attendees);
   - mapping row (`source: "google"`) exists → `events.patch`; update mapping state;
   - action `cancel` → `events.delete` (`sendUpdates: "all"`); mark mapping + keep activity status as set by the CRM writer. A 404/410 from Google (already gone) is success.
4. Mapping writes reuse the P2002-tolerant transactional pattern from `lib/crm/calendar/sync.ts`.

## Two-way semantics

- The `crm_CalendarEvents` mapping row is the shared state between directions.
- **Echo suppression:** outbound updates the mapping's `startAt`/`endAt`/`status` at push time, so the next inbound poll classifies the event as unchanged and skips it. Inbound updates the mapping too, so no outbound push is re-triggered (outbound only fires from CRM writers, not from inbound sync).
- **Reschedule in Google** → inbound poll updates the CRM activity (existing Milestone B behavior — Google wins when the change happens there).
- **Edit in CRM** → outbound patch updates Google (CRM wins when edited there).
- **Simultaneous edits:** last write wins. Accepted for meeting objects.
- **Cancel propagates both ways:** CRM cancel/delete → Google `events.delete` + attendee notification; Google delete → inbound marks activity `cancelled` (existing behavior; kill clock unaffected per the Phase 4 fix).

## Error handling

- Push failures retry via Inngest (`retries: 3`); auth failures classified by the existing `isAuthRevocationError` → `isActive: false` + reconnect prompt; other failures set `lastSyncError`.
- Guard-skips are silent successes (return a reason string for observability, mirroring `upsertCalendarEvent`).

## Testing

- Unit tests (mocked Prisma + mocked googleapis client): guard matrix (non-meeting, no date, no readwrite connection, calendly-sourced, soft-deleted), payload builder (duration default, attendee resolution per link type, no-email private block), insert-vs-patch-vs-delete selection, 404-on-delete tolerance, scope parsing (`tokens.scope` → `scopeLevel`).
- Existing inbound suites must stay green unchanged — echo suppression relies on their unchanged-skip semantics.

## Out of scope (this milestone)

Attendee accept/decline mirroring into CRM; cadence-task events; Calendly outbound (Calendly remains inbound-only); non-Google providers.

## Migration

One additive column: `CalendarConnection.scopeLevel String @default("readonly")`. Authored via `prisma migrate diff` + fresh-replay, per the standing dev-DB drift rule.
