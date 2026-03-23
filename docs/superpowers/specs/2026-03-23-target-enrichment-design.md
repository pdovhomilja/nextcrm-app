# Target Enrichment via Firecrawl — Design Spec

**Date:** 2026-03-23
**Status:** Approved
**Branch:** feature/target-enrichment (to be created)

---

## Overview

Extend the existing contact enrichment feature to `crm_Targets`. Users can enrich target records (company info, position, websites, phone numbers) using the same Firecrawl + GPT-4o multi-agent engine already integrated for contacts. Supports both single-target interactive enrichment (SSE drawer) and bulk background enrichment (Inngest fan-out).

This feature is intentionally identical in architecture to contact enrichment. All enrichment logic (`lib/enrichment/`) is reused unchanged.

---

## Architecture

Mirrors `feature/contact-enrichment` exactly:
- SSE streaming route for single-target enrichment with real-time progress
- Inngest fan-out for bulk background enrichment
- Drawer with field selector → progress → diff preview (single)
- Bulk modal with field selector → background jobs (bulk)
- Jobs status page at `/crm/targets/enrichment`

No new library code — all `lib/enrichment/` files are reused as-is.

---

## Data Model

### New Prisma model

```prisma
model crm_Target_Enrichment {
  id          String                  @id @default(uuid()) @db.Uuid
  targetId    String                  @db.Uuid
  status      crm_Enrichment_Status   @default(PENDING)
  fields      String[]
  result      Json?
  error       String?
  triggeredBy String?                 @db.Uuid
  createdAt   DateTime                @default(now())
  updatedAt   DateTime                @updatedAt

  target            crm_Targets       @relation(fields: [targetId], references: [id])
  triggered_by_user Users?            @relation("target_enrichment_triggered_by", fields: [triggeredBy], references: [id])

  @@index([targetId])
  @@index([status])
  @@index([createdAt])
  @@index([triggeredBy])
}
```

Reuses the existing `crm_Enrichment_Status` enum (PENDING, RUNNING, COMPLETED, FAILED, SKIPPED).

### New back-relations

```prisma
// Add to crm_Targets model:
enrichments   crm_Target_Enrichment[]

// Add to Users model:
target_enrichments_triggered  crm_Target_Enrichment[]  @relation("target_enrichment_triggered_by")
```

---

## Field Mapping

Only fields with a direct `crm_Targets` column are included. No social URL fields exist on this model.

| Enrichment field name | `crm_Targets` column | Display name |
|---|---|---|
| `position` | `position` | Position / Job Title |
| `company` | `company` | Company Name |
| `company_website` | `company_website` | Company Website |
| `personal_website` | `personal_website` | Personal Website |
| `mobile_phone` | `mobile_phone` | Mobile Phone |
| `office_phone` | `office_phone` | Office Phone |

The `EnrichFieldSelector` component is reused. The target drawer passes these 6 preset fields instead of the contact fields.

---

## API Layer

### `POST /api/crm/targets/enrich` — SSE stream (single target)

Identical to `/api/crm/contacts/enrich` with:
- Fetches `crm_Targets` instead of `crm_Contacts`
- Creates `crm_Target_Enrichment` record
- Same SSE event shape, same session map, same abort handling

### `DELETE /api/crm/targets/enrich?sessionId=<id>`

Same cancel behavior as contacts.

### `POST /api/crm/targets/enrich-bulk`

Identical to `/api/crm/contacts/enrich-bulk`. Sends `enrich/targets.bulk` Inngest event.

### `PATCH /api/crm/targets/[id]`

Applies selected enrichment fields to `crm_Targets`. Same FIELD_MAP pattern, same `params: Promise<{id: string}>` signature (Next.js 16).

---

## Inngest Functions

### `enrich/targets.bulk` → `enrich-targets-bulk`

Fan-out: creates `crm_Target_Enrichment` records (status: PENDING) and sends one `enrich/target.run` event per target.

### `enrich/target.run` → `enrich-target`

Per-target job:
1. Mark record RUNNING
2. Fetch target email
3. Skip if no email (SKIPPED)
4. 7-day dedup check (same as contacts)
5. Run `AgentEnrichmentStrategy`
6. Write enriched values to empty fields only
7. Update record (COMPLETED or FAILED), retry 3x on failure

Exports `shouldSkipTargetEnrichment` (same logic as `shouldSkipBulkEnrichment`, separate export for clarity).

Both functions registered in `app/api/inngest/route.ts`.

---

## UI Components

### `EnrichTargetDrawer`

Identical to `EnrichContactDrawer` with:
- Preset fields: the 6 target fields above (no social URLs)
- POSTs to `/api/crm/targets/enrich`
- PATCHes to `/api/crm/targets/[id]`
- `contactCurrentData` → `targetCurrentData`

### `EnrichButton` (targets)

Client wrapper component in `app/[locale]/(routes)/crm/targets/[targetId]/components/EnrichButton.tsx`. Wired into `BasicView.tsx` (Server Component) — same pattern as contacts.

### `BulkEnrichTargetsModal`

Identical to `BulkEnrichModal` — POSTs to `/api/crm/targets/enrich-bulk`.

### Contacts list (targets table)

- Checkbox column added to `columns.tsx` (same as contacts)
- Bulk toolbar in `data-table.tsx` (same pattern)

### `/crm/targets/enrichment` — Jobs page

Server Component, same table as contacts enrichment jobs page but queries `crm_Target_Enrichment`. Retry button POSTs to `/api/crm/targets/enrich-bulk`.

---

## Error Handling

Identical to contact enrichment:

| Scenario | Behavior |
|---|---|
| No `FIRECRAWL_API_KEY` | 503 response |
| Target has no email | Button disabled; API returns 422 |
| SSE disconnect | `request.signal` abort cancels in-flight requests |
| Bulk rate limit | Inngest retries (max 3, exponential backoff) |
| Recently enriched (< 7 days) | Bulk job skips with SKIPPED status |
| Single re-enrichment | Always runs (no dedup) |

---

## Out of Scope

- Enrichment of `crm_Leads` (separate future feature)
- Social URL fields for targets (no columns exist on `crm_Targets`)
- Automatic periodic re-enrichment
