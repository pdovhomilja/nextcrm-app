# Homepage Prompt Layers — Manual Browser Testing Guide

Covers end-user browser testing for the **layered homepage prompt**: the generation system prompt
is composed as **base → industry → style → avoid → machine contract (always last)** from the
prompt library, with an industry dropdown on the target, a stable-per-target style pick, and an
admin `vary_design` toggle. Spec: `docs/superpowers/specs/2026-10-01-homepage-prompt-layers-design.md`
(its seven acceptance criteria are sections 1–7 below). Run against **local** first, then the QA
(Vercel Preview) deploy.

## Prerequisites

```bash
# Terminal 1 — local Postgres + Inngest dev server
pnpm inngest:up

# Terminal 2 — dev server
pnpm dev
```

- **Migrations:** `20261001120000_homepage_prompt_layers` (3 enum values + `crm_Targets.homepage_industry_prompt_id`)
  and `20261001130000_seed_homepage_prompt_layers` (the layer library) applied — `pnpm db:migrate`.
  `pnpm db:seed` also seeds the library; `pnpm seed:homepage-prompts` re-seeds just the layers.
  Both are idempotent upserts keyed on 26 fixed ids: they never duplicate and never touch
  operator-created cards, but a re-run **resets the 26 seeded cards' name/body/is_default to the code
  values** (it discards your edits to those cards) and does **not** un-delete a soft-deleted one.
  `seed:homepage-prompts` is **not** behind the local-DB guard — it writes to whatever `DATABASE_URL`
  is set, so check that variable before running it.
- **Library after seeding:** 1 **Avoid list** card, 10 **Art direction** (style) cards, 15 **Industry**
  cards (one flagged default = **Generic**). Verify at http://localhost:3000/en/campaigns/prompts
  (sign in as an **admin** — the three layer kinds are only creatable/editable/deletable by admins).
- **Two approved targets in different verticals** (see the target-triage doc), e.g. one plumbing
  company and one dental practice, each with a `company_website` and a free-text `industry`.
- **An Anthropic key** (`ANTHROPIC_API_KEY` or Profile → LLMs). Every generation calls the real
  API and costs tokens. **Chromium:** same constraints as `target-homepage-manual-testing.md`
  (serverless binary is Linux-only; set `CHROMIUM_EXECUTABLE_PATH` locally, or test generation on QA).
- **How to see what the model was told:** open the Inngest dev UI (http://localhost:8288, or the
  Inngest cloud dashboard on QA), open the `homepage/target.generate` run and read the output of the
  **`load-prompt-layers`** step: `{ industry, style, avoid }` (each a body string or `null`). This is
  the authoritative record of which layers a run used. (With `vary_design` off the step does not run.)
- **Layer cards must be Org-wide.** Generation reads only **ORG-scoped**, non-deleted cards. The
  create dialog also offers "Personal" for these kinds, but a Personal layer card is ignored.
- **URLs:** http://localhost:3000/en/campaigns/prompts · http://localhost:3000/en/campaigns/targets ·
  http://localhost:3000/en/admin/homepage-settings

---

## 1. Populated library → different structure AND look per target; regenerate keeps both

*(AC1)*

1. Open target **A** (e.g. plumbing) → **AI → Generate homepage**. In the drawer, the **Industry**
   dropdown should already show the pre-matched vertical (e.g. *Home trades — HVAC / plumbing /
   electrical*) or **Generic** if nothing matched. Click **Generate** and wait for READY.
2. In the Inngest UI, note `load-prompt-layers` → `style` (the first words identify the style card)
   and `industry`.
3. Repeat for target **B** (e.g. dental). Its industry should differ, and — across a handful of
   targets — its style card should usually differ too (style is a hash of the homepage id over the
   10 cards, so two targets *can* collide; try a third/fourth target if so).
4. Open both previews (`/p/<slug>`): the **section structure** (industry layer) and the **visual
   language** (style layer) should visibly differ — not the same arches/pills/bokeh recipe.
5. **Regenerate** target A, then **Refine** it with a prompt. Re-read `load-prompt-layers` in each new
   run: `style` and `industry` are **identical** to the first run (stable per target).
   **Pass:** B differs from A in structure + look; A keeps its style card and vertical across
   regenerate and refine.
