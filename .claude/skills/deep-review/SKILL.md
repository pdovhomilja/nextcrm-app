---
name: deep-review
description: Thorough, stack-specific code review prioritizing security, performance, efficiency/maintainability, and best practices. Use when the user says "do a code review", "review my changes", "review the code", "review this branch", or before shipping. Distinct from the generic built-in /code-review — this one is tuned to the NextCRM-RE stack (Next.js App Router, Prisma, better-auth, Inngest, R2, Upstash).
---

# Deep Review

A repeatable, opinionated code review for this codebase. It evaluates changes against four priorities **in this order** — a finding in an earlier category outranks one in a later category:

1. **Security** (highest)
2. **Performance**
3. **Efficiency & maintainability** (eliminating redundancy, reuse, readability)
4. **Best practices** for the stack (Next.js App Router, Prisma, better-auth, TypeScript, Inngest, Resend, R2/S3, Upstash)

The output is a **severity-ranked findings report**, not edits. Reviewing and fixing are separate steps — propose first, fix only after the user chooses what to act on.

## Workflow

### 1. Determine scope

Default to the full branch diff (everything done since branching from `main`):

```bash
git diff $(git merge-base HEAD main) HEAD --stat
git diff $(git merge-base HEAD main) HEAD
```

Also include **uncommitted working-tree changes** if any exist (`git status --short`). If the user asks to review only staged/working changes or a specific path, narrow accordingly. State the scope you settled on before reviewing.

### 2. Build context before judging

Do not review the diff in isolation. For each changed file, understand how it's used:
- Read the surrounding code and the functions/types it touches
- Check for existing helpers the change should have reused (see the redundancy checklist)
- Note the trust boundary: server-only, Client Component, public route, admin route, Inngest handler, or MCP endpoint?

### 3. Review against the four priorities

For thoroughness, **spawn one review agent per priority** (parallel), each producing findings for its dimension, then a coordinator pass dedupes and ranks them. For small diffs a single inline pass is fine — scale to the size of the change.

#### Priority 1 — Security  ⚠️ highest

**There is no RLS.** Supabase is the database host only; the security boundary is **application code**. Every query must scope itself — there is no database policy to fall back on.

| Check | What to look for |
|---|---|
| **Authorization scoping** | Every server action / route handler that reads or writes user/owner-scoped data filters by the **session identity** (better-auth), never a client-supplied id. No trusting client-supplied ids/amounts/roles. |
| **AuthN / AuthZ** | Role and feature-gate checks enforced **server-side**, not just client-side UX. Admin paths (see `proxy.ts` `ADMIN_ONLY_PATHS`) re-check the role in the handler — the middleware only checks cookie presence. |
| **Soft-delete filter** | Scoped queries filter `deleted_at IS NULL` (universal soft-delete). Note tables that use a `status`/lifecycle instead — applying `deleted_at` there silently returns zero rows. Never hard-delete data that should be soft-deleted. |
| **Input validation** | All API/action inputs validated (zod) before use. No unparameterized raw SQL, no unsanitized HTML (`sanitize-html` where rendering user content). |
| **Secrets & env** | No hardcoded keys/tokens. Server-only secrets never exposed via `NEXT_PUBLIC_` or returned to the client. Confirm before any code reads/writes a secret. |
| **Money / invoice integrity** | Invoice/line-item amounts computed **server-side** with `Decimal` (decimal.js / Prisma Decimal), never trusted from the client. Results crossing to the client go through `serializeDecimals()`/`serializeDecimalsList()` (`lib/serialize-decimals.ts`). |
| **File storage (R2/S3)** | File access is scoped and authenticated; a raw presigned URL is never exposed to an untrusted context beyond its intended, time-bounded use. |
| **Public / token endpoints** | Signup, public forms, campaign unsubscribe, API-token and MCP (`mcp-handler`) endpoints validate hard and are rate-limited (`@upstash/ratelimit`) where abuse is possible. |
| **Inngest handlers** | Event payloads are validated, not trusted; handlers are idempotent (events can redeliver). |
| **Audit & leakage** | Significant state changes write an audit-log entry (`crm_audit_log`). Error responses don't leak stack traces, SQL, or internal ids. |

#### Priority 2 — Performance

