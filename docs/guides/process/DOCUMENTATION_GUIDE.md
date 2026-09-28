# Documentation Guide

How to write documentation, lessons learned, and durable knowledge so it stays
useful months later. Companion to `docs/guides/ENGINEERING_PLAYBOOK.md` (which covers *when*
to update docs and the doc-sync set) — this file covers *how to write them well*.

> The best example of this style already lives in your repo:
> `docs/testing/e2e-patterns.md`. Read a few of its sections and you'll
> see every rule below in practice. When in doubt, imitate it.

---

## 1. The house style — what a good doc section looks like

These rules are what separate a doc that saves the next person an afternoon from
one that just restates the code.

**One canonical fact per section.** A section should answer exactly one question
and be findable by that question. If you're tempted to write "also, related to
this...", start a new section. Sections are the unit of reuse — someone lands on
one from a search, reads it, and leaves.

**Root cause before symptoms.** Lead with *why* it happens, then list the
disguises it wears. A reader who understands the mechanism can diagnose the next
variant; a reader who only has a symptom list is stuck the moment reality differs
by one detail.

> One root cause manifests in many disguises. All the patterns below are
> consequences of it.

**Show wrong-then-right code.** The wrong version is not filler — it's how the
reader recognizes their own mistake. Label both, and make the *difference* the
focal point (a trailing comment on the changed line beats prose).

```typescript
// Wrong — <the specific reason it fails>:
badExample()

// Correct — <what changed and why it works>:
goodExample()
```

**Stamp a hard-won diagnosis with its date and its evidence.** When a fact came
from real investigation, say when you learned it and *what proved it* — a log
line, a container's output, a failing run. This tells the next reader how much to
trust it and where to look if it drifts.

> Diagnosed 2026-07-26 from the auth container log, not from the browser.

**State what does NOT fix it.** Dead ends you already walked are as valuable as
the fix — they stop the reader re-walking them. List the plausible-but-wrong
approaches and why each fails.

**Close with the generalized lesson.** End a specific war story with the portable
rule, so the doc teaches beyond the one case:

> Generalise: for any controlled form, "the value is in the input" is not evidence
> the framework knows about it. Assert on the outcome, not the field.

**Write the failure mode, not just the rule.** "Do X" is weaker than "if you do Y
instead, Z breaks silently on CI but passes locally." The consequence is what
makes a rule stick and tells the reader how much it matters.

---

## 2. The "revert-and-recheck" litmus — for docs about guards

The playbook applies this to tests; it applies to documentation too. When you
document that something is a *guard* (a test, an assertion, a validation), ask:
**if the thing it guards were removed, would this still read as true?** A doc that
describes a test as "proving X" when the test stays green with X reverted is
documenting a comforting fiction. Say what the guard *actually* pins, not what it
was intended to.

This is the single highest-value habit: most stale docs aren't wrong about syntax,
they're wrong about *what protects what*.

---

## 3. Lessons Learned sections

Most phase/feature docs and PRs end with a Lessons Learned section. It is **not a
changelog** — the diff already records what changed. It records what you'd want to
have known at the *start*.

**A line earns its place if it was surprising, tricky, cost real time, or would
trip the next person.** Examples of what belongs:

- A framework behaved differently than its docs implied (with the evidence).
- A "simple" change turned out to have a non-obvious dependency or ordering.
- A fix that looked right was wrong, and why the wrong version was tempting.
- A tool/config gotcha that isn't discoverable from the code.

**What does NOT belong:** "implemented the X component", "added tests", "renamed
Y" — that's the diff. If a line could be reconstructed by reading the merged code,
cut it.

**Format each as: what happened → why it mattered → what to do about it.** A bare
observation ("hydration was tricky") helps no one; the actionable form does:

> **Controlled inputs silently discard fills that land before hydration.** Cost
> ~2h chasing a phantom timeout. Fix: `waitUntil: 'load'` on static form pages,
> and a retryable sign-in helper. See the E2E patterns doc.

If a lesson is broadly reusable (not tied to this one feature), don't leave it
buried in a phase doc — **promote it** to the durable home (see §5).

---

## 4. Known Gaps — deferrals are recorded, never silent

Anything deliberately deferred — a review finding you chose not to fix now, a
scenario without test coverage, an edge case out of scope — goes in a **Known
Gaps** section with a one-line reason. Two rules:

- **A deferral is a decision, so write it down.** A gap that's recorded is a
  backlog item; a gap that's silent is a latent surprise that reads, later, as a
  bug someone shipped without noticing.
