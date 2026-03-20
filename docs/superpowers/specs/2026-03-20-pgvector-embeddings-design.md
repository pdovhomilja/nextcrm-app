# PGVector Embeddings — Similarity Recommendations for CRM

**Date:** 2026-03-20
**Status:** Approved
**Project:** nextcrm-app

---

## Overview

Add semantic similarity recommendations to the CRM module using PostgreSQL pgvector, OpenAI `text-embedding-3-small`, and Inngest for background embedding generation. When viewing any CRM record (Account, Contact, Lead, Opportunity), users can open a drawer to find similar records ranked by cosine similarity.

---

## Use Case

A user views a Contact record and wants to find other contacts with a similar profile (role, company type, background). They click "Find Similar" to open a drawer showing the top 5 most similar contacts with match scores. Same pattern applies to Accounts, Leads, and Opportunities.

---

## Architecture

### Approach: Normalized Companion Embedding Tables

Four separate embedding tables, one per CRM entity. CRM models are unchanged. Embedding tables are managed independently and can be rebuilt without touching CRM data.

---

## Section 1: Schema & Database

### pgvector Extension

Enable via raw SQL migration:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Companion Tables

```sql
-- Accounts
CREATE TABLE crm_Embeddings_Accounts (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id   TEXT NOT NULL UNIQUE REFERENCES crm_Accounts(id) ON DELETE CASCADE,
  embedding    vector(1536) NOT NULL,
  content_hash TEXT NOT NULL,
  embedded_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX ON crm_Embeddings_Accounts USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Contacts
CREATE TABLE crm_Embeddings_Contacts (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id   TEXT NOT NULL UNIQUE REFERENCES crm_Contacts(id) ON DELETE CASCADE,
  embedding    vector(1536) NOT NULL,
  content_hash TEXT NOT NULL,
  embedded_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX ON crm_Embeddings_Contacts USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Leads
CREATE TABLE crm_Embeddings_Leads (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      TEXT NOT NULL UNIQUE REFERENCES crm_Leads(id) ON DELETE CASCADE,
  embedding    vector(1536) NOT NULL,
  content_hash TEXT NOT NULL,
  embedded_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX ON crm_Embeddings_Leads USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Opportunities
CREATE TABLE crm_Embeddings_Opportunities (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id  TEXT NOT NULL UNIQUE REFERENCES crm_Opportunities(id) ON DELETE CASCADE,
  embedding       vector(1536) NOT NULL,
  content_hash    TEXT NOT NULL,
  embedded_at     TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX ON crm_Embeddings_Opportunities USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### Prisma Schema Addition

Add `Unsupported("vector(1536)")` fields using Prisma's raw type support with `@@ignore` on the embedding column (use raw SQL for vector operations). Companion models are added to `schema.prisma` for FK integrity and metadata queries.

### Embedded Text Per Entity (key fields only)

| Entity | Fields concatenated |
|--------|-------------------|
| Account | `name + description + email` |
| Contact | `first_name + last_name + position + email` |
| Lead | `name + description + status` |
| Opportunity | `name + description + stage` |

Null fields are omitted. Fields joined with `" "`.

---

## Section 2: Inngest Background Jobs

### New Package

```
inngest (npm package)
```

### API Route

```
app/api/inngest/route.ts   — serves the Inngest client handler
```

### Inngest Functions

```
inngest/functions/embed-account.ts       — event: "crm/account.saved"
inngest/functions/embed-contact.ts       — event: "crm/contact.saved"
inngest/functions/embed-lead.ts          — event: "crm/lead.saved"
inngest/functions/embed-opportunity.ts   — event: "crm/opportunity.saved"
inngest/functions/embed-backfill.ts      — manual trigger, fans out all records
inngest/client.ts                        — Inngest client singleton
```

### Job Logic (per function)

1. Receive `{ record_id }` from event payload
2. Fetch key fields from DB via Prisma
3. Concatenate fields into embedding text string
4. Compute SHA-256 `content_hash` of the text
5. Check companion table — **skip if hash unchanged** (idempotency)
6. Call OpenAI `text-embedding-3-small` API
7. Upsert companion embedding table row

### Event Dispatch

Existing server actions in `/actions/crm/` call `inngest.send()` after each Prisma create/update mutation. No changes to the mutation logic itself.

### Backfill

`embed-backfill.ts` fans out via `inngest.sendMany()` — sends one event per existing record for each entity type. Used for initial seeding and model changes.

---

## Section 3: Similarity Query Server Actions

### Location

```
actions/crm/similarity/get-similar-accounts.ts
actions/crm/similarity/get-similar-contacts.ts
actions/crm/similarity/get-similar-leads.ts
actions/crm/similarity/get-similar-opportunities.ts
```

### Action Signature

```typescript
type SimilarRecord = {
  id: string
  name: string        // display name field
  subtitle: string    // secondary field (position, stage, status)
  similarity: number  // 0–1 cosine similarity score
  href: string        // navigation URL
}

