# Homepage Prompt Layers — Configurable Design Variability

**Status:** 🚧 Draft for review

## Goal

AI homepage generations currently converge on one look (soft arches, pills, bokeh, one-display + one-text font) and one section recipe, regardless of the business. The cause is that every run is steered by the *same* prompt. This feature decomposes the generation prompt into **composable, user-configurable layers** — so different businesses get genuinely different, on-brand designs — while reusing the prompt-library machinery the fork already has (`crm_Ai_Prompt`, `/campaigns/prompts`, the prompt CRUD actions, and MCP parity).

The headline outcome: an operator can curate a library of **style directions**, **industry/vertical** briefs, and an **anti-pattern** list, and the generator composes them per target with a clear precedence — with everything degrading gracefully to today's behavior when the library is empty.

## Problem & current state

`lib/homepage/prompt.ts` composes exactly two pieces today:

- `DEFAULT_BASE_PROMPT` (overridable via a single admin-chosen `HOMEPAGE_BASE` prompt) — a generic "premium" brief that also hardcodes one **Structure** recipe (hero + CTA → value → services → social proof → contact).
- `MACHINE_CONTRACT` (always appended, code-owned) — output JSON shape, egress hosts, logo/image tokens.

With identical steering every run, the model falls back to its default house style (confirmed in production critiques: "glass pill nav, marquee strip, numbered pill rows, orb-and-arch collage"). Convergence is **prompt-driven**, not a sampling-temperature issue.

## The layered model

The system prompt is composed, in this fixed order, from **general → specific**, with the machine contract always last and absolute:

| Order | Layer | Applied | Selection | Configurable via |
|------|-------|---------|-----------|------------------|
| 1 | **Base** — how to build a premium site, element-agnostic (craft, motion quality, type scale, spacing, accessibility, content integrity). No look, no section recipe. | Always | Single admin-chosen | `HOMEPAGE_BASE` (exists) |
| 2 | **Industry / vertical** — sections, trust signals, tone, and primary conversion appropriate to the business type. | When the target has a vertical set (else the Generic default) | **Dropdown on the target** → one industry prompt | `HOMEPAGE_INDUSTRY` (new) |
| 3 | **Style / art direction** — pure look: shape language, type-pairing vibe, layout archetype, color treatment, motion character. | Always (one picked) | **Stable per target** (deterministic hash of the target id → one active style) | `HOMEPAGE_STYLE` (new) |
| 4 | **Anti-patterns / "avoid"** — the cliché-killer "never do this unless the brand calls for it" list. | Always (all active concatenated) | n/a | `HOMEPAGE_AVOID` (new) |
| 5 | **Per-target operator prompt** — free text typed in the Generate drawer; highest-priority *intent*. | When provided | n/a (operator types it) | existing drawer field |
| 6 | **Machine contract** — output JSON shape, egress, logo/image tokens. Code-owned, non-overridable. | Always, last | n/a | code only |

**Precedence principle:** general → specific; the operator prompt wins on *intent*; the machine contract wins on *format* and is always last. Each layer has a **narrow, non-overlapping remit** (base = craft, industry = content/sections/conversion, style = look, avoid = negatives) — that narrowness is what keeps layers from fighting. Later/more-specific layers may override earlier guidance except the machine contract.

**Graceful degradation (hard requirement):** every new layer is optional. An empty `HOMEPAGE_STYLE`/`HOMEPAGE_INDUSTRY`/`HOMEPAGE_AVOID` library contributes nothing, and composition falls back to exactly today's base + machine-contract behavior. No layer may ever hard-fail a generation.

## Selection logic

- **Style (stable per target):** deterministically hash the homepage/target id into an index over the *active* `HOMEPAGE_STYLE` set (sorted by a stable key). Same target → same card across regenerate **and** AI-refine; different targets spread across the set. Pure, unit-testable function. Empty set → no style layer.
- **Industry (dropdown on target):** the target stores a nullable reference to a `HOMEPAGE_INDUSTRY` prompt. The Generate drawer shows a dropdown whose options **are** the active industry prompts (so curating verticals = curating prompts — no separate hardcoded enum). Null → the Generic default industry prompt (the `HOMEPAGE_INDUSTRY` flagged `is_default`), else nothing.
- **Avoid (always):** concatenate all active `HOMEPAGE_AVOID` prompts (normally one). Scoped org-wide.
- **Operator prompt:** unchanged — appended as today, after the configured layers.

