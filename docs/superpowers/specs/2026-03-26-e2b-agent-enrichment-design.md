# E2B Agent Enrichment — Design Spec

**Date:** 2026-03-26
**Status:** Approved
**Replaces:** Current `AgentOrchestrator` path in Inngest enrichment jobs

---

## Problem

The current enrichment pipeline (`AgentOrchestrator` → Firecrawl API + OpenAI) has three compounding failures:

1. **Quality** — Firecrawl API misses JS-heavy sites, returns incomplete data
2. **Timeout** — 90s hard limit cuts enrichment short on complex targets
3. **Capability ceiling** — no real browser means no LinkedIn public profiles, no paginated results, no dynamic pages

Additionally, the data model assumes one contact per Target. Real outreach requires finding all C-level contacts at a company and enriching each one independently.

---

## Goal

Given a Target with at minimum a company name, enrich it with:
- Full company profile (website, industry, size, HQ, phone, socials)
- All discoverable C-level contacts, each with name, email, title, LinkedIn URL, phone

Each `crm_Target_Contact` can also be enriched independently when the user provides a name + email and needs the rest filled in.

---

## Architecture

```
User triggers enrichment (single or bulk)
        ↓
Inngest: enrich-target job (existing, updated)
        ↓
Create E2B sandbox (custom template)
        ↓
Run enrichment-agent.ts inside sandbox
        ↓
  ┌─────────────────────────────────────┐
  │  LLM tool-use loop (Claude Sonnet)  │
  │  tools → agent-browser CLI          │
  │  1. Discover company domain         │
  │  2. Scrape company page             │
  │  3. Find C-level contacts           │
  │  4. Enrich each contact             │
  │  5. Return typed JSON               │
  └─────────────────────────────────────┘
        ↓
Inngest reads result JSON
        ↓
PATCH Target fields (empty only)
CREATE / UPDATE crm_Target_Contact rows
        ↓
Fan out: enrich-target-contact per new contact
        ↓
Toast notification to user when all done
```

### Components

| Component | Location | Role |
|---|---|---|
| `e2b.Dockerfile` | repo root | Custom E2B template: agent-browser + Chrome + Node.js 20 |
| `scripts/enrichment-agent.ts` | repo root | Runs inside sandbox, owns the LLM tool-use loop |
| `inngest/functions/enrich-target.ts` | existing | Updated: spawns E2B instead of calling AgentOrchestrator |
| `inngest/functions/enrich-target-contact.ts` | new | Enriches a single crm_Target_Contact — same E2B pattern, Mode 2 only (contact fields, no company discovery) |
| `inngest/functions/enrich-targets-bulk.ts` | existing | Unchanged — fans out per target |
| `lib/enrichment/` | existing | Types + field presets reused as-is |

The existing `AgentOrchestrator` is retained for the SSE single-enrich drawer path (if re-enabled later). Only the Inngest background path switches to E2B.

---

## E2B Sandbox

**Custom template** (`e2b.Dockerfile`):
- Ubuntu base
- Node.js 20
- `agent-browser` CLI (Rust binary) + Chrome for Testing
- `@anthropic-ai/sdk` available

**Per-job lifecycle:**
1. Inngest step creates sandbox via `@e2b/code-interpreter` SDK
2. Input passed as environment variables: `EMAIL`, `COMPANY_NAME`, `COMPANY_WEBSITE`, `TARGET_NAME`, `FIELDS_REQUESTED`, `ANTHROPIC_API_KEY`
3. Script runs, writes JSON result to stdout
4. Inngest reads stdout, sandbox is destroyed
5. Timeout: 5 minutes hard limit per target

---

## Enrichment Agent (inside sandbox)

**File:** `scripts/enrichment-agent.ts`

**LLM:** Claude Sonnet 4.6 with tool-use via Anthropic SDK

### Tools

| Tool | Maps to | Purpose |
|---|---|---|
| `browser_open` | `agent-browser open <url>` | Navigate to a URL |
| `browser_snapshot` | `agent-browser snapshot` | Get accessible text tree + refs |
| `browser_click` | `agent-browser click @eN` | Interact with element by ref |
| `browser_extract` | `agent-browser extract "<prompt>"` | Extract structured data from current page |
| `web_search` | `agent-browser search "<query>"` | Search the web |

