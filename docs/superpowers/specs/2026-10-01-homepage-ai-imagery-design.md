# Homepage Generation — On-Brand AI Imagery (Design)

> Status: **proposed** · Owner: Rade Engineering · Date: 2026-10-01
> Feature branch: `feat/homepage-ai-imagery`
> Depends on (should merge first): `fix/homepage-step-boundary-terminal-errors`
> (terminal-error fail-fast + `max_tokens` default 24000) so the image step's
> fail-open and the budget headroom are in place.

## Goal

Make generated homepage mockups include **real, on-brand photography** instead of
text + CSS/SVG only, and update the generation prompt so the design model **knows
images are available and is expected to design around them**. Images are produced
by **Higgsfield** (the operator's account) via its server API, generated once per
run from the harvested brand, stored in R2, and composed into the page by the model
through placeholder tokens.

## Why (current state → problem)

- The render step enforces a strict **egress allowlist** (`render-allowlist.ts`):
  only Google Fonts + one pinned GSAP file load; every other request is aborted.
  The **machine contract** in the prompt also forbids remote resources. So any
  `<img src>` the model emits is both disallowed and killed at render.
- The **only** image today is the logo: harvested, inlined as a `data:` URI, swapped
  into the `__RADE_LOGO_SRC__` token at render time.
- Net effect: generated pages are text + flat color + CSS/SVG art. Even with a strong
  layout they read **plain/generic** — real premium pages lean on photography. QA has
  confirmed generation itself works end-to-end (Chromium 147, 4-pass flow), so the
  missing ingredient is imagery, not the renderer.

## Non-goals (this phase)

- **Model-directed image prompts** (the model emitting the image briefs it wants, 2-phase).
  Deferred; this phase uses a **fixed on-brand set**.
- Using the **prospect's own photos** (harvested). We chose AI-generated on-brand imagery.
- Video, image editing/variations, reusable "Soul" character training.
- **Per-pass** image regeneration. Images are generated **once** and reused across all passes.
- Streaming generation; a token-budget overhaul (covered elsewhere).

## Design decisions (agreed)

1. **Provider chain with graceful degradation.** Image generation resolves in order and
   uses the first provider whose key is present:
   **Higgsfield → OpenAI → text-only.**
   - **Higgsfield** (primary): base `https://api.higgsfield.ai/`, header
     `Authorization: Key <ID>:<SECRET>`, **async** (POST → `request_id` + `status_url` → poll).
     Default text-to-image model **SOUL V2** (`/higgsfield-ai/soul/v2/standard`), swappable via setting.
     Outputs persist ≥7 days provider-side; we copy them to our R2.
   - **OpenAI** (fallback): OpenAI Images (`gpt-image-1`) using the **existing `OPENAI_API_KEY`**
     (already present in Production, Preview/QA, and Development — verified; no new secret). Synchronous
     base64/URL response. Used only when Higgsfield is unconfigured or fails.
   - **Text-only** (final): no image provider configured/working → generate with zero image tokens.
   The app runtime can only call keyed HTTP APIs; the operator's Higgsfield *chat/MCP* access is a
   prototyping path, **not** a runtime fallback. (Anthropic/Claude, used for the HTML, does not make images.)
2. **Fixed on-brand set, generated once.** Before the design passes, plan and generate
   N images (hero + section shots) from the brief/brand/industry; reuse across every pass.
3. **R2-served via an allowlisted host.** Store under `previews/<slug>/images/`; add the
   code-owned previews host to the render egress allowlist, **path-scoped to the current
   slug** (mirrors the GSAP path-prefix guard). Keeps served pages light (no multi-MB base64).
4. **Placeholder tokens.** The model references `__RADE_IMG_1__ … __RADE_IMG_N__`.
   Persisted version HTML keeps the **tokens** (like the logo); substitution to the served
   R2 URL happens at render + publish, so versions stay portable and small.
5. **Fail-open across the chain.** A provider that is unconfigured or errors falls through to
   the next provider; exhausting the chain proceeds **text-only** (the model is told which tokens,
   if any, are available). Image failure never fails the generation run. Contrast with terminal
   text-generation errors, which still fail fast.
6. **REST, not SDKs.** Raw `fetch` like the Anthropic provider, for both adapters — no new dependency.
7. **Admin-configurable**, with safe defaults: `image_count` (default **3**, `0` disables),
   `image_model` (default SOUL V2 for Higgsfield), `image_provider` (default `auto` = the chain
   order above; may pin a single provider).
8. **Keys optional / fail-closed.** A missing `HIGGSFIELD_API_KEY` simply skips Higgsfield; a
   missing `OPENAI_API_KEY` skips OpenAI; missing both = text-only. Deploys and text-only
   generation are never affected by an absent image key.

## Prompt layering (how the model learns the capability)

The split from the existing design holds: a **base prompt** (creative direction,
admin-editable) + an always-appended **machine contract** (code-owned, non-overridable).

- **`MACHINE_CONTRACT`** gains image rules: the allowed image host is added to the host
  list; the model may use **only** the provided `__RADE_IMG_n__` tokens as `<img>` src,
  each at most once, every image needs descriptive `alt`, and no other image URLs are
  permitted. When zero tokens are provided, it is told so explicitly and to rely on type,
  color, and CSS/SVG.
- **`DEFAULT_BASE_PROMPT`** gains the **expectation**: design *around* real photography —
  a photographic hero and image-led sections — not flat color blocks; place images for
  impact and let them carry the premium feel.
- Each token is presented to the model with a short **alt/description** (what the image
  depicts) so it places them sensibly.

## Components

### C1 — Image provider interface + adapters + resolver — `lib/homepage/images/` (new, fork-owned)
A small provider interface decouples the flow from any one vendor:
- `ImageProvider` = `{ name, isConfigured(): boolean, generateImage({ prompt, aspectRatio, model }) → bytes|url }`.
- `higgsfield.ts` — adapter: `isConfigured` = `HIGGSFIELD_API_KEY` present. Higgsfield selects the
  model **by endpoint path** (the model is the URL, e.g. SOUL V2 = `/higgsfield-ai/soul/v2/standard`),
  not a body field. The adapter owns a **code-owned allow-set** mapping each supported model name →
  its endpoint + default params (so an admin picks from a known list, never types a raw URL). POST,
  poll `status_url` under a bounded timeout, return the image. Supported image models (REST catalog):
  **SOUL V2** (default), **Marketing Studio Image**, **Ideogram**, **Recraft**, **Qwen Image**,
  **Grok**, **Z-Image**; exact paths/size params pinned per model during implementation.
- `openai.ts` — adapter: `isConfigured` = `OPENAI_API_KEY` present; call OpenAI Images (`gpt-image-1`),
  return the (synchronous) image.
- `resolve.ts` — `resolveImageProviders(settings) → ImageProvider[]` in chain order
  (respecting `image_provider`: `auto` = Higgsfield → OpenAI; or a pinned single provider).
  `generateWithFallback(spec)` tries each configured provider in order; the first success wins, and an
  adapter that is unconfigured or throws is skipped to the next. Exhausting the list returns "no image"
  (the caller's fail-open path). Raw `fetch`; no SDK dependency.

### C2 — Image planning — `lib/homepage/images/plan.ts` (new, fork-owned)
Pure `planHomepageImages(brief, brand, industry, count) → ImageSpec[]`. Builds the fixed set
of prompts from a **code-owned scaffold** plus bounded brand fields (industry, palette, a
short business descriptor). Deterministic, length-capped, unit-testable. Defines token names
(`__RADE_IMG_1__ …`) and each image's intended role (hero / section) + alt text.

### C3 — Image storage — extend `lib/homepage/storage.ts` (fork-owned)
Put/serve generated images at `previews/<slug>/images/<key>.<ext>` using the existing R2/S3
helpers and previews base URL. Overwritten on regenerate.

### C4 — Generate-images step — `inngest/functions/generate-homepage.ts` (fork-owned)
A new `generate-images` step after `harvest-source`, before the passes: plan → generate in
**parallel** (bounded) → store in R2 → return a small **token→URL map + alt text** (no base64
in step state). The map is threaded into `baseArgs` and reused by every pass. Fail-open:
on any failure the step returns an **empty map** and the run continues text-only.

### C5 — Token substitution — `inngest/functions/generate-homepage.ts` (fork-owned)
Extend the logo's `materializeLogo` into a general token substitution that also replaces
`__RADE_IMG_n__` with the served R2 URL at **render** (the in-step vision render) and at
**publish** (the served page + screenshot). Persisted version HTML keeps the tokens.

### C6 — Egress allowlist — `lib/homepage/render-allowlist.ts` + `render.ts` (fork-owned)
Add the previews image host as allowed, **scoped to `previews/<slug>/images/`** for the
slug being rendered. `renderAndScreenshot` passes the current slug so the predicate can
path-scope (exact host + path-prefix, like GSAP). Other hosts and other slugs stay blocked.

### C7 — Prompt updates — `lib/homepage/prompt.ts` (fork-owned)
`MACHINE_CONTRACT` image-token rules + the allowed host (built from the allowlist constant so
it can't drift); `DEFAULT_BASE_PROMPT` photography expectation. The per-run token list + alt
descriptions are injected into the brief, not the static prompt.

### C8 — Settings + admin — `lib/homepage/settings.ts` + `app/.../admin/homepage-settings/*` (fork-owned)
New `crm_SystemSettings` keys `homepage.image_model`, `homepage.image_count`,
`homepage.image_provider`, with resolve/clamp helpers and admin form fields, mirroring the
existing model / max_tokens controls. `image_model` is validated against the adapter's **allow-set**
(name → endpoint) — a stored value not in the set falls back to the default (SOUL V2), exactly as
`resolveModel` does for the text model; the admin UI renders the list as a dropdown, not free text.

**Provider availability indicator (read-only).** The settings page shows, per provider, a
**"connected / not configured"** status derived **server-side** from each adapter's `isConfigured()`
(key presence only). The page server component computes the booleans and passes them to the form; the
**key value is never read, returned, or rendered** — only presence. This keeps the "configure it here"
mental model while secrets stay in env: an operator can see that, say, Higgsfield is connected and
OpenAI is the standby, or that no provider is configured (so generation will be text-only), without the
key ever leaving the server. Secrets themselves (`HIGGSFIELD_API_KEY`, `OPENAI_API_KEY`) are **not**
editable in this UI — they live in Vercel env per scope / local `.env`.

## Data model / migration

**None.** All new configuration lives in the existing **key/value `crm_SystemSettings`** table
(same mechanism as `homepage.model` / `homepage.max_tokens`). No Prisma schema change, no migration.

## Config / environment

- **`HIGGSFIELD_API_KEY`** — new, **optional / fail-closed**. Format is the ID:secret pair
  Higgsfield issues. The operator provisions it in the console and **confirms the value +
  scopes (DEV/QA/prod) with the implementer** (secrets rule — never set without confirmation).
  Add later-scope keys as optional with the fail-closed consumer above so a not-yet-present
  key never breaks a Vercel deploy.
- **`OPENAI_API_KEY`** — **already set** in Production (sensitive) and Preview/QA + Development
  (verified via Vercel env listing; no value read). **Reused** for the OpenAI image fallback — no new
  secret to provision. The only new work is a DEV-local `OPENAI_API_KEY` if the implementer wants to
  exercise the fallback locally.
- `.env.example` + `docs/reference/ENVIRONMENT_VARIABLES.md` updated in the same PR (env-doc guard) —
  add `HIGGSFIELD_API_KEY`, and note `OPENAI_API_KEY`'s additional use as the image fallback.

## Security considerations

- **Egress:** the allowlist stays exact-host and now path-scopes images to the current slug;
  attacker-steered HTML can at most reference this run's own non-sensitive image objects.
- **Indirect prompt injection:** image prompts are built from a code-owned scaffold + bounded,
  length-capped brand fields — not raw prospect HTML — limiting what harvested copy can steer
  into the image model. The model's output is an image (non-executable).
- **Served images** are public under `previews/` exactly like today's screenshots (non-sensitive
  prospect mockups); no new data-exposure class.
- **Abuse/cost:** image generation is gated behind the existing APPROVED + auth + in-flight
  guards and bounded by `image_count`; one set per run, reused across passes.
- **Key handling:** server-only; never `NEXT_PUBLIC_`; never returned to the client or logged. The
  admin availability indicator sends the client a **boolean presence flag per provider**, never the key.

## Acceptance criteria

1. With a valid key and `image_count ≥ 1`, a generation produces a page whose hero and at
   least one section use Higgsfield-generated images served from the allowlisted host, visible
   in the published preview + screenshot on QA.
2. Images are generated **once** per run (not per pass) and reused; no base64 appears in Inngest
   step state (the existing "no base64 in step state" test extends to cover it).
3. With **no Higgsfield key but an OpenAI key** present, images are generated via **OpenAI** and the
   page still gets imagery (fallback works). With **no image key at all** (or `image_count = 0`),
   generation still succeeds **text-only**; no error, status reaches READY, and the model is told no
   image tokens are available.
4. A **provider error** falls through to the next provider; a **partial** image failure uses the
   images that succeeded and drops the rest; the run succeeds in every case.
5. The render **egress** permits only the current slug's image objects on the previews host and
   still blocks every other host/path (unit-proven).
6. Admin can set image provider/model/count; values clamp to safe bounds; a missing/blank setting
   falls back to the defaults. The page shows a per-provider **connected / not configured** indicator
   that reflects key presence only and **never exposes a key value** (no key is sent to the client).
7. No Prisma migration is introduced; CI's schema/migration-sync check stays green.

## Testing

- **Unit:** `planHomepageImages` (scaffold + bounded fields, token/alt shape, count);
  token substitution (logo + image tokens, render vs persisted); settings resolve/clamp for the
  new keys (incl. `image_provider` = auto/pinned); egress allowlist (accept the current slug's image
  path, reject other paths/hosts/slugs); each adapter with mocked `fetch` (Higgsfield submit → poll →
  done; OpenAI sync; error; not-configured); the **resolver/`generateWithFallback`** (Higgsfield-first;
  Higgsfield-absent → OpenAI; both-absent → no image; a provider that throws is skipped to the next;
  a pinned provider is respected); the flow (images step success, fallback path, no-key fail-open,
  partial failure, reuse-across-passes, no-base64-in-step-state); prompt assembly (image rules + host
  present; zero-token wording); the **availability indicator** (each adapter's `isConfigured()` →
  booleans; a test asserting the page props carry presence flags only and **no key value**).
- **E2E:** keep **mocking** the image client (as Chromium/Anthropic are today — the E2E job
  calls no external paid services). Real image generation is **QA-verified manually**.
- **Manual-test doc** + **LESSONS_LEARNED** updated (image pipeline, fail-open, the egress scope,
  the Higgsfield async/poll shape).
- **Revert-verify** the egress regression test (reject-other-slug must fail if the path-scope is removed).

## Fork / upstream impact

All new files are fork-owned. Edited files (`generate-homepage.ts`, `prompt.ts`, `settings.ts`,
`render.ts`, `render-allowlist.ts`, `storage.ts`, the admin `homepage-settings` UI/action) are
**fork-added** homepage-feature files → **zero upstream merge risk**. `.env.example` is upstream-owned
and the edit is **additive** (one optional var). `UPSTREAM_IMPACT_LOG.md` gets an entry only for
`.env.example` (and any other upstream-owned file touched during implementation).

## Rollout

- **DEV first:** key in local env, generate, verify images appear + egress works.
- **Env-first for hosted:** add `HIGGSFIELD_API_KEY` to **Preview (QA)** and **Production** scopes
  as the optional/fail-closed var **before** the code that consumes it is promoted, so no deploy
  breaks. (No DB migration to order.)
- **QA:** run a real generation; confirm imagery + preview page weight + the egress scope.
- **Production:** promote via the normal gate once QA is clean.

## Open questions / risks

- **Image aspect ratios / roles:** hero (wide) vs section (portrait/square) — pin the exact set
  and SOUL V2's supported ratios during implementation.
- **Latency:** 3 parallel generations (~15–30s observed in the spike) must stay comfortably inside
  the 300s function budget alongside the passes; if tight, cap `image_count` default or move image
  gen fully parallel to harvest.
- **Model fidelity:** SOUL V2 vs Higgsfield "Marketing Studio Image" for interiors/products — may
  warrant a different default per industry; revisit after QA samples.
- **Cost:** each run now spends image credits; `image_count` is the control. Surface typical
  per-run cost to the operator in the admin copy.
- **Provider parity:** the `ImageProvider` interface is now first-class (Higgsfield + OpenAI ship in
  v1). Keep per-provider concerns (aspect-ratio support, model ids, sync vs poll) inside each adapter
  so the flow stays provider-agnostic; confirm OpenAI `gpt-image-1`'s supported sizes map to our
  hero/section roles during implementation.
- **Cross-provider look:** Higgsfield and OpenAI imagery differ stylistically; the fallback is for
  resilience, not visual parity — acceptable for a mockup, but worth an eyeball on QA samples from both.
