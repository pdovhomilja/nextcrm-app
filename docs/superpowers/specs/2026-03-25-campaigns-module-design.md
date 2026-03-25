# Campaigns Module — Design Spec
**Date:** 2026-03-25
**Status:** Approved

---

## Overview

A new top-level **Campaigns** module for NextCRM that enables users to create, schedule, and track email marketing campaigns. Targets and Target Lists are moved here from the CRM module. Campaign templates are created with AI generation (using existing LLM keys) and refined in a TipTap WYSIWYG editor. Campaigns are sent via Resend, scheduled via Inngest, and tracked with delivery + engagement analytics (opens, clicks, bounces).

---

## Goals

- Create, edit, and manage email campaigns with multi-step follow-ups
- Build and manage reusable campaign templates (AI-generated + TipTap editing)
- Move Targets & Target Lists from CRM sidebar to Campaigns sidebar
- Schedule one-shot campaigns with optional multi-step follow-ups
- Track delivery stats and engagement (opens, clicks, bounces, unsubscribes) per campaign and per recipient
- Search and filter campaigns and templates

---

## Out of Scope

- SMS or other non-email channels
- Multi-provider email abstraction (SMTP fallback)
- Drip automation triggered by user behaviour beyond open/non-open
- A/B testing of subject lines or content
- Global opt-out / suppression list (unsubscribe is campaign-scoped in v1)

---

## Architecture: Email Sending Stack

| Concern | Solution |
|---|---|
| Email sending | Resend API (new dependency) |
| Email rendering | `@react-email/components` (already installed) |
| Template authoring | TipTap WYSIWYG + AI generation via existing LLM keys |
| Job scheduling | Inngest (already installed) |
| Delivery/engagement tracking | Resend webhooks → DB |
| Unsubscribe | Stored random token per send → `/api/campaigns/unsubscribe` |

---

## Data Model

### Extend `crm_campaigns`

Add fields to the existing minimal model:

```prisma
model crm_campaigns {
  id           String    @id @default(uuid()) @db.Uuid
  v            Int       @map("__v")          // keep existing
  name         String
  description  String?
  status       String?   // draft | scheduled | sending | sent | paused

  // New fields
  template_id  String?   @db.Uuid
  from_name    String?   // display name e.g. "Jane from Acme"
  reply_to     String?   // reply-to address if different from RESEND_FROM_EMAIL
  scheduled_at DateTime?
  sent_at      DateTime?
  created_by   String?   @db.Uuid
  created_on   DateTime? @default(now())
  updatedAt    DateTime? @updatedAt

  template         crm_campaign_templates?    @relation(fields: [template_id], references: [id])
  created_by_user  Users?                     @relation("created_campaigns", fields: [created_by], references: [id])
  steps            crm_campaign_steps[]
  target_lists     CampaignToTargetLists[]
  sends            crm_campaign_sends[]
}
```

### New: `crm_campaign_templates`

```prisma
model crm_campaign_templates {
  id              String    @id @default(uuid()) @db.Uuid
  name            String
  description     String?
  subject_default String?
  content_html    String    // TipTap rendered HTML
  content_json    Json      // TipTap editor state (for re-editing)
  created_by      String?   @db.Uuid
  created_on      DateTime? @default(now())
  updatedAt       DateTime? @updatedAt

  created_by_user  Users?               @relation("created_campaign_templates", fields: [created_by], references: [id])
  campaigns        crm_campaigns[]
  steps            crm_campaign_steps[]
}
```

### New: `crm_campaign_steps`

One row per step. Step `order=0` is the initial send; higher orders are follow-ups.

```prisma
model crm_campaign_steps {
  id          String    @id @default(uuid()) @db.Uuid
  campaign_id String    @db.Uuid
  order       Int       // 0 = initial, 1+ = follow-ups
  template_id String    @db.Uuid
  subject     String
  delay_days  Int       @default(0)    // days after previous step (0 for initial)
  send_to     String    @default("all") // "all" | "non_openers"
  scheduled_at DateTime?               // computed: campaign.scheduled_at + cumulative delay_days
  sent_at     DateTime?

  campaign  crm_campaigns          @relation(fields: [campaign_id], references: [id], onDelete: Cascade)
  template  crm_campaign_templates @relation(fields: [template_id], references: [id])
  sends     crm_campaign_sends[]

  @@unique([campaign_id, order])  // prevent duplicate step positions
  @@index([campaign_id])
  @@index([scheduled_at])
}
```

### New: `CampaignToTargetLists`

```prisma
model CampaignToTargetLists {
  campaign_id    String @db.Uuid
  target_list_id String @db.Uuid

  campaign    crm_campaigns    @relation(fields: [campaign_id], references: [id], onDelete: Cascade)
  target_list crm_TargetLists  @relation(fields: [target_list_id], references: [id], onDelete: Cascade)

  @@id([campaign_id, target_list_id])
}
```

**Note:** `crm_TargetLists` must have inverse relation added:
```prisma
// add to existing crm_TargetLists model:
campaign_lists CampaignToTargetLists[]
```

