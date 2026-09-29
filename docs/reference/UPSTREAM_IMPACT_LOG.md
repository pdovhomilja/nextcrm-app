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

Adds a pre-conversion triage gate on `crm_Targets`. **13 new files** (action, `lib/crm/triage.ts`,
`TriagePassDialog`, `TriageControl`, `triage-options`, copied `data-table-faceted-filter`,
tests, docs) — zero merge risk. **8 upstream-owned files** touched, below.

| Upstream file | +/− | Insert-only? | What / where | Risk |
|---|---|---|---|---|
| `prisma/schema.prisma` | +27/0 | **insert** | new `enum crm_Triage_Status` + `enum crm_Pass_Reason` block after `enum crm_AuditLog_Action`; 6 fields appended inside `model crm_Targets`; 2 `@@index` | Low |
| `lib/mcp/tools/crm-targets.ts` | +132/6 | **mixed** | insert: `triage_status` filter on `crm_list_targets`, new `crm_set_target_triage` tool, imports. **rewrite: `crm_create_target` + `crm_update_target` schema/handler objects (extended to CSV parity); `crm_set_target_triage` uses `buildTriageData`** | **Moderate — main watch-point** |
| `lib/audit-log.ts` | +3/1 | **mixed** | insert: `"target"` added to `AuditEntityType` union. rewrite: removed a redundant `eslint-disable` above the `crm_AuditLog.create` cast (+2-line comment) | Low |
| `app/[locale]/(routes)/campaigns/targets/table-components/columns.tsx` | +22/0 | **insert** | imports + one `triage_status` badge column before the `actions` column | Low |
| `app/[locale]/(routes)/campaigns/targets/table-components/data-table-row-actions.tsx` | +29/0 | **insert** | imports + `onApprove` + `passOpen` state + `Approve`/`Pass…` menu items + `<TriagePassDialog/>` mount | Low–Med |
| `app/[locale]/(routes)/campaigns/targets/table-components/data-table-toolbar.tsx` | +9/0 | **insert** | imports + faceted `Triage` filter block | Low |
| `app/[locale]/(routes)/campaigns/targets/table-data/schema.tsx` | +7/0 | **insert** | triage fields added to `targetSchema` | Low |
| `app/[locale]/(routes)/campaigns/targets/[targetId]/components/BasicView.tsx` | +24/0 | **insert** | imports + `<TriageControl/>` in the header + a `PASSED` detail block | Low–Med |

**Re-verify after any upstream merge:** `__tests__/actions/set-target-triage.test.ts`,
`__tests__/mcp/crm-targets-triage.test.ts`, `tests/e2e/target-triage.spec.ts`.

**Note:** the only rewrite of existing upstream logic is in `lib/mcp/tools/crm-targets.ts`
(the create/update schema objects + the triage handler). If upstream reworks those tool
definitions, that's where a conflict would land. The `crm_create_target`/`crm_update_target`
field-parity extension is **upstream-contributable** — merging it upstream would remove that
divergence.
