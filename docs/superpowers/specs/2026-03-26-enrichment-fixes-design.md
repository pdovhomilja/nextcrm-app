# Enrichment Fixes Design

**Date:** 2026-03-26
**Scope:** 5 targeted fixes to the target enrichment pipeline — 3 critical bugs and 2 quick wins.

---

## 1. Inngest Field Mapping Divergence (Critical)

### Problem
`targetFieldMap` in `inngest/functions/enrich-target.ts` has 17 fields. The API PATCH route (`app/api/crm/targets/[id]/route.ts`) has 20 fields after adding company-search fields. The 8 new fields — `personal_email`, `company_email`, `company_phone`, `industry`, `employees`, `description`, `city`, `country` — are silently dropped in bulk Inngest enrichment jobs.

### Fix
Extend `targetFieldMap` in `enrich-target.ts` to include the 8 missing fields. The map already uses `prisma_field: db_column` pairs, so this is a direct addition. No logic changes required.

### Files Changed
- `inngest/functions/enrich-target.ts` — add 8 entries to `targetFieldMap`

---

## 2. BulkEnrichTargetsModal Missing Company-Search Fields (Critical)

### Problem
`BulkEnrichTargetsModal` hardcodes personal preset fields and defaults: `["position", "company", "social_linkedin", "company_website"]`. Targets enriched via bulk that only have a company name (no email) will use the company-search path in the orchestrator, but the field selector only offers personal fields. Users can't select company-specific fields (industry, employees, description, etc.) in bulk mode.

### Fix
Import and expose both `PERSONAL_PRESET_FIELDS` and `COMPANY_PRESET_FIELDS` (defined in `EnrichTargetDrawer.tsx`) in the bulk modal. Since bulk runs a mix of targets, show the combined set of fields from both presets. The orchestrator already routes each target to the correct scenario — the field list just needs to include all possible fields so results can be applied regardless of scenario.

Extract the two preset arrays and their defaults into a shared module (`lib/enrichment/presets/target-fields.ts`) so both `EnrichTargetDrawer` and `BulkEnrichTargetsModal` import from the same source.

### Files Changed
- `lib/enrichment/presets/target-fields.ts` — new file, exports `PERSONAL_PRESET_FIELDS`, `COMPANY_PRESET_FIELDS`, `PERSONAL_DEFAULTS`, `COMPANY_DEFAULTS`, `ALL_TARGET_PRESET_FIELDS`
- `app/[locale]/(routes)/campaigns/targets/[targetId]/components/EnrichTargetDrawer.tsx` — import from shared module
- `app/[locale]/(routes)/campaigns/targets/components/BulkEnrichTargetsModal.tsx` — import from shared module, use `ALL_TARGET_PRESET_FIELDS`

---

## 3. Skip-List Loading on Every Enrichment (Quick Win)

### Problem
`loadSkipList()` is called on every call to `AgentEnrichmentStrategy.enrichRow()`, with no caching. If the skip list is stored in the DB or a file, this adds unnecessary latency to every enrichment request.

### Fix
Add a module-level cache in `agent-enrichment-strategy.ts` (or `skip-list.ts`): store the loaded result and a timestamp. Re-use the cached value if it is less than 5 minutes old; otherwise reload. TTL of 5 minutes balances freshness vs. performance.

```typescript
let skipListCache: { data: SkipList; loadedAt: number } | null = null;
const SKIP_LIST_TTL_MS = 5 * 60 * 1000;

async function getCachedSkipList(): Promise<SkipList> {
  if (skipListCache && Date.now() - skipListCache.loadedAt < SKIP_LIST_TTL_MS) {
    return skipListCache.data;
  }
  const data = await loadSkipList();
  skipListCache = { data, loadedAt: Date.now() };
  return data;
}
```

### Files Changed
- `lib/enrichment/strategies/agent-enrichment-strategy.ts` — replace `loadSkipList()` call with `getCachedSkipList()`

---

## 4. Field Name Validation on Enrich Routes (Quick Win)

### Problem
`POST /api/crm/targets/enrich` and `POST /api/crm/targets/enrich-bulk` accept any strings in the `fields` array. Unknown field names are silently ignored by the orchestrator, leading to confusing results (user selects a field, nothing comes back).

### Fix
On each route, validate submitted field names against `FIELD_MAP` keys (from `app/api/crm/targets/[id]/route.ts`). If any unknown names are present, return `400` with a descriptive error listing the invalid fields.

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

Export `FIELD_MAP` (or its key set) from a shared location so both routes use the same source of truth.

### Files Changed
- `app/api/crm/targets/[id]/route.ts` — export `FIELD_MAP`
- `app/api/crm/targets/enrich/route.ts` — import and validate against `FIELD_MAP`
- `app/api/crm/targets/enrich-bulk/route.ts` — import and validate against `FIELD_MAP`

---

## 5. Orchestrator Timeout (Quick Win)

### Problem
`AgentOrchestrator.enrichRow()` has no maximum execution time. A slow or hung Firecrawl/OpenAI call can block a streaming SSE connection indefinitely.

### Fix
Wrap the orchestration pipeline in `Promise.race()` against a 90-second timeout. On timeout, resolve with a structured error result rather than throwing, so the caller receives a clean `status: "error"` response that can be streamed back to the client.

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
```

Apply at the top of `enrichRow()` before dispatching agents.

### Files Changed
- `lib/enrichment/agent-architecture/orchestrator.ts` — wrap pipeline with `withTimeout()`

---

## Implementation Order

1. `target-fields.ts` shared module (unblocks fix #2)
2. Inngest field mapping (fix #1, isolated)
3. BulkEnrichTargetsModal (fix #2, depends on shared module)
4. Skip-list caching (fix #3, isolated)
5. Field name validation (fix #4, after `FIELD_MAP` is exported)
6. Orchestrator timeout (fix #5, isolated)

---

## Out of Scope

- In-memory session store → Redis (requires infrastructure change)
- Contact enrichment company fallback (contacts always have email)
- `shouldSkipTargetEnrichment()` naming