### New: `crm_campaign_sends`

One row per recipient per campaign step. The unique constraint on `(step_id, target_id)` ensures Inngest retries are idempotent — a retry will upsert rather than duplicate.

```prisma
model crm_campaign_sends {
  id                String    @id @default(uuid()) @db.Uuid
  campaign_id       String    @db.Uuid
  step_id           String    @db.Uuid
  target_id         String    @db.Uuid
  email             String    // snapshot at send time
  status            String    @default("queued") // queued | sent | delivered | bounced | failed
  resend_message_id String?   // for webhook correlation
  unsubscribe_token String    @unique // random UUID generated at queue time, used in unsubscribe URL
  opened_at         DateTime?
  clicked_at        DateTime?
  unsubscribed_at   DateTime?
  error_message     String?
  sent_at           DateTime?

  campaign crm_campaigns      @relation(fields: [campaign_id], references: [id])  // no Cascade — campaigns use soft delete
  step     crm_campaign_steps @relation(fields: [step_id], references: [id])
  target   crm_Targets        @relation(fields: [target_id], references: [id])

  @@unique([step_id, target_id])   // idempotency: one send per target per step
  @@index([campaign_id])
  @@index([step_id, target_id])
  @@index([resend_message_id])
  @@index([status])
  @@index([unsubscribe_token])
}
```

**Note:** `crm_Targets` must have inverse relation added:
```prisma
// add to existing crm_Targets model:
campaign_sends crm_campaign_sends[]
```

---

## Module Structure

### Sidebar Navigation

New top-level `getCampaignsMenuItem()` added to sidebar. CRM menu loses "Targets" and "Target Lists" entries.

```
Campaigns (top-level)
  ├── All Campaigns       /campaigns
  ├── Templates           /campaigns/templates
  ├── Targets             /campaigns/targets        (moved from /crm/targets)
  └── Target Lists        /campaigns/target-lists   (moved from /crm/target-lists)
```

### File Structure

```
app/[locale]/(routes)/campaigns/
  page.tsx                              All Campaigns list (search + filter)
  new/
    page.tsx                            4-step creation wizard
    components/
      Step1Details.tsx                  Name, description, from_name, reply_to
      Step2Template.tsx                 AI prompt → TipTap editor
      Step3Audience.tsx                 Target list multi-select + recipient count preview
      Step4Schedule.tsx                 Date/time picker + follow-up steps builder
  [campaignId]/
    page.tsx                            Campaign detail + analytics
    components/
      CampaignDetail.tsx
      StepsTimeline.tsx                 Visual step-by-step with per-step stats
      RecipientsTable.tsx               Per-recipient status, opened, clicked, bounced
  templates/
    page.tsx                            Templates list
    new/page.tsx
    [templateId]/page.tsx               Template editor (AI + TipTap)
  targets/                              Moved — same components as /crm/targets
  target-lists/                         Moved — same components as /crm/target-lists

app/api/campaigns/
  webhooks/resend/route.ts              Resend delivery/open/click/bounce webhooks
  unsubscribe/route.ts                  One-click unsubscribe via unsubscribe_token
```

### Server Actions

```
actions/campaigns/
  get-campaigns.ts          List with search/filter params
  get-campaign.ts           Single campaign + steps + aggregated analytics
  create-campaign.ts        Full wizard data → create campaign + steps + target list links
  update-campaign.ts        Edit name, description, template, schedule, from_name, reply_to
  delete-campaign.ts        Soft delete (status = "deleted")
  schedule-campaign.ts      Set scheduled_at, status → "scheduled", enqueue Inngest schedule-send job
  send-campaign-now.ts      Set scheduled_at = now(), status → "sending", directly enqueue send-step jobs (skip sleepUntil)
  pause-campaign.ts         Set status → "paused"; in-flight Inngest jobs check campaign.status at execution start and exit early if paused

actions/campaigns/templates/
  get-templates.ts
  get-template.ts
  create-template.ts
  update-template.ts
  delete-template.ts
  generate-template.ts      Call LLM via user's configured API key (30s timeout, non-streaming); returns { html, json, subject }
```

---

## Campaign Creation Wizard (4 Steps)

### Step 1 — Details
- Campaign name (required)
- Description (optional)
- From name (optional, e.g. "Jane from Acme") — overrides `RESEND_FROM_EMAIL` display name
- Reply-to address (optional)

### Step 2 — Template
- Option A: AI Generate — text prompt → calls `generate-template` action → renders result in TipTap for editing
- Option B: Pick existing template from library
- Subject line field (required)
- Merge tags available: `{{first_name}}`, `{{last_name}}`, `{{email}}`, `{{company}}`, `{{position}}`
- TipTap toolbar: Bold, Italic, Underline, H1/H2, Bullet list, Link
- CTA buttons are implemented as styled links (`<a>` with button styling) via TipTap Link extension — no custom node needed

