# Unified Search Design

**Date:** 2026-03-20
**Route:** `/[locale]/fulltext-search/search`
**Status:** Approved

## Overview

Upgrade the existing fulltext search page into a unified search experience that combines keyword search and semantic (vector) similarity search. Results are grouped by entity type, each section sorted by relevance score descending. Search is triggered on form submit only.

## Goals

- One search box, one submit action, results for all CRM entities
- Entities with pgvector embeddings (Accounts, Contacts, Leads, Opportunities) get keyword + semantic results merged and ranked
- Entities without embeddings (Projects, Tasks, Users) get keyword-only results
- Grouped UI sections per entity type, hidden if empty

## Architecture & Data Flow

1. User types query and submits the form
2. Client calls single server action `unifiedSearch(query: string)`
3. Action verifies session via `getServerSession(authOptions)` — returns `{ error: "Unauthorized" }` if unauthenticated
4. Action generates one OpenAI embedding for the query
5. Action runs 7 parallel queries via `Promise.all`:
   - **Accounts** — `ILIKE` keyword + pgvector cosine similarity → merged, deduped, ranked
   - **Contacts** — same
   - **Leads** — same
   - **Opportunities** — same
   - **Projects** (`prismadb.boards`) — `ILIKE` keyword only
   - **Tasks** — `ILIKE` keyword only
   - **Users** — `ILIKE` keyword only
6. Returns grouped results: `{ accounts[], contacts[], leads[], opportunities[], projects[], tasks[], users[] }`
7. UI renders collapsible sections per entity, sorted by score descending

### Scoring (CRM entities with embeddings)

```
score = 0.5 * keywordScore + 0.5 * similarityScore
```

- `keywordScore`: 1.0 if record matched keyword query, 0 otherwise
- `similarityScore`: `1 - cosine_distance` from pgvector (0–1 range)

Records that match both keyword and semantic get a score up to 1.0. Semantic-only matches score up to 0.5. Keyword-only matches score exactly 0.5.

### pgvector Operator

Use `<=>` which is the **cosine distance** operator. Do NOT use `<->` (L2/Euclidean distance). Raw SQL pattern:

```sql
1 - (e.embedding <=> $queryVector::vector) AS similarity_score
```

### Fallback on Embedding Failure

If the OpenAI embedding call fails, the action falls back to keyword-only search for all entities. Semantic results are silently omitted — no error is surfaced to the user.

### Handling Un-embedded Records

For CRM entities, some records may not yet have an entry in their embedding table (`crm_Embeddings_*`). The semantic query must use a strategy that preserves keyword-matched records regardless of embedding presence:

1. Run keyword query (`ILIKE`) → get set K
2. Run semantic query (raw SQL with `LEFT JOIN` on embedding table, filter by `embedding IS NOT NULL`) → get set S
3. Union K ∪ S, deduplicate by `id`, compute merged score per record

Records in K but not in S get `similarityScore = 0`, final score = 0.5.

## Files

### Old Files to Retire

The following files are **replaced** by the new unified action and must be deleted:

- `actions/fulltext/search.ts`
- `actions/fulltext/get-search-results.ts`

### New Files

| File | Purpose |
|------|---------|
| `actions/fulltext/unified-search.ts` | Unified server action — auth, embedding, parallel queries, merge, rank |
| `components/fulltext-search/search-results.tsx` | Renders grouped result sections |
| `components/fulltext-search/entity-result-section.tsx` | Collapsible section per entity type |
| `components/fulltext-search/result-card.tsx` | Single result card with entity badge and score indicator |

### Modified Files

| File | Change |
|------|--------|
| `app/[locale]/(routes)/fulltext-search/search/page.tsx` | Wire to new action, on-submit trigger, loading skeleton |

### Unchanged Files

- `actions/crm/similarity/get-similar-*.ts` — used only by the "Find Similar" drawer
- `inngest/` functions — embedding generation pipeline unchanged

## Data Interfaces

### Server Action

```typescript
unifiedSearch(query: string): Promise<SearchResults | { error: string }>

interface SearchResults {
  accounts: SearchResult[]
  contacts: SearchResult[]
  leads: SearchResult[]
  opportunities: SearchResult[]
  projects: SearchResult[]
  tasks: SearchResult[]
  users: SearchResult[]
}

interface SearchResult {
  id: string
  title: string
  subtitle?: string
  url: string
  score: number          // 0–1
  matchType: 'keyword' | 'semantic' | 'both'
}
```

### Per-Entity Field Mapping

| Entity | Prisma Model | `title` | `subtitle` | `url` |
|--------|-------------|---------|-----------|-------|
| Accounts | `crm_Accounts` | `name` | `industry` or `type` | `/crm/accounts/${id}` |
| Contacts | `crm_Contacts` | `first_name + ' ' + last_name` | `email` | `/crm/contacts/${id}` |
| Leads | `crm_Leads` | `first_name + ' ' + last_name` or `company` | `email` | `/crm/leads/${id}` |
| Opportunities | `crm_Opportunities` | `name` | `type` or `sales_stage` | `/crm/opportunities/${id}` |
| Projects | `boards` | `title` | `description` (truncated) | `/projects/${id}` |
| Tasks | `crm_Tasks` | `subject` | `status` | `/tasks/${id}` |
| Users | `users` | `name` | `email` | `/settings/users/${id}` |

### Per-Entity Result Limit

Each entity query returns a maximum of **10 results** (after merging keyword + semantic). Raw semantic queries use `LIMIT 10`. Keyword queries use Prisma `take: 10`.

## Components

### `search-results.tsx`

Receives `SearchResults`, renders one `EntityResultSection` per entity type. Hides sections with 0 results. Shows "No results found for {query}" if all sections are empty.

### `entity-result-section.tsx`

Collapsible section with entity label and result count badge. Renders `ResultCard` list sorted by score descending.

### `result-card.tsx`

Displays title, subtitle, match type indicator (keyword / semantic / both), and score as a subtle progress bar or percentage badge. Links to the entity detail page.

## Error Handling & Edge Cases

| Case | Behavior |
|------|---------|
| Unauthenticated request | Return `{ error: "Unauthorized" }` |
| Empty query | No search fired, results cleared |
| Query < 2 chars | Inline hint shown, no API call |
| Embedding API failure | Fallback to keyword-only for all entities, no error shown |
| Un-embedded records | Appear as keyword-only matches (score 0.5) |
| No results for entity | Section hidden |
| All sections empty | Show "No results found for {query}" |
| Slow response | Loading skeleton shown while search runs |

## Out of Scope

- Real-time / debounced as-you-type search
- Cross-entity ranking (all results in one flat list)
- Filters by entity type
- Search history or saved searches
- Changes to the "Find Similar" drawer or Inngest embedding pipeline
