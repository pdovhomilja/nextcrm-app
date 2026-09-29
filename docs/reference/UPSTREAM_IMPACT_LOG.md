# Upstream Impact Log

> A per-change record of **exactly which upstream-owned files this fork edits**, so a
> future `bash scripts/sync-upstream.sh` merge can be analyzed and reconciled fast.
> This is the granular companion to `CUSTOMIZATIONS.md` (the high-level manifest) and is
> a **mandatory doc-sync target** per the *Additive-first change standard* in `CLAUDE.md`.

**When to append:** any change that edits a file that exists at `upstream/main:<path>`
(check with `git cat-file -e upstream/main:<path>`). New files carry zero merge risk and
don't need an entry (mention them only as context).

**Per entry, record:** the branch/PR, each upstream file touched, whether the edit is
**insert-only** (a hook) or a **rewrite** of existing upstream lines (the real conflict
surface), where in the file, the risk, and how to re-verify after a merge.

**Reconciliation tip:** after a sync, for each entry run
`git diff <merge-base> upstream/main -- <file>` on the listed files — an empty diff means
upstream didn't touch it and the hook is safe; overlap with a **rewrite** row is where you
resolve by hand. Re-run the entry's named tests to confirm the wiring survived.

---

## feat/target-triage — Target triage gate + MCP field parity  (PR: TBD)

Adds a pre-conversion triage gate on `crm_Targets`. **14 new files** (action,
`lib/crm/triage.ts`, **`lib/mcp/tools/crm-target-triage.ts`** — the triage MCP tools in
their own fork-owned file, `TriagePassDialog`, `TriageControl`, `triage-options`, copied
`data-table-faceted-filter`, tests, docs) — zero merge risk. **10 upstream-owned files**
touched, all **insertion-only** (0 rewrites of upstream logic):

| Upstream file | +/− | Insert-only? | What / where | Risk |
|---|---|---|---|---|
| `prisma/schema.prisma` | +27/0 | **insert** | new `enum crm_Triage_Status` + `enum crm_Pass_Reason` block after `enum crm_AuditLog_Action`; 6 fields appended inside `model crm_Targets`; 2 `@@index` | Low |
| `lib/mcp/tools/crm-targets.ts` | +58/0 | **insert** | `company_website`/`industry`/`city`/`description`/… fields appended to the `crm_create_target` + `crm_update_target` schemas & handler types (CSV parity). No existing tool rewritten; list tool & triage tool live elsewhere. | Low |
| `lib/mcp/tools/index.ts` | +3/0 | **insert** | export + import + spread of `crmTargetTriageTools` (mirrors the `crmEnrichmentTools` registration) | Low |
| `lib/audit-log.ts` | +3/1 | **mixed** | insert: `"target"` added to `AuditEntityType` union. rewrite: removed a redundant `eslint-disable` above the `crm_AuditLog.create` cast (+2-line comment) | Low |
| `app/[locale]/(routes)/campaigns/targets/table-components/columns.tsx` | +22/0 | **insert** | imports + one `triage_status` badge column before the `actions` column | Low |
| `app/[locale]/(routes)/campaigns/targets/table-components/data-table-row-actions.tsx` | +29/0 | **insert** | imports + `onApprove` + `passOpen` state + `Approve`/`Pass…` menu items + `<TriagePassDialog/>` mount | Low–Med |
| `app/[locale]/(routes)/campaigns/targets/table-components/data-table-toolbar.tsx` | +9/0 | **insert** | imports + faceted `Triage` filter block | Low |
| `app/[locale]/(routes)/campaigns/targets/table-data/schema.tsx` | +7/0 | **insert** | triage fields added to `targetSchema` | Low |
| `app/[locale]/(routes)/campaigns/targets/[targetId]/components/BasicView.tsx` | +24/0 | **insert** | imports + `<TriageControl/>` in the header + a `PASSED` detail block | Low–Med |

**Re-verify after any upstream merge:** `__tests__/actions/set-target-triage.test.ts`,
`__tests__/mcp/crm-targets-triage.test.ts`, `tests/e2e/target-triage.spec.ts`.

**Notes:**
- **No upstream logic is rewritten.** The MCP triage handler + `crm_list_targets_by_triage`
  moved to the fork-owned `lib/mcp/tools/crm-target-triage.ts`; `crm-targets.ts` now only
  *appends* fields to the create/update schemas, and `index.ts` only *registers* the new
  tool array. The lone non-insert is a 1-line lint cleanup in `audit-log.ts`.
- The `crm_create_target`/`crm_update_target` field-parity additions are
  **upstream-contributable** — merging them upstream would remove that divergence.

---

## fix/inngest-sharp-load — Defer sharp's native load out of the Inngest serve route  (PR: TBD)

