# Enrichment Fixes Design

**Date:** 2026-03-26
**Scope:** 5 targeted fixes to the target enrichment pipeline — 3 critical bugs and 2 quick wins.

---

## 1. Inngest Field Mapping Divergence (Critical)

### Problem
`targetFieldMap` in `inngest/functions/enrich-target.ts` has 10 fields. The API PATCH route (`app/api/crm/targets/[id]/route.ts`) has 20 fields after adding company-search fields. The 8 new fields — `personal_email`, `company_email`, `company_phone`, `industry`, `employees`, `description`, `city`, `country` — are silently dropped in bulk Inngest enrichment jobs.

Additionally, the Prisma `select` block in `enrich-target.ts` only fetches the original 10 columns. The `isFieldEmpty` guard reads `target[targetColumn]` to skip fields that already have a value — for the 8 new fields that are not in the `select`, this lookup returns `undefined`, bypassing the "only fill empty fields" protection.

### Fix
Two changes in `enrich-target.ts`:
1. Extend `targetFieldMap` to include the 8 missing fields.
2. Extend the Prisma `select` block to fetch all 8 new columns so `isFieldEmpty` works correctly.

### Files Changed
- `inngest/functions/enrich-target.ts` — add 8 entries to `targetFieldMap` + extend `select`

---

## 2. Shared Target Field Presets — DRY Refactor (Consistency Fix)

### Problem
`PERSONAL_PRESET_FIELDS`, `COMPANY_PRESET_FIELDS`, and their defaults are defined inline in `EnrichTargetDrawer.tsx`. `BulkEnrichTargetsModal.tsx` has its own `TARGET_PRESET_FIELDS` array (all fields combined) defined separately. These two definitions are out of sync and will drift as fields are added.

### Fix
Extract all preset arrays into a shared module: `lib/enrichment/presets/target-fields.ts`. Export:
- `PERSONAL_PRESET_FIELDS` + `PERSONAL_DEFAULTS`
- `COMPANY_PRESET_FIELDS` + `COMPANY_DEFAULTS`
- `ALL_TARGET_PRESET_FIELDS` (combined, for bulk modal)

Both `EnrichTargetDrawer` and `BulkEnrichTargetsModal` import from this module. No functional change — this ensures both UIs stay in sync when fields are added in future.

### Files Changed
- `lib/enrichment/presets/target-fields.ts` — new file, single source of truth for all target enrichment fields
- `app/[locale]/(routes)/campaigns/targets/[targetId]/components/EnrichTargetDrawer.tsx` — import from shared module, remove inline definitions
- `app/[locale]/(routes)/campaigns/targets/components/BulkEnrichTargetsModal.tsx` — import `ALL_TARGET_PRESET_FIELDS` from shared module, remove inline definition

---

## 3. Skip-List Loading on Every Enrichment (Quick Win)

### Problem
`loadSkipList()` is called on every call to `AgentEnrichmentStrategy.enrichRow()`, with no caching. This adds unnecessary latency to every enrichment request.

### Fix
Add a module-level cache in `agent-enrichment-strategy.ts`: store the loaded result and a timestamp. Re-use the cached value if it is less than 5 minutes old; otherwise reload. If `loadSkipList()` throws, the error propagates normally — no stale cache is written.

```typescript
let skipListCache: { data: SkipList; loadedAt: number } | null = null;
const SKIP_LIST_TTL_MS = 5 * 60 * 1000;

async function getCachedSkipList(): Promise<SkipList> {
  if (skipListCache && Date.now() - skipListCache.loadedAt < SKIP_LIST_TTL_MS) {
    return skipListCache.data;
  }
  const data = await loadSkipList(); // throws on error — cache not written
  skipListCache = { data, loadedAt: Date.now() };
  return data;
}
```

**Known limitation:** In serverless environments (Vercel), each cold start gets a fresh module instance, so the cache has no effect across invocations. The TTL matters only for long-running processes (local dev, self-hosted). Still worth adding — no downside in serverless, meaningful savings in persistent deployments.

### Files Changed
- `lib/enrichment/strategies/agent-enrichment-strategy.ts` — add `getCachedSkipList()`, replace `loadSkipList()` call

---

## 4. Field Name Validation on Enrich Routes (Quick Win)

### Problem
`POST /api/crm/targets/enrich` and `POST /api/crm/targets/enrich-bulk` accept any strings in the `fields` array. Unknown field names are silently ignored by the orchestrator.

### Fix
Move `FIELD_MAP` to `lib/enrichment/presets/target-fields.ts` (the shared module created in Fix #2). Both enrich routes import from there and validate submitted field names against its keys. Return `400` with the list of invalid fields if any are present.

```typescript
const validFields = new Set(Object.keys(FIELD_MAP));
const invalidFields = fields.filter((f: string) => !validFields.has(f));
if (invalidFields.length > 0) {
  return NextResponse.json(
    { error: `Unknown fields: ${invalidFields.join(", ")}` },
    { status: 400 }
  );
}
```

`app/api/crm/targets/[id]/route.ts` imports `FIELD_MAP` from the shared module instead of defining it locally.

### Files Changed
- `lib/enrichment/presets/target-fields.ts` — add and export `FIELD_MAP`
- `app/api/crm/targets/[id]/route.ts` — import `FIELD_MAP` from shared module
- `app/api/crm/targets/enrich/route.ts` — import `FIELD_MAP`, add validation
- `app/api/crm/targets/enrich-bulk/route.ts` — import `FIELD_MAP`, add validation

---

## 5. Orchestrator Timeout (Quick Win)

### Problem
`AgentOrchestrator.enrichRow()` has no maximum execution time. A slow or hung Firecrawl/OpenAI call can block a streaming SSE connection indefinitely.

### Fix
Apply the timeout in `AgentEnrichmentStrategy.enrichRow()`, wrapping the `this.orchestrator.enrichRow(...)` call. On timeout, catch the error and return a structured `RowEnrichmentResult` with `status: "error"` so the SSE stream receives a clean response rather than hanging.

```typescript
const ENRICHMENT_TIMEOUT_MS = 90_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

// In enrichRow():
const raw = await withTimeout(
  this.orchestrator.enrichRow(row, fields, emailColumn, onProgress, onAgentProgress, identityOverride),
  ENRICHMENT_TIMEOUT_MS,
  "Enrichment"
);
```

### Files Changed
- `lib/enrichment/strategies/agent-enrichment-strategy.ts` — add `withTimeout()`, wrap orchestrator call, catch timeout error and return `{ status: "error", enrichments: {}, error: "..." }`

---

## Implementation Order

1. `lib/enrichment/presets/target-fields.ts` — shared module (unblocks fixes #2 and #4)
2. Inngest field mapping + select (fix #1, isolated)
3. `EnrichTargetDrawer` + `BulkEnrichTargetsModal` import from shared module (fix #2)
4. Move `FIELD_MAP` to shared module; update `[id]/route.ts` import (fix #4 part 1)
5. Add field validation to enrich routes (fix #4 part 2)
6. Skip-list caching (fix #3, isolated)
7. Orchestrator timeout (fix #5, isolated)

---

## Out of Scope

- In-memory session store → Redis (requires infrastructure change)
- Contact enrichment company fallback (contacts always have email)
- `shouldSkipTargetEnrichment()` naming
