# E2E Test Patterns — Playwright + Next.js App Router (starter)

<!-- Distilled stack traps for this fork
     (Playwright + Next.js App Router + Prisma/PostgreSQL + better-auth + Inngest
     + Vercel). The RSC/navigation/interception patterns are framework-level and
     apply verbatim; the DB and auth patterns are shown against Prisma + better-auth.
     Replace placeholder routes/paths (`/dashboard`, `/api/...`) with your own. This
     app is single-tenant — no per-tenant host/subdomain patterns. Grow this doc as
     the project hits new traps. -->

Almost every flaky-looking failure below traces to **one root cause**: Next.js
App Router streams page responses as RSC (React Server Component) payloads, and
Playwright's trace recorder tries to buffer every response body. An open stream
breaks that capture, surfacing as:

```
Error: apiRequestContext._wrapApiCall: file data stream has unexpected number of bytes
Error: End of central directory record signature not found. Either not a zip file, or file is truncated.
```

Read the RSC-streaming section first; the rest are its consequences.

## Contents

- RSC streaming — the core pitfall
- Navigation patterns
- Seeding client storage before load
- Form fills and hydration races
- Route interception (`page.route`)
- Session and auth setup
- DB helper patterns
- Data-integrity traps
- Deployed QA environment
- Authz / security assertions

---

## RSC streaming — the core pitfall

A page emits a **streaming** RSC response when it has a Suspense boundary.
Suspense is triggered by:

| Pattern | Effect |
|---|---|
| `useSearchParams()` in a `'use client'` component | Requires a `<Suspense>` wrapper → streams |
| `use(params)` in a `'use client'` page | React suspends on the Promise → streams |
| Explicit `<Suspense>` in the tree | Streams |

The fix in every case is to remove the Suspense trigger from app code so the page
sends a complete, non-streaming RSC response.

### `useSearchParams()` → read `window.location` synchronously

```typescript
// Wrong — forces a <Suspense> wrapper, making Next.js stream the response:
'use client'
import { useSearchParams } from 'next/navigation'
const next = useSearchParams().get('next')

// Correct — synchronous read, no Suspense needed:
function getNext(): string {
  if (typeof window === 'undefined') return '/dashboard'
  const raw = new URLSearchParams(window.location.search).get('next') ?? ''
  return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/dashboard'
}
// Call getNext() at navigation time; remove any <Suspense> wrapper.
```

### `use(params)` → `useParams()`

In Next.js 15+, page `params` are Promises. `use(params)` in a Client Component
suspends → streaming. `useParams()` reads path params synchronously from router
context — no Suspense.

```typescript
// Wrong — use(params) suspends → streaming RSC:
'use client'
import { use } from 'react'
export default function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
}

// Correct — useParams() is synchronous:
'use client'
import { useParams } from 'next/navigation'
export default function Page() {
  const { token } = useParams<{ token: string }>()
}
```

---

## Navigation patterns

### `{ waitUntil: 'commit' }` vs `{ waitUntil: 'load' }` — choose by page type

- **Dynamic pages with Suspense streaming** (use `loading.tsx` or explicit
  `<Suspense>`): the response stream stays open while suspended fetches resolve;
  the `load` event never fires normally. Use **`'commit'`**.
- **RSC pages without Suspense** (fetch all data synchronously before rendering —
  no `loading.tsx`, no `<Suspense>`): payload completes quickly, `load` fires.
  `'load'` is safe and guarantees hydration.
- **Static pages** (`○` in build output, e.g. `/login`): complete HTML
  immediately, `load` fires. Use **`'load'`** — required before a form fill,
  because `'commit'` resolves before React hydrates and attaches `onChange`.

```typescript
await page.goto('/dashboard', { waitUntil: 'commit' })          // dynamic/streaming
await page.goto('/login', { waitUntil: 'load' })                // static page with a form
await page.waitForURL('**/dashboard**', { waitUntil: 'commit', timeout: 15_000 })
```

Never use `'load'` on a streaming page — it hangs waiting for a body that never
finishes.

### `.count()` does not auto-retry — wait for a rendered element before branching on it

