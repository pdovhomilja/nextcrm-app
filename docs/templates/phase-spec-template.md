<!--
  PHASE SPEC template. Copy to docs/plans/phase-<N>-<slug>.md.
  A PHASE is the high-level unit. It decomposes into one or more WORKSTREAMS
  (docs/plans/phase-<N>-ws<M>-<slug>.md), each of which decomposes into one or more PRs.
  RULE: a spec describes intent, scope, decomposition, and acceptance — NEVER
  implementation code. No code fences, no snippets. Describe the change; don't write it.
  Delete this comment once started.
-->

# Phase <N>: <name>

## Goal

<One paragraph — what this phase delivers and why. The outcome, not the how.>

## Scope

- **In:** <what this phase covers>
- **Out (explicit non-goals):** <what it deliberately does not>

## Workstreams

<The decomposition — each links to its workstream spec.>

| WS | Name | Spec | Depends on | Status |
|---|---|---|---|---|
| 1 | <name> | `phase-<N>-ws1-<slug>.md` | — | not started |
| 2 | <name> | `phase-<N>-ws2-<slug>.md` | WS1 | not started |

## Acceptance criteria

<Observable, checkable outcomes that mean the phase is done.>

- [ ] …

## Risks / open questions

- …

## Lessons Learned

<Surprises/traps found during this phase. Promote cross-phase ones to
`docs/reference/LESSONS_LEARNED.md`.>

## Known Gaps

<Deferred items, each with a reason — never a silent omission.>
