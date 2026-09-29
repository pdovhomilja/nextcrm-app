# Prospecting Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fork-owned `/prospect` skill that finds N net-new qualified redesign prospects for a describable ICP, enriches each with concrete website detail + a contact email, and loads them into the CRM as `NEW` targets in a dated, criteria-labeled target list.

**Architecture:** A skill under `.claude/skills/prospect/` — a `SKILL.md` orchestrator that parses the prompt, plans the sweep, fans out one research subagent per vertical (each following a strict verify-and-enrich recipe), runs a top-up loop until N net-new qualified leads clear dedup, then loads via the CRM MCP tools. Two reference files carry the per-lead recipe and the load mapping; one small tested Node helper does deterministic URL dedup.

**Tech Stack:** Markdown skill (Claude Code skill conventions), Node ESM helper + `node --test`, the `rade-crm-qa` / `rade-crm-prod` MCP tools (`crm_create_target_list`, `crm_create_target`, `crm_add_to_target_list`, `crm_list_targets`), `dispatching-parallel-agents`.

**Spec:** `docs/superpowers/specs/2026-09-29-prospecting-skill-design.md`

## Global Constraints

- **Quantity = N net-new *qualified* leads; default 30.** Duplicates and disqualified finds never count toward N.
- **ICP is configurable, not WordPress-locked.** The website-criteria string is recorded verbatim in the target-list description.
- **Environment is `qa` or `prod`, always asked if unspecified; a `prod` load requires explicit confirmation** before any write.
- **Never fabricate.** Every prospect is a real site returning HTTP 200 with evidence from its raw HTML / headers / sitemap; unverifiable candidates are dropped.
- **Dedup is mandatory** — skip any business already in the CRM, matched by normalized `company_website` then company name.
- **Always-collect data set → `description`** (per spec §4): if WordPress → version, page builder(s), theme, plugins; all sites → sitemap URL count, homepage+menu link count, most recent page update, security/perf/UI-UX signals; plus a contact email.
- **Fork-owned artifact.** Everything lives under `.claude/skills/prospect/` — no upstream-owned file is edited, so no `UPSTREAM_IMPACT_LOG.md` entry is needed.
- **Load field mapping (spec §7):** company→`company`+`last_name`; root URL→`company_website`; vertical→`industry`; city→`city`, region/country→`country`; contact→`email`/`company_email`; enrichment+hook→`description`; `triage_status=NEW`.

## Review Focus

- **Same site in different forms** (http/https, `www.`, trailing slash, deep path vs root) must dedup to one — else a repeat run reloads an existing prospect. *(Pinned in Task 1 tests.)*
- **Niche/geography exhausted before N** — the top-up loop must terminate at an attempt cap and report the shortfall, never pad with junk or loop forever. *(Pinned: Task 2 loop cap + Task 5 acceptance.)*
- **A session advertising the pre-parity MCP schema silently strips `company_website`/`description`** — the load must verify the first created target retained `company_website` and abort if stripped. *(Pinned: Task 4 read-back check.)*
- **`prod` write without confirmation** — accidental real-data load. *(Pinned: Task 2 environment gate.)*
- **A candidate returning 403 / blank / non-matching** must be dropped and never counted or fabricated. *(Pinned: Task 3 recipe; Task 5 spot-check.)*

---

### Task 1: URL dedup helper (deterministic, TDD)

**Files:**
- Create: `.claude/skills/prospect/scripts/dedupe.mjs`
- Test: `.claude/skills/prospect/scripts/dedupe.test.mjs`

**Interfaces:**
- Produces: `normalizeSiteUrl(url: string): string` — lowercased host with `www.` and scheme and trailing slash and path stripped to a bare root key (e.g. `https://WWW.Foo.com/bar/` → `foo.com`). Produces `filterNewByWebsite(candidates: {company_website:string}[], existingUrls: string[]): {kept, skipped}` — partitions candidates whose normalized root is absent from the normalized existing set.

- [ ] **Step 1: Write the failing tests**