6. **Known gap (do not file as a bug):** the style pick is `hash % (number of active style cards)`.
   If you add, delete or soft-delete a style card between runs, the next regenerate/refine of a
   target **may** pick a different style. Stable only while the style set is unchanged
   (`CUSTOMIZATIONS.md`, Known gaps).

## 2. Empty library → today's behavior (base + machine contract)

*(AC2)*

1. As admin, soft-delete **all** Art direction, Industry and Avoid cards (or run against a DB with
   none seeded). Keep the Homepage base prompt.
2. Generate target A. In Inngest, `load-prompt-layers` returns `{ industry: null, style: null, avoid: null }`.
3. **Pass:** the run reaches READY with no error and looks like pre-feature output (the base
   prompt's own direction + the machine contract) — no layer headers ("Industry guidance:",
   "Visual style:", "Avoid:") are required for it to succeed. Nothing fails because a library is empty.
4. Restore the library afterwards: re-seeding does **not** revive soft-deleted seeded cards (the
   upsert leaves `deletedAt` alone). On a throw-away local DB, prefer `pnpm db:reset` (it migrates and seeds);
   or simply create replacement cards in `/campaigns/prompts`. **Do not run this section on QA/prod
   data you care about** — use a scratch local DB.

## 3. Industry dropdown changes the vertical on the next generate/refine

*(AC3)*

1. Open target A's Generate drawer; note the **Industry** dropdown value. Its options are exactly the
   active Industry cards in the library (curate verticals by curating prompts).
2. Pick a clearly different vertical (e.g. *Legal / law firm*). The selection **persists
   immediately** (no Save button): close and reopen the drawer, or reload — it still shows the pick.
   A failed save reverts the dropdown and shows a toast.
3. Click **Generate** (or **Refine**). In Inngest, `load-prompt-layers` → `industry` is now the Legal
   card body. **Pass:** the new page's sections/tone follow the new vertical (practice areas,
   attorney bios, consultation CTA) rather than the old one.
4. **Unset → Generic:** target with no saved pick and no pre-match shows **Generic** and the run's
   `industry` is the Generic (`is_default`) card. If the Generic card is deleted and nothing is
   picked, `industry` is `null` and the run still succeeds.
5. **Pre-match at create:** create a target with free-text `industry` "Plumbing & Heating" (UI, CSV
   import, and — if you have MCP access — `crm_create_target`). Its drawer should open already on
   the Home trades card. An unrecognised industry ("Quantum widgets") leaves it on Generic. The
   match is best-effort; the operator can always correct it.

## 4. Operator prompt still overrides style/industry; machine contract still wins on format

*(AC4)*

1. In the drawer, enter an operator prompt that contradicts the style, e.g. "Use a bright, playful
   palette with rounded shapes" on a target whose style card is *Luxe dark / cinematic*.
2. Generate. **Pass:** the page follows the operator's intent (it wins on intent) while still
   completing normally.
3. **Format:** whatever the layers/operator ask for, the run still returns parsable output, loads only
   allowed hosts (Google Fonts + the pinned GSAP URL), and uses the logo/image placeholder tokens —
   the machine contract is appended last and cannot be overridden. A run that produces broken JSON
   or blocked egress is a bug.

## 5. `vary_design` off → base-only behavior

*(AC5)*

1. Admin → **Homepage Generation** (`/admin/homepage-settings`): the **Vary design per target**
   switch is **on** by default. Turn it **off** and **Save**; reload to confirm it persisted.
2. Generate target A. In Inngest, the **`load-prompt-layers` step does not appear** and the page is
   base + machine contract only (same as section 2) even though the library is full.
3. Turn it back **on**, Save, regenerate: `load-prompt-layers` returns the style/industry/avoid
   again. **Pass:** the toggle is the only difference.
4. **Non-admin:** a non-admin cannot reach/save the setting (the action is admin-gated); the
   page shows the existing forbidden handling.

## 6. Prompt cap — an oversized or missing layer never fails a run

*(AC6)*

