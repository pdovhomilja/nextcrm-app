# Target AI Outreach (email) — Manual Browser Testing Guide

Covers end-user browser testing for AI-drafted outreach email from an **approved**
target (generate → preview → send one-off) and the AI prompt library. Run against your
**local** environment.

## Prerequisites

```bash
# Terminal 1 — local Postgres + Inngest dev server
pnpm inngest:up

# Terminal 2 — dev server
pnpm dev
```

- **Migration:** `20260929120000_target_ai_outreach` applied (`pnpm db:migrate`).
- **Seed:** `pnpm db:seed` — at least one target; approve one (see the target-triage doc).
- **A campaign template that contains the `{{body}}` placeholder** — Campaigns →
  Templates → New. A template without `{{body}}` is rejected at generate/send time.
- **An Anthropic key:** `ANTHROPIC_API_KEY` in env, or a system/personal key under
  Profile → LLMs. Generation calls the real API on a manual run.
- **Safe sending:** set `EMAIL_REDIRECT_TO=<your inbox>` so the real Resend send lands in
  your own inbox instead of the prospect's (see `docs/reference/ENVIRONMENT_VARIABLES.md`).
- **URLs:** http://localhost:3000/en/campaigns/targets · /en/campaigns/prompts

> The E2E spec does **not** hit the real APIs: `playwright.config.ts` points
> `ANTHROPIC_BASE_URL` / `RESEND_BASE_URL` at a local mock server, so automated runs
> are free and send nothing. Manual runs use the real services.

---

## 1. Generate, preview and send an outreach email

**E2E:** `tests/e2e/target-ai-email.spec.ts` › `generates, previews and sends an outreach email from an approved target`

1. Open an **Approved** target's detail page (Campaigns → Targets → View).
2. Click the **AI** menu (sparkles) in the header → **Generate email**.
3. **Verify:** the "Generate outreach email" drawer opens with the **first prompt and first
   template already selected** (the guidance box pre-filled from that prompt), so it's ready to
   generate immediately.
4. Optionally pick a different **prompt**.
5. **Verify:** the guidance box fills with that prompt's body (you can still edit it).
6. Pick a **template** (must contain `{{body}}`). The **Button label / Button link** fields
   inherit that template's CTA defaults — see 1d. Leave "Include homepage…" unchecked
   (the box is disabled with "none generated yet" until a homepage exists).
7. Click **Generate**.
8. **Verify:** a **Subject** field appears populated, and the **preview** frame shows
   your template wrapped around the AI body, with `{{first_name}}` / `{{company}}`
   already replaced by the target's real values (no literal `{{…}}` visible).
9. Edit the subject if you like. **Verify:** editing the subject (or changing the
   template / homepage checkbox) clears the preview and **Send email** becomes disabled;
   click **Update preview** to re-render it and re-enable Send. Clearing the subject
   entirely keeps the preview/Update/Send block visible. Closing the drawer (or changing
   an input) while a Generate/Update is still running discards that late result instead
   of repopulating the drawer.
10. Click **Send email**. **Verify:** a success toast "Email sent" appears and the drawer closes.
11. **Verify:** exactly one email arrives (at `EMAIL_REDIRECT_TO` if set) with the
    resolved subject, and it carries an unsubscribe link.
12. **Verify:** the target's activity timeline shows "Outreach email sent: <subject>".

### 1a. Only approved targets can generate

**E2E:** `tests/e2e/target-ai-email.spec.ts` › `blocks AI email generation for a non-approved target`

1. Open a target that is still **New** (or Passed) → **AI** menu.
2. **Verify:** **Generate email (approve first)** is shown greyed-out and cannot be clicked.

### 1b. Guard rails (no E2E — covered by unit tests)

Covered by Jest, not the browser: `do_not_email` targets and targets with no email
address are refused; a malformed / fenced AI reply is tolerated or fails cleanly with
"AI returned an unexpected response"; a template missing `{{body}}` is refused; a
post-send bookkeeping failure never surfaces as an error (no duplicate cold email).
See `actions/crm/targets/__tests__/`.

### 1c. Opt-out link

