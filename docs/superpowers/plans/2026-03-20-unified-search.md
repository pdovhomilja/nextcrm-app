# Unified Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the rudimentary fulltext search at `/en/fulltext-search?q=test` with a unified search that combines keyword + pgvector semantic search, results grouped by entity type.

**Architecture:** A single `unifiedSearch` server action generates one OpenAI embedding for the query, then runs 11 parallel queries (`Promise.all`) — CRM entities (Accounts, Contacts, Leads, Opportunities) get keyword + semantic search merged and scored, other entities (Projects/Boards, Tasks, Users) get keyword-only. Results are returned as grouped arrays. The UI renders collapsible sections per entity, each sorted by score descending.

**Tech Stack:** Next.js 15 App Router, TypeScript, Prisma (`prismadb`), PostgreSQL + pgvector (`<=>` cosine distance), OpenAI `text-embedding-3-small` (1536 dims), next-auth session, shadcn/ui, Tailwind CSS.

---

## File Map

| Action | File |
|--------|------|
| **Create** | `actions/fulltext/unified-search.ts` |
| **Create** | `components/fulltext-search/result-card.tsx` |
| **Create** | `components/fulltext-search/entity-result-section.tsx` |
| **Replace** | `app/[locale]/(routes)/fulltext-search/components/SearchResult.tsx` |
| **Replace** | `app/[locale]/(routes)/fulltext-search/search/components/ResultPage.tsx` |
| **Delete** | `actions/fulltext/search.ts` |
| **Delete** | `actions/fulltext/get-search-results.ts` |
| **Modify** | `app/[locale]/(routes)/fulltext-search/search/page.tsx` |

> **Note on spec deviation:** The spec lists `components/fulltext-search/search-results.tsx` as a separate file. In this plan, that logic is inlined into `SearchResult.tsx` to reduce file count — functionally identical.

---

## Task 1: Create `unified-search.ts` server action

**Files:**
- Create: `actions/fulltext/unified-search.ts`

**Key patterns from existing code:**
- Auth: `getServerSession(authOptions)` from `@/lib/auth`
- DB: `prismadb` from `@/lib/prisma`
- Embedding: `generateEmbedding`, `toVectorLiteral` from `@/inngest/lib/embedding-utils`
- Raw SQL: `prismadb.$queryRaw<T>` with tagged template literals
- Cosine: `1 - (e.embedding <=> ${vec}::vector)` — use `<=>` (cosine), NOT `<->` (L2)

**Field notes (important — avoid FK UUID fields as display text):**
- `crm_Accounts.industry` is a UUID FK → use `email` as subtitle instead
- `crm_Opportunities.type` is a UUID FK → use `status` enum (ACTIVE/INACTIVE/PENDING/CLOSED) as subtitle
- `crm_Leads` uses camelCase: `firstName`, `lastName`, `company`, `email`
- `tasks.taskStatus` is an enum; display as-is for subtitle

**Scoring logic:**
```
score = 0.5 * keywordScore + 0.5 * similarityScore
keywordScore  = 1.0 if in keyword results, else 0
similarityScore = 1 - cosine_distance (0–1)
```
After union + dedup by `id`, sort by `score` desc, cap at 10 per entity.

**Semantic queries use LEFT JOIN + IS NOT NULL** to exclude un-embedded records from semantic results while still allowing keyword-matched un-embedded records to appear with score 0.5.

- [ ] **Step 1: Create the file**

