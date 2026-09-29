# Prospecting Skill — Design Spec

**Status:** Draft (pre-implementation) · **Date:** 2026-09-29 · **Owner:** Shaun
**Branch:** `feat/prospecting-skill`

> Describes intent, scope, and acceptance for a repeatable prospecting skill. No
> implementation code (per `CLAUDE.md` › Documentation Sync). The implementation
> plan follows via the `writing-plans` skill after this spec is approved.

---

## 1. Purpose

Turn the one-off prospecting sweep that produced our first 28 leads into a
**repeatable, parameterized skill** that, on demand, finds **N net-new qualified
prospects** matching a describable ideal-customer profile, enriches each with the
detail needed to motivate a website redesign, and **loads them into the CRM as
`NEW` targets in a dated target list** — ready for the human triage gate.

Success = "give the skill a short prompt (or none) and get a clean, deduped,
well-evidenced target list in the chosen environment, with zero fabricated data."

## 2. Scope

**In scope (pipeline steps 1–3):** sweep → verify/enrich → consolidate/dedup →
load into the CRM.

**Out of scope (separate work):** the human triage gate (already shipped);
downstream enrichment-to-contacts via the CRM's own AI enrichment, auto-mockup
previews, outreach campaigns, and convert-at-engagement. The skill hands off at a
loaded `NEW` list; those stages consume it.

**Artifact type & fork hygiene:** a **fork-owned skill** under `.claude/skills/`
(proposed name: `prospect`, invoked `/prospect`). It touches **no upstream-owned
files** — it only *uses* the existing CRM MCP tools — so it carries **zero
upstream-merge risk** and needs no `UPSTREAM_IMPACT_LOG.md` entry.

## 3. Inputs & interaction model

**Interaction model:** *prompt-first with targeted follow-ups.* The user gives a
natural-language prompt (any subset of the parameters, or nothing). The skill
parses what's present, applies defaults, and asks **only** for what's missing or
ambiguous — never a rigid full interview. It always asks for the **environment**
if unspecified.

| Parameter | Required | Default / behavior |
|---|---|---|
| **Quantity** | No | **30.** Counts **net-new *qualified*** leads only — duplicates and disqualified finds do not count toward N (see §5 top-up loop). |
| **Industries / verticals** | No | If omitted, spread across sensible local verticals for the geography. |
| **Website criteria** | No | Free-form filter on the *site itself* — e.g. "WordPress only," a specific WP version, a page builder, performance traits, or none. **Not** WordPress-locked. If omitted, default to "good redesign candidates" (visibly dated / weak UX / poor performance), technology-agnostic. **The exact criteria string is recorded verbatim in the target-list description.** |
| **Geography** | No (asked if absent) | Supports **tight (single city)** through **broad (metro / region / state)**. |
| **Environment** | Yes | `qa` or `prod`. **Always asked if unspecified.** A `prod` load requires an explicit confirmation before writing (real outbound data). |

## 4. Always-collect data set (every qualified prospect)

Independent of the filter criteria, each prospect is enriched with as much of the
following as can be **verified from the live site**, and the findings are written
into the target's **`description`** field:

- **If WordPress:** core **version number**, **page builder(s)**, **theme**, and
  notable **plugins**.
- **All sites:** **sitemap(s)** read → **count of URLs**; **number of links on the
  homepage + its menus**; **most recent page update** (sitemap `lastmod` /
  `Last-Modified` where available); observed **security, performance, and UI/UX
  issues**; any other concrete redesign-motivating signal.
- **A contact email** — a generic inbox (`info@…`, `contact@…`) or, where
  findable, an **owner/president name + email**. Stored in the target's contact
  fields (`email` / `company_email`) and summarized in `description`.

## 5. Behavior / flow

1. **Resolve parameters** — parse the prompt, apply defaults (quantity 30), ask
   targeted follow-ups for anything missing; always confirm environment; confirm a
   `prod` write.
2. **Plan the sweep** — derive the working set of verticals (given or spread) and
   the geography breadth; restate the resolved plan to the user before running.
3. **Parallel research + enrichment** — fan out one subagent per vertical (per
   `dispatching-parallel-agents`). Each subagent, per candidate, follows the
   **non-negotiable quality bar** (§6): confirm the candidate meets the website
   criteria (or the default redesign-candidate heuristic) from **real HTTP 200
   evidence**, collect the **always-collect data set** (§4), find a contact email,
   and drop anything unreachable / non-matching / fabricated. Each subagent writes
   a structured evidence file to a **gitignored run-scoped scratch path** (not
   committed).
