# Target email engagement — webhook fix + engagement line (design)

**Status:** ✅ Implemented
**Date:** 2026-10-02
**Branch:** `feat/target-email-engagement`

## Lessons Learned

- **Resend events carry two ids.** `data.message_id` is the RFC 5322 header, `data.email_id` is the
  id we store. The pre-existing `message_id ?? email_id` matched the header → silent 200, nothing
  recorded (for campaigns too). Promoted to `LESSONS_LEARNED.md`.
- **`clicked_at` ≠ homepage click.** Resend fires `email.clicked` for ANY tracked link (unsubscribe
  included), so the homepage-specific signal needs `data.click.link` matched to `/p/<slug>`.
- **Self-view exclusion stays cheap** — a Cookie-header presence check (no `getSession()`), to keep
  the public `/p/` serving path fast.

## Known Gaps

- **E2E:** live Resend delivery (open/click → badge + engagement line) and the `/p/` self-view check
  are manual-on-QA only (need real open/click tracking + a `/p/<slug>` request). The webhook matching,
  homepage-click, and self-view logic are unit-covered; recorded as an E2E gap in the manual-testing doc.
- **Local DB drift** (`source_url`/`screenshot_key` columns from prior local `db push`) is unrelated;
  `prisma migrate reset` clears it. Does not affect CI/QA/prod (committed-migration builds).

## Problem

Resend records opens/clicks for one-off target outreach emails, but they never
surface in the CRM. Two separate causes:

1. **Webhook never matches (the real bug).** `app/api/campaigns/webhooks/resend/route.ts`
   resolves the lookup id as `event.data.message_id ?? event.data.email_id`.
   Resend's current `email.*` payloads include `data.message_id` as the **RFC 5322
   Message-ID header** (`<...@...>`), which never equals the stored Resend email id
   (`data.email_id`, e.g. `01a0fa36-...`, saved from the send response's `data.id`
   as `crm_Target_Email.resend_message_id`). So `??` picks the header, the lookup
   misses, the handler returns `{"ok":true}` 200, and `opened_at`/`clicked_at` are
   never written. **Verified in prod** (The Powder Room: open event `email_id`
   matched the stored id, but `opened_at` stayed null). **This also breaks campaign
   open/click tracking** (`crm_campaign_sends`, same handler) — it is an **upstream
   bug** (the line exists at `upstream/main`).

2. **No engagement surface on the homepage line.** Even once opens/clicks record,
   the only display is the "Outreach emails" card badges. The user wants the
   signal next to the "Sample homepage — viewed N times" line, and a view counter
   that doesn't count their own CRM previews.

## Goals / decisions (already agreed)

- **Placement:** a *separate* engagement line near `HomepageViews`, not merged into it.
- **Click precision:** **homepage-specific** — distinguish a click on the homepage
  link from other links (unsubscribe, etc.).
- **Self-views:** **exclude** the operator's own CRM visits from the `/p/` view counter.
- **Which email:** the engagement line reflects the **most recent outreach email
  that included the homepage**.

## Non-goals

- No change to the "Outreach emails" card (its badges start working for free once
  the webhook is fixed).
- No backfill of historical opens/clicks (Resend won't redeliver; a fresh test
  after deploy confirms).
- No target-list-row badge (separate idea, out of scope).

## Design

### 1. Webhook id fix (upstream-owned file — log + consider upstreaming)

`app/api/campaigns/webhooks/resend/route.ts`:
- Change the lookup to **prefer the Resend email id**:
  `const messageId = event.data.email_id ?? event.data.message_id;`
  (the stored `resend_message_id` is the email id; `message_id` is the RFC header).
- Widen the parsed event type to include the click/open sub-objects:
  `data: { email_id?, message_id?, created_at, click?: { link?, timestamp? }, open?: { timestamp? } }`.
- Prefer the event's own timestamp when setting `opened_at`/`clicked_at`
  (`data.open?.timestamp` / `data.click?.timestamp`), falling back to `new Date()`.
- Keep idempotency (only set when currently null). This fix restores **both**
  campaign and target-email tracking.

### 2. Homepage-specific click (fork-owned model + migration)

- **Schema:** add `homepage_clicked_at DateTime?` to `crm_Target_Email`
  (`prisma/schema.prisma`, fork-owned model). Additive/nullable → **additive
  migration** authored with `prisma migrate dev`. Keep existing `clicked_at` = "any
  tracked link clicked".
- **Webhook target-email branch:** on `email.clicked`, after setting `clicked_at`,
  look up the target's homepage slug (join `crm_Target_Email.targetId` →
  `crm_Target_Homepage.slug`) and, if `data.click.link` points at that page's
  `/p/<slug>`, set `homepage_clicked_at` (idempotent). A missing/garbage link just
  leaves it null (fail-open). One extra small query, only on click events.

### 3. Engagement line UI (fork-owned)