1. From the email received in 1.11, click the unsubscribe link.
2. **Verify:** a confirm page with an **Unsubscribe** button is shown and the target is
   **not** yet do-not-email (GET never mutates). Click the button.
3. **Verify:** a confirmation page is shown, and the target now has **do not email** set;
   generating and sending to that target is refused afterwards.

*(Unsubscribe route is unit-tested in `app/api/crm/targets/unsubscribe/__tests__/route.test.ts`;
no browser E2E — it is an unauthenticated endpoint: GET shows a confirm form, POST mutates and also
serves RFC 8058 one-click.)*

### 1d. CTA button — inherit from template, override, homepage auto-default

**E2E:** `tests/e2e/target-ai-email.spec.ts` › `generates, previews and sends an outreach email
from an approved target` (asserts the drawer inherits the template CTA, the override flows into
the preview, and the sent email carries the overridden label + inherited link).

1. Use a template that has a **Button label** and **Button link** set (Campaigns → Templates).
2. Open the Generate-email drawer on an approved target and pick that template.
3. **Verify:** the **Button label** and **Button link** fields pre-fill with the template's values.
4. Change the **Button label** (and/or link). Generate, then **Verify:** the preview shows the amber
   button with your overridden label. Send, and **Verify:** the received email's button uses the
   overridden label and the (inherited) link.
5. **Homepage default + auto-link:** open the drawer on a target whose homepage is **READY with a
   screenshot**. **Verify:** "Include homepage…" starts **checked** and the **Button link** starts as
   `{{homepage_url}}`. Unchecking restores the template's link; re-checking sets it back. On send, the
   button links to that target's homepage. On a target with **no** homepage (or one still
   generating/failed), the box starts unchecked (and is disabled when no page is published yet).
   *(The `{{homepage_url}}` resolution is covered by
   `actions/crm/targets/__tests__/preview-target-email.test.ts`; the default-checked + auto-fill needs
   a generated homepage, so it is verified manually here — E2E known gap.)*

### 1e. Edit the AI draft before sending

**E2E:** `tests/e2e/target-ai-email.spec.ts` › `generates, previews and sends…` (the test rewrites
the draft in the editor and asserts the **edited** body — not the AI original — reaches the send).

1. Generate a draft. **Verify:** the AI copy appears in an editable rich-text editor below the subject.
2. Edit the text (merge tags like `{{first_name}}` still work). **Verify:** editing disables **Send**
   until you click **Update preview**; the preview then shows your edited copy.
3. Send. **Verify:** the received email contains your edits, not the original draft.

### 1f. Reply-To is the sender's email

