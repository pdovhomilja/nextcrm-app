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