### Step 3 — Audience
- Multi-select target lists (checkbox list with search)
- Live recipient count preview (deduplicated by email, excludes targets with no email)

### Step 4 — Schedule & Follow-ups
- Send date + time picker (or "Send now" toggle)
- Follow-up steps builder:
  - Add step button
  - Per step: delay (N days after previous), template selector, subject, send_to (All / Non-openers only)
  - Reorder steps (up/down arrows)
  - Remove step

---

## Campaign Detail Page

- Status badge: Draft / Scheduled / Sending / Sent / Paused
- Action buttons: Pause (if scheduled/sending), Duplicate, Delete
- 5 stat cards: Sent · Delivered · Open Rate · Click Rate · Bounced
- Steps Timeline: each step with its own sent count, open rate, scheduled/sent date
- Recipients Table: name, email, status, opened ✓/–, clicked ✓/–, bounced ✓/–
  - Filter by status (all / delivered / bounced / opened / clicked / unsubscribed)
  - Search by name or email

---

## Inngest Jobs

### `campaigns/schedule-send`
- Triggered: Inngest event `campaigns/schedule` with `scheduled_at`; uses `sleepUntil(scheduled_at)` then executes
- Idempotency: uses `@@unique([step_id, target_id])` — upsert with `skipDuplicates` when creating send rows
- Action: check `campaign.status !== 'paused'`; fetch all targets from linked target lists (deduplicated by email, exclude targets with no email); create `crm_campaign_sends` rows (status=queued, `unsubscribe_token=uuid()`); fan out `campaigns/send-step` per recipient; schedule `campaigns/process-follow-up` for each follow-up step

### `campaigns/send-step`
- Triggered: fan-out from schedule-send or process-follow-up
- Action: check `campaign.status !== 'paused'`; resolve merge tags server-side via string substitution (not Resend's variable system) before passing HTML to Resend; send via Resend API; update `crm_campaign_sends` status → sent, store `resend_message_id`; on error set status → failed + error_message

### `campaigns/process-follow-up`
- Triggered: `sleepUntil` at `step.scheduled_at` (cumulative delay from initial send)
- Action: check `campaign.status !== 'paused'`; filter recipients by `send_to` condition (`all` = all step-0 recipients not bounced/unsubscribed; `non_openers` = additionally filter `opened_at IS NULL`); fan out `campaigns/send-step`

---

## Resend Webhook Handler

`POST /api/campaigns/webhooks/resend`

- Signature verified via `Resend-Signature` header using `RESEND_WEBHOOK_SECRET`
- All updates are idempotent: `opened_at` / `clicked_at` set only if currently NULL; status only transitions forward (queued → sent → delivered; never back from bounced)

| Resend event | DB update |
|---|---|
| `email.delivered` | `status = delivered` (only if currently `sent`) |
| `email.bounced` | `status = bounced`, `error_message` |
| `email.opened` | `opened_at = now()` (only if NULL) |
| `email.clicked` | `clicked_at = now()` (only if NULL) |

---

## Unsubscribe Flow

1. At queue time, a random UUID `unsubscribe_token` is generated and stored on `crm_campaign_sends`
2. Each email footer includes: `/api/campaigns/unsubscribe?token=<unsubscribe_token>`
3. Handler looks up the send by token, sets `unsubscribed_at = now()`
4. Future follow-up steps exclude targets where any send for this campaign has `unsubscribed_at IS NOT NULL`
5. Handler responds with a plain confirmation page: "You have been unsubscribed."
6. **Scope:** unsubscribe is campaign-scoped in v1. A global opt-out flag (`crm_Targets.opted_out`) is out of scope and can be added in a future spec.

---

## Search & Filter (All Campaigns list)

- Text search: campaign name
- Filter by status: All / Draft / Scheduled / Sending / Sent / Paused
- Sort by: Created date / Scheduled date / Name
- Standard TanStack Table pattern (same as Targets, Contacts, etc.)

---

## New Environment Variables

```
RESEND_API_KEY=            # Resend sending API key
RESEND_WEBHOOK_SECRET=     # Resend webhook signature verification
RESEND_FROM_EMAIL=         # Default "From" address (e.g. noreply@yourdomain.com)
```

---

## Migration Notes

- Targets and Target Lists routes move: `/crm/targets` → `/campaigns/targets`, `/crm/target-lists` → `/campaigns/target-lists`
- CRM nav `getCrmMenuItem` loses `targets` and `targetLists` entries and their localisation keys
- No data migration needed — `crm_Targets` and `crm_TargetLists` models are unchanged
- Old URLs redirect to new paths via Next.js `redirects` in `next.config.js`

---

## Dependencies to Add

| Package | Purpose |
|---|---|
| `resend` | Email sending API client |
| `@tiptap/react` | Rich text editor core |
| `@tiptap/starter-kit` | TipTap extensions bundle (bold, italic, headings, lists) |
| `@tiptap/extension-link` | Link / CTA button formatting |
| `@tiptap/extension-underline` | Underline formatting |
