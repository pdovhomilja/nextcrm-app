# Campaign Branded Shell + CTA — Manual Browser Testing Guide

Covers end-user browser testing for the branded campaign email shell (Rade house
style — navy header, gears logo, signature, CAN-SPAM footer) and the optional
per-template call-to-action button. Run against your **local** environment.

## Prerequisites

```bash
# Terminal 1 — local Postgres + Inngest dev server
pnpm inngest:up

# Terminal 2 — dev server
pnpm dev
```

- **Seed:** `pnpm db:seed` — needs at least one campaign template to exist, or create
  one in scenario 1.
- **Migration:** `20260930140000_campaign_template_cta` must be applied (`pnpm db:migrate`).
- **URL:** http://localhost:3000/en/campaigns/templates/new
- **Env (optional):** set `CAMPAIGN_MAILING_ADDRESS` in `.env` to see the address line
  in the footer (scenario 3). Leave unset to confirm it is omitted.

## Test accounts

Sign in as any seeded admin (e.g. `test@nextcrm.app`) — local OTP is printed to the dev
server console (`[Auth] OTP for …`).

---

## 1. Branded shell + amber CTA button renders in preview

**E2E:** `tests/e2e/campaign-template-cta.spec.ts` → "renders the branded shell with an
amber CTA button when label + link are set".

1. Go to `/en/campaigns/templates/new`.
2. Fill **Template Name** and **Subject Line**, and type a line into the email body.
3. Under **Call-to-Action Button**, set **Button label** = `Book a call` and
   **Button link** = `https://radeengineering.com/book`.
4. Click the **Preview** tab.

**Expect:** the preview shows the navy Rade header ("RADE ENGINEERING" + tagline + gears
logo*), your typed body in the white card, a filled **amber** "Book a call" button, the
signature block, and the navy footer with the unsubscribe link.

\* The logo is a hosted image (`radeengineering.com/gears-mark.png`); it may not render
in the sandboxed preview iframe but loads in real inboxes (external-image loading).

## 2. CTA button is omitted when label/link are empty

**E2E:** `tests/e2e/campaign-template-cta.spec.ts` → "omits the CTA button when
label/link are empty (shell still branded)".

1. Go to `/en/campaigns/templates/new`, fill name/subject/body, leave **both** CTA
   fields empty.
2. Click **Preview**.

**Expect:** the branded shell still renders (header/footer), but **no** button appears.
Setting only one of label/link (not both) must also render no button.

## 3. Mailing address footer follows `CAMPAIGN_MAILING_ADDRESS`

**E2E:** covered at the unit level (`__tests__/campaigns/render-email.test.ts` →
"mailing address" describe block). Manual check confirms the env wiring end-to-end.

1. With `CAMPAIGN_MAILING_ADDRESS` **set**, preview a template → the address appears in
   the footer under "You're receiving this because…".
2. Unset it, restart `pnpm dev`, preview again → the address line is gone (no blank line).

## 4. Wide body content stays inside the column (no horizontal scroll)

The shell is a fixed 600px column; AI/TipTap body markup must never stretch it (that would scroll
sideways in the preview, in Resend, and on mobile). See `docs/reference/LESSONS_LEARNED.md` →
"AI/TipTap body markup can blow out the fixed email column".

1. On an approved target **with a generated homepage**, open **AI → Generate email** and generate a draft.
2. Click **Insert homepage screenshot**, then **Update preview**.
3. **Verify:** the 1280px screenshot is scaled to fit the column — the preview has **no horizontal
   scrollbar** and nothing is clipped off the right edge.
4. In the body editor, paste a very long unbroken URL (e.g. `https://example.com/` + ~120 `a`s) and a
   short code block, then **Update preview**.
5. **Verify:** the long string wraps and the code block wraps — still no horizontal scroll.
6. (Optional) Send to a test inbox and open in Gmail + a phone — the email fits the width on both.

**Guard:** width constraints are unit-covered in `render-email.test.ts` → "constrains wide body content
(no horizontal overflow)" (images capped, pre/code wrap, long words break).

---

## Known Gaps

- **Wide-body width guards (§4):** the shell CSS rules are asserted by the unit test
  (`render-email.test.ts`); a pixel-level visual E2E (measuring scrollWidth across email clients) is
  brittle and omitted — verify visually per §4 and in Resend/mobile.
- **Unsafe CTA URL rejection** (e.g. `javascript:`) is covered only by the unit test
  (`render-email.test.ts` → "refuses a CTA URL with an unsafe scheme"), not E2E — it is a
  server-side guard with no distinct UI affordance.
- **Merge tags in the CTA link** (`{{homepage_url}}` etc.) resolve only at send time, not
  in preview (preview has no recipient) — verified via the send path, not this editor.