Unlike `expect(locator)…` web-first assertions, `locator.count()` reads **once,
now**. Called right after `{ waitUntil: 'commit' }` (headers arrived, body still
streaming), it returns `0` — and code that branches on that count silently takes the
wrong path. Before any count-based branch, wait for a real rendered element:

```typescript
// Wrong — count is 0 mid-stream; the else-branch runs by mistake:
if ((await page.getByRole('row').count()) > 0) { /* … */ }

// Correct — wait for first render, THEN branch:
await expect(page.getByRole('row').first()).toBeVisible()
const rows = await page.getByRole('row').count()
```

### `redirect()` in Server Components causes "navigation interrupted"

`redirect()` from `next/navigation` does not send an HTTP 302 — it embeds a
redirect in the RSC payload (status 200) and the browser fires a second
navigation. With `'load'`, Playwright sees two overlapping navigations and
throws.

```typescript
// Wrong:
await page.goto('/dashboard')                 // "Navigation interrupted"
// Correct:
await page.goto('/dashboard', { waitUntil: 'commit' })
await page.waitForURL(/\/login/, { timeout: 10_000 })
```

### `notFound()` pages return HTTP 200 — assert by content, not status

`notFound()` renders the not-found boundary with a **200**, so
`expect(res.status()).toBe(404)` fails for a *page* even when the gate works.

- **Assert a page is gated by its content** — the real page's own copy is
  *absent*. Do **not** string-match generic "could not be found" text: Next.js
  ships inert not-found markup on every page response (false-positive trap).
- **API routes DO return a real 404** — assert that directly where possible.

```typescript
await page.goto('/gated-page', { waitUntil: 'commit' })
await expect(page.getByRole('heading', { name: /real page heading/i })).toHaveCount(0)

const res = await request.get('/api/v1/gated/config')
expect(res.status()).toBe(404)   // API route: real 404
```

### Circular HTTP redirect — add `.catch(() => {})`

When middleware 307s back to the URL the browser is already on, Playwright throws
"Navigation interrupted" even with `'commit'`. The redirect still succeeds — let
`waitForURL` be the assertion.

```typescript
await page.goto('/admin', { waitUntil: 'commit' }).catch(() => {})
await page.waitForURL(/\/login/, { timeout: 10_000 })
```

### Abort RSC streams before `finally`-block cleanup

`waitForURL` with `'commit'` returns when headers arrive, but the body stream
stays open and trace capture is still reading it. If `finally` runs async DB
cleanup, the capture fails. Navigate to `about:blank` as the **first** line of
every `finally`:

```typescript
try {
  await page.goto(`/invite/${token}`, { waitUntil: 'commit' })
  await page.waitForURL('**/dashboard**', { waitUntil: 'commit', timeout: 10_000 })
} finally {
  await page.goto('about:blank', { waitUntil: 'commit' }).catch(() => {})  // close the stream first
  await cleanupUser(email)
}
```

---

## Seeding client storage before load (`addInitScript`)

To start a page at a non-default state stored in `sessionStorage`/`localStorage`,
`addInitScript` alone is **not** sufficient for SSR client components: a
`useState(readStored)` lazy initializer runs on the server (storage unavailable →
default), and hydration reuses that server state without re-calling the
initializer.

**Fix — two parts.** In the component, add a one-time `useEffect` that reads
storage after mount and corrects state (wrap `setState` in `setTimeout(0)` to
satisfy `react-hooks/set-state-in-effect`):

```typescript
useEffect(() => {
  const id = setTimeout(() => {
    const stored = readStored()
    if (stored !== DEFAULT) setValue(stored)
  }, 0)
  return () => clearTimeout(id)
}, [])
```

In the test, seed then wait for a post-effect signal (e.g. loading cleared):

```typescript
await page.addInitScript(() => sessionStorage.setItem('wizard_step', '2'))
await page.goto('/wizard', { waitUntil: 'load' })
await expect(page.getByText('Loading…')).not.toBeVisible({ timeout: 8_000 })
```

---

## Form fills and hydration races

### Controlled inputs discard fills that land before hydration

`fill()` sets the raw DOM value as soon as the input exists — often before React
hydrates. Hydration then re-renders from initial state (`''`) and **silently
discards the typed value**; the submit sends an empty form. This is a *race*: it
passes on an idle machine and fails under load.

