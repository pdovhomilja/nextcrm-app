# ISR, Caching & Render Modes (Next App Router)

> **Read before** adding a cache/Redis call to a page, marking a route
> `force-dynamic` / `force-static`, or debugging a 500 on an ISR route or an
> intermittent `econnrefused` burst. Next's App Router decides *statically* whether a
> route can be prerendered; one uncacheable call or one wrong directive flips that —
> and the failure is usually a 500 under load, not a local error.

---

## 1. Keep uncacheable I/O OUT of the render path

Every `@upstash/redis` call is a `no-store` `fetch`. Next treats an uncacheable
fetch **during static/ISR render** as a dynamic signal and throws
`DynamicServerError` — which 500s an on-demand-ISR route under load. The same applies
to any `no-store` fetch or uncached external call made while a page renders.

**Pattern — writes/polling in a cron, reads cached in the page:**

- A `CRON_SECRET`-guarded route (`/api/cron/*`, run by Vercel Cron) does the
  uncacheable work (poll upstream, write Redis) and calls `revalidateTag(...)`.
- The **page reads only**, wrapped in `unstable_cache` so the read is contained in a
  cache scope and never signals dynamic.

**Never swallow framework control-flow errors.** `DynamicServerError`, `redirect()`,
and `notFound()` all work by throwing. A `try/catch` around render logic that
catches everything will swallow them and produce a broken page. Re-throw them:

```ts
import { unstable_rethrow } from 'next/navigation'
try {
  /* … */
} catch (err) {
  unstable_rethrow(err) // lets redirect/notFound/DynamicServerError propagate
  // …handle only your OWN errors below
}
```

## 2. The `force-dynamic` litmus test (and why a needless one is a canary)

**Only mark a route `force-dynamic` if its render reads `cookies()`, `headers()`, or
`searchParams`.** These do NOT force dynamic:

- an interactive Client Component island,
- an `unstable_cache` read,
- `draftMode().isEnabled`.

**Why it matters beyond correctness:** a needlessly-dynamic route opens a live DB
connection on *every* request — roughly **1000× the DB touches** of an ISR page. So
it becomes the disproportionate **canary** for otherwise-harmless intermittent pooler
blips (`econnrefused`). When you see a burst of connection errors:

- **Group failures by `lastSeen`, not by route.** A spike across several unrelated
  routes within one minute is **one pooler event**, not N separate bugs.
- For routes that must stay dynamic, wrap idempotent reads in a **transient-only
  retry** that walks the `.cause` chain (an ORM like Prisma wraps the underlying
  refusal in a `PrismaClientKnownRequestError`/`PrismaClientInitializationError`, so
  the retryable code isn't on the top-level error).

**Verify a route's mode in a real `next build` route table (`○` static vs `ƒ`
dynamic), never in `next dev`** — dev doesn't prerender, so it can't show you the
mode the deploy will use.

**`force-static` is the *wrong* directive for CMS/DB-backed pages** — it prerenders
them empty and 404s detail pages on Vercel. Let them be ISR (default + revalidate),
not forced static.

## 3. `revalidatePath`/`revalidateTag` throw outside a request context

Called from a migration, a seed script, or a CLI/local-API write, `revalidatePath`
throws `"static generation store missing"` — there's no request scope. Wrap it:

```ts
export async function safeRevalidate(fn: () => void) {
  try { fn() } catch (err) {
    if (err instanceof Error && /static generation store/i.test(err.message)) return
    throw err // only swallow the missing-store invariant, nothing else
  }
}
```

---

## Quick reference

- Uncacheable I/O (Redis, `no-store` fetch) → **out of render**; do it in a cron,
  read via `unstable_cache`, invalidate via `revalidateTag`.
- `unstable_rethrow` before handling your own errors in any render `try/catch`.
- `force-dynamic` only for `cookies()`/`headers()`/`searchParams`. Verify with
  `next build`, not `next dev`.
- Connection-error bursts: group by `lastSeen` (one event), not by route (N bugs).
- `safeRevalidate` when revalidating from a non-request context.