| Check | What to look for |
|---|---|
| **N+1 queries** | No per-row DB calls in a loop — use a Prisma relation `include`/`select`, `in`, or a single batched query. |
| **Index coverage** | New columns used in `WHERE`/`ORDER BY`/joins have supporting indexes (flag the migration if missing). |
| **Over-fetching** | `select`/`include` names the fields actually needed, not the whole model, on hot paths. List endpoints are paginated/bounded. |
| **RSC data flow** | Independent fetches run in parallel (no serial await → waterfalls). Server Components are the default; `'use client'` only where interactivity requires it. |
| **Caching** | Upstash reads/TTLs are correct and keys are scoped; Next.js cache/`revalidate` directives are intentional; no redundant re-computation per request. |
| **Bundle / assets** | No heavy client imports that could be server-side. Don't import a validated env module into client code. Images (`sharp`/`next/image`) and fonts optimized. |

#### Priority 3 — Efficiency & maintainability (eliminate redundancy)

| Check | What to look for |
|---|---|
| **Reuse existing helpers** | Reuse `serializeDecimals()`, existing auth/role helpers, and shared `lib/` utilities — don't reimplement what exists. |
| **DRY** | Duplicated logic/queries/constants extracted rather than copy-pasted. |
| **Dead / unused code** | No unused imports, vars, params, or unreachable branches. No leftover debug logging. |
| **Typing** | Leverages Prisma-generated types; no `any` or unsafe casts (upstream is in an active `any` cleanup); discriminated unions where they clarify intent. |
| **Cohesion & naming** | Single-responsibility, reasonably sized; names match the surrounding idiom; magic numbers/strings named. |
| **Consistency** | New code matches the comment density, structure, and conventions of the files around it. |

#### Priority 4 — Best practices for the stack

| Area | What to look for |
|---|---|
| **Next.js App Router** | Server Components by default; route handlers idiomatic; `error.tsx`/`loading.tsx` boundaries where appropriate; no `runtime = 'edge'` (Vercel Fluid Compute / Node.js is the default). |
| **Prisma** | Right query shape; **migrations authored as files** (`prisma migrate dev`), never `prisma db push`; schema change ships with a migration (Guardrails enforces this); `Decimal` serialized across the server→client boundary. |
| **better-auth** | Session read server-side; role/admin checks in the handler; no auth decision made only in the client or only in `proxy.ts`. |
| **React** | Rules of hooks respected; stable `key`s; no derived state recomputed in effects; basic a11y. |
| **TypeScript** | `strict`-compatible; no swallowed errors; exhaustive handling where it matters. |
| **Testing** | New/changed behavior has coverage; DB-backed logic has a suite under `__tests__/` (runs in CI's `integration` job); E2E follows `docs/testing/e2e-patterns.md`; no flakiness traps. |
| **Project conventions** | Adheres to `CLAUDE.md`: application code is the authz boundary, soft-delete not hard-delete, feature gates enforced server-side, audit entries on state changes. |

### 4. Produce the findings report

Rank findings by **severity first, then by priority category**:

- **🔴 Critical** — data leak, auth bypass, secret exposure, data loss, money/invoice integrity. Must fix before shipping.
- **🟠 High** — real bug or significant perf problem under normal load; missing validation on a trust boundary.
- **🟡 Medium** — maintainability/redundancy issues, missing tests, suboptimal-but-working patterns.
- **⚪ Low** — style, minor nits, optional polish.

For each finding: **Severity + category**, **Location** (`file:line`), **What**, **Why it matters** (concrete risk/cost), **Suggested fix**.

End with a one-line **verdict**: `Ship` / `Ship after fixing 🔴/🟠` / `Needs rework`, plus a count by severity.

Report honestly: if the diff is clean, say so. Don't pad with Low findings; don't soften a Critical.

### 5. Offer to fix — don't auto-apply

After the report, ask: **"Want me to fix any of these? (e.g. 'all 🔴/🟠', 'just the security ones', a specific item, or none)"**

Apply only what the user selects, scoped strictly to the chosen findings. After fixing, re-verify the affected checks (and run `pnpm lint` + `pnpm exec tsc --noEmit` if code changed).

## Checklist

- [ ] Scope determined and stated
- [ ] Each changed file understood in context, not judged in isolation
- [ ] Security reviewed first (application-authz, not RLS)
- [ ] Performance reviewed
- [ ] Efficiency reviewed — reuse of helpers, DRY, dead code, typing, naming
- [ ] Best practices reviewed
- [ ] Findings ranked by severity then priority, each with location + why + fix
- [ ] One-line verdict with severity counts
- [ ] Fixes offered, not auto-applied; only selected items changed