**1 upstream-owned file** touched, **insertion-only** logic (an equivalent import swap, no
upstream logic rewritten):

| Upstream file | +/− | Insert-only? | What / where | Risk |
|---|---|---|---|---|
| `inngest/functions/documents/generate-thumbnail.ts` | +5/−1 | **swap** | remove top-level `import sharp from "sharp"`; add `const sharp = (await import("sharp")).default;` inside the handler before first use (+4-line explanatory comment) | Low |

**Why:** a top-level `import sharp` makes sharp's native libvips binding load when
`app/api/inngest/route.ts` imports this function. On Vercel that native load fails
(`ERR_DLOPEN_FAILED: libvips-cpp.so…`), 500-ing the whole serve route → Inngest sync and
every function break. Lazy-loading defers the native load to actual thumbnail generation,
so the route (and all other functions) import cleanly.

**Re-verify after any upstream merge:**
`git diff <merge-base> upstream/main -- inngest/functions/documents/generate-thumbnail.ts` —
if upstream restored the top-level import, re-apply the lazy import. Confirm `/api/inngest`
returns 200 on a Vercel deploy and the app syncs.

**Note:** upstream-contributable — the lazy import is a strict improvement (native module
loaded only when used) and would remove this divergence if merged upstream.

---

## feat/qa-targets-ux — Company-only targets + targets-list columns  (PR: TBD, bundled with the Inngest fix above)

**4 upstream-owned files** touched — relaxations and insertions, no upstream logic rewritten
except the deliberate column reorder:

| Upstream file | Kind | What / where | Risk |
|---|---|---|---|
| `lib/mcp/tools/crm-targets.ts` | **relax** | `crm_create_target`: `last_name` made `.optional()`; handler now requires last_name **or** company and defaults the non-null column to `""`. `crm_update_target`: dropped `last_name` `min(1)` so it can be blanked to `""`. Nothing else changed. | Low |
| `app/[locale]/(routes)/campaigns/targets/table-components/columns.tsx` | **insert + reorder** | added `industry` and `company_website` (link) columns; reordered to Company·Industry·Website·Status·Triage; `created_on` `enableHiding` flipped to `true`. No column removed. | Low–Med |
| `app/[locale]/(routes)/campaigns/targets/table-components/data-table.tsx` | **insert** | default column visibility (person/date fields hidden) + `localStorage` persistence of the viewer's choices, keyed per-origin so QA and prod remember independently. | Low |
| `app/[locale]/(routes)/campaigns/targets/table-data/schema.tsx` | **insert** | `company_website` + `industry` added to `targetSchema`. | Low |

**Re-verify after any upstream merge:** `__tests__/mcp/crm-targets-triage.test.ts` (company-only
create/update). For the table: `git diff <merge-base> upstream/main -- …/table-components/columns.tsx`
— `columns.tsx` is the one real friction point (full column-array reorder); reconcile by hand if
upstream changed columns.

**Notes:**
- The `last_name`-optional relaxation is **upstream-contributable** — company-only targets are a
  legitimate shape and the UI CSV importer already allows them (`last_name ?? ""`).
- No server/query change was needed for the new columns: `getTargets()` already returns full rows.

---

## fix/prisma-pool-exhaustion — Cap the pg pool + add a Pool-level error handler  (PR: TBD)

**1 upstream-owned file** touched, **insertion-only** logic (no upstream logic rewritten):

| Upstream file | +/− | Insert-only? | What / where | Risk |
|---|---|---|---|---|
| `lib/prisma.ts` | +~16/−1 | **insert** | in `prismaClientSingleton()`: `new Pool({ connectionString })` → `new Pool({ connectionString, max: Number(process.env.DB_POOL_MAX) \|\| 3 })`; add `pool.on("error", …)` before `new PrismaPg(pool)` (+ explanatory comments citing SUPABASE_ON_VERCEL.md §3–4) | Low |

**Why:** upstream builds the pool with no `max`, so `pg` uses its default of **10** per function
instance. Against the hosted **session-mode** pooler (`pool_size 15`), two warm Vercel instances
exhaust it (`EMAXCONNSESSION`), which surfaces as better-auth `FAILED_TO_GET_SESSION` on **every**
page (the QA outage, digest `3914836991`). The fork's `SUPABASE_ON_VERCEL.md` §3–4 already
prescribed this exact config (`DB_POOL_MAX ?? 3` + a Pool-level `error` handler for Supavisor
idle-reaps / `57P01`) but it had never been wired into the code. `|| 3` (not `?? 3`) is used so an
empty-string/invalid env value can't coerce to pg's falsy fallback of 10.

**Re-verify after any upstream merge:**
`git diff <merge-base> upstream/main -- lib/prisma.ts` — if upstream reverted to `new Pool({ connectionString })`
or restructured the singleton, re-apply the `max` cap + `pool.on("error")`. Guard: `lib/__tests__/prisma.test.ts`.