### Context-Aware Research Strategy

The agent receives all known Target fields and adapts its research plan:

```
Has website?
  YES → skip domain discovery, scrape directly
  NO  → has email with company domain (non-personal)?
          YES → derive domain from email
          NO  → search "<company name> official website"

Has contact name + email?
  YES → LinkedIn search: "<name> <company>" — high confidence
  NO  → search C-level contacts for company

Has contact email only (personal: gmail/outlook/etc)?
  YES → use company name for domain lookup, then find person by name on LinkedIn
```

The agent never searches for information it already has.

### Confidence Tiers

| Available input | Expected quality |
|---|---|
| name + website + contact email (company domain) | High |
| name + contact email (company domain) | High |
| name + contact email (personal) | Medium |
| name only | Lower |

### Output Schema

```json
{
  "target": {
    "company_website": "https://acme.com",
    "company_industry": "SaaS",
    "company_size": "50-200",
    "company_hq": "San Francisco, CA",
    "company_phone": "+1 415 000 0000",
    "company_linkedin": "https://linkedin.com/company/acme",
    "company_twitter": "https://twitter.com/acme",
    "company_description": "..."
  },
  "contacts": [
    {
      "name": "Jane Smith",
      "email": null,
      "title": "CEO",
      "linkedinUrl": "https://linkedin.com/in/janesmith",
      "phone": null,
      "source": "enriched"
    }
  ],
  "confidence": {
    "company_phone": 0.8,
    "title": 0.9
  }
}
```

Fields with confidence below 0.6 are discarded before writing to DB. Only empty target fields are overwritten.

---

## Data Model

### New model: `crm_Target_Contact`

```prisma
model crm_Target_Contact {
  id           String                @id @default(uuid()) @db.Uuid
  targetId     String                @db.Uuid
  contactId    String?               @db.Uuid        // optional link to crm_Contacts
  name         String?
  email        String?
  title        String?
  phone        String?
  linkedinUrl  String?
  source       String                @default("manual") // "manual" | "enriched" | "imported"
  enrichStatus crm_Enrichment_Status @default(PENDING)
  enrichedAt   DateTime?
  createdAt    DateTime              @default(now())
  updatedAt    DateTime              @updatedAt

  target   crm_Targets    @relation(fields: [targetId], references: [id])
  contact  crm_Contacts?  @relation(fields: [contactId], references: [id])

  @@unique([targetId, email])
  @@unique([targetId, linkedinUrl])
  @@index([targetId])
  @@index([enrichStatus])
}
```

`crm_Targets` gets: `contacts crm_Target_Contact[]`

No new enums — `crm_Enrichment_Status` reused. Schema pushed via `prisma db push`.

### Status flows

```
crm_Targets:          PENDING → RUNNING → COMPLETED | FAILED
crm_Target_Contact:   PENDING → RUNNING → COMPLETED | FAILED | SKIPPED
```

---

## Error Handling

| Failure | Behaviour |
|---|---|
| E2B sandbox creation fails | Inngest retries 3× with exponential backoff |
| Sandbox timeout (5 min) | Mark as FAILED, store error, continue with partial results |
| Script crash mid-run | Partial JSON written before exit is still applied |
| LLM returns malformed JSON | Retry once with stricter prompt, then FAILED |
| Page blocked / bot detection | Agent tries next source, logs blocked domain |
| Contact not found | Leave fields null, do not fail the enrichment |

**Partial success is valid.** Company fields enriched but 0 contacts found → Target marked COMPLETED with note.

**Dedup:** Before creating `crm_Target_Contact`, check for existing row matching `(targetId, email)` OR `(targetId, linkedinUrl)`. Update if exists, insert if not.

---

## UX

- Enrichment runs fully in background (no SSE, no drawer)
- Toast notification when enrichment completes (success or partial)
- Target detail page shows contacts table with enrichment status per contact
- User can manually add a contact (name + email) and trigger enrichment on it alone

---

## What Does Not Change

- `lib/enrichment/` types and field presets — reused as-is
- `enrich-targets-bulk.ts` — fan-out logic unchanged
- `crm_Target_Enrichment` job log model — still used for audit trail
- SSE drawer / `AgentOrchestrator` — retained, not deleted
- Auth patterns, route structure, existing API contracts