```js
// .claude/skills/prospect/scripts/dedupe.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeSiteUrl, filterNewByWebsite } from "./dedupe.mjs";

test("normalizeSiteUrl collapses scheme, www, path, case, trailing slash", () => {
  const forms = [
    "https://www.Foo.com/",
    "http://foo.com",
    "https://foo.com/services/",
    "FOO.com",
    "https://www.foo.com/a/b?c=d",
  ];
  for (const f of forms) assert.equal(normalizeSiteUrl(f), "foo.com");
});

test("normalizeSiteUrl keeps distinct hosts distinct", () => {
  assert.notEqual(normalizeSiteUrl("https://foo.com"), normalizeSiteUrl("https://bar.com"));
  assert.equal(normalizeSiteUrl("https://sub.foo.com"), "sub.foo.com");
});

test("filterNewByWebsite skips existing (any URL form) and keeps net-new", () => {
  const candidates = [
    { company_website: "https://www.existing.com/home" },
    { company_website: "http://fresh.com" },
  ];
  const existing = ["https://existing.com/"];
  const { kept, skipped } = filterNewByWebsite(candidates, existing);
  assert.deepEqual(kept.map((c) => c.company_website), ["http://fresh.com"]);
  assert.equal(skipped.length, 1);
});

test("filterNewByWebsite dedups within the candidate batch too", () => {
  const candidates = [
    { company_website: "https://dup.com/" },
    { company_website: "http://www.dup.com/x" },
  ];
  const { kept } = filterNewByWebsite(candidates, []);
  assert.equal(kept.length, 1);
});
```

- [ ] **Step 2: Run the tests, verify they fail**

Run: `node --test .claude/skills/prospect/scripts/dedupe.test.mjs`
Expected: FAIL — cannot find module `./dedupe.mjs` / exports undefined.

- [ ] **Step 3: Write the minimal implementation**

```js
// .claude/skills/prospect/scripts/dedupe.mjs
export function normalizeSiteUrl(url) {
  let s = String(url || "").trim().toLowerCase();
  s = s.replace(/^[a-z]+:\/\//, "");      // strip scheme
  s = s.replace(/^www\./, "");            // strip leading www.
  s = s.split(/[/?#]/)[0];               // keep host only
  return s;
}

export function filterNewByWebsite(candidates, existingUrls) {
  const seen = new Set((existingUrls || []).map(normalizeSiteUrl));
  const kept = [];
  const skipped = [];
  for (const c of candidates) {
    const key = normalizeSiteUrl(c.company_website);
    if (!key || seen.has(key)) { skipped.push(c); continue; }
    seen.add(key);
    kept.push(c);
  }
  return { kept, skipped };
}
```

- [ ] **Step 4: Run the tests, verify they pass**

Run: `node --test .claude/skills/prospect/scripts/dedupe.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5: Revert-verify one guard**

Temporarily change `s.replace(/^www\./, "")` to a no-op, re-run — the "collapses … www" test must FAIL. Restore, re-run — PASS.

- [ ] **Step 6: Commit**

```bash
git add .claude/skills/prospect/scripts/dedupe.mjs .claude/skills/prospect/scripts/dedupe.test.mjs
git commit -m "feat(prospect): url dedup helper for the prospecting skill"
```

---

### Task 2: Skill orchestrator — `SKILL.md` front matter + workflow

**Files:**
- Create: `.claude/skills/prospect/SKILL.md`

**Interfaces:**
- Consumes: `scripts/dedupe.mjs` (Task 1), `references/research-recipe.md` (Task 3), `references/load-mapping.md` (Task 4).
- Produces: the invokable `prospect` skill (`/prospect`).

- [ ] **Step 1: Write `SKILL.md` with valid front matter and the full orchestration**

Author the file with this exact front matter and a body covering the sections below (prose, not code):

```markdown
---
name: prospect
description: Find N net-new qualified website-redesign prospects for a describable ICP (geography, verticals, site criteria), verify and enrich each from the live site (WordPress version/builder/theme/plugins, sitemap URL count, homepage+menu links, last update, security/perf/UX issues, contact email), dedup against the CRM, and load them as NEW targets in a dated, criteria-labeled target list. Use when the user asks to prospect, find leads, build a target/lead list, or source redesign prospects.
---
```

Body sections (write each as clear instructions):

1. **Resolve inputs** — parse the prompt for quantity (default **30** net-new qualified), industries (optional), website criteria (optional, free-form), geography (tight→broad), and environment. Ask targeted follow-ups only for what's missing/ambiguous; **always** ask for the environment if unspecified. State the resolved plan back to the user before running.
2. **Environment gate** — `qa` or `prod`. Before any `prod` write, get an explicit "yes, load to prod" confirmation.
3. **Plan the sweep** — derive the vertical set (given, or spread across sensible local verticals) and geography breadth.
4. **Fetch existing CRM websites for dedup** — via `crm_list_targets` (paginate) in the chosen environment; keep the list of existing `company_website` values for the top-up loop.
5. **Parallel research** — using `dispatching-parallel-agents`, dispatch one research subagent per vertical. Give each subagent the geography, the vertical, the website criteria, a per-vertical over-fetch target, and instruct it to follow `references/research-recipe.md` exactly and return a structured list of verified, enriched candidates.
6. **Top-up loop** — consolidate returned candidates; run `node .claude/skills/prospect/scripts/dedupe.mjs` logic (import `filterNewByWebsite`) against the existing-CRM set **and** within-batch to count **net-new qualified**. If below N, dispatch more research (more candidates in the same verticals, then broaden geography) and repeat. Stop at N, or at an **attempt cap of 4 top-up rounds**; if still short, proceed with what cleared and **report the shortfall and why** (e.g., "niche exhausted").
7. **Rank** — order by signal severity (broken > stale/security > cosmetic) for triage.
8. **Load** — follow `references/load-mapping.md`.
9. **Report** — print counts (candidates found / verified / duplicates skipped / loaded), per-vertical breakdown, ranked tiers, environment, the criteria string, and the target-list id/link; note any shortfall against N.

- [ ] **Step 2: Validate the skill file structure**

Run:
```bash
head -5 .claude/skills/prospect/SKILL.md    # front matter present, name: prospect
test -f .claude/skills/prospect/SKILL.md && echo "SKILL.md OK"
```
Expected: front matter shows `name: prospect` and a `description:`; file exists. (Confirm the skill appears in the session's skill list on next load.)

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/prospect/SKILL.md
git commit -m "feat(prospect): skill orchestrator (params, sweep, top-up loop, report)"
```

