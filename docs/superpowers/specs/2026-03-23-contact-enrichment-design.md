# Contact Enrichment via Firecrawl — Design Spec

**Date:** 2026-03-23
**Status:** Approved
**Branch:** feature/contact-enrichment (to be created)

---

## Overview

Integrate the fire-enrich multi-agent enrichment engine into NextCRM so users can automatically populate contact fields (company info, LinkedIn, industry, funding stage, tech stack, etc.) using Firecrawl + GPT-4o. Supports both single-contact interactive enrichment and bulk background enrichment.

---

## Architecture

### Approach: Copy fire-enrich `lib/` into nextcrm

The fire-enrich library (`lib/enrichment/`) is copied directly into nextcrm. No external service dependency. The multi-agent orchestration runs inside the same Next.js process.

```
nextcrm-app/
├── lib/
│   └── enrichment/                      ← copied from fire-enrich/lib/
│       ├── agent-architecture/
│       │   ├── agents/                  (discovery, company-profile, funding, tech-stack, general, metrics)
│       │   ├── core/                    (agent-base, types)
│       │   ├── tools/                   (smart-search, website-scraper, email-parser)
│       │   └── orchestrator.ts
│       ├── strategies/
│       │   ├── agent-enrichment-strategy.ts
│       │   ├── enrichment-strategy.ts
│       │   └── email-parser.ts
│       ├── services/
│       │   ├── firecrawl.ts
│       │   └── openai.ts
│       ├── types/
│       │   ├── index.ts
│       │   └── field-generation.ts
│       ├── config/
│       │   └── enrichment.ts
│       └── utils/
│           ├── skip-list.ts
│           ├── source-context.ts
│           ├── email-detection.ts
│           └── field-utils.ts
├── app/api/crm/contacts/
│   └── enrich/
│       └── route.ts                     ← SSE streaming endpoint (single contact)
│       └── bulk/
│           └── route.ts                 ← triggers Inngest bulk fan-out
├── inngest/functions/
│   ├── enrich-contact.ts                ← single contact Inngest job
│   └── enrich-contacts-bulk.ts          ← bulk fan-out orchestrator
└── app/[locale]/(routes)/crm/contacts/
    ├── enrichment/
    │   └── page.tsx                     ← enrichment jobs status page
    ├── components/
    │   ├── EnrichButton.tsx             ← bulk trigger button for list toolbar
    │   └── BulkEnrichModal.tsx          ← field selector for bulk flow
    └── [contactId]/components/
        ├── BasicView.tsx                ← existing, gets "Enrich with AI" button
        └── EnrichContactDrawer.tsx      ← field selector + progress + diff preview
```

---

## Data Model

### New Prisma model

```prisma
model crm_Contact_Enrichment {
  id          String                  @id @default(uuid()) @db.Uuid
  contactId   String                  @db.Uuid
  status      crm_Enrichment_Status   @default(PENDING)
  fields      String[]
  result      Json?
  error       String?
  triggeredBy String?                 @db.Uuid
  createdAt   DateTime                @default(now())
  updatedAt   DateTime                @updatedAt

  contact     crm_Contacts            @relation(fields: [contactId], references: [id])

  @@index([contactId])
  @@index([status])
  @@index([createdAt])
}

enum crm_Enrichment_Status {
  PENDING
  RUNNING
  COMPLETED
  FAILED
  SKIPPED
}
```

The `result` JSON field stores the full `RowEnrichmentResult` from fire-enrich (per-field values, confidence scores, source URLs). This powers the diff preview before the user applies changes.

No changes to `crm_Contacts` — all existing fields are sufficient targets.

### New relation on `crm_Contacts`

```prisma
// Add to crm_Contacts model:
enrichments   crm_Contact_Enrichment[]
```

### Required env vars (add to `.env.example`)

```
FIRECRAWL_API_KEY=           # get from firecrawl.dev
# OPENAI_API_KEY already present
```

---

## API Layer

### `POST /api/crm/contacts/enrich` — SSE stream (single contact)

**Request:**
```typescript
{
  contactId: string;
  fields: EnrichmentField[];  // from lib/enrichment/types
}
```

**Behavior:**
1. Fetch contact from DB, extract `email` as enrichment seed
2. Return 422 if contact has no email
3. Create `crm_Contact_Enrichment` record (status: RUNNING)
4. Instantiate `AgentEnrichmentStrategy` with `FIRECRAWL_API_KEY` + `OPENAI_API_KEY`
5. Stream SSE events (same shape as fire-enrich):
   - `{ type: 'session', sessionId }`
   - `{ type: 'agent_progress', message, messageType, sourceUrl? }`
   - `{ type: 'result', result: RowEnrichmentResult }`
   - `{ type: 'complete' }`
   - `{ type: 'error', error }`
