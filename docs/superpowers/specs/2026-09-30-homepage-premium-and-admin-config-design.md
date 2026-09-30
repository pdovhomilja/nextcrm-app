# Homepage Generation — Premium Output + Admin Configuration (Design)

**Date:** 2026-09-30
**Status:** Draft (awaiting review)
**Owner:** Rade Engineering
**Related:** builds on the shipped homepage-generation feature (PRs #21/#22/#23) and its spec
`docs/superpowers/specs/2026-09-29-target-ai-outreach-design.md`.

## Goal

Make AI-generated prospect homepages look **premium** (custom typography, motion — staggered scroll
reveals, parallax, hover micro-interactions) and make the generation **configurable by an admin**
(model, max output tokens, and the base "designer" prompt) instead of hard-coded constants. Also
allow an authorized user to **upload an externally-produced HTML file that overrides the generated
design**, served from the same previews URL.

## Why (current state → problem)

The current generator (`lib/homepage/provider.ts`) is boxed into basic output by its own constraints:

- The `SYSTEM_PROMPT` forbids the ingredients of premium design: "no external CSS/JS frameworks",
  "web-safe/system fonts only", and "no scripts that fetch remote resources" (which the model
  over-reads as "no motion JS at all"). It never *asks* for motion.
- `max_tokens: 12000` is hard-coded, so rich pages truncate. With the recent fail-fast fix, a
  truncated response now surfaces as a hard "cut off (max_tokens)" error — this is what made a
  human refine fail.
- The `model` is hard-coded to `claude-sonnet-5-5`; there is no way to opt into a stronger model.
- The render step blocks **all** network egress (an SSRF hardening), so custom fonts and animation
  libraries can't load at render time.

None of this needs a separate "deployed agent with skills" — the design philosophy belongs in an
editable prompt, and the constraints are ours to relax deliberately.

## Non-goals

- No external/deployed generation agent; generation stays a server-side Anthropic call in the
  existing Inngest job.
- No per-user or per-generation model/token controls (admin-global only; footgun avoidance).
- The **egress allowlist is not admin-editable** (see Security). Admins tune creative direction and
  model/tokens, never the set of reachable hosts.
- No change to the private-R2 storage, `/p/` serving, host-gate, or per-environment previews wiring.

## Design decisions (agreed)

1. **Admin-only global settings** (`isAdmin`) for `model`, `max_tokens`, and the active **base
   prompt** selection.
2. **Base "designer" prompt lives in the prompt library** as a new kind, distinct from per-generation
   guidance prompts.
3. **Controlled egress via a code-owned allowlist**: Google Fonts + a pinned GSAP (with ScrollTrigger).
4. **Default model = Sonnet 5.5; Opus 5.5 opt-in; Haiku 4.5 available.** Default `max_tokens` raised
   well above 12k, clamped in code to the model ceiling.
5. **Upload override:** an authorized user can upload a self-contained HTML file that becomes the
   current served design (a new version), reusing the serve path + sandbox + allowlisted render +
   version model. Uploaded HTML is **not sanitized** (would break the design); isolation rests on the
   sandbox CSP + the authenticated-uploader trust model.

## Prompt layering (the model of "base vs guidance")

Three layers plus a code-owned contract:

```
system  = [active base designer prompt]           # library, HOMEPAGE_BASE kind, admin-selected
        + [code-owned machine contract]           # appended by code, NOT editable

user    = [business brief]                         # facts, code-built (company, site, brand, logo placeholder)
        + [per-generation guidance, if any]        # drawer free-text or a HOMEPAGE guidance prompt -> "Operator instructions: …"
        + [previous HTML + auto-refine rubric]     # auto/refine passes only
```

- **Base designer prompt** = reusable creative direction (premium aesthetics, motion, typography,
  layout, brand fidelity). The same across targets. Admin-editable via the library.
- **Per-generation guidance** = target-specific, appended as "Operator instructions". On a *refine*,
  the change request is this layer.
- **Business brief** = always injected by code.
- **Code-owned machine contract** (appended to system, never admin-editable): the JSON output shape
  `{critique, html}` the parser depends on; the self-contained + **allowed-hosts** rules; the logo
  placeholder convention. A weak base prompt yields weak design, but can never break parsing or
  widen egress.

## Components

### C1 — Admin settings

- **Storage:** a single global settings record (one row), following the `crm_SystemSettings` /
  `Invoice_Settings` precedents. Fields: `model` (enum-constrained), `max_tokens` (int),
  `base_prompt_id` (FK/uuid to the active `HOMEPAGE_BASE` prompt), timestamps.
- **Resolution helper** (mirrors `getApiKey`'s chain): setting value → code default. The job/provider
  read through this helper so it works before anything is configured.
  - `model`: default `claude-sonnet-5-5`; allowed set `{claude-sonnet-5-5, claude-opus-5-5,
    claude-haiku-4-5-20251001}` owned in code. An unknown/removed stored value falls back to default.
  - `max_tokens`: default (e.g.) 32000; **clamped** to `[4000, MODEL_MAX]` per the resolved model.
  - `base_prompt`: the selected `HOMEPAGE_BASE` prompt's body; if unset/missing, a code default.
- **Admin page:** `app/[locale]/(routes)/admin/homepage-settings` (matches `crm-settings`,
  `funnel-settings`), `isAdmin`-gated server-side (page + the save action). Non-admins are refused.
- **Save action:** validates model ∈ allowed set, clamps max_tokens, verifies `base_prompt_id` is an
  existing `HOMEPAGE_BASE` prompt; writes an audit-log entry.

### C2 — Base prompt in the library

- New prompt **kind `HOMEPAGE_BASE`** (alongside `EMAIL`, `HOMEPAGE`). `HOMEPAGE` stays the
  per-generation guidance kind shown in the drawer dropdown; `HOMEPAGE_BASE` never appears there.
- Seed one premium default `HOMEPAGE_BASE` prompt (see C4) via the seed script + migration.
- Prompt CRUD already exists; `HOMEPAGE_BASE` reuses it (create/edit/soft-delete), filtered by kind.

### C3 — Controlled egress + motion at render

- **Allowlist (code-owned, exact host):** `fonts.googleapis.com`, `fonts.gstatic.com`,
  `cdnjs.cloudflare.com` limited to a **pinned, versioned GSAP path** (core + ScrollTrigger).
  Replace `render.ts`'s `context.route("**/*", abort)` with: allow iff the request URL's host is on
  the allowlist (and, for cdnjs, the path matches the pinned GSAP prefix); otherwise abort. Internal
  / metadata hosts remain unreachable. `serviceWorkers:"block"`, `acceptDownloads:false` stay.
- **Screenshot-vs-animation ("finalize" step):** scroll-reveal designs start elements hidden and
  animate in on scroll; a single static screenshot would capture them hidden. Before screenshotting,
  the render step must force the **final visual state**: e.g. `gsap.globalTimeline.progress(1)`,
  `ScrollTrigger.getAll().forEach(t => t.progress(1))` / `ScrollTrigger.refresh()`, plus a
  defensive fallback that sets any still-`opacity:0`/reveal-target elements to visible. Wrapped so a
  page without GSAP is unaffected. The served `/p/` page animates normally in the prospect's browser.
- **Accessibility:** the base prompt requires a `prefers-reduced-motion` fallback.
- **Serving:** unchanged. External refs (fonts/GSAP) load in the prospect's browser at serve time —
  not an SSRF concern (their browser, not our server). The `sandbox allow-scripts` CSP already allows
  page scripts; confirm it does not block the allowlisted subresources for the *served* page (adjust
  the served CSP only if needed, staying at least as strict as today).

### C4 — Premium base prompt (seeded default)

Creative direction demanding: staggered scroll reveals, scroll-linked/parallax motion, hover
micro-interactions, a modular type scale, generous spacing, cohesive modern color system, GSAP +
ScrollTrigger usage patterns (loaded from the allowlisted CDN), custom Google Font pairing, and a
`prefers-reduced-motion` fallback. Editable by admins afterward.

### C5 — Defaults, bounds, timeouts

- Default `max_tokens` raised (≈32000) so premium pages stop truncating; clamped per model.
- Larger outputs take longer; keep the per-pass generate timeout + render within the 300s function
  budget (re-check the arithmetic with the higher token ceiling; lower the default if needed).
- Model + max_tokens flow from the resolver into `provider.ts` (currently hard-coded).

### C6 — Upload override (bring-your-own design)

- **Purpose:** let an authorized user replace the generated design for a target with an
  externally-produced, self-contained HTML file, served from the same `/p/<slug>` previews URL.
- **Upload path:** presigned **direct-to-R2** upload (reuse the `crm_get_upload_url` pattern) to avoid
  the ~4.5 MB Vercel function-body limit; enforce a size cap (e.g. 5 MB) and validate the content is
  HTML. The object is written to the served key (`previews/<slug>/index.html`).
- **Versioning:** the upload becomes a new `crm_Target_Homepage_Version` row with **`pass_kind:
  "UPLOAD"`** (html stored, `created_by` = uploader, no prompt/critique) and `current_version_id` is
  repointed to it. The existing serve gate (`current_version_id`), revert, and email "include
  homepage" paths therefore work unchanged — you can revert between an uploaded and a generated
  version.
- **Screenshot:** render the uploaded HTML with the same **allowlisted egress** + "finalize
  animations" step to produce the email image. Caveat: assets the upload pulls from non-allowlisted
  hosts won't appear in the *screenshot* (the served page still shows them in the prospect's browser).
- **Refine gating:** AI-refine is **disabled while an upload is current** (no model lineage);
  regenerate is still allowed and produces a fresh generated version (revertible back to the upload).
- **Isolation:** served with the same headers (`sandbox allow-scripts`, `nosniff`, `noindex`).
  Uploaded HTML is **not sanitized** — isolation is the sandbox opaque origin (no CRM cookies) plus
  the fact that the uploader is authenticated/trusted.
- **Authz + audit:** gated by the same target-write check (`assertCanWriteTarget` / `created_by`
  scope); every upload writes an audit-log entry.

## Data model / migration (additive, migration-first)

- Add the `HOMEPAGE_BASE` value to the prompt-kind enum.
- Add the `UPLOAD` value to the `crm_Homepage_Pass_Kind` enum (for upload-override versions).
- Add the homepage-generation settings row/table (`model`, `max_tokens`, `base_prompt_id`, audit
  columns).
- Seed the default premium `HOMEPAGE_BASE` prompt (seed script is the source of truth).
- Additive → migration lands first (QA), then the code PR, per the CI/environment rules.

## Security considerations

- **SSRF:** the allowlist is exact-host and **code-owned**; admins cannot add hosts. It structurally
  cannot reach `169.254.169.254`/internal hosts. The render context holds no secrets. Residual
  (typosquat/DNS-rebind) is low and unchanged-in-kind from any CDN use.
- **Admin authz:** settings read/write enforce `isAdmin` server-side (page + action), not just UI.
- **Machine contract in code:** JSON output shape + allowed-hosts rules + logo placeholder are
  appended by code, so an edited base prompt can't break parsing or egress.
- **max_tokens clamp:** prevents an admin setting an absurd value (cost/timeout footgun).
- **Audit:** settings changes write `crm_audit_log`.
- **Upload override:** serving arbitrary unsanitized HTML from our domain is accepted **only** because
  (a) the served page is sandboxed to an opaque origin (no CRM cookies/DOM), (b) it is `noindex`, and
  (c) the uploader is authenticated and audited (not the public). Enforce a size cap + HTML
  content-type validation on upload; the render-time allowlist still bounds SSRF. Not sanitized by
  design (sanitizing would break the uploaded design). Consider a rate-limit on uploads.

## Acceptance criteria

1. An admin can set model (Sonnet/Opus/Haiku), max_tokens, and the active base prompt on the admin
   page; non-admins cannot reach it or save.
2. Generation uses the configured model + clamped max_tokens; unset → Sonnet + default tokens.
3. The base designer prompt comes from the selected `HOMEPAGE_BASE` library entry; per-generation
   guidance is appended; the JSON/self-contained/allowlist contract is always present regardless of
   the base prompt's content.
4. Generated pages may use Google Fonts + pinned GSAP; the render **screenshot shows the final
   (animated-in) state**, not hidden reveal targets.
5. The render egress allowlist permits only the pinned hosts/paths and aborts everything else
   (verified incl. an internal-host attempt).
6. A previously-truncating premium refine now completes within the token budget.
7. Served `/p/` pages animate in the prospect's browser and honor `prefers-reduced-motion`.
8. An authorized user can upload a self-contained HTML file for a target; it becomes the current
   version (`pass_kind: UPLOAD`), is served at `/p/<slug>` with the sandbox/nosniff/noindex headers,
   and a screenshot is produced. Revert works to/from generated versions; AI-refine is refused while
   an upload is current; oversized/non-HTML uploads are rejected; the upload is audit-logged.

## Testing

- **Unit:** settings resolver (default fallback, model allow-set, max_tokens clamp per model); admin
  authz on the save action; allowlist matcher (exact host pass, cdnjs path pin, internal/other host
  reject); prompt composition (contract always appended; `HOMEPAGE_BASE` excluded from guidance).
- **Render:** the "finalize animations" step forces final state and no-ops without GSAP (mock).
- **Upload override:** upload action authz (target-write) + validation (HTML content-type, size cap);
  an upload creates an `UPLOAD` version and repoints `current_version_id`; the serve path serves the
  uploaded HTML; revert works to/from a generated version; AI-refine is refused while an upload is
  current; audit entry written.
- **Integration/E2E:** admin settings save round-trip; a generation run using a configured model;
  `/p/` serves an animated page; an uploaded page serves + shows in the drawer. Manual ↔ E2E parity
  per the docs rules.
- Revert-verify the load-bearing guards (allowlist reject, contract-appended, clamp, upload
  authz/validation).

## Fork / upstream impact

- **Fork-owned (edit freely):** the new settings model helpers, admin page, `render.ts`,
  `provider.ts`, the Inngest job, seed data.
- **Upstream-owned (log + minimize):** the Prisma schema (enum value + settings table — additive
  rows), the admin route group/layout if a nav entry is added, and the prompt-kind type if upstream
  owns it. Each logged in `docs/reference/UPSTREAM_IMPACT_LOG.md` per the additive-first standard.

## Rollout

Migration-first to QA → code PR → verify on QA (admin config + a real premium generation, screenshot
shows final state) → promote to production. Prod needs `ANTHROPIC_API_KEY`, R2, Inngest, and
`NEXT_PUBLIC_PREVIEWS_BASE_URL` in the Production scope before previews work there.

## Open questions / risks

- **Token budget vs 300s:** confirm the raised max_tokens still fits render + vision in one step;
  lower the default if the arithmetic is tight.
- **Served-page CSP:** verify `sandbox allow-scripts` permits the allowlisted font/GSAP subresources
  for the *served* page; tighten with explicit `font-src`/`script-src` if we want defense-in-depth.
- **GSAP version pin:** pick and pin an exact GSAP version; note it in the allowlist + a LESSONS entry.