4. **Top-up loop to reach N** — the orchestrator dedups results **against the CRM
   (by `company_website`, normalized; and by company name)** and **within the
   batch**, then counts **net-new qualified** leads. If short of N, it dispatches
   further research (more candidates in the same verticals, or broader geography)
   and repeats — until N is met or a sane **attempt cap** is hit. If the niche is
   exhausted before N, it stops and **reports the shortfall with the reason**
   rather than padding with weak or duplicate leads.
5. **Consolidate & rank** — merge the vertical results, final-dedup, and rank by
   signal severity (broken > stale/security > cosmetic) for easy triage.
6. **Load into the CRM** (chosen environment, via MCP):
   - **Create (or reuse) a target list** named `"<geography> — <criteria label> —
     <YYYY-MM>"`, whose **description records the exact build criteria** used
     (verticals, website-criteria string, geography, quantity, run date).
   - **Create each target** with the field mapping in §7, `triage_status = NEW`.
   - **Attach all** created targets to the list in one bulk call.
7. **Run report** — counts (candidates found / verified / duplicates skipped /
   loaded), breakdown by vertical, ranked tiers, the environment, the criteria
   string, and a link/id to the target list. Note any shortfall against N.

## 6. Non-negotiable quality bar

- Every prospect is a **real site returning HTTP 200** with evidence pulled from
  its **raw HTML / headers / sitemap** (and a browser check where a visual signal
  is claimed). **Never fabricate** a business, URL, version, or metric.
- A candidate that cannot be verified against the criteria is **dropped**, not
  guessed.
- **Dedup is mandatory** — never load a business already in the CRM (matched by
  normalized website, then name).
- Respect the environment gate — no silent prod writes.

## 7. Data mapping (research → `crm_Targets`)

| Research finding | Target field |
|---|---|
| Business name | `company` and `last_name` (last_name required by the model) |
| Site URL (normalized root) | `company_website` |
| Vertical / category | `industry` (when determinable) |
| City | `city` · region/country → `country` |
| Contact email | `email` (and/or `company_email`) |
| **Full enrichment write-up (§4) + opener hook** | `description` |
| — | `triage_status = NEW` (default) |

Loading uses the CRM's MCP tools (`crm_create_target_list`, `crm_create_target`,
`crm_add_to_target_list`). Note: `crm_create_target`/`crm_update_target` accept the
full CSV-parity field set (shipped in PR #9); a session must advertise that schema
(a session started **after** the QA/prod parity deploy) — the skill verifies a
created target retained `company_website` before bulk-loading, and stops if fields
are being stripped.

## 8. Acceptance criteria

1. A bare invocation runs with defaults (quantity 30) and asks only for the missing
   essentials (at minimum, environment).
2. A one-line prompt (e.g. "50 HVAC leads in the KC metro, WordPress + WPBakery,
   into qa") runs with a single plan confirmation.
3. The result contains **exactly N net-new qualified leads** — or fewer, with an
   explicit exhaustion reason — and **no duplicates** of existing CRM targets.
4. Every loaded target has `company`, `company_website`, `city`, `industry` (when
   determinable), a contact email (when findable), and a `description` containing
   the §4 data set. WordPress prospects include version + builder/theme/plugins.
5. A target list exists named by geography + criteria + month, whose **description
   records the exact criteria** used to build it; all targets are `NEW`.
6. The run report states counts, per-vertical breakdown, tiers, environment,
   criteria, and the list id/link.
7. **No fabricated data**; every lead is HTTP-200-verified.

## 9. Open questions / resolved decisions

- **Resolved:** scope = steps 1–3; quantity default 30 (net-new qualified);
  industries/criteria/geography optional; environment always asked; dedup by
  website; ICP is configurable (not WordPress-locked); prompt-first interaction.
- **To confirm during planning:** the exact gitignored scratch path for evidence
  files; the attempt-cap heuristic for the top-up loop; the list-name/label format;
  whether to also capture a lightweight per-lead evidence artifact for auditability
  beyond the `description`.

## 10. Future extensions (not this skill)

Triage orchestration (surface the `NEW` queue, apply Approve/Pass via MCP),
CRM AI-enrichment to contacts, auto-mockup previews, and outreach campaigns —
each consumes the `NEW` list this skill produces.