1. **Oversized:** as admin, edit a style card (or create a new Org-wide one) with a body well over
   12,000 characters (paste a large block), and make sure it is the card a target picks (delete the
   other style cards so it is the only one). Generate that target.
   **Pass:** the run reaches READY — optional layers are dropped lowest-precedence-first (avoid, then
   style, then industry) until the composed prompt fits the 12k-character cap; the base prompt and
   machine contract are never dropped. (A very long *base* alone still goes through, unlike layers.)
2. **Missing/soft-deleted:** pick an industry on a target, then soft-delete that Industry card and
   regenerate. **Pass:** no failure — it falls back to the Generic card (or none). Likewise delete
   every Avoid card → run succeeds with `avoid: null`.
3. **Stale pick on the target:** a target whose saved industry card was deleted keeps working
   (the dropdown falls back to Generic; the id is ignored at read time).

## 7. The three new kinds are CRUD-able in the UI (and readable via MCP), with soft-delete

*(AC7)*

**UI — as an admin** at `/campaigns/prompts`:
1. Click **New prompt**. The kind dropdown lists **Email, Homepage** plus, for admins,
   **Homepage base (designer), Industry, Art direction, Avoid list**. Create one of each new kind
   with scope **Org-wide**. Each appears in the list with its human label (Industry / Art direction
   / Avoid list). Reload — they persist.
2. **Edit** a card's name/body (kind and scope are fixed after create); **delete** it (soft-delete:
   gone from the list, and from the Industry dropdown for Industry cards).
3. A new Industry card appears in the target drawer dropdown on next open; a new Style card enters the
   hash pool; a new Avoid card is concatenated into every run.
4. **Non-admin:** the kind dropdown does **not** offer the layer kinds; calling create/edit/delete for
   them (e.g. via a crafted request) returns **Forbidden**. Org-scope in general is admin-only.