---

### Task 3: Reference — the per-candidate research + enrichment recipe

**Files:**
- Create: `.claude/skills/prospect/references/research-recipe.md`

**Interfaces:**
- Consumes: nothing. Produces: the exact instructions each research subagent follows; referenced by `SKILL.md` step 5.

- [ ] **Step 1: Write the recipe file**

Author `references/research-recipe.md` covering, as explicit steps a subagent follows per candidate:

1. **Discover** real candidates in the vertical + geography (web search for real local businesses; never invent).
2. **Fetch & verify (HARD GATE):** `curl -sSL -A "Mozilla/5.0" --max-time 20 <url>` — the site must return **HTTP 200** with real HTML. Confirm it meets the **website criteria** (or, if none given, the default "redesign candidate" heuristic: visibly dated design, weak UX, poor performance). **Drop** anything unreachable (403/blank/DNS-fail), non-matching, or not a real business. **Never fabricate** a URL, business, version, or metric.
3. **Always-collect enrichment** (record every field found):
   - If WordPress: core **version** (`<meta name="generator">` / fingerprints), **page builder(s)** (WPBakery/Elementor/Beaver/Divi/Oxygen/…), **theme** (`wp-content/themes/<slug>`), notable **plugins** (`wp-content/plugins/<slug>`).
   - **Sitemap(s):** fetch `robots.txt` + `/sitemap.xml` (and nested sitemaps); **count total URLs**.
   - **Homepage links:** count links in the homepage and its nav menus.
   - **Most recent update:** newest sitemap `lastmod` or `Last-Modified` header.
   - **Signals:** concrete security (stale core/plugins, discontinued trackers), performance (page weight, render-blockers), and UI/UX (unreadable/overlapping/broken elements — confirm visual claims with a real browser screenshot) issues.
   - **Contact email:** a generic inbox (`info@`, `contact@`) or an owner/president name + email where findable on the site (contact/about pages, schema JSON).