The free-text `crm_Targets.industry` string is **kept** (it still feeds the brief and image planning). The new vertical dropdown is a **separate structured field**. At target-creation we best-effort pre-select the dropdown by matching the free-text industry to a vertical (keyword match), so it rarely needs manual setting; the operator can always change it.

## Data model

Additive only — no destructive change.

- **`crm_Ai_Prompt_Kind` enum** — add `HOMEPAGE_INDUSTRY`, `HOMEPAGE_STYLE`, `HOMEPAGE_AVOID`. (Additive enum values → one migration.)
- **`crm_Targets`** — add nullable `homepage_industry_prompt_id` (uuid, FK-by-convention to `crm_Ai_Prompt`, no hard FK needed; null = Generic default). (One migration; additive column.)
- **Settings** — optional `homepage.vary_design` toggle in the existing key/value `crm_SystemSettings` store (no migration), default **on**. Off → skip layers 2–4 (base-only behavior).
- **`is_default`** on `crm_Ai_Prompt` (exists) marks the Generic industry prompt and, if desired, a default style.

Migration ordering (per CLAUDE.md): these are **additive** → migration-first (the enum + column migration PR lands and deploys to QA before the code that reads them), then the code PR.

## Admin / UI surface

Reuse what exists; minimal new surface:

- **Prompt library (`/campaigns/prompts`)** — the kind tabs/filter gains Industry, Style, and Avoid. CRUD, org/personal scope, soft-delete, and `is_default` all reuse the current screen and actions. (Confirm the intended location before building per the UI-surface rule.)
- **Generate drawer (target)** — add the **Industry** dropdown (lists active industry prompts; defaults to the pre-matched vertical or Generic). The existing operator free-text field is unchanged.
- **Admin → Homepage Generation settings** — add the `vary_design` on/off toggle alongside the existing model/max-tokens/base-prompt/image settings.

## MCP parity

Extend the existing prompt CRUD MCP tools (`crm_create_prompt` / `crm_update_prompt` / `crm_delete_prompt` / `crm_list_prompts`) to accept the three new kinds. Optionally extend `crm_create_target`/`crm_update_target` to set `homepage_industry_prompt_id`. No new tool shapes required.

## Backward compatibility & token budget

- **Compatibility:** empty libraries → today's output. Existing `HOMEPAGE_BASE` prompts keep working; we only *trim* the default base of the hardcoded Structure recipe (moved into industry/style remit).
- **Token budget (explicit constraint):** more layers = longer system prompt = more cost and max-tokens pressure (we already hit a truncation incident → default `max_tokens` is 24000). Each seed layer is kept tight; the composed system prompt is **capped** (hard backstop on total length, trimming lowest-precedence optional layers first) so layering can never blow the budget or truncate output.

## Security & scope

- Application-code authz as always (no RLS): prompt CRUD and the settings toggle are **admin-gated server-side**; the industry dropdown write on a target is owner/role-scoped like other target writes.
- Soft-delete (`deletedAt`) filters on every prompt read; `is_default` resolution ignores soft-deleted rows.
- No new secrets, no new egress. The machine contract (egress allowlist, tokens) is unchanged and still non-overridable by any layer.
- Audit: creating/editing/deleting a prompt and changing the vary-design setting follow the existing audit pattern for prompt-library + homepage settings.

## Acceptance criteria

1. With a populated library, two targets in different verticals and different style cards produce visibly different structure **and** look; regenerating one target keeps its style card and vertical.
2. With empty `HOMEPAGE_STYLE`/`HOMEPAGE_INDUSTRY`/`HOMEPAGE_AVOID` libraries, output matches today's behavior (base + machine contract).
3. Setting the industry dropdown on a target changes the vertical layer on the next generate/refine; unset → Generic default.
4. The operator free-text prompt still overrides style/industry guidance; the machine contract still wins on format.
5. Turning `vary_design` off yields base-only behavior.
6. The composed system prompt never exceeds the cap; no generation fails because a layer is missing, empty, or soft-deleted.
7. The three new kinds are fully CRUD-able in the UI and via MCP, with org/personal scope and soft-delete.

## Risks / open questions

