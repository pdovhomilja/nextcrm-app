# Supabase on Vercel (connections, pooling, serverless)

> **Read before** setting `DATABASE_URL`, tuning a connection pool, or debugging a
> "Failed query" / `ENETUNREACH` / `EMAXCONNSESSION` incident. This is about the
> *connection shape* between Vercel's serverless runtime (and CI) and hosted
> Supabase Postgres — load-bearing and easy to get wrong. In this fork Supabase is
> the **database host only** (Prisma + `@prisma/adapter-pg` own the connection; no
> `supabase-js`, no Supabase Auth), so everything here is about the Postgres
> connection string Prisma reads from `DATABASE_URL`. Pairs with
> `docs/guides/process/CI_AND_ENVIRONMENT_DESIGN.md` §9.

---

## 1. Always connect through the IPv4 shared pooler — never the direct host

`db.<ref>.supabase.co` (the direct/dedicated host) is **IPv6-only**; IPv4 there is a
paid add-on. **Vercel builds + runtime and GitHub runners are IPv4-only.** So every
server-side connection must go through the **shared pooler**:

```
postgresql://postgres.<ref>:<pw>@aws-<n>-<region>.pooler.supabase.com:5432/postgres
```

- **Tell for the wrong (direct) string:** host `db.<ref>.supabase.co` + a plain
  `postgres` username (the pooler user is `postgres.<ref>`).
- **The failure is loud and misleading.** When Supabase drops the direct IPv4
  A-record, *every* Vercel build fails at once at prerender with
  `ENETUNREACH <ipv6-addr>` — so a docs-only commit that happened to trigger the
  build looks like the cause. It isn't; the connection string is.
- The **shared** pooler serves both modes and is IPv4 — you do **not** need the $4/mo
  dedicated-IPv4 add-on to build/run on Vercel.

## 2. Session pooler (5432) vs transaction pooler (6543)

The same shared pooler host offers two ports:

| Port | Mode | Use for |
|---|---|---|
| **5432** | Session | `prisma migrate deploy`, DDL, prepared statements, long-lived sessions, the CI build |
| **6543** | Transaction | Serverless app runtime at scale — multiplexes aggressively |

Getting this wrong fails migrations in confusing ways (transaction mode breaks
prepared statements/DDL, and Prisma's migration engine relies on both). Rule of
thumb: **`prisma migrate deploy` and the CI build → 5432; serverless request
handlers at launch → 6543.** The migration workflows
(`migrate-qa.yml` / `migrate-production.yml`) always target the session pooler.

## 3. Serverless pool exhaustion — cap `DB_POOL_MAX`, and mind geography

Each Vercel function **instance** opens its own `pg` pool (the one Prisma's
`@prisma/adapter-pg` wraps). Against a session-mode
pooler, a cold-start fan-out or a prerender pass can exhaust the small server-side
`pool_size` **with zero real users** (`EMAXCONNSESSION`), cascading into "Failed
query" across every route at one instant.

- **Cap `DB_POOL_MAX` on every env scope** (DEV, QA, PRODUCTION) — a prod-only fix
  leaves QA exposed. The kit ships `DB_POOL_MAX=3`. **Never `1`** — a 1-connection
  pool deadlocks concurrent-query prerenders (pages issue multiple queries per
  render).
- **For launch traffic, move request handlers to the transaction pooler (6543).**
- **Co-locate the DB region with the Vercel region.** Connection *mode* never fixes
  geography: one project saw avg query time drop **~900 ms → ~33 ms** purely from
  putting the DB in the same region as the compute. A cross-region hop dwarfs any
  pooling tweak.

## 4. Any long-lived `pg.Pool` MUST have a Pool-level `error` handler

Supabase's Supavisor pooler reaps idle server connections as routine housekeeping;
`pg` surfaces that as an `'error'` event **on the Pool object**. With no Pool-level
listener, Node escalates it to an **uncaught exception that kills the warm function
instance** (`57P01 terminating connection due to administrator command`).

This fork drives Prisma through the `pg` driver adapter, so the `pg.Pool` is
yours to construct — attach the handler to the same Pool you hand to the adapter:

```ts
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX ?? 3),
})
pool.on('error', (err) => {
  // Supavisor idle-reap etc. — log and swallow; the pool re-establishes on next use.
  console.error('[pg pool] idle client error (non-fatal):', err.message)
})
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })
```

**Don't assume Prisma or the adapter did this** — the driver adapter wraps the Pool
you pass but does not add a Pool-level `error` listener for you (and the default
Prisma engine, without a driver adapter, hides the Pool entirely). Verify the Pool
itself has one.

---

## Quick reference

- `DATABASE_URL` → shared pooler host, `postgres.<ref>` user, port **5432** for
  `prisma migrate deploy`/build.
- `DB_POOL_MAX` → set on **all** scopes; never `1`.
- DB region == Vercel region.
- Every `pg.Pool` (including the one behind `@prisma/adapter-pg`) → a
  `pool.on('error', …)` handler.