**MCP** (QA/prod MCP server, or the `rade-crm-*` connectors):
1. `crm_list_prompts` with `kind` = `HOMEPAGE_INDUSTRY`, `HOMEPAGE_STYLE`, `HOMEPAGE_AVOID` (and
   `HOMEPAGE_BASE`) returns the org-wide cards (+ the caller's personal ones). **Pass:** the seeded
   cards are listed; deleted ones are not.
2. **Known scope limit:** `crm_create_prompt` / `crm_delete_prompt` remain **personal `EMAIL` /
   `HOMEPAGE` only** — the layer kinds are org-level admin configuration managed in the web UI, so
   MCP intentionally cannot create or delete them. (The spec's "CRUD via MCP" is satisfied for
   read/list; authoring stays admin-in-UI.) There is no MCP setter for a target's industry pick.

---

## 8. One-shot Style override in the Generate drawer

*(Follow-up — lets the operator override the stable-per-target style for a single generation. Not an original AC.)*

1. Open an **approved** target → **AI → Generate homepage**. Below the **Industry** dropdown there is
   now a **Style** dropdown (`data-testid="homepage-style-select"`) defaulting to **Auto
   (recommended)**. **Pass:** it lists the active **Art direction** cards; with an empty style library
   it is disabled showing **Auto**.
2. Leave it on **Auto** and **Generate**. In the Inngest UI, `load-prompt-layers` → `style` is the
   hash-picked card (same as §1) — **Auto changes nothing**.
3. Regenerate the same target, this time picking a **specific** style (one you can recognise in the
   output). **Pass:** `load-prompt-layers` → `style` is now **that** card's body, not the hash pick,
   and the rendered `/p/<slug>` reflects it.
4. **One-shot semantics:** after the override generate, click **Refine** (any change request).
   **Pass:** the refine's `load-prompt-layers` → `style` returns to the **Auto** (hash) card — the
   override is **not persisted** (by design). Re-opening the drawer also resets Style to **Auto**.
5. **Tamper/degrade:** a stale/unknown style id (e.g. library edited since the drawer loaded) must
   **not** fail the run — it falls open to the Auto pick. (Unit-covered; see parity table.)

## 9. Prompt library — filter by kind

*(Follow-up — a client-side filter over the existing `/campaigns/prompts` table. Not an original AC.)*

1. As an admin, open **http://localhost:3000/en/campaigns/prompts**. Above the table there is a
   **kind filter** (`data-testid="prompt-kind-filter"`) defaulting to **All kinds**.
2. Pick **Art direction**. **Pass:** only `HOMEPAGE_STYLE` rows show; the friendly labels
   (Industry / Art direction / Avoid list) match the Kind column. Switch to **Industry**, **Email**,
   etc. — the table narrows accordingly; **All kinds** restores the full list.
3. **Pass:** the filter only lists kinds actually present (no empty buckets), and it's **UX only** —
   it never changes which prompts exist or who may edit them (admin gating on the layer kinds is
   unchanged).

---

## E2E parity (bidirectional)

There is **no Playwright spec** for this feature, deliberately: every meaningful step either needs a
live Anthropic call + headless chromium render (not run in CI — see `target-homepage-manual-testing.md`)
or is covered below at unit level.

| Manual step | Automated counterpart |
|---|---|
| §1 stable style per target; style pool | `lib/homepage/prompt-layers/__tests__/select-style.test.ts` (determinism, order-independence, empty → null); `inngest/functions/__tests__/generate-homepage.test.ts` (style stable across passes) |
| §8 one-shot style override + fail-open to Auto on unknown id | `lib/homepage/prompt-layers/__tests__/select-style.test.ts` (`resolveStyleDirection` override wins / unknown → hash / empty → null); `inngest/functions/__tests__/generate-homepage.test.ts` (`stylePromptId` override honored on generate, unknown id → deterministic pick) |
| §8 drawer Style options query (read-authz, active ORG cards) | `actions/crm/targets/__tests__/get-homepage-styles.test.ts` |
| §1/§2/§6 layer loading, empty/soft-deleted/missing fallback, Generic default | `lib/homepage/prompt-layers/__tests__/load-layers.test.ts` |
| §1/§2/§4/§6 composition order, contract last, empty layers dropped, 12k cap | `lib/homepage/__tests__/prompt.test.ts`; `inngest/functions/__tests__/generate-homepage.test.ts` |
| §3 industry pre-match (free text → card) | `lib/homepage/prompt-layers/__tests__/match-industry.test.ts`, `prefill-industry.test.ts`; `__tests__/actions/target-industry-prefill.test.ts` (create path) |
| §3 persisting the dropdown pick (authz, validation, audit) | `actions/crm/targets/__tests__/set-homepage-industry.test.ts` |
| §5 `vary_design` setting (admin-gated save, default on, off → no layers) | `lib/homepage/__tests__/settings.test.ts`; `actions/admin/__tests__/homepage-settings.test.ts`; `generate-homepage.test.ts` |
| §7 admin-only layer kinds; MCP kind list | `actions/crm/prompts/__tests__/prompts.test.ts`, `homepage-base-gate.test.ts`; `lib/mcp/__tests__/crm-ai-prompts.test.ts` |
| Seed idempotency / fixed ids / counts (1 + 10 + 15) | `prisma/seeds/__tests__/homepage-prompt-layers.test.ts` |

**Manual-only (QA):** the *visible* outcome — that layers produce genuinely different structure and
look, that the operator prompt wins on intent, and that a real oversized prompt still renders — needs
a live generation and is verified by eye on the QA deploy (`qa.crm.radeengineering.com`), same as the
base homepage flow. The drawer's Industry dropdown rendering (`data-testid="homepage-industry-select"`)
is likewise only exercised by hand; add a seeded-state E2E (like `tests/e2e/target-homepage.spec.ts`)
if the dropdown starts regressing.

**Known Gap (E2E) — §8 Style dropdown + §9 prompt-library kind filter.** Both new UI controls are
**manual-only**: no Playwright spec renders them yet. The *logic* behind §8 is unit/integration
covered (see the two rows above); §9 is a pure client-side filter over already-fetched rows.
Deferred deliberately for the same reason as the rest of this feature (the drawer path needs a live
Anthropic call + headless chromium). Add seeded-state E2E (`data-testid="homepage-style-select"`,
`data-testid="prompt-kind-filter"`) if either control starts regressing.

## Cleanup

Delete throw-away targets and any test cards you created (soft-delete in `/campaigns/prompts`).
Soft-deleted seeded cards are not revived by re-seeding — use a scratch local DB for the destructive sections (2, 6), or recreate the cards by hand. Re-enable **Vary design per
target** if you left it off.