**E2E:** `tests/e2e/target-ai-email.spec.ts` › `generates, previews and sends…` (asserts the Resend
`reply_to` equals the seeded admin's email).

1. Send an outreach email, then reply to it from the recipient inbox (or inspect headers).
2. **Verify:** the **Reply-To** is *your* (the sending user's) email, not the `noreply@` From — so a
   prospect's reply reaches you. *(Replies are not ingested into the CRM; they land in your inbox.)*

### 1g. Target shows its outreach history

**E2E:** `tests/e2e/target-ai-email.spec.ts` › `generates, previews and sends…` (reloads the target
and asserts the sent email shows with a **SENT** status).

1. After sending, open the target detail page. **Verify:** an **"Outreach emails"** section lists the
   send — subject, timestamp, and a **SENT** badge — with a "Last emailed …" summary. A failed send
   shows a **FAILED** badge with its error; a target never emailed shows "No emails sent yet."

### 1h. Open / click tracking on outreach emails

**E2E:** `tests/e2e/target-ai-email.spec.ts` › `generates, previews and sends…` (marks the sent row
opened+clicked as the webhook would, reloads, asserts the **Opened** / **Clicked** badges).

1. After the recipient opens the email / clicks a link, Resend fires a webhook that stamps the row.
   **Verify:** the outreach-history row shows an **Opened** and/or **Clicked** badge. *(These come from
   the Resend open/click webhook, which now also matches one-off outreach emails, not just campaigns;
   the webhook logic is unit-tested in `__tests__/campaigns/api/webhooks-resend.test.ts`.)*

### 1i. Sample-homepage view count

**E2E:** unit only (needs a generated homepage + a real `/p/<slug>` request — E2E known gap). UA filter
+ counter are covered by `lib/homepage/__tests__/views.test.ts`.

1. With a generated homepage, open its `/p/<slug>` preview in a normal browser.
2. **Verify:** the target detail shows **"Sample homepage — viewed N times · last …"** (the count
   increments). Bot/prefetch traffic (email-client link scanners) is filtered out, so the number is an
   approximate "did a human look?" signal — use website analytics for exact traffic.

### 1j. Unsubscribe / do-not-email visibility

**E2E:** `tests/e2e/target-ai-email.spec.ts` › `generates, previews and sends…` (flags the target
do-not-email, reloads, asserts the badge).

1. When a contact unsubscribes (campaign or outreach), they're globally set do-not-email.
   **Verify:** the target detail shows a red **"Do not email"** badge next to the title, and further
   sends to that target are refused.
2. **Campaign side:** on a campaign detail page, **Verify:** the Recipients table has an **Unsub**
   column (✓ per unsubscribed recipient) and the stats row shows an **Unsub** count.

### 1k. Embed an image / the homepage screenshot in the body

**E2E:** `tests/e2e/target-ai-email.spec.ts` › `generates, previews and sends…` (inserts an image
via the toolbar button and asserts it survives editing and reaches the send).

1. Generate a draft, then click the **image** button in the body toolbar and paste a URL (or a merge
   tag like `{{homepage_screenshot}}`). **Verify:** the image appears in the editor and **stays** when
   you keep editing (previously `<img>` was stripped — the editor had no image support).
2. On a target with a READY homepage, click **Insert homepage screenshot**. **Verify:** an
   `<img src="{{homepage_screenshot}}">` is added; with "Include homepage" checked, the preview/sent
   email shows the actual screenshot (merge tag resolves to the screenshot URL).

### 1l. Branded, confirm-based unsubscribe

**E2E:** unsubscribe routes unit-tested (`__tests__/campaigns/api/unsubscribe*`,
`app/api/crm/targets/unsubscribe/__tests__`). Visual branding verified manually.

1. Click an unsubscribe link from a received email. **Verify:** a **branded page** (navy header +
   gears logo) opens with an **Unsubscribe** button — and clicking the link alone does **not**
   unsubscribe you (GET is a confirm; a link scanner can't opt you out). Click the button.
2. **Verify:** a branded confirmation page shows, and the target is now do-not-email. Gmail/Apple
   Mail's built-in Unsubscribe (one-click) also works (POST).

## 2. AI prompt library — create, edit, delete

**E2E:** `tests/e2e/target-ai-email.spec.ts` › `creates, edits and deletes a prompt`

1. Open **/en/campaigns/prompts** directly (there is no sidebar menu entry yet — see Known gaps).
2. Click **New prompt**; enter a **Name** and **Prompt body**; leave Kind = *Email*,
   Scope = *Personal*; click **Save**.
3. **Verify:** toast "Prompt created" and the prompt appears in the table with kind `EMAIL`.
4. Click **Edit** on that row, change the **Name**, click **Save**.
5. **Verify:** toast "Prompt updated" and the row shows the new name.
6. Click **Delete** on the row.
7. **Verify:** toast "Prompt deleted" and the row disappears.
8. (Admin) create a prompt with Scope = *Org-wide* → **Verify:** it also appears in
   another user's **Choose a prompt** list; a *Personal* prompt does not.

*(Step 8 needs a second user and is not automated.)*

---

## Known gaps

- **Prompt library** is linked from the Campaigns sidebar group (an insertion-only
  hook in the upstream-owned `menu-items/Campaigns.tsx`; also reachable at
  `/en/campaigns/prompts`).
- **Homepage generation** now exists — see `docs/testing/target-homepage-manual-testing.md`.
  The include-homepage checkbox above stays disabled until a homepage exists for the target.
- **MCP parity** (`crm_send_target_email`, prompt CRUD tools) is covered by Jest
  (`lib/mcp/__tests__/`), not the browser.
