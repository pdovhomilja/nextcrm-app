---
name: prospect
description: Find N net-new qualified website-redesign prospects for a describable ICP (geography, verticals, site criteria), verify and enrich each from the live site (WordPress version/builder/theme/plugins, sitemap URL count, homepage+menu links, last update, security/perf/UX issues, contact email), dedup against the CRM, and load them as NEW targets in a dated, criteria-labeled target list. Use when the user asks to prospect, find leads, build a target/lead list, or source redesign prospects.
---

# Prospect — repeatable redesign-lead sourcing

Turn a short prompt (or none) into **N net-new qualified prospects** loaded into
the CRM as `NEW` targets, ready for the human triage gate. Spec:
`docs/superpowers/specs/2026-09-29-prospecting-skill-design.md`.

**Hard rules (never bend these):**
- **Never fabricate.** Every prospect is a real site returning **HTTP 200** with
  evidence from its raw HTML / headers / sitemap. Unverifiable → dropped.
- **N counts only net-new qualified leads** (default **30**). Duplicates and
  disqualified finds never count toward N.
- **Dedup is mandatory** — skip any business already in the CRM.
- **Environment is `qa` or `prod`, always confirmed** before any write; a `prod`
  load needs an explicit "yes, load to prod".

## 1. Resolve inputs (prompt-first, targeted follow-ups)

Parse the user's prompt for these; apply defaults; ask **only** for what's missing
or ambiguous — never a full interview:

- **Quantity** — default **30** (net-new qualified).
- **Industries / verticals** — optional; if omitted, spread across sensible local
  verticals for the geography.
- **Website criteria** — optional, free-form (e.g. "WordPress only", a WP version,
  a page builder, performance traits). **Not** WordPress-locked. If omitted, use
  the default "good redesign candidate" heuristic (visibly dated / weak UX / poor
  performance). **Record the criteria string verbatim** — it goes into the target
  list's description (step 8).
- **Geography** — tight (a city) through broad (metro / region / state). Ask if absent.
- **Environment** — `qa` or `prod`. **Always ask if unspecified.**

Restate the resolved plan (quantity, verticals, criteria, geography, environment)
to the user before running.

## 2. Environment gate

Load into `qa` → the `rade-crm-qa` MCP server; `prod` → `rade-crm-prod`. Before any
`prod` write, get an explicit confirmation ("yes, load to prod"). Never write to
prod on inference.

## 3. Plan the sweep

Derive the working vertical set (given, or spread across sensible local verticals)
and the geography breadth. Pick a per-vertical over-fetch target above the naive
share of N, since dedup + disqualification will trim the batch.

## 4. Fetch existing CRM websites (for dedup)

Page through `crm_list_targets` (chosen environment) and collect every existing
`company_website`. Keep this list — it feeds the top-up loop's net-new count.

## 5. Parallel research

Using `dispatching-parallel-agents`, dispatch **one research subagent per
vertical**. Give each: the geography, its vertical, the website criteria, and a
per-vertical over-fetch count. Instruct each to follow
`references/research-recipe.md` **exactly** and return a structured list of
verified, enriched candidate records (company, company_website root, city,
industry, email, description).

## 6. Top-up loop (reach N net-new qualified)

Consolidate the returned candidates. Compute the net-new set with the dedup helper
against the existing-CRM websites **and** within-batch:

```bash
node -e '
import("./.claude/skills/prospect/scripts/dedupe.mjs").then(({ filterNewByWebsite }) => {
  const candidates = /* array of {company_website,...} */;
  const existing = /* array of existing company_website strings */;
  const { kept, skipped } = filterNewByWebsite(candidates, existing);
  console.log(JSON.stringify({ kept: kept.length, skipped: skipped.length }));
});'
```

(or import `filterNewByWebsite` directly). If the count of net-new qualified is
below N, dispatch more research — more candidates in the same verticals first, then
broaden geography — and repeat. **Stop at N, or at an attempt cap of 4 top-up
rounds.** If still short, proceed with what cleared and **report the shortfall and
why** (e.g. "niche exhausted for this geography").

## 7. Rank

Order the final set by signal severity — **broken > stale/security > cosmetic** —
so the strongest leads triage first.

## 8. Load

Follow `references/load-mapping.md`: the parity-schema safety check, create/reuse
the criteria-labeled target list, create each target (field mapping, `NEW`), and
bulk-attach to the list.

## 9. Report

Print: counts (candidates found / verified / duplicates skipped / loaded),
per-vertical breakdown, ranked tiers, the environment, the exact criteria string,
and the target-list id/link. Note any shortfall against N.
