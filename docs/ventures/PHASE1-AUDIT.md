# Phase 1 — Repository audit (2026-10-17)

## ROFYT workspace

**Path:** `C:\Users\euroa\OneDrive\Desktop\VenSai Labs\ROFYT`

| Finding | Detail |
|--------|--------|
| Structure | Only `README.md` — **no application code**, no git repo, no package manager |
| Admin Portal | **Not started** |
| ERP | **Not started** |
| Database / auth | **None** |
| Tests / CI | **None** |

**Conclusion:** Greenfield ROFYT monorepo required. No existing work to preserve inside ROFYT.

## VenSai CRM (`next-crm-app`)

**Production:** https://crm.vensailabs.in  
**Source:** Available in workspace; branch `feat/ventures-rofyt` (PR #23 **open**, not on `main` yet).

| Area | Finding |
|------|---------|
| Stack | Next.js 16 App Router, React 19, Prisma 7 + PostgreSQL, Better Auth, pnpm |
| Ventures UI | Sidebar **Ventures** (admin/manager), master password gate (`VENTURES_MASTER_PASSWORD`), overview, Rofyt stats page, create venture form |
| Data model | Single `VentureApp` table — slug, kind, encrypted env, optional admin email/password hash, `externalUrl` |
| Provisioning | **Not implemented** — no connection test, no seed-to-target API, no audit log, no SSRF-safe outbound client |
| ROFYT coupling | Hardcoded `ROFYT_SLUG`, `BUILTIN_VENTURE_APPS`, `ensureRofytVenture()` |

**Gap vs target architecture:** Needs venture **key/subdomain**, **application targets** (ERP + Admin), **separate deployment/provisioning statuses**, **M2M provisioning credentials**, **operations + audit**, and **target-side APIs** on ROFYT.

## CRM ↔ ROFYT dependency

CRM cannot provision accounts until ROFYT exposes authenticated `/api/health` and `/api/internal/provisioning/admin` (or equivalent) on deployed hosts.

DNS (`rofyt.vensailabs.in`, `admin-rofyt.vensailabs.in`) is **not verified** in this audit — treat as conventions until infra is confirmed.

## Reuse plan

- **Extend** `VentureApp` and add related tables — do not replace CRM core.
- **Scaffold** ROFYT as its own pnpm monorepo (separate DB from CRM).
- **Shared contract** via `packages/provisioning-contract` in ROFYT repo; CRM imports types from duplicated Zod schema or npm workspace link later.

## Next phases (ordered)

1. ROFYT monorepo foundation + provisioning + health endpoints (ERP + Admin apps).
2. CRM migration + venture target UI + SSRF-safe connection test + seed workflow.
3. Integration tests + Vercel env docs (`VENTURE_DOMAIN_SUFFIX`, per-target provisioning secrets).
4. Merge PR #23 baseline, then follow-up PR for provisioning stack.