- **Industry free-text → vertical pre-match** is heuristic (keyword match). Acceptable because the operator can always correct the dropdown; the match is a convenience, not a correctness requirement.
- **Combinatorial coherence:** only *one* layer is pick-one (Style). Industry is deterministic (dropdown), base/avoid are always-applied. This is deliberate — stacking multiple random pick-one layers would produce incoherent combos.
- **Vertical groupings (decided):** remodeling keeps roofing/siding/gutters/windows/garage/masonry folded in; automotive keeps repair + detailing together. Confirmed — not split in v1.
- **Refine rubric layer deferred to v2** (making `AUTO_REFINE_PROMPT` a configurable `HOMEPAGE_RUBRIC` kind) — out of scope here.
- **Seed delivery (decided):** seeding is **idempotent** — re-running never duplicates — via upsert on a stable natural key (`kind` + canonical name, org scope, system-created). Delivered as a **runnable script** (the pattern used on the other projects, e.g. `pnpm seed:homepage-prompts`) that can be pointed at any environment, and also wired into local `prisma/seeds/seed.ts` for dev. The operator can edit/extend/soft-delete seeded entries afterward; a re-run restores/updates the canonical set without clobbering operator-created prompts.

## Known Gaps

- No per-run style override in the drawer in v1 (selection is stable-per-target + the operator free-text). Could add a style dropdown later.
- Industry pre-match is best-effort only.
- Refine-rubric configurability deferred to v2.

---

## Appendix A — Seed prompt bodies (starter library)

> These are **content**, not code — the starter entries seeded into the library, each editable in the UI. Every layer still defers to the machine contract and must honor the target's real brand colors/fonts/copy, WCAG AA contrast, and a `prefers-reduced-motion` fallback.

### A.1 Base (`HOMEPAGE_BASE`, refactored — craft only, no look, no section recipe)

> You are a senior web designer and creative director producing a premium, memorable homepage for a small business. Focus on CRAFT, independent of any particular visual style:
> - A clear concept and confident point of view; never a stock-template feel.
> - A modular, fluid type scale with strong hierarchy and a tasteful Google Font pairing.
> - Generous, consistent spacing; a cohesive color system derived from the business's real brand; responsive and mobile-first from 360px to 1440px with CSS grid/flexbox.
> - Motion that supports content, never obstructs it: staggered scroll reveals (GSAP ScrollTrigger), restrained parallax, tactile hover micro-interactions — with a `prefers-reduced-motion` fallback that disables them.
> - Accessibility: semantic landmarks, descriptive alt text, AA contrast, visible focus states.
> - Content integrity: reuse only the supplied brand, name, colors, and real copy. Never invent phone numbers, addresses, emails, testimonials, hours, or claims.
> - If screenshots are provided, they show the current site and/or a previous attempt; preserve brand identity while fixing weaknesses. Design around real photography when images are provided.
> The page's section structure and visual style come from the layers that follow; do not impose a fixed section recipe here.

### A.2 Avoid (`HOMEPAGE_AVOID`, always applied)

> Avoid these overused "AI-template" patterns unless the brand genuinely calls for one:
> - **Layout:** default hero-text-left / image-right split; three identical feature cards in a row; centered headline + subhead + two buttons with nothing else above the fold; relentless symmetry.
> - **Decoration/shapes:** glassmorphism (frosted translucent panels); large blurred gradient "blobs" or bokeh orbs as filler; spinning circular badges/seals; floating arches-and-circles collages; pill-shaped everything; gratuitous glows and drop shadows.
> - **Motion:** tilted/scrolling marquee strips; count-up number tickers; elements flying in from offscreen for no reason; purposeless parallax.
> - **Typography:** one giant gradient-filled headline word; letter-spacing cranked on everything; a single trendy font with no real hierarchy.
> - **Copy:** vague hype ("Elevate your experience," "Welcome to the future of…," "We're passionate about…"); emoji bullet lists; manufactured urgency.
> - **Structure:** a numbered "1–2–3 how it works" pill row as filler; a logo cloud of brands they don't have; sections padded with placeholder content.
> Instead: commit to one clear concept, let whitespace and real content carry the page, make every element earn its place, and prefer an unexpected-but-appropriate layout over the safe template. Never fabricate content to fill a section — cut the section.

### A.3 Style / art-direction cards (`HOMEPAGE_STYLE`, stable-per-target pick)

Each card still adapts the target's real brand palette/fonts and honors accessibility.

