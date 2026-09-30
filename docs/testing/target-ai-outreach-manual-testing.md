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
3. **Verify:** the "Generate outreach email" drawer opens.
4. In **Choose a prompt**, pick a saved email prompt.
5. **Verify:** the guidance box fills with that prompt's body (you can still edit it).
6. Pick a **template** (must contain `{{body}}`). Leave "Include homepage…" unchecked
   (homepage generation is a later phase; the box is disabled with "none generated yet").
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

- **No sidebar link to the prompt library yet:** `/en/campaigns/prompts` is reachable
  by URL only (`menu-items/Campaigns.tsx` is upstream-owned and was not touched).
- **Homepage generation / previews.radeengineering.com** is a separate follow-up: the
  "Generate homepage" menu item is disabled ("coming soon") and the include-homepage
  checkbox stays disabled until a homepage exists.
- **MCP parity** (`crm_send_target_email`, prompt CRUD tools) is covered by Jest
  (`lib/mcp/__tests__/`), not the browser.
