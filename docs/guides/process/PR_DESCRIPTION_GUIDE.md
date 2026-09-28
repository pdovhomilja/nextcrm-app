# PR Description Guide

The house style for pull-request descriptions, with copy-paste templates. A good
PR description does two jobs: it tells the **reviewer** exactly what to scrutinize
(and what's already been checked), and it leaves the **archaeologist** — you, six
months from now, running `git blame` — enough to understand *why* without
re-reading the diff.

> Companion to `docs/guides/process/DOCUMENTATION_GUIDE.md` (doc-writing style) and
> `docs/guides/ENGINEERING_PLAYBOOK.md` §4 (the PR *procedure*). This file is only about the
> description text.

---

## Title — conventional commits

```
<type>(<scope>): <imperative summary>
```

- **type:** `feat` · `fix` · `chore` · `docs` · `test` · `refactor` · `perf`
- **scope:** the area touched (`config`, `platform`, `auth`, `deps`, `db`, …)
- Summary is imperative and specific — name the actual change, not "updates".

Real examples:
```
feat(config): reorganize board admin config into tabs
fix(platform): correct Prisma relation include (fixes "Account not found")
chore(deps): pnpm audit fix — resolve high-severity prod advisories
test(16a): r25 signup dual-identity E2E — close manual↔E2E parity gap
docs(env): document the QA-tier migration + promote flow
```

---

## Every PR ends with the footer

```
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

---

## Two shapes: fix vs. everything else

Bug fixes lead with the **problem**; features lead with the **change**. Pick the
shape that matches, include the sections that apply, drop the ones that don't.
Don't pad — a docs-only PR is three lines and that's correct.

### Template A — Feature / change

```markdown
## What

<One or two sentences: what this delivers and where it lives. State the scope
boundary up front — e.g. "No migration, no schema change" or "presentation-only".>

<Optional: a table or bullet list of the concrete pieces. Use a table when there's
a clean key→value shape (tab → contents, route → behavior).>

## Key changes

- **<Component/file>** — <what changed and the one non-obvious thing about it>.
- <Call out any deliberate architectural choice, prefixed "owner decision:" when
  it was a product call, not a technical one.>

## Trust boundary / security

<Only when the change touches an auth surface, a query scope, a public endpoint,
or user data. State what the new/changed trust boundary is and why it's safe —
"scoped to the server-resolved id, never the body", "gating is UX-only, enforced
server-side", etc. If there's no new auth surface, say exactly that.>

## Testing

- **Unit (added/updated):** <files + what each covers>.
- **E2E:** <specs + what they exercise; how many ran and that they passed — the
  E2E tier is the only one that exercises the real database>.
- **Revert-verified** the <X> regression test (fails with the fix removed).
- <Cited totals: "N unit + coverage, lint/typecheck/build clean.">

## Deep review

<Summary of the pre-PR review: "Security / Performance / Efficiency pass — 0 🔴 /
0 🟠 / N 🟡." What was found and fixed; what was accepted as-designed and why;
anything flagged but deliberately left out of scope.>

## Docs synced

<Every doc updated, with the section touched: `data-model.md` (…), `modules.md`
(…), `phase-N-manual-testing.md` (…). If a doc-sync pass caught a pre-existing
inaccuracy, say so — that's a feature of the process.>

## After merge

<Only when the PR adds `prisma/migrations/`: "Adds a Prisma migration —
`migrate-qa.yml` runs `prisma migrate deploy` against QA and advances `qa` after
this merges to main (main itself does not deploy). Reaches production via the
gated Promote button, not automatically." List the migration files if there are
several.>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

### Template B — Bug fix

```markdown
## Symptom

<What the user actually sees, concretely. "Clicking any account shows 'Contact
not found' even though the contact exists." Include that the data is intact if
it's a query bug, not data loss — rule out the scary interpretation early.>

## Root cause

<The mechanism, not just the location. Why does it happen? What changed to
introduce it (name the migration/commit if known)? A table of call sites → effect
is ideal when one root cause has several user-visible symptoms:>

| File | Bug → | User-visible effect |
|---|---|---|
| [`path/to/file`](path/to/file) | <what goes wrong> | <what the user sees> |

<Note when/why it surfaced ("after a local env rebuild applied migration …007").
Pre-empt red herrings: "the '8/1/26' date is unrelated — that's the reseed
timestamp, not a bug.">

## Fix

<What changed, with the key line or snippet. Verify statement: "Verified against
the local DB that this returns the correct data.">

## Test

<Which tier and why THAT tier — "in the E2E tier, the only tier that exercises
the real database, since the unit tier mocks Prisma away." What it asserts
(the result/status, not "no error thrown").>

**Revert-verified:** with the fix reverted, the assertion(s) fail.

## Checks

- `pnpm typecheck` — clean
- `eslint` (changed files) — clean
- `pnpm test:coverage` — <N files / N tests pass, coverage gate held>
- `pnpm test:e2e -- <spec>` — passes (and fails when reverted)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

---

## The section catalog — when to include each

| Section | Include when… |
|---|---|
| **What / Summary** | Always (features). One or two sentences + scope boundary. |
| **Symptom** | Bug fixes. The user-visible problem. |
| **Root cause** | Bug fixes. The *mechanism*; table for multi-symptom causes. |
| **Fix** | Bug fixes. What changed + verification. |
| **Key changes** | Features with several moving parts. |
| **Trust boundary / security** | Any auth surface, query scope, public endpoint, or user data touched. |
| **Why it's safe / Why a standalone PR** | Migrations, dependency bumps, or anything whose *safety* is the question. |
| **Testing / Test / Checks** | Always. Scale to the change. |
| **Deep review** | Any PR that carried new risk (the review ran before the PR — see playbook §4). |
| **Docs synced** | Whenever docs changed — list each with its section. |
| **After merge / Migrations** | Whenever `prisma/migrations/` is touched. |

---

## House idioms (what makes it *this* style)

- **Scope statements up front.** "No migration, no schema change."
  "Presentation-only." "Lockfile-only — no package.json change." A reviewer reads
  this first and calibrates how hard to look.
- **`**Revert-verified:**`** — the explicit callout that a regression test was
  confirmed by reverting its fix and watching it fail. This is load-bearing; it's
  the difference between a test and a decoration (playbook §7).
- **Severity emoji for review findings:** 🔴 Critical · 🟠 High · 🟡 Medium ·
  ⚪ Low. Summaries read "0 🔴 / 0 🟠 / 2 🟡".
- **File references as markdown links** to the repo path (`[foo.ts](path/to/foo.ts)`)
  so they're clickable in the PR.
- **Cite test totals** — "2436 unit + coverage, lint/typecheck/build clean."
  Concrete numbers signal the suite actually ran.
- **Name the tier and why it's the right one** — "the E2E tier, the only tier that
  exercises the real database." Ties back to the testing strategy.
- **"owner decision:"** prefaces a product/architecture call so it reads as
  deliberate, not incidental — and records who decided.
- **Pre-empt red herrings.** If something in the diff or data looks alarming but
  isn't, say so before the reviewer wonders.
- **Doc-sync honesty.** When the doc-sync pass caught a *pre-existing* inaccuracy,
  call it out — it demonstrates the process working, not scope creep.

---

## Checklist — before opening the PR

- [ ] Title is `type(scope): imperative summary`
- [ ] Correct shape (fix = Symptom→Root cause→Fix; feature = What→…)
- [ ] Scope boundary stated ("no migration / no schema change / lockfile-only")
- [ ] Trust-boundary section present if any auth/scope/public surface changed
- [ ] Tests described; totals cited; **Revert-verified** noted for regression tests
- [ ] Deep-review outcome summarized (it ran *before* this PR — playbook §4)
- [ ] Docs-synced list matches what actually changed
- [ ] After-merge migration note if `prisma/migrations/` touched
- [ ] Claude Code footer present
```