- **Query (`BasicView.tsx`, APPROVED branch):** fetch the most recent
  `crm_Target_Email` for the target **with `included_homepage = true`**, selecting
  `opened_at`, `clicked_at`, `homepage_clicked_at`, `sent_at`. Run it in the
  existing `Promise.all`.
- **New component `HomepageEngagement.tsx`** (sibling of `HomepageViews`), rendered
  directly under `<HomepageViews/>` in `BasicView`:
  `Email: opened <date> · homepage link clicked <date>` with graceful
  "— not opened yet" / "— homepage link not clicked yet" states, and nothing shown
  when the target has no homepage-bearing email. Uses `LocalDateTime` like
  `HomepageViews`. `data-testid="homepage-engagement"`.

### 4. Self-view exclusion (`/p/` counter, fork-owned)

- In `app/p/[slug]/route.ts`, **skip the view increment when the request carries a
  logged-in CRM session** — a cheap **presence check of the better-auth session
  cookie** on `req` (no DB round-trip, keeps the public serving path fast). The
  drawer's preview iframe and "Open in new tab" are same-origin and carry the
  cookie → skipped; a prospect on the previews domain / from the email has no
  cookie → counted. Approximate by design (a stale cookie over-skips, acceptable
  for a best-effort counter). `recordHomepageView` stays best-effort/non-blocking.
  - Verify the exact better-auth cookie name during implementation (`lib/auth-server.ts`
    / better-auth config); fall back to a full `getSession()` only if a reliable
    cookie-presence check isn't available.

## Trust boundary / security

- Webhook keeps its Svix signature gate untouched; still idempotent; still returns
  200 for unknown messages.
- The engagement query is inside the already-authorized target detail
  (`assertCanReadTarget` upstream of `BasicView`); selects only timestamps.
- The `/p/` self-view check only *reduces* counting; it never blocks serving and
  never exposes session data.

## Ownership / upstream impact

- **Upstream-owned touch:** `app/api/campaigns/webhooks/resend/route.ts` (the
  `messageId` line + event-type widening). Thin, insertion-friendly. **Log in
  `UPSTREAM_IMPACT_LOG.md`**; strong candidate to contribute the id-fix back upstream.
- **Upstream-owned touch:** `BasicView.tsx` (already fork-extended) — one more query
  + one more child render. Log it.
- Fork-owned: `prisma/schema.prisma` (the `crm_Target_Email` model is fork-added —
  the new column is not an upstream risk), the migration, `HomepageEngagement.tsx`,
  `app/p/[slug]/route.ts`, `lib/homepage/views.ts` (if touched).

## Commit structure (for upstream cherry-pick)

The branch is split so the generic fix can be contributed back to
`pdovhomilja/nextcrm-app` independently of the fork-only engagement work:

- **Commit A — `fix(webhooks): match Resend events by email_id, not the RFC Message-ID`**
  (upstream-contributable; touches **only** `app/api/campaigns/webhooks/resend/route.ts`):
  prefer `event.data.email_id`, widen the event type to include `open`/`click`
  sub-objects, prefer the event's own timestamp. Benefits **both** campaign sends
  and target emails. Carries its own regression test. Cherry-pickable onto a clean
  `upstream/main` base.
- **Commit B — fork engagement feature:** `homepage_clicked_at` column + migration,
  the homepage-specific click match in the fork's target-email branch, the
  `HomepageEngagement` line + `BasicView` query, `/p/` self-view exclusion, tests,
  and docs (incl. `UPSTREAM_IMPACT_LOG.md`).

Keep Commit A free of any fork-specific (`crm_Target_Email` homepage match) logic
so a clean cherry-pick to upstream needs no surgery.

## Migration ordering

Additive column → the migration ships **in this PR**; on merge, `advance-qa` →
Vercel build runs `prisma migrate deploy` before the app serves, so the column
exists before the code reads it. After-merge reminder applies (migration auto-applies
via deploy; never hand-apply).

## Testing

- **Webhook (unit, Jest):** `email.opened`/`email.clicked` with the real
  payload shape (both `message_id` RFC header **and** `email_id` present) now match
  on `email_id` and set `opened_at`/`clicked_at`; a click whose `data.click.link`
  matches the homepage `/p/<slug>` sets `homepage_clicked_at`, a non-homepage link
  does not; unknown message → no-op 200. **Revert-verify** the id fix (swap back to
  `message_id ??` → open test fails).
- **Self-view (unit):** `recordHomepageView`/route helper skips when the session
  cookie is present, counts when absent.
- **Engagement query:** picks the most-recent homepage-bearing email.
- **Manual/E2E:** add scenarios to `docs/testing/target-homepage-manual-testing.md`
  (or the outreach doc) — send → open → see the engagement line populate; click the
  homepage link → see homepage-click populate; operator preview does **not** bump
  the counter. E2E parity per existing convention (likely a recorded gap given the
  live-email dependency).

## Open questions

- None blocking. (Exact better-auth cookie name confirmed at implementation.)