**Note:** **upstream-contributable** — capping the pool and adding a Pool-level error handler are
strict robustness improvements for any serverless/pooled deployment and would remove this divergence
if merged upstream.

---

## feat/target-type — Individual vs Company target type  (PR: TBD)

**15 upstream-owned files** touched (14 source + 1 E2E spec). Everything type-specific lives in the
**fork-owned** `lib/crm/target-type.ts` (taxonomy, required-identity rule, title resolver, labels);
the upstream files only get thin hooks that call it. Also fork-owned/new (no merge risk): the
migration `prisma/migrations/20260928130000_target_type/`, `__tests__/lib/target-type.test.ts`,
`__tests__/actions/{create-target-type,import-targets-type}.test.ts`,
`__tests__/mcp/crm-targets-type.test.ts`, `tests/e2e/target-type.spec.ts`,
`docs/testing/target-type-manual-testing.md`, the design spec + plan.

| Upstream file | Kind | What / where | Risk |
|---|---|---|---|
| `prisma/schema.prisma` | **insert** | `enum crm_Target_Type { INDIVIDUAL COMPANY }`; `type crm_Target_Type @default(COMPANY)` field + `@@index([type])` on `crm_Targets`. | Low |
| `lib/mcp/tools/crm-targets.ts` | **insert + guard replacement** | `type` param on `crm_create_target` / `crm_update_target`; the fork's "last_name **or** company" guard (see `feat/qa-targets-ux` above) is **replaced** by a type-aware guard from `requiredIdentityField(type)` (COMPANY→company, INDIVIDUAL→last_name; create defaults COMPANY). | Med (rewrites the fork's own earlier guard) |
| `actions/crm/targets/create-target.ts` | **insert + guard rewrite** | `type` + the previously-missing form fields added to the arg type; the identity guard becomes type-aware; `type` persisted. | Med |
| `actions/crm/targets/update-target.ts` | **insert** | one `type?` line in the accepted-fields type. | Low |
| `…/campaigns/targets/table-data/schema.tsx` | **insert** | `type` added to `targetSchema`; `first_name` made optional. | Low |
| `…/table-components/columns.tsx` | **insert** | adaptive **Name** column (accessor + filterFn via `resolveTargetTitle`) and **Type** badge column. | Med (same column-array friction point as `feat/qa-targets-ux`) |
| `…/table-components/data-table-toolbar.tsx` | **insert** | **Type** faceted filter; the search box is **repointed** `last_name` → `name` (placeholder now "Filter by name or company ..."). | Low–Med |
| `…/components/NewTargetForm.tsx` | **insert** | Type selector, `isFieldForType` gating around person-only / company-only fields, `superRefine` enforcing the per-type required identity; `company` label via `fieldLabel`. | Med (many small wraps) |
| `…/components/UpdateTargetForm.tsx` | **insert + REWRITE** | same as `NewTargetForm`; plus **rewrite**: `last_name` Zod `.min(1)` → `.optional()` (a company has no last name). | Med |
| `…/[targetId]/components/BasicView.tsx` | **insert + replacement** | title → `resolveTargetTitle` + Type badge; person-only / company-only blocks gated by `isFieldForType`; company block relabelled via `fieldLabel`; Industry/Employees/Description surfaced. | Med |
| `actions/crm/targets/import-targets.ts` | **insert** | optional `type` row value; defaults `COMPANY`. | Low |
| `actions/crm/targets/suggest-mapping.ts` | **insert** | `type` added to **its own hardcoded** target-field array (it does not read `target-fields.ts`). | Low |
| `lib/spreadsheet/target-fields.ts` | **insert** | `type` field added to the importable set — **side effect:** CSV/XLSX **export** now also emits a Type column. | Low |
| `…/campaigns/targets/[targetId]/page.tsx` | **insert + one-line rewrite** | imports `resolveTargetTitle`; the container heading `Target detail view: ${first_name} ${last_name}` becomes `Target detail view: ${resolveTargetTitle(target)}` (a Company otherwise rendered a blank title). | Low |
| `tests/e2e/campaign-targets.spec.ts` | **edit (test only)** | "create with all fields" now selects **Individual** first and drops company-only fills (company is the default type and hides person fields); list-filter placeholder and test title → name-or-company; detail check "Company" → "Employer". | Low |

**Re-verify after any upstream merge:** `git diff <merge-base> upstream/main -- <each file above>`. The
friction points are `columns.tsx` (column array), `UpdateTargetForm.tsx` (the `last_name` schema line +
the many conditional wraps) and `BasicView.tsx`. Guards: `__tests__/lib/target-type.test.ts`,
`__tests__/mcp/crm-targets-type.test.ts`, `__tests__/actions/create-target-type.test.ts`,
`__tests__/actions/import-targets-type.test.ts`, `tests/e2e/target-type.spec.ts`.

