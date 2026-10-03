# Design: Per-Target Homepage Generation Cost Tracking

**Date:** 2026-10-03
**Branch:** `feat/homepage-cost-tracking`
**Status:** Draft for review

## Purpose

Give admins visibility into what homepage HTML generation costs **per target**,
accumulating across every regeneration and every refine iteration. Today the
per-pass Anthropic token usage is only `console.log`-ed (`[HOMEPAGE_USAGE]`,
added in this branch); nothing is persisted or queryable. This feature persists
that usage and surfaces an admin table.

Success = an admin can open an **Admin → Homepage Costs** page and see, one row
per target, how recently it was generated, how many generations ran, which model,
and the total dollar cost to date — sorted most-recent-first.

## Scope

In scope:
- Persist per-pass token usage + model on homepage version rows.
- A pricing table + cost helper (code-side, not persisted).
- A read-only admin page with an aggregated per-target table.

Out of scope (YAGNI for now): date-range filtering, CSV export, pagination,
charts, cost for non-homepage AI features (email, enrichment), budgets/alerts.

## Data model

Each homepage pass already writes exactly one `crm_Target_Homepage_Version` row
(`inngest/functions/generate-homepage.ts`, the `runPass` persist step). Add
**nullable** columns to that model:

- `model` — the model id used for the pass (e.g. `claude-sonnet-5-5`).
- `input_tokens`, `output_tokens`, `cache_read_tokens`, `cache_creation_tokens`.

All nullable and additive. A single migration; because the columns are nullable
and the Vercel build runs `prisma migrate deploy` before the new code serves,
this is safe to ship in one PR (no migration-first split needed). Migration is
authored with `prisma migrate dev` and committed — never `db push`.

Rows written by the **upload** and **revert** paths (no model call) leave these
null. Version rows that predate this change are also null.

## Definition: "a generation"

A **generation** = a version row that recorded a model call (usage present).
This is what the count column reports. Upload/revert rows and pre-tracking rows
(null usage) are **not** counted and contribute **$0.00** to cost.

## Capture (write path)

The sole generation-persist site — the `runPass` persist step — writes the
`usage` now returned by `generateHomepage` plus the pass's `model` onto the new
columns. Auto passes and human refine passes both flow through `runPass`, so
this is one insertion point. The upload persist site is unchanged.

## Pricing & cost (`lib/homepage/cost.ts`, new, fork-owned)

- A pricing map keyed by model id, each entry giving input / output /
  cache-read / cache-write USD per 1M tokens for the homepage-eligible models
  (Sonnet 5.5, Opus 5.5, Haiku 4.5). An unknown model id yields a cost of 0 and
  is treated as untracked (fail-closed, never throws).
- `computePassCostUsd(usage, model)` → dollars for one pass, summing
  `input·input_rate + output·output_rate + cache_read·read_rate +
  cache_creation·write_rate`.
- The same helper may enrich the `[HOMEPAGE_USAGE]` log line with a `$` figure.

Pricing lives in code so rate corrections never require a data migration.

## Aggregation (`actions/admin/homepage-costs.ts`, new)

`getHomepageCostsForAdmin()`:
1. `requireRole(["admin"])` (defensive; the admin layout already gates the route).
2. Fetch each homepage's versions selecting **only** `created_at`, `pass_kind`,
   `model`, and the four token columns — **never** `html` (large). Join the
   owning target's company name and id.
3. Aggregate in JS per target:
   - **name** — target company (fallback "(unknown)").
   - **lastGenerationAt** — max `created_at` across passes with recorded usage.
   - **generations** — count of passes with recorded usage.
   - **model** — model of the most recent recorded pass; if the target used more
     than one distinct model, annotate (e.g. `claude-sonnet-5-5 (+1)`).
   - **totalCostUsd** — Σ `computePassCostUsd` over all the target's passes.
   - **inputTokens / outputTokens** — summed totals (for the muted detail).
   - **hasUntracked** — true if any of its generations lack usage (drives the
     "pre-tracking" note).
4. Sort by `lastGenerationAt` descending (newest first); targets with no recorded
   generation still appear with $0.00 and the pre-tracking note.

Scale: dozens of targets × a few versions each — aggregation in JS is fine.
Pagination deferred until it's actually needed.

## UI

- `app/[locale]/(routes)/admin/homepage-costs/page.tsx` — server component,
  admin-gated by the existing admin layout. Renders a static table (sort is
  fixed, so no client interactivity).
- Columns: **Target · Last generation · # generations · Model · Total cost**,
  with total input/output tokens shown muted/secondary next to cost. Cost of a
  row whose generations are all untracked shows `$0.00` with a subtle
  "pre-tracking" marker.
- Add a nav item ("Homepage Costs") to `navItems` in
  `app/[locale]/(routes)/admin/_components/AdminSidebarNav.tsx`.

## Testing

- **Unit — `computePassCostUsd`**: correct math including cache tokens; unknown
  model → 0; null/partial usage → 0.
- **Unit — `getHomepageCostsForAdmin`** (mocked prisma): per-target count, cost
  sum across mixed passes, last-generation date, newest-first sort order, model
  annotation when mixed, and null-usage rows contributing $0 and not inflating
  the count. Confirm `html` is never selected.
- Follow repo TDD: write the failing test first; verify any regression guard by
  reverting its fix.

## Rollout / ordering

- One PR: migration + capture + pricing + action + page + nav + tests.
- Per repo rule, after merge the deploy applies the migration (don't apply by
  hand). Remind the user post-merge.
- Doc-sync targets: `docs/reference/PROJECT_STRUCTURE.md` (new admin route +
  files), data-model doc (new columns), and `LESSONS_LEARNED.md` if any gotcha
  emerges. No env-var changes. No upstream-owned files touched (homepage code,
  admin pages, and the version model are all fork-owned) → no
  `UPSTREAM_IMPACT_LOG.md` entry.

## Dependencies

Builds on the `[HOMEPAGE_USAGE]` logging already on this branch (it makes
`generateHomepage` return `usage`, which the capture step persists).