4. **Return** a structured record per kept candidate: `company`, `company_website` (root), `city`, `industry`, `email`, and a `description` that concatenates the enrichment findings + a one-line opener hook naming the single strongest redesign motivator.
5. **Confidence & drops:** note dropped candidates and why (so a later pass doesn't recheck them).

- [ ] **Step 2: Validate**

Run: `test -f .claude/skills/prospect/references/research-recipe.md && grep -qi "HTTP 200" .claude/skills/prospect/references/research-recipe.md && echo OK`
Expected: `OK` (the hard gate is present).

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/prospect/references/research-recipe.md
git commit -m "docs(prospect): per-candidate research + enrichment recipe"
```

---

### Task 4: Reference — the CRM load mapping + safety checks

**Files:**
- Create: `.claude/skills/prospect/references/load-mapping.md`

**Interfaces:**
- Consumes: `scripts/dedupe.mjs` (Task 1). Produces: the load instructions referenced by `SKILL.md` step 8.

- [ ] **Step 1: Write the load-mapping file**

Author `references/load-mapping.md` covering:

1. **Choose the MCP server** for the environment: `rade-crm-qa` (qa) or `rade-crm-prod` (prod).
2. **Parity-schema safety check (HARD GATE):** create the **first** target with `company_website` set, then read the returned record. If `company_website` came back `null`, the session is advertising the pre-parity tool schema — **abort the load**, tell the user to run the skill in a session started after the parity deploy (or use CSV import), and do not create the rest. *(This is the field-stripping failure mode from Review Focus.)*
3. **Create/reuse the target list** via `crm_create_target_list`: name `"<geography> — <criteria label> — <YYYY-MM>"`; **description records the exact build criteria** (verticals, website-criteria string, geography, requested quantity, run date). Reuse an existing same-named list if present.
4. **Create each target** via `crm_create_target` using the field mapping (Global Constraints): `company`+`last_name`=business name, `company_website`=root URL, `industry`=vertical, `city`/`country`, `email`/`company_email`=contact, `description`=enrichment+hook. `triage_status` defaults to `NEW`.
5. **Attach all** created target ids to the list in **one** `crm_add_to_target_list` call (`target_ids` array).
6. **Dedup reference:** the net-new set was already filtered with `filterNewByWebsite` (Task 1) against the CRM in `SKILL.md` step 6 — do not re-load skipped duplicates.

- [ ] **Step 2: Validate**

Run: `test -f .claude/skills/prospect/references/load-mapping.md && grep -qi "abort the load" .claude/skills/prospect/references/load-mapping.md && echo OK`
Expected: `OK` (the parity-schema safety gate is present).

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/prospect/references/load-mapping.md
git commit -m "docs(prospect): CRM load mapping + parity-schema safety gate"
```

---

### Task 5: End-to-end dry-run acceptance (live, small)

**Files:** none (exercises the skill).

**Interfaces:** Consumes the whole skill.

- [ ] **Step 1: Small live run**

Invoke `/prospect` with a deliberately small, narrow request into **qa**: `find 3 leads, HVAC, in Olathe KS, into qa`. Let the skill resolve params (quantity 3), run the sweep, and load.

- [ ] **Step 2: Verify the acceptance criteria (spec §8)**

Confirm, via `crm_list_targets` / the QA app:
- Exactly **3 net-new qualified** targets loaded (or fewer with an explicit exhaustion reason).
- Each has `company`, `company_website`, `city`, `industry`, an `email` when findable, and a `description` containing the §4 data set (WP version/builder/theme/plugins where WP; sitemap URL count; homepage+menu link counts; last update; ≥1 concrete issue).
- A target list exists named by geography+criteria+month, whose **description records the criteria**; all targets are `NEW`.
- No fabricated data — spot-check one site returns HTTP 200 and its stated version/signals match.

- [ ] **Step 3: Verify dedup on re-run**

Re-invoke the same request. Expected: **0 new** targets loaded (all 3 skipped as existing), and the report states the skip count.

- [ ] **Step 4: Commit any fixes**

If the run surfaced recipe/mapping gaps, fix the skill files and commit:
```bash
git add .claude/skills/prospect
git commit -m "fix(prospect): address dry-run findings"
```

---

## Notes for the executor

- This plan produces a **skill**, so most tasks are authoring instructions, not code — the only unit-tested unit is Task 1. Quality comes from the explicit hard gates (HTTP-200 verify, never-fabricate, dedup, parity-schema check, env confirmation) and the Task 5 live acceptance.
- Doc-sync on completion: add a `LESSONS_LEARNED.md` entry only if the dry run surfaces a recurring gotcha; `PROJECT_STRUCTURE.md` gains the `.claude/skills/prospect/` skill if skills are mapped there. No `UPSTREAM_IMPACT_LOG.md` entry — nothing upstream-owned is touched.
- Pre-PR gate before shipping: `deep-review`, then doc-sync, then PR (ask before pushing).