1. **Editorial / magazine** — High-contrast serif display + clean grotesk body; asymmetric columns, drop caps, hairline rules; ink-on-cream plus one accent; print-like fades; long-form, story-driven layout.
2. **Swiss / grid-minimal** — Neutral grotesk on a strict modular grid, left-aligned, baseline rhythm; flat color blocks, no ornament; tiny functional motion; rational, information-first.
3. **Brutalist / raw** — Mono or heavy grotesk, visible grid, hard edges, oversized type; black/white plus one loud accent, borders; abrupt snappy motion; bold and unconventional.
4. **Warm organic** — Rounded/soft shapes, arches, soft gradients; humanist sans + friendly serif; warm palette; gentle staggered reveals and soft parallax; approachable.
5. **Luxe dark / cinematic** — Deep near-black with a metallic or jewel accent; elegant high-contrast display; full-bleed imagery, heavy negative space, spotlighting; slow fades and scale-on-scroll; premium and image-led.
6. **Geometric / Bauhaus** — Bold circles/triangles/blocks, sharp edges, strong grid; geometric sans; brand-bold palette; snappy geometric transitions; playful but structured.
7. **Retro-modern** — Warm retro palette (mustard/rust/cream), groovy display + clean body; rounded-rectangle framing, tasteful badges; bouncy-but-controlled motion; characterful.
8. **Minimal mono** — Near-monochrome, one type family across weights; hairline dividers, micro-labels, large whitespace; whisper-quiet motion; confident restraint that lets photography dominate.
9. **Maximal / expressive** — Layered rich color, big overlapping type, textured grounds, image collage; lively coordinated motion; vibrant, dense-but-controlled.
10. **Tech / product-grade** — Crisp neutral plus one vivid accent, precise grid, card systems, subtle depth; Inter/Geist-style type; smooth purposeful micro-interactions; feature-forward, modern competence.

### A.4 Industry / vertical cards (`HOMEPAGE_INDUSTRY`, dropdown on target)

Format for each: *signature sections · trust signals · primary conversion · tone.* Derived from the actual QA+Prod target industries.

1. **Home trades — HVAC / plumbing / electrical** — Urgency ("24/7 / same-day"), service-area map, licensed-&-insured, financing, review wall · call / book service · reassuring, responsive.
2. **Remodeling, exterior & custom builders** *(kitchen/bath, additions, custom homes, roofing, siding, gutters, windows, garage doors, masonry)* — Before/after gallery, project process, warranties, insurance-claim help · request consultation / free estimate · craftsmanship, trust.
3. **Landscaping & lawn care** — Seasonal services, portfolio, recurring maintenance plans, service area · get a quote · fresh, outdoorsy.
4. **Automotive — repair & detailing** — Certifications/specialties, before/after (detailing), warranties · book appointment / call · honest, expert.
5. **Dental** — New-patient offer, insurance accepted, services grid, doctor bios · book online · clean, friendly-clinical.
6. **Medical & health practice** *(optometry, chiropractic, physical therapy, therapy/counseling)* — Conditions treated, practitioner bios, insurance, appointment · book / request consult · calm, credible.
7. **Salon, spa & beauty** *(hair, nails, barber, med spa, skincare)* — Services + pricing, gallery, stylist bios, Instagram feel · book now · stylish, aspirational.
8. **Veterinary & pet care** *(vet, grooming, boarding/daycare)* — Services, compassionate tone, new-client offer, hours · book appointment · warm, caring.
9. **Fitness & wellness** *(gym, personal training, studio)* — Class schedule, membership tiers, transformations · free trial / join · energetic, motivating.
10. **Food & drink** *(restaurants, cafés, bakeries, breweries)* — Menu, hours, location/map, ambiance photography · reserve / order / visit · appetizing, place-driven.
11. **Events & venues** *(wedding, event, private-event café)* — Gallery, capacity/spaces, tour booking, inquiry form · inquire / book a tour · elegant, evocative.
12. **Legal / law firm** *(PI, estate, family, criminal, business, general)* — Practice areas, attorney bios, results/testimonials, consultation · free consultation · authoritative, trustworthy.
13. **Financial & professional services** *(accounting/CPA, insurance)* — Services, credentials, secure feel, consultation · schedule a consult / get a quote · precise, dependable.
14. **Nonprofit & community** *(social services, food pantry)* — Mission, impact stats, programs, donate/volunteer · donate / volunteer · mission-forward, human.
15. **Generic (default, `is_default`)** — Industry-agnostic premium small-business page with a sensible single CTA; used when no vertical is set · neutral, adaptable.

## Manual Testing

See `docs/testing/homepage-prompt-layers-manual-testing.md` (to be authored with the plan).