Two things that do **not** fix it (both verified):
- Waiting for a server-rendered link/element to be visible — it's in the SSR HTML
  before React attaches, so it proves nothing about hydration.
- `toHaveValue()` after the fill — reads the DOM; hydration can wipe React state
  *after* the assertion passes and *before* the click.

**Two robust approaches:**

1. For static form pages, navigate with `{ waitUntil: 'load' }` so JS has loaded
   and React has hydrated before the fill.
2. Make the sign-in (or any critical fill) **retryable**, asserting on the
   *outcome* of submit (the browser actually left the page), not on the field
   value. Put this in a `helpers/sign-in.ts` and reuse it everywhere:

```typescript
import { signIn } from '../helpers/sign-in'
await signIn(page, email, password)   // retries the whole attempt until URL changes
```

**Generalise:** for any controlled form, "the value is in the input" is not proof
the framework knows about it. Assert on the submit's outcome; make the fill
retryable.

### A global "did React hydrate?" fallback must key off a signal from the layout

Apps sometimes ship a hydration fallback (e.g. a timer that reveals CSS-gated
content if hydration seems stalled). Whatever signal it waits on — `window.__jsReady`,
a `data-hydrated` attribute — **must be set by every hydrated page, from the root
layout**, not by a feature component only some routes render. If the flag is set by
(say) a dashboard widget, a perfectly-hydrated page that lacks that widget trips the
fallback — and an E2E hydration wait keyed on the same signal then hangs or misfires
on exactly the pages that were fine. Set it once in the layout's client boundary;
assert on it everywhere.

### Asserting a third-party widget actually rendered