6. On complete: update enrichment record (`status: COMPLETED`, `result: JSON`)
7. Client calls `PATCH /api/crm/contacts/[id]` to apply selected fields

**Cancel:** `DELETE /api/crm/contacts/enrich?sessionId=...` aborts in-flight requests.

---

### `POST /api/crm/contacts/enrich/bulk`

**Request:**
```typescript
{ contactIds: string[]; fields: EnrichmentField[] }
```

**Behavior:**
1. Validate contactIds (max 100 per batch)
2. Send `enrich/contacts.bulk` Inngest event
3. Return `{ success: true, count: number }`

---

### Inngest Functions

#### `enrich/contacts.bulk` → `enrich-contacts-bulk`
Fan-out: creates one `crm_Contact_Enrichment` record per contact (status: PENDING), then sends one `enrich/contact.run` event per contact.

#### `enrich/contact.run` → `enrich-contact`
1. Fetch contact email from DB
2. Skip if no email (update record to SKIPPED)
3. Instantiate `AgentEnrichmentStrategy`
4. Run enrichment
5. Write enriched values directly to `crm_Contacts` — **only empty fields** (never overwrite existing data)
6. Update `crm_Contact_Enrichment` record (COMPLETED or FAILED)
7. Retry up to 3x on failure with exponential backoff

---

## UI Components

### `EnrichContactDrawer` (single contact)

Slide-over drawer triggered by "Enrich with AI" button on contact detail (`BasicView.tsx`).

**Step 1 — Field selection:**
- Preset checkboxes: Company Name, Industry, Position, Website, LinkedIn URL, Twitter URL, Description, Tech Stack, Funding Stage
- "Add custom field" free-text input (name + description)
- "Start Enrichment" button (disabled if no fields selected)

**Step 2 — Progress view:**
- Real-time agent progress messages with phase labels (Discovery, Company Profile, Funding, Tech Stack)
- Source URLs shown as favicon + domain chips
- Cancel button calls DELETE endpoint

**Step 3 — Diff preview:**
- Two-column table: "Current" vs "Enriched"
- Per-row checkboxes (pre-checked) to select which fields to apply
- Source citation links per field
- "Apply Selected" → PATCH contact → closes drawer
- "Discard" → closes without saving

Drawer disabled + tooltip shown if contact has no email: *"Add an email to enable enrichment."*

---

### Bulk enrichment (contacts list)

- Checkbox column added to contacts table
- Floating toolbar appears when ≥1 contact selected: `"Enrich X contacts"`
- Clicking opens `BulkEnrichModal`: field selector (same component as drawer step 1) + "Start" button
- On submit: POST to bulk endpoint → success toast → link to Enrichment Jobs page

**Bulk apply policy:** Only writes to empty fields. Never overwrites existing data.

---

### `/crm/contacts/enrichment` — Enrichment Jobs Page

Table of all `crm_Contact_Enrichment` records:

| Contact | Status | Fields | Triggered | By |
|---------|--------|--------|-----------|-----|
| Jane Doe | ✅ Completed | industry, linkedin | 2 min ago | Pavel |
| John Smith | 🔄 Running | company, website | now | Pavel |
| Alice Brown | ❌ Failed | tech_stack | 5 min ago | Pavel |

- Status badge with color coding
- "Retry" action for FAILED records (re-sends Inngest event)
- Click contact name → navigate to contact detail

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Missing `FIRECRAWL_API_KEY` | Route returns 503 with message pointing to env setup |
| Contact has no email | Enrich button disabled with tooltip; API returns 422 |
| Personal email (gmail, yahoo, etc.) | Returns `skipped` status with friendly message |
| Partial enrichment (some fields fail) | Diff preview shows partial results; user applies what was found |
| SSE connection dropped mid-enrichment | Client calls DELETE endpoint to abort; enrichment record set to FAILED |
| Bulk Firecrawl rate limit | Inngest retries with exponential backoff (max 3 attempts) |
| Bulk: contact already recently enriched | Check for COMPLETED record within last 7 days; skip with `status: SKIPPED` |

---

## Dependencies to Add

```json
// Already in fire-enrich, need to verify presence in nextcrm:
"@mendable/firecrawl-js": "^1.x",
"openai": "^4.x",   // likely already present
"zod": "^3.x"       // likely already present
```

---

## Out of Scope

- Enrichment of `crm_Accounts` (separate future feature)
- Enrichment of `crm_Leads` (separate future feature)
- Custom enrichment provider (non-Firecrawl)
- Scheduling automatic periodic re-enrichment
