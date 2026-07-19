# AQUNAMA Phase 4 — Calendar Sync (Calendly + Google Calendar inbound) — Design

**Date:** 2026-07-19
**Gap:** G-05 (`docs/internal/aqunama-sales-process-gap-analysis.md`)
**Roadmap:** Plan 4 in `docs/superpowers/plans/2026-07-16-aqunama-roadmap.md`

## Scope decisions (2026-07-19)

- This spec covers **Milestones A + B**: Calendly inbound webhook capture and Google Calendar OAuth + inbound polling sync. **Milestone C (outbound / true two-way) is deferred** to a follow-up plan; nothing here blocks it.
- Calendly: one **paid organization account** → a single organization-scope webhook subscription covers all reps.
- Google: reps are on a **Google Workspace domain** → OAuth consent screen is "Internal", `calendar.readonly` scope, no Google verification review needed.
- Google inbound uses **Inngest polling** (15-min cron, incremental `syncToken`), mirroring `email-sync-all`. No push watch channels.
- Unmatched attendee email: **Calendly → auto-create a Target** (source "Book-a-call"); **Google → skip the event entirely** (reps' internal/personal meetings must not pollute the CRM).
- Synced meetings are `crm_Activities` rows, so they **restart the Phase 2 45-day kill clock** via `getLastClientActivity` with no Phase 2 changes. (amended at final review: `getLastClientActivity` gained a `status != cancelled` filter so cancelled bookings don't suppress the kill clock)

## Architecture

Two inbound pipelines converging on one shared processor:

```
Calendly org webhook ──▶ POST /api/crm/calendar/webhooks/calendly ──▶ inngest "crm/calendar.event.received"
                                                                          │
Google Calendar ◀── events.list + syncToken (Inngest cron */15,           │
                    fan-out per active CalendarConnection) ───────────────┤
                                                                          ▼
                                                            lib/crm/calendar-sync.ts
                                                            upsertCalendarEvent():
                                                            match → dedup → meeting activity
```

- The webhook route verifies the Calendly HMAC signature (pattern: `app/api/campaigns/webhooks/resend/route.ts`), ACKs 200 fast, and hands the payload to Inngest for durable, retried processing.
- The Google poller fans out one Inngest event per active connection (pattern: `inngest/functions/emails/sync-all.ts`), performs incremental sync, and emits the same processing event per relevant change.
- All business rules (matching, dedup, activity writes) live in one module: `lib/crm/calendar-sync.ts`.

## Data model

Three additions; no changes to existing models.

```prisma
enum CalendarProvider { google }

model CalendarConnection {          // mirrors EmailAccount
  id                    String   @id @default(uuid()) @db.Uuid
  userId                String   @db.Uuid            // → Users, onDelete Cascade
  provider              CalendarProvider
  accountEmail          String                        // rep's calendar email
  accessTokenEncrypted  String
  refreshTokenEncrypted String
  tokenExpiresAt        DateTime?
  syncToken             String?                       // Google incremental cursor
  isActive              Boolean  @default(true)
  lastSyncedAt          DateTime?
  lastSyncError         String?
  createdAt / updatedAt
  @@unique([userId, provider, accountEmail])
}

model crm_CalendarEvents {          // sync mapping / idempotency / dedup
  id             String   @id @default(uuid()) @db.Uuid
  source         String                                // "calendly" | "google"
  externalId     String                                // Calendly invitee URI / Google event id
  iCalUID        String?                               // cross-source dedup key
  connectionId   String?  @db.Uuid                     // → CalendarConnection (google only)
  activityId     String   @db.Uuid                     // → crm_Activities (the meeting)
  startAt        DateTime
  endAt          DateTime?
  attendeeEmails Json     @default("[]")
  status         String                                // scheduled | cancelled
  rawPayload     Json?                                 // last payload, debugging
  createdAt / updatedAt
  @@unique([source, externalId])
  @@index([iCalUID])
  @@index([activityId])
}
```

The meeting itself is a plain `crm_Activities` row (`type: meeting`, status `scheduled`/`cancelled`) linked via `crm_ActivityLinks` to the matched entities. Encryption reuses the existing `passwordEncrypted` crypto helper used by `EmailAccount`.

## Matching & processing rules (shared processor)

Counterparty email selection — Calendly: the invitee email; Google: attendees minus any email on the rep's own Workspace domain.

Match in priority order; first hit wins:

1. **`crm_Contacts.email`** → link activity to the contact and its account; if the account has exactly one open (ACTIVE, not deleted) opportunity, link that too. Multiple open opportunities → link contact + account only.
2. **`crm_Targets`** (by email) → link to the target.
3. **`crm_Leads.email`** → link to the lead.
4. **No match:**
   - Calendly → create a `crm_Targets` row: source "Book-a-call", name/email from the invitee, assigned to the rep whose `Users.email` matches the Calendly event host (fallback: unassigned); link the meeting activity to it.
   - Google → skip; store nothing.

Additional Google skip rules: all-day events, events the rep has declined, and events already captured from Calendly — detected by matching `iCalUID`, or same `startAt` + counterparty email, against `crm_CalendarEvents` (Calendly bookings replicate onto the rep's Google Calendar).

**Reschedules/cancellations:** Calendly `invitee.canceled` (a reschedule arrives as cancel + new `invitee.created`) and Google `status: cancelled` / changed `start` update the mapped activity — set status `cancelled` or update `date` — never create duplicates. All writes are idempotent upserts keyed on `(source, externalId)`.

## Per-source specifics

### Calendly (Milestone A)

- Admin setup page under CRM settings: store the organization API token + webhook signing key; a "Subscribe webhook" action calls Calendly's API to register `invitee.created` / `invitee.canceled` at organization scope and stores the subscription URI.
- `POST /api/crm/calendar/webhooks/calendly`: verify `Calendly-Webhook-Signature` (HMAC-SHA256 with the signing key), return 401 on failure; on success ACK 200 immediately and emit the Inngest event.
- Host → rep resolution: Calendly event host email matched to `Users.email`.

### Google Calendar (Milestone B)

- "Connect Google Calendar" on the same settings surface as email accounts → OAuth (offline access, `calendar.readonly`) → tokens encrypted → `CalendarConnection` row.
- Cron `*/15 * * * *` fans out per active connection. Each run: refresh access token if expired; `events.list` with stored `syncToken` (first run or `410 GONE`: full re-fetch of a ±60-day window and new token); feed changes to the shared processor; update `lastSyncedAt`/`syncToken`.
- Repeated auth failures → `isActive = false` + `lastSyncError` set → settings UI shows a "reconnect" prompt.

## Error handling

- Bad webhook signature → 401, nothing processed.
- Valid-but-unparseable payloads → ACK 200 + log (never let repeated 4xx/5xx responses cause Calendly to disable the subscription); processing failures after ACK retry via Inngest.
- Token refresh failure → connection flagged as above; no silent data loss (next successful sync re-fetches via syncToken or full window).

## Testing

- Jest unit tests: matcher priority tiers and no-match branches (both sources), cross-source dedup, reschedule/cancel upsert behavior, Calendly signature verification — with fixture payloads for both providers.
- Route tests for the webhook endpoint following the existing `__tests__/route.test.ts` pattern.
- Migration authored with `prisma migrate diff` (dev-DB drift rule); CI replays migrations fresh.

## Risks

- Calendly webhook API requires a paid plan — org account confirmed paid; verify tier grants webhook access before implementation starts.
- Polling delay: bookings appear in CRM within ≤15 min. Accepted for this process.
- Google quota: `events.list` incremental polling per rep every 15 min is far below default quotas.
- Milestone C (outbound) later needs the `calendar.events` write scope — a consent re-grant per rep, but no schema change.