Asserting a widget *container* exists proves nothing — the bug is a container that
renders **empty** (e.g. a captcha mounted after its script's one-time DOM scan).
The challenge is often not a directly-queryable iframe, and it renders async — so
assert on **child count** with `expect.poll`:

```typescript
async function childCount(page, selector) {
  return page.evaluate(sel => document.querySelector(sel)?.childElementCount ?? -1, selector)
}
await expect.poll(() => childCount(page, '[data-testid="widget"]'), { timeout: 20_000 })
  .toBeGreaterThan(0)
```

Give the container a stable `data-testid`; prefer an explicit render API over
implicit auto-scan for widgets not in the initial render.

---

## Route interception (`page.route`)

### Register `page.route()` AFTER goto AND after hydration, never before

`page.route()` activates CDP `Fetch.enable`, which intercepts **all** requests —
including the streaming RSC navigation response, which then fails to buffer. And
even after `goto` resolves with `'commit'`, client components may not be hydrated
(`toBeVisible()` passes on SSR elements before `onClick` attaches).

```typescript
// Wrong — intercepts the streaming navigation, or clicks before onClick attaches.

// Correct A — no pre-click interaction: drop 'commit', let default 'load' hydrate:
await page.goto('/billing')                    // resolves at 'load' — hydrated
await page.route('/api/v1/checkout', ..., { times: 1 })
await page.getByRole('button', { name: 'Subscribe' }).click()

// Correct B — when 'commit' is needed for consistency, follow with load state:
await page.goto('/billing', { waitUntil: 'commit' })
await page.waitForLoadState('load')            // ensures hydration
await page.route('/api/v1/portal', ..., { times: 1 })
```

Do not use a client-side validation error as a hydration proof — it's circular
(the error only appears once React's `onChange` has fired).

### Use `{ times: 1 }` on every route that fires exactly once

Without it, the route stays registered until context teardown, and `Fetch.disable`
races the trace writer → "file data stream has unexpected number of bytes".

```typescript
await page.route('**/api/v1/check-slug**', async route => {
  await route.fulfill({ status: 200, json: { available: true } })
}, { times: 1 })
```

### When a mocked response triggers a redirect, also intercept the redirect target

Chrome runs the fulfill callback (including `window.location.href = …`) and
dispatches the follow-on GET **before** it acks CDP, so `Fetch.disable` arrives
too late and CDP captures the redirect target's streaming response. Fix: add a
`{ times: 1 }` route for the target returning minimal complete HTML.

```typescript
await page.route('/api/v1/signup', async route => {
  await route.fulfill({ status: 201, json: { redirectUrl: '/login' } })
}, { times: 1 })
await page.route('**/login**', async route => {
  await route.fulfill({ status: 200, contentType: 'text/html',
    body: '<html><body><h1>Sign in</h1></body></html>' })
}, { times: 1 })
await submit.click()
await page.waitForURL('**/login**', { waitUntil: 'load' })
```

### Use `json:` shorthand in `route.fulfill()`

```typescript
await route.fulfill({ status: 200, json: { url: '...' } })                  // correct
// Wrong — JSON.stringify + manual contentType can produce a content-length mismatch.
```

### Never stub the field your change produces

The most dangerous interception supplies the exact value under test — the spec
then only asserts the client renders what it was handed, and stays green with the
entire server change reverted.

```typescript
// ✗ Proves nothing about the server:
await page.route('**/api/v1/config**', async route => {
  const body = await (await route.fetch()).json()
  await route.fulfill({ json: { ...body, count: 12 } })
})
await expect(page.getByText('12')).toBeVisible()

// ✓ Read the real value with the SAME predicate the route uses; stub nothing:
const expected = await countThings(SLUG)
expect(expected, 'fixture precondition').toBeGreaterThan(0)  // guard the premise
await expect(page.getByTestId('count-value')).toHaveText(String(expected))
```

Rule of thumb: *if I revert the change this spec guards, does it fail?* If you
can't answer from reading it, apply the revert and find out.

### Assert on the element, not its container

`toHaveText`/`toHaveTextContent` against a wrapper matches text from **any**
descendant — a sibling note or label can satisfy the assertion. Give the value
its own `data-testid` and assert on it exactly:

```typescript
expect(screen.getByTestId('count-value').textContent?.trim()).toBe('—')
```

### Rate-limited endpoints must skip the limit outside production

E2E and QA hammer the same endpoints from one IP; a 5/hr window causes
intermittent 429s that look like failures. Gate rate limiting on
`VERCEL_ENV === 'production'` so QA/local/CI skip it entirely — the
environment gate is the correct abstraction, not a bigger limit or a bypass
header.

```typescript
export async function checkRateLimit(key, limit, windowSeconds = 3600) {
  if (process.env.VERCEL_ENV !== 'production') return true
  // ... Redis incr/expire ...
}
```

### Prefer `request.*` over `page.goto()` for "session still works" assertions

```typescript
// Better — tests the API auth contract directly, avoids RSC streaming:
const res = await request.get('/api/v1/some-protected-route')
expect(res.status()).toBe(200)
```

---

## Session and auth setup

### A shared-session sign-out invalidates the shared storageState

better-auth's sign-out revokes the `session` row on the server. If any test drives
the real sign-out route while signed in as the shared setup user, the shared
`playwright/.auth/user.json` storageState becomes invalid for the rest of the
Playwright process — every later test that loads it gets redirected to sign-in. This
only surfaces when multiple specs run in sequence (full suite / CI), never in
isolation.

**Fix: logout tests must use a throw-away user**, signed in within the test body
with empty storageState, cleaned up after — the shared session is never touched.

```typescript
test.use({ storageState: { cookies: [], origins: [] } })
test('logout works', async ({ page }) => {
  await createTestUser(email)          // seed a user + drive the OTP sign-in flow
  try {
    await signInWithOtp(page, email)   // retryable helper (see auth.setup.ts flow)
    // ... logout assertions ...
  } finally {
    await deleteTestUser(email)        // delete better-auth children then the user
  }
})
```

TODO(rade): no shared throw-away-user / sign-in helpers exist under `tests/` yet —
factor them out of `tests/auth.setup.ts`'s OTP-capture flow when the first logout
spec lands, and confirm the FK cleanup order (see "Auth-user cleanup FK trap").

### `request.newContext()` inherits the configured session — pass `storageState` explicitly

If `playwright.config.ts` sets a default `storageState`, `request.newContext()`
picks it up too — an "unauthenticated" test is silently authenticated.

```typescript
const ctx = await pwRequest.newContext({
  baseURL: BASE_URL,
  storageState: { cookies: [], origins: [] },   // explicitly empty
})
```

This failure is quiet: an authenticated request for a non-existent row returns
**404**, reading exactly like the auth refusal you meant to test. Two rules:
1. Pass `storageState` explicitly whenever the point is that there's no session.
2. **Assert the exact status** (`toBe(401)`), never "not 200". Use a *real,
   resolvable* id so a 404 is unambiguous.

### Never use `browser.newContext()` + `newPage()` for unauthenticated tests

Those pages route navigations through Playwright's tracing wrapper, triggering the
"file data stream" error on RSC pages even without any `page.route()`. Instead:

```typescript
test.use({ storageState: { cookies: [], origins: [] } })   // the `page` fixture starts empty
```

### A nested `test.use({ storageState })` override does NOT reliably re-init the `request` fixture

An override re-scopes `page`/`context` but not always the API `request` fixture —
it can keep the file-level session and silently pass the wrong one (200 where you
asserted 401). For authz-denial assertions, either use a raw `fetch` with no
cookies, or spin up a dedicated context via
`playwright.request.newContext({ storageState })` inside the test — don't rely on
the nested `test.use`.

### `test.describe.serial` vs plain `test.describe`

- `.serial`: sequential AND shared browser context. Use when a test depends on
  state from an earlier one. Tradeoff: accumulated auth session state (multiple
  in-context sign-ins) can hang a later call.
- Plain: each test gets a fresh context. Use when tests are independent.

---

## DB helper patterns

### Reach the DB over TCP (Prisma / `pg`), not a fetch-based client

Playwright wraps global `fetch` with CDP instrumentation, so any client built on
`fetch` becomes part of the CDP chain and fails unexpectedly. This fork's test
helpers reach Postgres through Prisma or a `pg` `Pool` (see `tests/auth.setup.ts`),
which use a TCP socket and are unaffected. If you add a helper that calls an HTTP
API from inside a spec, route it through `undici`'s `fetch` rather than the
CDP-wrapped global:

```typescript
import { fetch } from 'undici'
await fetch(url, { /* ... */ })   // not the CDP-wrapped global fetch
```

### Poll DB state after an async job, before navigating

An Inngest job (or a webhook handler) returns as soon as it is accepted, but the
RSC page renders the moment `goto` resolves — possibly before the write lands. Poll
the DB first:

```typescript
await triggerJob(BASE_URL, event)
await expect(async () => {
  expect((await prisma.invoice.findUnique({ where: { id } }))?.status).toBe('active')
}).toPass({ timeout: 10_000 })
await page.goto('/invoices', { waitUntil: 'commit' })
```

### Tear down external-service state, not just DB rows

Deleting a DB row removes app data but not objects created in an external service
(an R2/S3 upload, a Resend contact). Read the external id/key **before** deleting the
row, then delete the external object (swallow errors — it may already be gone).

```typescript
const keys = rows.map(r => r.storageKey).filter(Boolean)
await prisma.document.deleteMany({ where: { id: { in: docIds } } })
for (const key of keys) await deleteObject(key).catch(() => {})
```

### Reset helpers must set AND clear every asserted field — with no status guard

A `beforeEach` reset RPC/helper must (a) populate every field a test asserts (not
just the obvious one), and (b) **clear** every column other states might set, and
(c) reset from *any* prior state. A `WHERE ... AND cancelled_at IS NULL` guard
means a prior test that cancelled the record makes the reset silently a no-op
(`0 rows affected`, returns success), and every later test starts corrupt. When a
new column is added that a test can set, add its clear to the reset.

### Delete in FK dependency order when children lack `ON DELETE CASCADE`

Deleting a parent row while child tables still reference it (FK without cascade)
raises a foreign-key violation (Prisma throws `P2003`) — or, in raw SQL, fails and
leaves rows so later tests see stale data. Delete children first:

```typescript
await prisma.childA.deleteMany({ where: { parentId: pid } })
await prisma.childB.deleteMany({ where: { parentId: pid } })
await prisma.parent.delete({ where: { id: pid } })
```

Prefer `onDelete: Cascade` in `schema.prisma` where the child rows should always go
with the parent, so cleanup can't drift out of order.

### Re-seed shared fixtures after clearing them

If one spec clears all rows of a shared fixture in `afterAll`, later specs that
depend on it fail silently (they find nothing). Make cleanup re-seed, and make the
seed idempotent (skip if it already exists). Consider self-healing lookups that
re-insert a missing fixture rather than throwing.

### Fixture cleanup belongs in a hook, not a `finally`

A `try/finally` in the test body runs on assertion failure but **not** on
Playwright timeout or a crashed worker — leaked rows then shift the baseline for
every later test. Use `test.afterEach`, null the id before awaiting, and make the
delete helper **throw** (a silently-failed cleanup is indistinguishable from none):

```typescript
let fixtureId: string | null = null
test.afterEach(async () => {
  if (fixtureId) { const id = fixtureId; fixtureId = null; await deleteById(id) }
})
```

### Derive expected counts from the DB, never hardcode accumulated state

Measure a baseline in the test, then assert the *relationship* — and assert the
baseline is discriminating:

```typescript
const before = await countThings(SLUG)
// ... insert 2 ...
expect(body.total).toBe(before + body.inserted)
expect(before).toBeGreaterThan(0)            // load-bearing: else the case degenerates
expect(body.total).not.toBe(body.inserted)
```

### Assert the resolved value, not just row presence

When a feature's whole point is to *transform* stored data (resolve an id → name,
diff before/after, format a timestamp), assert the transformed output explicitly —
a presence-only assertion stays green with the transform broken and a fallback
rendered.

### Immutable / append-only tables can't use insert-then-clean fixtures

If a table has an immutability trigger that raises on UPDATE/DELETE **even for the
app's own DB user** (e.g. the CRM audit log), you cannot insert a fixture
row and delete it after — the delete throws and the row is stranded forever,
polluting later runs. Instead: **drive a real action that writes the row, assert,
then restore** the underlying state. Cover any variant you can't produce naturally
(e.g. an impersonation flag) with a unit test, and scope negative assertions to
the row the test itself created — never page-wide.

### Establish shared-fixture preconditions, don't assert them

A test that *asserts* a precondition on shared state is order-dependent; one that
*establishes* it is not. If a precondition needs a key/row to be absent, strip it
in `beforeEach` via Prisma / the test DB client (turning the in-test check into a
guard that the strip worked) rather than hoping execution order leaves it absent.

---

## Data-integrity traps

### Know which models are soft-deletable (`deletedAt`) vs hard-deleted

Filtering `where: { deletedAt: null }` on a Prisma model that has no `deletedAt`
field is a Prisma validation error at call time (louder than a silent zero-row read),
but the deeper trap is the same: some entities are soft-deleted (`deletedAt`) and
some are hard-deleted, and a query that assumes the wrong one silently reads the
wrong set. TODO(rade): list which models use soft-delete vs hard-delete (see the
soft-delete migration under `docs/`).

### `findFirst` vs `findUnique` on a partially-unique column

On a column made unique only among live rows (a partial unique index
`WHERE deleted_at IS NULL`), soft-deleted duplicates accumulate across runs.
`findUnique` requires a truly unique constraint and won't accept the filtered set;
`findFirst` returns *a* row silently. Code that treats a `null` as "not found" then
skips its dedupe check and hits the unique index on INSERT (a 500 instead of a 409).
Add the filter that guarantees ≤1 live row:

```typescript
const existing = await prisma.user.findFirst({
  where: { email, deletedAt: null },   // ← so at most one live row matches
  select: { id: true },
})
```

### Auth-user cleanup FK trap (better-auth)

better-auth stores accounts in the `user` table with related `account`, `session`,
and `verification` rows keyed off it. Deleting a `user` while a child row still
references it raises an FK violation (or strands the children if the FK is missing),
and a leftover user makes the next sign-up/seed for that email fail as already
registered. Delete the children **first**, then the `user` — and also clear the
captured-OTP `verification` rows (identifier `test-otp-<email>`) the way
`tests/auth.setup.ts` does before re-running the flow.

```typescript
await prisma.session.deleteMany({ where: { userId } })
await prisma.account.deleteMany({ where: { userId } })
await prisma.verification.deleteMany({ where: { identifier: `test-otp-${email}` } })
await prisma.user.delete({ where: { id: userId } })
```

TODO(rade): confirm the better-auth relation/cascade shape against
`prisma/schema.prisma` (model + field names, and whether `onDelete: Cascade` is set).

### A "duplicate account" error is provider-specific — assert on the shape you observe

Don't string-match a hardcoded provider message when asserting a duplicate-email /
duplicate-account path — the exact text is better-auth's to choose and can change.
TODO(rade): capture better-auth's actual duplicate-email response (status + body)
from a real run and assert on that, not a guessed substring.

---

## Deployed QA environment (Vercel's Preview scope)

### Deployment Protection blocks all QA requests

Without a bypass header, every QA request redirects to `vercel.com/login` — a
symptom that looks identical to a streaming-RSC failure.

1. Dashboard → Project → Settings → Deployment Protection → Generate Secret.
2. Put `VERCEL_AUTOMATION_BYPASS_SECRET=<secret>` in the env file the QA run loads
   (TODO(rade): the deployed-QA target is not wired yet — see e2e-commands.md).
3. Wire into `playwright.config.ts` `use.extraHTTPHeaders`
   (`x-vercel-protection-bypass`), **and** separately into the `setup` project
   (`tests/auth.setup.ts`) — it drives its own requests and does NOT inherit the
   `use` headers unless you pass them.

### The bypass header must be added to every raw undici fetch

`extraHTTPHeaders` only covers browser-originated requests. Raw undici calls
(webhook/cron helpers) bypass Playwright — a test expecting an app-level 401 can
accidentally pass on Vercel's 401 instead. Spread a `vercelBypassHeaders()` helper
into every such call. (Does NOT apply to direct Postgres calls via Prisma / `pg` —
those don't go through Vercel.)

### Use the branch alias URL, not the deployment-specific URL

`*-git-<hash>-team.vercel.app` goes stale after the next push; the branch alias
`*-git-<branch-slug>-team.vercel.app` always points to the latest deployment.

### Environment-branched code paths diverge between local and CI

Any code that branches on the *presence* of an env credential (e.g.
`hasR2Credentials()`, present in `.env.local`, absent in CI) runs a **different
path** in each environment. A hand-built fixture can pass on one path and fail on
the other. Assert the thing you're actually testing (e.g. that a gate passed), not
a specific end-to-end status, or drive the real end-to-end sequence.

---

## Truncated trace files

"End of central directory record signature not found..." in the trace viewer is a
**secondary symptom**. A test that crashes mid-run writes a truncated trace ZIP.
Fix the underlying failure (usually one of the RSC-streaming patterns above) and
the trace error disappears.

---

## Authz / security assertions

This fork has no RLS/GRANT database tier — authorization is enforced in application
code (server actions under `actions/`, the API routes under `app/api/`, and the MCP
tools). The rules below come from testing that layer; they apply to E2E and to any
Jest authz test. TODO(rade): confirm where the authz suites live under `tests/` /
`__tests__/` and cross-link them here.

### Assert on the result, never on "no error was thrown"

An authorization gate that filters rows out returns an empty result with **no**
error — so `expect(error).toBeNull()` (or a bare "it didn't throw") passes against a
completely broken caller. **Every assertion that touches the DB must name a row
count / an explicit status**, not just the absence of an error.

### Pair every allow with a deny, and every deny with an allow

A cross-scope deny that returns 0 rows is indistinguishable from "the row doesn't
exist." Add a second assertion that the same row **is** visible to the caller that
owns it. Prove a fixture exists (a direct Prisma read) before asserting it's hidden,
so a broken setup reads as "fixture absent", not a security regression.

### Characterisation tests pin broken behaviour — INVERT them to repair, don't delete

Some assertions deliberately encode today's defect so an unfixed problem keeps a
watcher (each says so in a comment). Repairing the defect means **inverting** the
assertion, not removing the test.

### A test that builds its own credential guards nothing

A test that mints its own session/token asserts against a shape its author chose,
not the one better-auth actually emits — so reverting the production fix leaves it
green. Exercise the **real** sign-in / session path (as `tests/auth.setup.ts` does).
For the same reason, don't hardcode UUIDs — a DB reset reissues them and a stale id
degrades into a silent zero-row pass.