type SimilarityResult =
  | { status: 'ok'; records: SimilarRecord[] }
  | { status: 'no_embedding' }
  | { status: 'error'; message: string }

async function getSimilarAccounts(recordId: string, limit = 5): Promise<SimilarityResult>
```

### Query Pattern

```sql
SELECT a.id, a.name, a.email,
       1 - (e.embedding <=> $1::vector) AS similarity
FROM   "crm_Accounts" a
JOIN   "crm_Embeddings_Accounts" e ON e.account_id = a.id
WHERE  a.id != $2
ORDER  BY e.embedding <=> $1::vector
LIMIT  $3;
```

The embedding vector for the source record is fetched first, then passed as `$1`.

---

## Section 4: UI Components

### Trigger Button

A "Find Similar" button added to the header area of each entity detail page:

```
app/[locale]/(routes)/crm/accounts/[id]/page.tsx
app/[locale]/(routes)/crm/contacts/[id]/page.tsx
app/[locale]/(routes)/crm/leads/[id]/page.tsx
app/[locale]/(routes)/crm/opportunities/[id]/page.tsx
```

### Reusable Drawer Component

```
components/crm/similar-records-drawer.tsx
```

**Props:**
```typescript
{
  entityType: 'account' | 'contact' | 'lead' | 'opportunity'
  recordId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}
```

**Drawer contents:**
- Header: "Similar [Entity Type]s"
- Loading skeleton (3 placeholder rows) while fetching
- Up to 5 result rows, each showing:
  - Record name/title
  - Subtitle (position, stage, status)
  - Similarity badge ("94% match") — color coded: green >80%, yellow 60–80%, gray <60%
  - Clickable row navigates to that record
- Empty state when `status === 'no_embedding'`: "Still generating similarity data. Check back shortly."
- Error state with retry option

**Client component** — calls the relevant server action on drawer open via `useEffect`.

---

## File Structure Summary

```
inngest/
  client.ts
  functions/
    embed-account.ts
    embed-contact.ts
    embed-lead.ts
    embed-opportunity.ts
    embed-backfill.ts

app/api/inngest/
  route.ts

actions/crm/similarity/
  get-similar-accounts.ts
  get-similar-contacts.ts
  get-similar-leads.ts
  get-similar-opportunities.ts

components/crm/
  similar-records-drawer.tsx

prisma/
  migrations/
    XXXX_add_pgvector_embeddings/
      migration.sql   (raw SQL, not Prisma-generated)

prisma/schema.prisma  (companion models added)
```

---

## Dependencies to Add

```
inngest
```

OpenAI SDK (`openai`, `ai`) already installed.

---

## Out of Scope

- Semantic search / fulltext search replacement
- RAG / chat interface
- Cross-entity similarity (e.g. find Accounts similar to a Contact)
- Embedding models other than `text-embedding-3-small`
- User-configurable similarity threshold

---

## Success Criteria

1. Creating or updating any CRM record triggers an Inngest job that generates and stores an embedding
2. "Find Similar" drawer shows top 5 similar records with scores within seconds of opening
3. Records without embeddings yet show a graceful "generating" state
4. Backfill function can embed all existing records in one trigger
5. Content hash prevents redundant OpenAI API calls on unchanged records