- **Never silently drop a UI element, field, or requirement** because it has no
  obvious home. Flag it. A visible "we didn't do X, because Y" is worth far more
  than an implied "everything is covered."

---

## 5. Where does this knowledge belong? (placement taxonomy)

Half of documenting well is putting the fact where it'll be *found* — at the
altitude and lifespan that match it. Before writing, ask which of these it is:

| The knowledge is... | It belongs in... | Lifespan |
|---|---|---|
| Why *this change* was made / how to test it | The **PR description** (house style: `docs/guides/process/PR_DESCRIPTION_GUIDE.md`) | Transient — dies with the PR |
| How the system *is* (schema, routes, contracts, behavior) | The **spec / data-model docs** | Durable — kept in sync forever |
| A cross-cutting *trap* that will bite any future change | The **patterns doc** (e.g. `e2e-patterns`) | Durable — grows over time |
| What was tricky *in this phase/feature* | The feature doc's **Lessons Learned** | Semi-durable — promote if reusable |
| A deferred item | The feature doc's **Known Gaps** | Until closed |
| A working preference or a correction on *how you want work done* | **Persistent memory** (§6) | Cross-project |

The common failure is writing a durable trap into a transient place (a PR body
nobody re-reads) or vice versa. When a Lessons-Learned line turns out to be a
general trap, **move it** to the patterns doc — that's the whole point of the
"promote" step.

### Where those docs physically live (`docs/` layout)

The taxonomy above says *what kind* of doc a fact belongs in; this is *where each
kind lives on disk*, so there's one obvious home instead of re-deciding every
time. Recommended layout (adapt names to the project — `TODO:` the ones that
differ):

```
docs/
├── overview.md                     → product/architecture entry point ("start here")
├── spec/                           → how the system IS — durable, kept in sync
│   ├── data-model.md               → schema, migrations, indexes
│   ├── modules.md                  → routes / pages / API surface
│   └── platform.md                 → email, storage, security, observability
├── plans/                          → phase & workstream SPECS (intent only — NO code)
│   ├── phase-<N>-<slug>.md         → phase spec (templates/phase-spec-template.md)
│   └── phase-<N>-ws<M>-<slug>.md   → workstream spec (templates/workstream-spec-template.md)
├── features/                       → ONE doc per unit of work; Lessons Learned + Known Gaps live here
│   └── <feature>.md                → start from docs/templates/feature-doc-template.md
├── testing/
│   ├── e2e-patterns.md             → cross-cutting test traps (grows over time)
│   ├── e2e-commands.md             → how to run the suites
│   └── <feature>-manual-testing.md → manual scenarios (bidirectional E2E parity)
├── reference/                      → durable reference (doc-sync targets)
│   ├── LESSONS_LEARNED.md          → central recurring-trap log (MANDATORY doc-sync)
│   ├── ENVIRONMENT_VARIABLES.md    → every .env.example var (env-doc guard enforces via scripts/check-env-docs.sh)
│   └── PROJECT_STRUCTURE.md        → annotated repo map
├── guides/
│   ├── ENGINEERING_PLAYBOOK.md     → the "why" behind the rules
│   ├── process/                    → CI_AND_ENVIRONMENT_DESIGN, DOCUMENTATION_GUIDE, PR_DESCRIPTION_GUIDE
│   └── platform/                   → LOCAL_DEV_GUIDE, SUPABASE_ON_VERCEL (Supabase DB host + pooler), ISR_AND_CACHING (Upstash Redis)
└── templates/
    ├── phase-spec-template.md      → phase spec skeleton
    ├── workstream-spec-template.md → workstream spec skeleton
    ├── feature-doc-template.md     → feature/work-unit doc skeleton
    └── manual-testing-template.md  → manual-testing doc skeleton
```

(Repo-root artifacts outside `docs/` — `.github/workflows/` for CI + prod
migrations (`prisma migrate deploy`), `scripts/` and env examples, `.env.example`,
`.gitignore` — are covered in `ENGINEERING_PLAYBOOK.md` §2/§7.)

> **Fork reality — this is not a greenfield tree.** The Rade Engineering CRM fork
> already carries docs under `docs/specs/`, `docs/deployment/`, `docs/internal/`,
> and `docs/superpowers/` (with `notes/`, `plans/`, `qa/`, `specs/` subdirs), plus
> `docs/guides/`. Treat the layout above as the *target* shape and map the ported
> docs onto what already exists rather than growing a parallel tree.
> TODO(rade): map the recommended layout (`spec/`, `plans/`, `features/`,
> `testing/`, `reference/`) onto the existing `docs/` tree.

