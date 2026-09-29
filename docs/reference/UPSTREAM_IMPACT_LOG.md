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