```typescript
// actions/fulltext/unified-search.ts
"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import {
  generateEmbedding,
  toVectorLiteral,
} from "@/inngest/lib/embedding-utils";

export interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  score: number;
  matchType: "keyword" | "semantic" | "both";
}

export interface UnifiedSearchResults {
  accounts: SearchResult[];
  contacts: SearchResult[];
  leads: SearchResult[];
  opportunities: SearchResult[];
  projects: SearchResult[];
  tasks: SearchResult[];
  users: SearchResult[];
}

function mergeResults(
  keywordIds: Set<string>,
  semanticMap: Map<string, number>,
  allRecords: { id: string; title: string; subtitle: string; url: string }[]
): SearchResult[] {
  const results: SearchResult[] = allRecords.map((r) => {
    const inKeyword = keywordIds.has(r.id);
    const semanticScore = semanticMap.get(r.id) ?? 0;
    const score = 0.5 * (inKeyword ? 1.0 : 0) + 0.5 * semanticScore;
    const matchType: SearchResult["matchType"] =
      inKeyword && semanticScore > 0 ? "both" : inKeyword ? "keyword" : "semantic";
    return { ...r, score, matchType };
  });
  return results.sort((a, b) => b.score - a.score).slice(0, 10);
}

export async function unifiedSearch(
  query: string,
  locale: string = "en"
): Promise<UnifiedSearchResults | { error: string }> {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };
  if (!query || query.trim().length < 2)
    return { error: "Query must be at least 2 characters" };

  // Generate embedding — fall back to keyword-only on failure (silent)
  let queryVec: string | null = null;
  try {
    const embedding = await generateEmbedding(query.trim());
    queryVec = toVectorLiteral(embedding);
  } catch {
    // intentional silent fallback to keyword-only
  }

  const noSemantic = Promise.resolve([] as { id: string; similarity: number }[]);

  try {
    const [
      kwAccounts,
      kwContacts,
      kwLeads,
      kwOpportunities,
      kwProjects,
      kwTasks,
      kwUsers,
      semAccounts,
      semContacts,
      semLeads,
      semOpportunities,
    ] = await Promise.all([
      prismadb.crm_Accounts.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 10,
        select: { id: true, name: true, email: true },
      }),
      prismadb.crm_Contacts.findMany({
        where: {
          OR: [
            { first_name: { contains: query, mode: "insensitive" } },
            { last_name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 10,
        select: { id: true, first_name: true, last_name: true, email: true },
      }),
      prismadb.crm_Leads.findMany({
        where: {
          OR: [
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
            { company: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 10,
        select: { id: true, firstName: true, lastName: true, company: true, email: true },
      }),
      prismadb.crm_Opportunities.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 10,
        select: { id: true, name: true, status: true },
      }),
      prismadb.boards.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 10,
        select: { id: true, title: true, description: true },
      }),
      prismadb.tasks.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { content: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 10,
        select: { id: true, title: true, taskStatus: true },
      }),
      prismadb.users.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { username: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 10,
        select: { id: true, name: true, email: true },
      }),
      // Semantic queries — use LEFT JOIN + IS NOT NULL to exclude un-embedded records
      queryVec
        ? prismadb.$queryRaw<{ id: string; similarity: number }[]>`
            SELECT a.id, 1 - (e.embedding <=> ${queryVec}::vector) AS similarity
            FROM "crm_Accounts" a
            LEFT JOIN "crm_Embeddings_Accounts" e ON e.account_id = a.id
            WHERE e.embedding IS NOT NULL
            ORDER BY e.embedding <=> ${queryVec}::vector
            LIMIT 10`
        : noSemantic,
      queryVec
        ? prismadb.$queryRaw<{ id: string; similarity: number }[]>`
            SELECT c.id, 1 - (e.embedding <=> ${queryVec}::vector) AS similarity
            FROM "crm_Contacts" c
            LEFT JOIN "crm_Embeddings_Contacts" e ON e.contact_id = c.id
            WHERE e.embedding IS NOT NULL
            ORDER BY e.embedding <=> ${queryVec}::vector
            LIMIT 10`
        : noSemantic,
      queryVec
        ? prismadb.$queryRaw<{ id: string; similarity: number }[]>`
            SELECT l.id, 1 - (e.embedding <=> ${queryVec}::vector) AS similarity
            FROM "crm_Leads" l
            LEFT JOIN "crm_Embeddings_Leads" e ON e.lead_id = l.id
            WHERE e.embedding IS NOT NULL
            ORDER BY e.embedding <=> ${queryVec}::vector
            LIMIT 10`
        : noSemantic,
      queryVec
        ? prismadb.$queryRaw<{ id: string; similarity: number }[]>`
            SELECT o.id, 1 - (e.embedding <=> ${queryVec}::vector) AS similarity
            FROM "crm_Opportunities" o
            LEFT JOIN "crm_Embeddings_Opportunities" e ON e.opportunity_id = o.id
            WHERE e.embedding IS NOT NULL
            ORDER BY e.embedding <=> ${queryVec}::vector
            LIMIT 10`
        : noSemantic,
    ]);

    const semMap = (rows: { id: string; similarity: number }[]) =>
      new Map(rows.map((r) => [r.id, Number(r.similarity)]));

    // Collect IDs found only in semantic results (need full record fetch)
    const kwAccountIds = new Set(kwAccounts.map((r) => r.id));
    const kwContactIds = new Set(kwContacts.map((r) => r.id));
    const kwLeadIds = new Set(kwLeads.map((r) => r.id));
    const kwOpportunityIds = new Set(kwOpportunities.map((r) => r.id));

    const [extraAccounts, extraContacts, extraLeads, extraOpportunities] =
      await Promise.all([
        prismadb.crm_Accounts.findMany({
          where: { id: { in: semAccounts.map((r) => r.id).filter((id) => !kwAccountIds.has(id)) } },
          select: { id: true, name: true, email: true },
        }),
        prismadb.crm_Contacts.findMany({
          where: { id: { in: semContacts.map((r) => r.id).filter((id) => !kwContactIds.has(id)) } },
          select: { id: true, first_name: true, last_name: true, email: true },
        }),
        prismadb.crm_Leads.findMany({
          where: { id: { in: semLeads.map((r) => r.id).filter((id) => !kwLeadIds.has(id)) } },
          select: { id: true, firstName: true, lastName: true, company: true, email: true },
        }),
        prismadb.crm_Opportunities.findMany({
          where: { id: { in: semOpportunities.map((r) => r.id).filter((id) => !kwOpportunityIds.has(id)) } },
          select: { id: true, name: true, status: true },
        }),
      ]);

    const accounts = mergeResults(
      kwAccountIds,
      semMap(semAccounts),
      [...kwAccounts, ...extraAccounts].map((r) => ({
        id: r.id,
        title: r.name,
        subtitle: r.email ?? "",
        url: `/${locale}/crm/accounts/${r.id}`,
      }))
    );

    const contacts = mergeResults(
      kwContactIds,
      semMap(semContacts),
      [...kwContacts, ...extraContacts].map((r) => ({
        id: r.id,
        title: `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim(),
        subtitle: r.email ?? "",
        url: `/${locale}/crm/contacts/${r.id}`,
      }))
    );

    const leads = mergeResults(
      kwLeadIds,
      semMap(semLeads),
      [...kwLeads, ...extraLeads].map((r) => ({
        id: r.id,
        title:
          r.firstName || r.lastName
            ? `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim()
            : (r.company ?? "Unknown Lead"),
        subtitle: r.email ?? r.company ?? "",
        url: `/${locale}/crm/leads/${r.id}`,
      }))
    );

    const opportunities = mergeResults(
      kwOpportunityIds,
      semMap(semOpportunities),
      [...kwOpportunities, ...extraOpportunities].map((r) => ({
        id: r.id,
        title: r.name,
        subtitle: r.status ?? "",
        url: `/${locale}/crm/opportunities/${r.id}`,
      }))
    );

    const projects: SearchResult[] = kwProjects.map((r) => ({
      id: r.id,
      title: r.title,
      subtitle: r.description ? r.description.slice(0, 80) : "",
      url: `/${locale}/projects/${r.id}`,
      score: 0.5,
      matchType: "keyword",
    }));

    const tasks: SearchResult[] = kwTasks.map((r) => ({
      id: r.id,
      title: r.title,
      subtitle: r.taskStatus ?? "",
      url: `/${locale}/tasks/${r.id}`,
      score: 0.5,
      matchType: "keyword",
    }));

    const users: SearchResult[] = kwUsers.map((r) => ({
      id: r.id,
      title: r.name ?? r.email ?? "Unknown User",
      subtitle: r.email ?? "",
      url: `/${locale}/settings/users/${r.id}`,
      score: 0.5,
      matchType: "keyword",
    }));

    return { accounts, contacts, leads, opportunities, projects, tasks, users };
  } catch (error) {
    console.error("[UNIFIED_SEARCH]", error);
    return { error: "Search failed" };
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/pdovhomilja/development/Next.js/nextcrm-app
npx tsc --noEmit 2>&1 | grep unified-search
```
Expected: no output (no errors)

- [ ] **Step 3: Commit**

```bash
git add actions/fulltext/unified-search.ts
git commit -m "feat: add unified search server action with keyword + pgvector semantic search"
```

---

## Task 2: Create `result-card.tsx` component

**Files:**
- Create: `components/fulltext-search/result-card.tsx`

Displays a single search result with title, subtitle, match type badge, and score percentage. Wraps in a Next.js `Link`.

- [ ] **Step 1: Create the file**

```tsx
// components/fulltext-search/result-card.tsx
"use client";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { SearchResult } from "@/actions/fulltext/unified-search";

const matchTypeLabel: Record<SearchResult["matchType"], string> = {
  keyword: "Keyword",
  semantic: "Semantic",
  both: "Best Match",
};

const matchTypeVariant: Record<
  SearchResult["matchType"],
  "default" | "secondary" | "outline"
> = {
  keyword: "outline",
  semantic: "secondary",
  both: "default",
};

export function ResultCard({ result }: { result: SearchResult }) {
  return (
    <Link
      href={result.url}
      className="flex items-start justify-between gap-3 rounded-md border p-3 text-sm hover:bg-muted/50 transition-colors"
    >
      <div className="flex flex-col gap-1 min-w-0">
        <span className="font-medium truncate">{result.title}</span>
        {result.subtitle && (
          <span className="text-muted-foreground text-xs truncate">
            {result.subtitle}
          </span>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <Badge variant={matchTypeVariant[result.matchType]}>
          {matchTypeLabel[result.matchType]}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {Math.round(result.score * 100)}%
        </span>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/pdovhomilja/development/Next.js/nextcrm-app
npx tsc --noEmit 2>&1 | grep result-card
```
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add components/fulltext-search/result-card.tsx
git commit -m "feat: add ResultCard component for unified search"
```

---

## Task 3: Create `entity-result-section.tsx` component

**Files:**
- Create: `components/fulltext-search/entity-result-section.tsx`

Collapsible section with label + count badge, renders a `ResultCard` list.

- [ ] **Step 1: Create the file**

```tsx
// components/fulltext-search/entity-result-section.tsx
"use client";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResultCard } from "./result-card";
import type { SearchResult } from "@/actions/fulltext/unified-search";

interface EntityResultSectionProps {
  label: string;
  results: SearchResult[];
}

export function EntityResultSection({ label, results }: EntityResultSectionProps) {
  const [open, setOpen] = useState(true);

  if (results.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="ghost"
        className="flex items-center gap-2 w-fit px-1 h-auto py-1"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        <span className="font-semibold text-sm">{label}</span>
        <Badge variant="secondary" className="text-xs">
          {results.length}
        </Badge>
      </Button>
      {open && (
        <div className="flex flex-col gap-1 pl-6">
          {results.map((r) => (
            <ResultCard key={r.id} result={r} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/pdovhomilja/development/Next.js/nextcrm-app
npx tsc --noEmit 2>&1 | grep entity-result
```
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add components/fulltext-search/entity-result-section.tsx
git commit -m "feat: add EntityResultSection collapsible component"
```

---

## Task 4: Replace `SearchResult.tsx` (the client orchestrator)

**Files:**
- Modify: `app/[locale]/(routes)/fulltext-search/components/SearchResult.tsx`

This client component reads `?q=` from URL params, reads `locale` from route params, calls `unifiedSearch` on submit (URL change), shows loading skeleton and grouped results.

- [ ] **Step 1: Replace the file entirely**

```tsx
// app/[locale]/(routes)/fulltext-search/components/SearchResult.tsx
"use client";

import { useSearchParams, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { EntityResultSection } from "@/components/fulltext-search/entity-result-section";
import {
  unifiedSearch,
  type UnifiedSearchResults,
} from "@/actions/fulltext/unified-search";

const ENTITY_LABELS: Record<keyof UnifiedSearchResults, string> = {
  accounts: "Accounts",
  contacts: "Contacts",
  leads: "Leads",
  opportunities: "Opportunities",
  projects: "Projects",
  tasks: "Tasks",
  users: "Users",
};

const ENTITY_ORDER: (keyof UnifiedSearchResults)[] = [
  "accounts",
  "contacts",
  "leads",
  "opportunities",
  "projects",
  "tasks",
  "users",
];

export default function SearchResult() {
  const searchParams = useSearchParams();
  const params = useParams();
  const query = searchParams?.get("q") ?? "";
  const locale = (params?.locale as string) ?? "en";

  const [results, setResults] = useState<UnifiedSearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults(null);
      return;
    }
    setIsLoading(true);
    unifiedSearch(query.trim(), locale)
      .then((res) => {
        if ("error" in res) {
          console.error("[UNIFIED_SEARCH]", res.error);
          return;
        }
        setResults(res);
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, [query, locale]);

  if (!query)
    return <p className="text-muted-foreground">Enter a search term above.</p>;

  if (query.trim().length < 2)
    return (
      <p className="text-muted-foreground text-sm">
        Type at least 2 characters to search.
      </p>
    );

  if (isLoading)
    return (
      <div className="flex flex-col gap-4">
        {ENTITY_ORDER.map((key) => (
          <div key={key} className="h-16 rounded-md bg-muted animate-pulse" />
        ))}
      </div>
    );

  if (!results) return null;

  const hasAnyResults = ENTITY_ORDER.some((key) => results[key].length > 0);

  if (!hasAnyResults)
    return (
      <p className="text-muted-foreground">
        No results found for &quot;{query}&quot;.
      </p>
    );

  return (
    <div className="flex flex-col gap-6">
      {ENTITY_ORDER.map((key) => (
        <EntityResultSection
          key={key}
          label={ENTITY_LABELS[key]}
          results={results[key]}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/pdovhomilja/development/Next.js/nextcrm-app
npx tsc --noEmit 2>&1 | grep -E "SearchResult|unified"
```
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/(routes)/fulltext-search/components/SearchResult.tsx"
git commit -m "feat: replace SearchResult with unified search UI — grouped sections, loading skeleton"
```

---

## Task 5: Update `search/page.tsx`, simplify `ResultPage.tsx`, delete old actions

**Files:**
- Modify: `app/[locale]/(routes)/fulltext-search/search/page.tsx`
- Modify: `app/[locale]/(routes)/fulltext-search/search/components/ResultPage.tsx`
- Delete: `actions/fulltext/search.ts`
- Delete: `actions/fulltext/get-search-results.ts`

The `/fulltext-search/search/` sub-route uses the deleted `getSearch` action. Redirect it to `/fulltext-search`, forwarding the `?q=` param.

- [ ] **Step 1: Update `search/page.tsx` to redirect (preserving `?q=`)**

```tsx
// app/[locale]/(routes)/fulltext-search/search/page.tsx
import { redirect } from "next/navigation";

const FullTextSearchPage = async (props: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ q?: string }>;
}) => {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const q = searchParams?.q;
  redirect(`/${params.locale}/fulltext-search${q ? `?q=${encodeURIComponent(q)}` : ""}`);
};

export default FullTextSearchPage;
```

- [ ] **Step 2: Strip `ResultPage.tsx` (no longer used)**

```tsx
// app/[locale]/(routes)/fulltext-search/search/components/ResultPage.tsx
// No longer used — search/page.tsx redirects to /fulltext-search
export default function ResultPage() {
  return null;
}
```

- [ ] **Step 3: Delete old action files**

```bash
rm /Users/pdovhomilja/development/Next.js/nextcrm-app/actions/fulltext/search.ts
rm /Users/pdovhomilja/development/Next.js/nextcrm-app/actions/fulltext/get-search-results.ts
```

- [ ] **Step 4: Verify TypeScript compiles cleanly**

```bash
cd /Users/pdovhomilja/development/Next.js/nextcrm-app
npx tsc --noEmit 2>&1 | head -30
```
Expected: no new errors

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/(routes)/fulltext-search/search/page.tsx"
git add "app/[locale]/(routes)/fulltext-search/search/components/ResultPage.tsx"
git rm actions/fulltext/search.ts actions/fulltext/get-search-results.ts
git commit -m "feat: retire old fulltext actions, redirect /search sub-route to unified search"
```

---

## Task 6: Manual verification

- [ ] **Step 1: Start dev server**

```bash
cd /Users/pdovhomilja/development/Next.js/nextcrm-app
pnpm dev
```

- [ ] **Step 2: Verify core flows at `http://localhost:3000/en/fulltext-search`**

1. Page loads without console errors
2. Entering 1 character → shows "Type at least 2 characters" hint
3. Submitting a query (Enter in the search input) → loading skeletons appear
4. Results appear grouped: Accounts, Contacts, Leads, Opportunities, Projects, Tasks, Users
5. Empty sections are hidden
6. Each section is collapsible (click to toggle)
7. Each card shows title, subtitle, badge (Keyword / Semantic / Best Match), score %
8. Clicking a card navigates to correct URL with correct locale prefix
9. Searching with no matches → "No results found for …"

- [ ] **Step 3: Verify old redirect**

Navigate to `http://localhost:3000/en/fulltext-search/search?q=test`
Expected: redirects to `http://localhost:3000/en/fulltext-search?q=test`

- [ ] **Step 4: Commit any fixes found during verification**

```bash
git add -p
git commit -m "fix: unified search verification fixes"
```
