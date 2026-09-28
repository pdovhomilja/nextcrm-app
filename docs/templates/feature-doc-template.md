<!--
  Feature / work-unit doc template.
  Copy to docs/features/<feature>.md (or a docs/plans/phase-<N>-<slug>.md spec) and fill in.
  The `ship-phase` skill updates the Status, Lessons Learned, Known Gaps, and
  Manual Testing sections at ship time — keep those headings.
  See docs/guides/process/DOCUMENTATION_GUIDE.md §3 (Lessons Learned) and §4 (Known Gaps).
  Delete this comment once started.
-->

# <Feature / work-unit name>

**Status:** 🚧 In progress <!-- → ✅ Complete at ship time -->

## Goal

<One short paragraph: what this delivers and why. The problem it solves, not the
implementation.>

## Scope

- **In scope:** <the concrete things this unit of work covers>
- **Out of scope:** <what it deliberately does not touch — prevents scope creep>

## Implementation checklist

<!-- The concrete steps; check them off as you go. Ship-phase verifies these are all checked. -->

- [ ] …
- [ ] …

## Lessons Learned

<!--
  NOT a changelog — the diff already records what changed. Record what you'd want
  to have known at the START: what was surprising, tricky, cost real time, or
  would trip the next person. Format each as: what happened → why it mattered →
  what to do about it. If a lesson is broadly reusable, PROMOTE it to the patterns
  doc (docs/testing/e2e-patterns.md) rather than leaving it buried here.
  See DOCUMENTATION_GUIDE.md §3.
-->

- …

## Known Gaps

<!--
  Anything deliberately deferred — a review finding not fixed now, a scenario
  without test coverage, an edge case out of scope — each with a one-line reason.
  A recorded gap is a backlog item; a silent gap is a latent surprise. Never
  silently drop a requirement — flag it here. See DOCUMENTATION_GUIDE.md §4.
-->

- …

## Manual Testing

See `docs/testing/<feature>-manual-testing.md`
