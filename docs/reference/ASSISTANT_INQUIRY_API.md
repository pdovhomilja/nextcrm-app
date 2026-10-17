# Assistant Inquiry API — `POST /api/crm/assistant/inquiry`

The single, narrow CRM write that Rade's public AI assistants (website chat and the
Vapi phone agent, both orchestrated by **n8n Cloud**) use to record a lead and what
was discussed. It is **write-only**: it never returns CRM data beyond the ids it
created or matched. The public agents get neither the MCP server nor a user API token.

Code: `app/api/crm/assistant/inquiry/route.ts` → `lib/crm/assistant/*`.
Tests: `__tests__/crm/assistant/`.

## What one call does

1. **Rate limit**: 60 requests/min per caller IP (Upstash sliding window). This runs
   *before* auth, so it also slows token guessing. If Upstash is unset or unreachable,
   the limiter fails open; the token is the security boundary.
2. **Auth**: `Authorization: Bearer <ASSISTANT_TOKEN>`, compared in constant time.
   `ASSISTANT_TOKEN` is separate from `NEXTCRM_TOKEN` (website forms), so either can be
   rotated or revoked on its own. An unset token, or one shorter than 32 characters,
   rejects every call (fail closed).
3. **Validate**: zod, strict. Unknown fields are rejected, so callers can't smuggle ids.
4. **Idempotency**: the first call with an `idempotencyKey` claims a unique row in
   `crm_Assistant_Inquiries`. Any later call with the same key returns the original ids
   with `duplicate: true` and writes nothing.
5. **Find or create the lead** (`crm_Leads`, not soft-deleted):
   1. match by **email** (trimmed, lowercased, compared case-insensitively), then
   2. by **phone** (stored phones reduced to digits; a bare 10-digit US number matches
      with or without the leading `1`).

   If several leads match, the **oldest** wins. Otherwise a lead is created through
   `createWebLead` (source/status/assignee resolution plus the `crm/lead.saved`
   event), with email lowercased and phone stored as E.164. A matched lead is
   **not modified**.
6. **Activity**: one `crm_Activities` row, status `completed` and dated now, linked to
   the lead via `crm_ActivityLinks` (`entityType: "lead"`). `voice_call` creates a
   **call** and `website_chat` a **note**. `description` holds the summary. `metadata`
   holds `origin: "ai_assistant"`, source, sessionId, intent, urgency,
   serviceInterest, booking, a contact snapshot and the idempotencyKey. An urgent
   inquiry's title starts with `URGENT ·`.

### Why leads (not contacts or targets)

The website forms already feed `crm_Leads`, and an inbound inquirer is a lead until
Shaun converts them. Contacts are converted customers, and targets are *outbound*
prospects. Matching only leads keeps the contract stable (one `leadId`). A converted
customer who calls in may get a fresh lead; see Known gaps.

### Why a table for idempotency (not Upstash)

The unique index makes the claim race-safe. The "complete" mark commits **in the same
transaction** as the activity, so a key can never point at a half-written result. The
ledger is durable (no TTL, no eviction) and doubles as an audit trail of assistant
writes. Upstash is optional outside production, so idempotency would silently vanish
in DEV.

## Request

```http
POST /api/crm/assistant/inquiry
Authorization: Bearer <ASSISTANT_TOKEN>
Content-Type: application/json
```

```json
{
  "idempotencyKey": "vapi-call-7f3c2a:summary",
  "source": "voice_call",
  "sessionId": "vapi-call-7f3c2a",
  "contact": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "(913) 555-0142",
    "company": "Doe Plumbing"
  },
  "inquiry": {
    "intent": "booking",
    "serviceInterest": "Website redesign",
    "summary": "Owner of a 3-truck plumbing company; site is outdated WordPress. Booked a discovery call.",
    "urgency": "normal"
  },
  "booking": {
    "calBookingUid": "cal_8YbQ2",
    "startTime": "2026-10-20T15:00:00-05:00"
  }
}
```