Mapping back to the taxonomy rows:

| Taxonomy home | Physical location |
|---|---|
| Spec / data-model docs | `docs/spec/*.md` |
| Phase / workstream specs (intent, no code) | `docs/plans/phase-<N>-<slug>.md`, `docs/plans/phase-<N>-ws<M>-<slug>.md` |
| Patterns doc (cross-cutting traps) | `docs/testing/e2e-patterns.md` (+ new ones under `docs/testing/`) |
| **Central** recurring-trap log (mandatory doc-sync) | `docs/reference/LESSONS_LEARNED.md` |
| A unit's **local** Lessons Learned / Known Gaps | its phase/workstream spec or `docs/features/<feature>.md` |
| Manual test scenarios | `docs/testing/<feature>-manual-testing.md` |
| Repo map / env-var reference | `docs/reference/PROJECT_STRUCTURE.md`, `docs/reference/ENVIRONMENT_VARIABLES.md` |
| PR description / persistent memory | Not in `docs/` — the PR itself / the agent's memory store |

> **Two homes for lessons:** a lesson local to one unit of work stays in that
> phase/workstream spec (or feature doc); anything **cross-phase or recurring** is
> promoted to `docs/reference/LESSONS_LEARNED.md` — a mandatory doc-sync target.
>
> **Work hierarchy:** a **phase** → one or more **workstreams** → one or more **PRs**
> (`docs/plans/`). Projects that prefer flat **features** use `docs/features/<name>.md`
> instead. Either way, **one doc per unit of work**, its Lessons Learned + Known Gaps
> live *in that doc*, and specs never contain implementation code.

New feature/work-unit docs start from
[`docs/templates/feature-doc-template.md`](../templates/feature-doc-template.md),
which ships the `## Lessons Learned` and `## Known Gaps` sections pre-stubbed so
they always land in the same place.

---

## 6. Persistent memory — one fact per file

If your agent/harness supports a persistent memory store, treat it as the home for
facts that (a) are non-obvious, (b) would cost time to rediscover, and (c) aren't
already recorded by the code or git history.

**Structure each memory as one fact, with why and how-to-apply.** A bare rule is
brittle; the reasoning is what lets you (or the agent) apply it correctly to a new
situation and recognize when it no longer holds.

```
<the fact, stated plainly>
Why: <the reason it's true / the cost of getting it wrong>
How to apply: <what to actually do next time>
```

**Categories worth keeping:**
- **User/project profile** — who's working, constraints, goals not derivable from code.
- **Feedback** — corrections and confirmed approaches ("do it this way, because...").
- **Locked decisions** — architectural choices not to re-litigate.
- **Traps** — the silent-failure / environment-drift class that cost hours once.

**Do NOT memorize** what the repo already records (code structure, past fixes, git
history, CLAUDE.md). If asked to "remember" something the code already says, ask
what was *non-obvious* about it and save that instead.

**Memory is a snapshot, not live truth.** A stored fact reflects what was true when
written. If it names a file, function, or flag, verify it still exists before
acting on it.

---

## 7. Keeping docs in sync

Covered in `docs/guides/ENGINEERING_PLAYBOOK.md` §8 — walk the full doc-sync set on every
change, confirm each file is updated or explicitly N/A, and treat the testing and
data-model docs as the usual blind spots. The habit that guide adds to this one:
**a doc edit is part of the change, reviewed with it — not a follow-up.** A
follow-up doc PR is how the fact and its documentation drift apart.

---

## Checklist — before calling a doc "done"

- [ ] Each section answers one findable question
- [ ] Root cause stated before symptoms; mechanism, not just recipe
- [ ] Wrong-then-right code where a mistake is easy to make
- [ ] Hard-won diagnoses stamped with date + evidence
- [ ] Dead ends ("what does NOT fix it") recorded
- [ ] Guard-docs pass the revert-and-recheck litmus (describes what's *actually* pinned)
- [ ] Lessons Learned are surprises/traps, not a changelog
- [ ] Deferrals recorded in Known Gaps with reasons; nothing silently dropped
- [ ] Knowledge placed at the right altitude/lifespan (§5); reusable traps promoted
- [ ] Full doc-sync set walked (see playbook §8)
