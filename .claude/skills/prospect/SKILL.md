---
name: prospect
description: Find N net-new qualified website-redesign prospects for a describable ICP (geography, verticals, site criteria), verify and enrich each from the live site (WordPress version/builder/theme/plugins, sitemap URL count, homepage+menu links, last update, security/perf/UX issues, a named contact person + email or a generic company inbox, and social profiles), dedup against the CRM, and load them as NEW targets in a dated, criteria-labeled target list. By default only leads with a contactable email count; an opt-in allows email-less sites. Use when the user asks to prospect, find leads, build a target/lead list, or source redesign prospects.
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
- **Contactability (email requirement)** — two modes:
  - **`email-required`** — only load leads with a **contactable email** (a
    role/generic inbox like `info@` **or** a named person's email). A candidate with
    neither is **dropped** and does **not** count toward N (treated like a criteria
    miss — see `research-recipe.md` step 2).
  - **`include-no-email`** — drop the requirement entirely; email-less sites are kept
    and count toward N like any other qualified lead.

  Resolve from the prompt if it clearly states one (e.g. "only leads with an email",
  "must be contactable" → `email-required`; "include sites without an email",
  "regardless of email" → `include-no-email`). **If the prompt does not clearly
  specify, ASK** (a targeted follow-up, like environment) — do not silently default.
  Suggest `email-required` as the recommended choice when you ask.
- **Environment** — `qa` or `prod`. **Always ask if unspecified.**

Restate the resolved plan (quantity, verticals, criteria, geography, contactability
mode, environment) to the user before running.

## 2. Environment gate

Load into `qa` → the `rade-crm-qa` MCP server; `prod` → `rade-crm-prod`. Before any
`prod` write, get an explicit confirmation ("yes, load to prod"). Never write to
prod on inference.

## 3. Plan the sweep

Derive the working vertical set (given, or spread across sensible local verticals)
and the geography breadth. Pick a per-vertical over-fetch target above the naive
share of N, since dedup + disqualification will trim the batch.

## 4. Fetch existing CRM records (for dedup)

Page through `crm_list_targets` (chosen environment) and collect every existing
record's **`company_website` AND `company`** (name). Keep these — they feed the
top-up loop's net-new count. Collecting the name matters: pre-parity rows (and any
imported without a site) can have a blank `company_website`, so website-only dedup
would miss them — name dedup catches them.

## 5. Parallel research

Using `dispatching-parallel-agents`, dispatch **one research subagent per
vertical**. Give each: the geography, its vertical, the website criteria, the
**contactability mode** (`email-required` or `include-no-email`), and a
per-vertical over-fetch count. Instruct each to follow
`references/research-recipe.md` **exactly** and return a structured list of
verified, enriched candidate records (company, company_website root, city,
industry, email, description). Under `email-required`, over-fetch harder — expect a
chunk of otherwise-qualified sites to be dropped for having no findable email.

## 6. Top-up loop (reach N net-new qualified)

Consolidate the returned candidates. Compute the net-new set with
**`filterNewProspects`** — it dedups on normalized **website OR company name**
against the existing CRM records (step 4) **and** within the batch. Write the two
arrays to temp JSON and run the helper (fill both files — do not paste the snippet
with the `/* … */` placeholders unedited):

```bash
# candidates.json = the research records [{company, company_website, ...}, ...]
# existing.json   = the step-4 records    [{company, company_website}, ...]
node --input-type=module -e '
import { filterNewProspects } from "./.claude/skills/prospect/scripts/dedupe.mjs";
import { readFileSync } from "node:fs";
const candidates = JSON.parse(readFileSync(process.argv[1], "utf8"));
const existing = JSON.parse(readFileSync(process.argv[2], "utf8"));
const { kept, skipped } = filterNewProspects(candidates, existing);
console.log(JSON.stringify({ keptCount: kept.length, skippedCount: skipped.length, kept }));
' candidates.json existing.json
```

Use the returned **`kept`** set as the net-new qualified prospects. If its count is
below N, dispatch more research — more candidates in the same verticals first, then
broaden geography — and repeat, adding each round's finds to `existing.json` so
they don't re-dupe. **Stop at N, or at an attempt cap of 4 top-up rounds.** If still
short, proceed with what cleared and **report the shortfall and why** (e.g. "niche
exhausted for this geography").

## 7. Rank

Order the final set by signal severity — **broken > stale/security > cosmetic** —
so the strongest leads triage first.

## 8. Load

Follow `references/load-mapping.md`: the parity-schema safety check, create/reuse
the criteria-labeled target list, create each target (field mapping, `NEW`), add any
found people as target contacts (`crm_create_target_contact`, with the primary
person also on the target's person fields so it survives conversion), and bulk-attach
the targets to the list.

## 9. Report

Print: counts (candidates found / verified / duplicates skipped / loaded),
per-vertical breakdown, ranked tiers, the environment, the exact criteria string,
the **contactability mode**, and the target-list id/link. When mode was
`email-required`, also report **how many otherwise-qualified candidates were dropped
for having no findable email**. Note any shortfall against N.