| Field | Rules |
|---|---|
| `idempotencyKey` | **required**, 1–200 chars. One key per *conversation outcome*: for example `<sessionId>:summary`, or the Vapi call id. **Reuse it on retries**; a new key means a new activity. |
| `source` | **required**: `"website_chat"` \| `"voice_call"` |
| `sessionId` | optional, ≤200 chars (chat session or call id) |
| `contact.name` | optional, ≤200. Last word becomes `lastName`, the rest `firstName`; when absent, `lastName` is `"Unknown"`. |
| `contact.email` | optional, a valid email |
| `contact.phone` | optional, any common format. Must normalize to E.164: a 10-digit US number, `1`+10 digits, or `+`-prefixed international. |
| `contact.company` | optional, ≤200 |
| — | **at least one of `contact.email` / `contact.phone` is required** |
| `inquiry.intent` | **required**: `"sales"` \| `"support"` \| `"booking"` \| `"other"` |
| `inquiry.serviceInterest` | optional, ≤200 |
| `inquiry.summary` | **required**, 1–4000 chars |
| `inquiry.urgency` | `"normal"` (default) \| `"urgent"` |
| `booking.calBookingUid` | optional, ≤200 |
| `booking.startTime` | optional, ISO-8601 datetime with `Z` or an offset |

## Responses

**200: recorded** (or replayed)

```json
{ "status": "success", "leadId": "5b0e…", "activityId": "c21a…", "leadCreated": true, "duplicate": false }
```

On a replay of the same key: identical ids and `leadCreated` (as of the original call),
with `"duplicate": true`.

| Status | Body | Caller should |
|---|---|---|
| 400 | `{ "status": "error", "message": "Validation failed", "formErrors": [], "fieldErrors": { "contact": ["At least one of email or phone is required"] } }`. Also returned for non-JSON bodies (`"Body must be valid JSON"`). | fix the payload; don't retry as-is |
| 401 | `{ "status": "error", "message": "Unauthorized" }` | check the token; don't retry |
| 409 | `{ "status": "error", "message": "A request with this idempotencyKey is still in progress; retry shortly" }` | retry with the **same** key after a few seconds |
| 429 | `{ "status": "error", "message": "Too many requests" }` | back off and retry |
| 500 | `{ "status": "error", "message": "Could not record inquiry" }` | retry with the **same** key; the claim was released |

Errors never include stack traces, SQL or internal details (those go to the server log
under `[assistant-inquiry]`).

## n8n wiring notes

- HTTP Request node: Header Auth `Authorization` = `Bearer {{ $env.ASSISTANT_TOKEN }}`
  (store it as an n8n credential). Turn on "Retry on fail" for 409/429/5xx, keeping the
  same body.
- Derive `idempotencyKey` deterministically from the session or call id, never from
  `Date.now()`, so a retried execution replays instead of duplicating.
- Notifications to Shaun (urgent flag, booking) belong in n8n after a `200` with
  `duplicate: false`, so a retry doesn't notify twice.

## Known gaps

- **Identity isn't verified.** A caller can give someone else's email, and the
  conversation is then logged on that person's lead. Nothing leaks (only ids come
  back), and the metadata contact snapshot shows what was claimed. Verification
  (e.g. an email OTP in chat) would live on the n8n side.
- **Leads only.** An existing contact or target with the same email isn't matched, so
  a converted customer gets a new lead.
- **No backfill.** A matched lead's empty phone/company aren't filled in from the call.
  The values are in the activity metadata.
- **Lead source.** A lead the assistant *creates* gets **`AI Website Chat`** (chat) or
  **`AI Phone Assistant`** (voice); a matched lead keeps its source. Both rows come from
  migration `20261018120000_assistant_lead_sources`, which also re-tagged the leads the
  assistants had created before (they were filed as `Web` / `Other`). The names live in
  `LEAD_SOURCE_BY_CHANNEL` (`lib/crm/assistant/record-inquiry.ts`); a test fails if the
  mapping and the migration disagree, because a name with no row leaves the lead with
  **no source** (`createWebLead` looks it up by name and silently falls back to null).
- **Phone matching is a sequential scan** over `crm_Leads` (regex on free-form text).
  That's fine at current volume; add a normalized, indexed phone column if leads reach
  six figures.
- **A crash between lead creation and the activity** (rare) leaves the new lead in
  place. The retry matches it by email or phone, so it reports `leadCreated: false`.