**Notes:**
- Migration is **additive** (new enum + non-null column defaulting `COMPANY`, plus a one-time
  `last_name = company` → `''` cleanup) → **migration-first**: it reaches QA via the Vercel build's
  `prisma migrate deploy`, never by hand.
- The `last_name = company` cleanup only touches rows where the MCP load duplicated the company name.
- The whole feature is **upstream-contributable in principle** but is opinionated (co-equal
  Individual/Company targets); contribute only from a clean upstream base if upstream wants it.

---

## fix/inngest-concurrency-limit — embedEmail concurrency within Inngest plan  (PR: TBD)

**1 upstream-owned file**, **rewrite** (one value):

| Upstream file | +/− | Kind | What / where | Risk |
|---|---|---|---|---|
| `inngest/functions/emails/embed-email.ts` | +1/−1 | **rewrite** | `concurrency: { limit: 10 }` → `{ limit: 5 }` — the declared limit exceeded the Inngest account plan limit (5), which failed the whole-app sync and prevented ALL functions from registering (enrichment, embeddings, email sync, campaigns, calendar). | Low |

**Why:** surfaced only after the sharp fix let `/api/inngest` sync succeed — Inngest then validated function configs and rejected the app because `embedEmail` requested concurrency 10 > plan 5. Capping at 5 lets the app register. Raise again if the Inngest plan is upgraded. Upstream-contributable.

---

## fix/e2b-base-image — Repair the E2B enrichment template build  (PR: TBD)

**1 upstream-owned file**, **rewrite**:

| Upstream file | Kind | What / where | Risk |
|---|---|---|---|
| `e2b.Dockerfile` | **rewrite** | (1) `FROM e2b/nodejs:latest` → `FROM e2bdev/base:latest` — the old base image was removed from E2B's registry (`image not found`). (2) Split the npm install: `agent-browser`/`tsx` stay global (used as CLIs), but `@anthropic-ai/sdk` is installed **locally under `/home/user`** — the agent runs as `/home/user/agent.mjs` and ESM bare-import resolution ignores the global prefix/NODE_PATH. | Low |

**Why:** `e2b template create nextcrm-enrichment` failed first on the missing base image, then at runtime with `ERR_MODULE_NOT_FOUND: @anthropic-ai/sdk`. Both are fixed; the template now builds and the sandbox agent runs (the remaining enrichment failure is a separate ANTHROPIC-credential issue, not the template). The template is built via the E2B CLI, not the app deploy, so this change is for reproducibility.

---

## feat/targets-list-name-cell — Clickable Name/Company + description tooltip + Industry filter  (PR: TBD)

**3 upstream-owned files**, insertions only:

| Upstream file | Kind | What / where | Risk |
|---|---|---|---|
| `.../campaigns/targets/table-components/columns.tsx` | **insert** | new `TargetLinkCell` helper — Name + Company cells become links to `/crm/targets/:id` (redirects to /campaigns/targets) and show a `description` hover tooltip; `industry` added to the Name filterFn; a `filterFn` added to the `industry` column so it can be faceted-filtered | Low |
| `.../campaigns/targets/table-components/data-table-toolbar.tsx` | **insert** | Industry faceted filter (options derived from the data's distinct industries) + search placeholder update | Low |
| `.../campaigns/targets/table-data/schema.tsx` | **insert** | `description` added to `targetSchema` (needed for the tooltip) | Low |

**Note:** also carries the `e2b.Dockerfile` repair (base image + local sdk) folded into this branch per request — see the `fix/e2b-base-image` section above.

---

## feat/targets-list-name-cell — Account row-schema accepts null contact first_name  (PR: same PR, folded in per request)

**1 upstream-owned file**, one-field relaxation:

| Upstream file | Kind | What / where | Risk |
|---|---|---|---|
| `.../crm/accounts/table-data/schema.tsx` | **rewrite** (1 field) | `contacts[].first_name`: `z.string().optional()` → `z.string().nullish()`. `.optional()` rejects an explicit `null`; `crm_Contacts.first_name` is nullable in the DB and a company contact (created by a target→opportunity conversion) has none. The row-schema is parsed during render, so the null threw a ZodError → React #419 → "This page couldn't load" (client-side, no digest) on the accounts list and the opportunity detail (`AccountsView`). `last_name` left required (non-null in DB). | Low |

**Why:** reproduced first-hand on QA (`/crm/opportunities/d98743b0…`) — console showed `ZodError … path ["contacts",0,"first_name"] expected string, received null`. Fix aligns the display schema with the DB's existing nullability; enforcement of individual names belongs on the write path, not this read schema. Guard: `__tests__/crm/account-schema.test.ts` (revert-verified). Upstream-contributable.
