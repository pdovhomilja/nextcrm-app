# Homepage Premium Output + Admin Config + Upload Override — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make generated homepages premium (custom fonts + GSAP motion), make model / max_tokens / base designer prompt admin-configurable, and let an authorized user upload an HTML file that overrides the design — served from the same `/p/<slug>` previews URL.

**Architecture:** Additive on the shipped homepage feature. A key/value settings resolver (`crm_SystemSettings`) feeds model + max_tokens + the active base-prompt id into the existing Inngest job/provider. The base designer prompt becomes a `HOMEPAGE_BASE` library prompt; a code-owned "machine contract" is always appended. The render step swaps its full egress block for a code-owned exact-host allowlist (Google Fonts + pinned GSAP) and finalizes animations before the screenshot. Upload override is a new Inngest flow producing an `UPLOAD` version, mirroring revert.

**Tech Stack:** Next.js 16 App Router, Prisma 7 (Supabase Postgres, no RLS), better-auth, Inngest, Anthropic API, R2/S3 via `@aws-sdk/client-s3`, playwright-core + @sparticuz/chromium, Jest + Playwright, next-intl.

**Spec:** `docs/superpowers/specs/2026-09-30-homepage-premium-and-admin-config-design.md`

## Global Constraints

- **No RLS — application code is the authz boundary.** Every action/route scopes by session identity. Admin settings use `requireRole(["admin"])`; target-scoped actions use `assertCanWriteTarget` / `created_by`.
- **Additive-first:** put logic in new fork-owned files; touch upstream-owned files only with thin insertion hooks and log each in `docs/reference/UPSTREAM_IMPACT_LOG.md`. Upstream-owned in scope: `prisma/schema.prisma`, `app/[locale]/(routes)/admin/_components/AdminSidebarNav.tsx` (nav entry), possibly the prompts page/kind type. Fork-owned: `lib/homepage/*`, `inngest/functions/generate-homepage.ts`, the new admin page/actions, seed.
- **The machine contract (JSON `{critique,html}` output, self-contained + allowed-hosts rules, logo placeholder) is appended by CODE**, never part of the admin-editable base prompt.
- **The egress allowlist is code-owned**, exact-host, never admin-editable.
- **Migrations:** additive, migration-first (migration PR lands in QA before/with the code). Never `prisma db push`. Author with `prisma migrate dev`, or a hand-authored migration containing only the new objects (repo pattern) + `prisma generate`.
- **max_tokens is clamped in code** to `[MIN, MODEL_MAX]`; model must be in the code-owned allow-set. Uploaded HTML is **never sanitized**; a size cap + HTML content-type check are enforced.
- pnpm only. Match import-path casing exactly (CI is Linux). `pnpm lint` = `eslint . --max-warnings=0`; run `pnpm exec tsc --noEmit`.

## Review Focus

- **Egress allowlist bypass** — a host/path that should be blocked (internal/metadata, or a non-pinned cdnjs path) slips through; assert exact-host + GSAP-path-pin and an internal-host rejection. (WS2 T3)
- **Machine contract dropped** — an empty/weak base prompt must still yield valid JSON + self-contained output; the contract is always appended regardless of base-prompt content. (WS2 T1)
- **max_tokens / model footgun** — an out-of-range max_tokens or unknown model from settings must clamp/fall back, never reach the API raw. (WS1 T2)
- **Upload authz + validation** — upload must reject a foreign target (authz), a non-HTML file, and an oversized file; and must not let uploaded HTML reach the render with egress unguarded. (WS3 T3/T4)
- **Revert/refine after upload** — reverting between UPLOAD and generated versions must work; AI-refine must be refused while the current version is UPLOAD (no model lineage). (WS3 T4/T5)

---

## Workstream 1 — Admin configuration

### Task 1.1: Add `HOMEPAGE_BASE` to the prompt-kind enum

**Files:**
- Modify: `prisma/schema.prisma` (enum `crm_Ai_Prompt_Kind`, ~line 2056) — upstream-owned, log it
- Create: `prisma/migrations/<ts>_homepage_base_prompt_kind/migration.sql`

**Interfaces:**
- Produces: enum value `HOMEPAGE_BASE` usable as `crm_Ai_Prompt_Kind.HOMEPAGE_BASE`.

- [ ] **Step 1: Add the enum value.** In `schema.prisma`:
  ```prisma
  enum crm_Ai_Prompt_Kind {
    EMAIL
    HOMEPAGE
    HOMEPAGE_BASE
  }
  ```
- [ ] **Step 2: Hand-author the migration** `migration.sql`:
  ```sql
  ALTER TYPE "crm_Ai_Prompt_Kind" ADD VALUE IF NOT EXISTS 'HOMEPAGE_BASE';
  ```
- [ ] **Step 3:** `pnpm exec prisma generate` (no format-reflow of the whole schema — edit the enum in place). Run `pnpm exec tsc --noEmit`.
- [ ] **Step 4:** Append the schema touch to `docs/reference/UPSTREAM_IMPACT_LOG.md` (enum value added; additive).
- [ ] **Step 5: Commit** `feat(homepage): add HOMEPAGE_BASE prompt kind`.

### Task 1.2: Settings resolver (`lib/homepage/settings.ts`)

**Files:**
- Create: `lib/homepage/settings.ts`
- Test: `lib/homepage/__tests__/settings.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const HOMEPAGE_MODELS = ["claude-sonnet-5-5","claude-opus-5-5","claude-haiku-4-5-20251001"] as const;
  export type HomepageModel = (typeof HOMEPAGE_MODELS)[number];
  export const DEFAULT_HOMEPAGE_MODEL: HomepageModel = "claude-sonnet-5-5";
  export const DEFAULT_MAX_TOKENS = 32000;
  export const MAX_TOKENS_FLOOR = 4000;
  export const MODEL_MAX_TOKENS: Record<HomepageModel, number>; // ceilings per model
  export function clampMaxTokens(model: HomepageModel, n: number): number;
  export function resolveModel(stored: string | null | undefined): HomepageModel;
  export type HomepageSettings = { model: HomepageModel; maxTokens: number; basePromptId: string | null };
  export async function getHomepageSettings(): Promise<HomepageSettings>; // reads crm_SystemSettings keys
  ```
- Keys in `crm_SystemSettings`: `homepage.model`, `homepage.max_tokens`, `homepage.base_prompt_id`.

- [ ] **Step 1: Write failing tests** (`settings.test.ts`), mocking `@/lib/prisma`:
  ```ts
  jest.mock("@/lib/prisma", () => ({ prismadb: { crm_SystemSettings: { findMany: jest.fn() } } }));
  import { prismadb } from "@/lib/prisma";
  import { resolveModel, clampMaxTokens, getHomepageSettings, DEFAULT_HOMEPAGE_MODEL, DEFAULT_MAX_TOKENS, MAX_TOKENS_FLOOR } from "@/lib/homepage/settings";
  const rows = (o: Record<string,string>) => (prismadb.crm_SystemSettings.findMany as jest.Mock)
    .mockResolvedValue(Object.entries(o).map(([key,value])=>({key,value})));
  beforeEach(() => jest.clearAllMocks());

  it("resolveModel: known passes, unknown/blank -> default", () => {
    expect(resolveModel("claude-opus-5-5")).toBe("claude-opus-5-5");
    expect(resolveModel("gpt-4")).toBe(DEFAULT_HOMEPAGE_MODEL);
    expect(resolveModel(null)).toBe(DEFAULT_HOMEPAGE_MODEL);
  });
  it("clampMaxTokens: clamps to [floor, model ceiling]", () => {
    expect(clampMaxTokens("claude-sonnet-5-5", 999)).toBe(MAX_TOKENS_FLOOR);
    expect(clampMaxTokens("claude-sonnet-5-5", 10_000_000)).toBeLessThanOrEqual(64000);
    expect(clampMaxTokens("claude-sonnet-5-5", 20000)).toBe(20000);
  });
  it("getHomepageSettings: defaults when unset", async () => {
    rows({});
    expect(await getHomepageSettings()).toEqual({ model: DEFAULT_HOMEPAGE_MODEL, maxTokens: DEFAULT_MAX_TOKENS, basePromptId: null });
  });
  it("getHomepageSettings: reads + clamps stored values", async () => {
    rows({ "homepage.model":"claude-opus-5-5", "homepage.max_tokens":"999", "homepage.base_prompt_id":"p1" });
    const s = await getHomepageSettings();
    expect(s.model).toBe("claude-opus-5-5");
    expect(s.maxTokens).toBe(MAX_TOKENS_FLOOR); // 999 clamped up
    expect(s.basePromptId).toBe("p1");
  });
  ```
- [ ] **Step 2: Run** `pnpm exec jest lib/homepage/__tests__/settings` → FAIL (module missing).
- [ ] **Step 3: Implement** `settings.ts`. `getHomepageSettings` does one `findMany({ where: { key: { in: [...] } } })`, maps rows, applies `resolveModel` + `clampMaxTokens(model, parseInt||DEFAULT)`. `MODEL_MAX_TOKENS` ≈ `{sonnet:64000, opus:64000, haiku:32000}` (verify ceilings against claude-api skill before finalizing).
- [ ] **Step 4: Run tests** → PASS. `tsc`.
- [ ] **Step 5: Commit** `feat(homepage): settings resolver (model/max_tokens/base prompt)`.

### Task 1.3: Admin settings actions (`actions/admin/homepage-settings.ts`)

**Files:**
- Create: `actions/admin/homepage-settings.ts`
- Test: `actions/admin/__tests__/homepage-settings.test.ts`

**Interfaces:**
- Consumes: `resolveModel`, `clampMaxTokens`, `HOMEPAGE_MODELS` (T1.2); `requireRole` (`@/lib/authz`); `writeAuditLog`.
- Produces:
  ```ts
  export async function getHomepageSettingsForAdmin(): Promise<{ data: HomepageSettings & { basePrompts: {id:string;name:string}[] } } | { error: string }>;
  export async function saveHomepageSettings(input: { model: string; maxTokens: number; basePromptId: string | null }): Promise<{ data: HomepageSettings } | { error: string }>;
  ```

- [ ] **Step 1: Write failing tests** — mock `@/lib/authz` (`requireRole`), `@/lib/prisma`, `@/lib/audit-log`. Assert: non-admin (`requireRole` throws `AuthorizationError`) → `{ error: "Forbidden" }`, no write; admin save with unknown model → clamps to default; max_tokens out of range → clamped; `basePromptId` not a `HOMEPAGE_BASE` prompt → `{ error }`; success upserts the three `crm_SystemSettings` keys + writes audit. (Mirror `actions/campaigns/templates/__tests__/generate-template-scope.test.ts` mock style.)
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Each action: `try { user = await requireRole(["admin"]) } catch (e) { if AuthorizationError/AuthenticationError return {error:"Forbidden"|"Unauthorized"} ; throw }`. `saveHomepageSettings`: validate `basePromptId` (if set) is an existing `crm_Ai_Prompt` with `kind:"HOMEPAGE_BASE", deletedAt:null`; `model = resolveModel(input.model)`; `maxTokens = clampMaxTokens(model, input.maxTokens)`; upsert the three keys via `crm_SystemSettings.upsert`; `writeAuditLog({ entityType:"setting"? , ... })` (reuse an existing audit entityType; if none fits, add via the audit-log insertion hook — log it). `getHomepageSettingsForAdmin`: `getHomepageSettings()` + list `HOMEPAGE_BASE` prompts `{id,name}`.
- [ ] **Step 4: Run** → PASS. `tsc` + `lint`.
- [ ] **Step 5: Commit** `feat(admin): homepage generation settings actions`.

### Task 1.4: Admin settings page + nav

**Files:**
- Create: `app/[locale]/(routes)/admin/homepage-settings/page.tsx` (server component)
- Create: `app/[locale]/(routes)/admin/homepage-settings/_components/HomepageSettingsForm.tsx` (client)
- Modify: `app/[locale]/(routes)/admin/_components/AdminSidebarNav.tsx` — add a nav entry (upstream-owned? verify; log if so)

**Interfaces:** Consumes `getHomepageSettingsForAdmin` / `saveHomepageSettings` (T1.3), `HOMEPAGE_MODELS` (T1.2). The `/admin` layout already gates via `requireRole(["admin"])`, so no extra page-level auth (the save action re-checks server-side).

- [ ] **Step 1:** Page (server component) loads `getHomepageSettingsForAdmin()` and renders `<HomepageSettingsForm settings={...} models={HOMEPAGE_MODELS} basePrompts={...} />`. Match the `crm-settings/page.tsx` shell (title + description + component).
- [ ] **Step 2:** `HomepageSettingsForm` (client): a `Select` for model (options = `HOMEPAGE_MODELS`, default Sonnet), a number `Input` for max_tokens (help text: clamped), a `Select` for base prompt (options = basePrompts, "None → built-in default"), Save button calling `saveHomepageSettings` and toasting `{data}|{error}`. Reuse shadcn `Select/Input/Button` + `sonner` toast (see `GenerateHomepageDrawer.tsx`).
- [ ] **Step 3:** Add a sidebar entry "Homepage Generation" → `/admin/homepage-settings` in `AdminSidebarNav.tsx` (insertion-only; log if upstream-owned).
- [ ] **Step 4:** Manual check via preview_start (admin session) that the page saves and reloads; `tsc` + `lint`.
- [ ] **Step 5: Commit** `feat(admin): homepage generation settings page`.

---

## Workstream 2 — Premium prompt composition + egress/motion

### Task 2.1: Prompt composition (`lib/homepage/prompt.ts`) + provider params

**Files:**
- Create: `lib/homepage/prompt.ts`
- Modify: `lib/homepage/provider.ts` (fork-owned) — accept `system`, `model`, `maxTokens`
- Test: `lib/homepage/__tests__/prompt.test.ts`; update `lib/homepage/__tests__/provider.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const MACHINE_CONTRACT: string; // JSON output + self-contained + allowed-hosts + logo placeholder rules
  export function buildSystemPrompt(basePrompt: string | null): string; // (basePrompt || DEFAULT_BASE) + "\n\n" + MACHINE_CONTRACT
  export const DEFAULT_BASE_PROMPT: string; // fallback creative direction
  ```
- `provider.ts` `generateHomepage` gains `input.system: string`, `input.model: string`, `input.maxTokens: number` (replaces the hard-coded `SYSTEM_PROMPT`, `model`, `max_tokens`). Keep `GENERATE_FETCH_TIMEOUT_MS`.

- [ ] **Step 1: Write failing tests** (`prompt.test.ts`): `buildSystemPrompt("BASE X")` contains `"BASE X"` AND the contract markers (`{"critique"`, `logo placeholder`, allowed-hosts hostnames); `buildSystemPrompt(null)` still contains the contract + falls back to `DEFAULT_BASE_PROMPT`. **This is the Review-Focus "contract always appended" guard** — revert-verify later.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** `prompt.ts`. `MACHINE_CONTRACT` moves the machine-critical parts out of the old `SYSTEM_PROMPT`: "Respond with ONLY JSON `{critique, html}`"; "self-contained single HTML document"; "You MAY load ONLY these external resources: https://fonts.googleapis.com, https://fonts.gstatic.com, and GSAP from https://cdnjs.cloudflare.com/ajax/libs/gsap/<PINNED_VER>/ (gsap.min.js, ScrollTrigger.min.js). No other remote resources."; the `__RADE_LOGO_SRC__` placeholder rule. `DEFAULT_BASE_PROMPT` = a solid premium direction (used only until an admin sets one).
- [ ] **Step 4: Update `provider.ts`** to take `system/model/maxTokens` and use them in the request body; delete the hard-coded `SYSTEM_PROMPT`/model/`max_tokens`. Update `provider.test.ts` to pass `system/model/maxTokens` and assert they hit the body.
- [ ] **Step 5: Run** both suites → PASS. `tsc`.
- [ ] **Step 6: Commit** `feat(homepage): split base prompt + code-owned machine contract`.

### Task 2.2: Seed the premium default `HOMEPAGE_BASE` prompt

**Files:**
- Modify: `prisma/seeds/seed.ts` (fork-owned seed) — upsert one ORG-scoped `HOMEPAGE_BASE` prompt
- Create: `prisma/migrations/<ts>_seed_homepage_base_prompt/migration.sql` (idempotent INSERT … ON CONFLICT DO NOTHING) so hosted envs get it without a manual seed

**Interfaces:** Produces a known `HOMEPAGE_BASE` prompt (stable id or name) admins can select/edit.

- [ ] **Step 1:** Add to `seed.ts` an upsert of a `crm_Ai_Prompt` `{ name:"Premium homepage (default)", kind:"HOMEPAGE_BASE", scope:"ORG", is_default:true, body: <premium direction> }`. Body = the premium creative direction from spec C4 (staggered scroll reveals via GSAP ScrollTrigger, parallax, hover micro-interactions, modular type scale, generous spacing, modern color system, Google Font pairing, `prefers-reduced-motion` fallback). **No machine-contract text** (that's code-appended).
- [ ] **Step 2:** Hand-author the seed migration (idempotent insert keyed on a fixed uuid).
- [ ] **Step 3:** `pnpm db:seed` locally; verify the prompt appears under `HOMEPAGE_BASE` and is selectable on the admin page. `tsc`.
- [ ] **Step 4: Commit** `feat(homepage): seed premium default base prompt`.

### Task 2.3: Egress allowlist (`lib/homepage/render-allowlist.ts`) + render wiring

**Files:**
- Create: `lib/homepage/render-allowlist.ts`
- Modify: `lib/homepage/render.ts` (fork-owned)
- Test: `lib/homepage/__tests__/render-allowlist.test.ts`; update `render.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const GSAP_VERSION = "<pinned>"; // e.g. "3.13.0"
  export function isAllowedRenderRequest(url: string): boolean; // exact host + cdnjs GSAP path pin
  ```

- [ ] **Step 1: Write failing tests** (`render-allowlist.test.ts`): allow `https://fonts.googleapis.com/...`, `https://fonts.gstatic.com/...`, `https://cdnjs.cloudflare.com/ajax/libs/gsap/<ver>/gsap.min.js` and `.../ScrollTrigger.min.js`; **reject** `http://169.254.169.254/...`, `http://localhost/...`, `https://evil.com`, `https://cdnjs.cloudflare.com/ajax/libs/jquery/...` (wrong cdnjs path), `https://fonts.googleapis.com.evil.com` (look-alike host). This is the Review-Focus allowlist guard — **revert-verify**.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** `isAllowedRenderRequest`: parse `new URL(url)`; exact `host` ∈ {fonts.googleapis.com, fonts.gstatic.com}; OR host === cdnjs.cloudflare.com AND `pathname.startsWith("/ajax/libs/gsap/" + GSAP_VERSION + "/")`. Anything unparseable/else → false.
- [ ] **Step 4: Update `render.ts`:** replace `context.route("**/*", r => r.abort())` with `context.route("**/*", r => isAllowedRenderRequest(r.request().url()) ? r.continue() : r.abort())`. Update `render.test.ts` egress test: the installed handler continues an allowlisted URL and aborts a disallowed one.
- [ ] **Step 5: Run** → PASS. `tsc` + `lint`.
- [ ] **Step 6: Commit** `feat(homepage): controlled render egress allowlist (fonts + pinned GSAP)`.

### Task 2.4: Finalize animations before screenshot

**Files:**
- Modify: `lib/homepage/render.ts`
- Test: update `render.test.ts`

**Interfaces:** internal — before `page.screenshot`, run a page script that forces final state.

- [ ] **Step 1: Write failing test:** after `setContent`, `render.ts` calls `page.evaluate` (or `addScriptTag`) with a finalize routine before `screenshot`. Assert (via the mock page) an evaluate/finalize call happens before screenshot. (Extend the existing render mock with an `evaluate` jest.fn and assert call order.)
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** a `finalizeAnimations(page)` that `await page.evaluate(() => { try { const g = (window as any).gsap; if (g) { g.globalTimeline.progress(1); (window as any).ScrollTrigger?.getAll?.().forEach((t:any)=>t.progress?.(1)); } document.querySelectorAll<HTMLElement>('[style*="opacity:0"],[style*="opacity: 0"],.reveal,[data-reveal]').forEach(el=>{el.style.opacity="1";el.style.transform="none";el.style.visibility="visible";}); } catch {} })`. Call it (wrapped, non-throwing) after `setContent`, before `screenshot`. Keep `waitUntil:"load"`.
- [ ] **Step 4: Run** → PASS. `tsc`.
- [ ] **Step 5: Commit** `feat(homepage): finalize animations before screenshot`.

### Task 2.5: Wire settings (model/max_tokens/base prompt) into the flows

**Files:**
- Modify: `inngest/functions/generate-homepage.ts` (fork-owned)
- Test: update `inngest/functions/__tests__/generate-homepage.test.ts`

**Interfaces:** Consumes `getHomepageSettings` (T1.2), `buildSystemPrompt` (T2.1), the base-prompt body lookup.

- [ ] **Step 1: Write failing tests:** in generate + refine flows, a `resolve-settings` step loads settings; the `generateHomepageHtml` call receives `model`, `maxTokens`, and `system = buildSystemPrompt(basePromptBody)` (mock `getHomepageSettings` to return opus/40000/base id; assert the provider mock got them). Existing tests updated for the new provider call shape.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement:** add a `step.run("resolve-settings", getHomepageSettings)`; if `basePromptId`, load the prompt body (`crm_Ai_Prompt.findUnique`), else null; pass `system: buildSystemPrompt(body)`, `model`, `maxTokens` into `runPass`→`generateHomepageHtml`. Keep the timeout arithmetic ≤300s (if `maxTokens` default makes a pass risky, note it; render is a separate concern from vision output length).
- [ ] **Step 4: Run** full job suite → PASS. `tsc`.
- [ ] **Step 5: Commit** `feat(homepage): use admin model/max_tokens/base prompt in generation`.

---

## Workstream 3 — Upload override

### Task 3.1: Add `UPLOAD` to `crm_Homepage_Pass_Kind`

**Files:** Modify `prisma/schema.prisma` (enum, ~line 2147, upstream-owned — log); Create `prisma/migrations/<ts>_homepage_upload_pass_kind/migration.sql` (`ALTER TYPE "crm_Homepage_Pass_Kind" ADD VALUE IF NOT EXISTS 'UPLOAD';`).
- [ ] Steps: add value → migration → `prisma generate` → log upstream touch → `tsc` → commit `feat(homepage): add UPLOAD pass kind`.

### Task 3.2: Upload storage helpers

**Files:** Modify `lib/homepage/storage.ts` (fork-owned); update `lib/homepage/__tests__/storage.test.ts`.

**Interfaces:**
```ts
export const homepageUploadKey = (slug: string) => `previews/${slug}/tmp/upload.html`;
export async function putHomepageUpload(slug: string, html: string): Promise<void>;
export async function getHomepageUpload(slug: string): Promise<string | null>;
export async function deleteHomepageUpload(slug: string): Promise<void>;
```
- [ ] Steps: failing test (key shape distinct from served/tmp keys; put/get round-trip via the mocked S3 client) → implement (mirror `putHomepageTmpSource`/`getHomepageTmpSource`) → PASS → commit `feat(homepage): upload storage helpers`.

### Task 3.3: Upload action (`actions/crm/homepage/upload-homepage.ts`)

**Files:** Create `actions/crm/homepage/upload-homepage.ts`; test in `actions/crm/homepage/__tests__/homepage-actions.test.ts`.

**Interfaces:**
```ts
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // < Vercel 4.5MB body limit
export const uploadHomepage = async (data: { targetId: string; html: string })
  : Promise<{ data: { queued: true } } | { error: string }>;
```
- [ ] **Step 1: Failing tests:** unauth → `{error:"Unauthorized"}`; non-owner (`assertCanWriteTarget` throws) → `{error:"Forbidden"}`; non-APPROVED target → error; empty/`> MAX_UPLOAD_BYTES` html → error; not-HTML (doesn't contain `<` / no `<html`/`<!doctype`/`<body`) → error; happy path: ensures a homepage row exists (create if none, like the generate route's upsert) → `putHomepageUpload` → `inngest.send("homepage/target.upload", { targetId, homepageId, slug, triggeredBy })` → audit → `{data:{queued:true}}`. **No sanitization.**
- [ ] **Step 2–4:** run FAIL → implement (reuse `assertCanWriteTarget`, target APPROVED check, the homepage-row upsert helper, `putHomepageUpload`, `inngest.send`, `writeAuditLog`) → PASS.
- [ ] **Step 5: Commit** `feat(homepage): upload-override action`.

### Task 3.4: `uploadFlow` in the Inngest job

**Files:** Modify `inngest/functions/generate-homepage.ts` (add `homepage/target.upload` trigger + `uploadFlow`); update the job test.

**Interfaces:** Event `homepage/target.upload` data `{ homepageId; targetId; slug; triggeredBy }`. Reuses `renderAndUpload`, `materializeLogo` (no logo for uploads → pass null), `previewUrls`, the READY update, `failRun`.

- [ ] **Step 1: Failing tests** (mirror `revertFlow` tests): loads homepage (soft-delete filter) + `getHomepageUpload(slug)`; if no upload blob → `failRun`; else renders the uploaded html with allowlisted egress (the mocked `renderAndScreenshot`), uploads html+screenshot to served keys, creates a version `{ pass_kind:"UPLOAD", html, created_by:triggeredBy, prompt:null, agent_critique:null }`, sets `current_version_id` + READY + `previewUrls`, deletes the upload blob. Concurrency key `event.data.targetId` already serializes it; add the case to the event switch.
- [ ] **Step 2–4:** FAIL → implement `uploadFlow` + add `{ event: "homepage/target.upload" }` to `triggers` and a `case "homepage/target.upload": return uploadFlow(...)` in the handler switch → PASS. **Revert-verify** a load-bearing bit (no-upload-blob → FAILED).
- [ ] **Step 5: Commit** `feat(homepage): upload-override Inngest flow (UPLOAD version)`.

### Task 3.5: Refine gating on UPLOAD + status exposes pass_kind

**Files:** Modify `actions/crm/homepage/refine-homepage.ts`, `actions/crm/homepage/get-homepage-status.ts`; the inngest refine flow already requires `current_version_id`. Update `homepage-actions.test.ts`.

**Interfaces:** `get-homepage-status` returns each version's `pass_kind` and the current version's kind; refine refuses when the current version is `UPLOAD`.

- [ ] **Step 1: Failing tests:** `refineHomepage` when the current version's `pass_kind === "UPLOAD"` → `{error:"This page was uploaded; AI refine isn't available. Regenerate to use AI."}` and no event; `getHomepageStatus` includes `pass_kind` per version (already selected) + a `current_pass_kind` field. (get-homepage-status already selects `pass_kind`; add resolving the current version's kind.)
- [ ] **Step 2–4:** FAIL → implement (refine loads the current version's `pass_kind`; guard before send) → PASS.
- [ ] **Step 5: Commit** `feat(homepage): disable AI refine on uploaded pages`.

### Task 3.6: Drawer — upload UI + refine gating

**Files:** Modify `app/[locale]/(routes)/campaigns/targets/[targetId]/components/GenerateHomepageDrawer.tsx` (fork-owned).

**Interfaces:** Consumes `uploadHomepage` (T3.3) + `getHomepageStatus` `current_pass_kind` (T3.5).

- [ ] **Step 1:** Add an "Upload your own HTML" section: a file `<input type="file" accept="text/html,.html">`, read the file text (`await file.text()`), size-check client-side (`MAX_UPLOAD_BYTES`), call `uploadHomepage({ targetId, html })`, then `startPolling` (reuse the existing poll). Toast `{data}|{error}`. Disable while `locked`.
- [ ] **Step 2:** When `current_pass_kind === "UPLOAD"`, hide/disable the Refine box (show a hint: "Uploaded page — regenerate to use AI refine"). Keep Regenerate + Revert working.
- [ ] **Step 3:** `router.refresh()` on READY already wired. Verify via preview_start with a small HTML file; screenshot. `tsc` + `lint`.
- [ ] **Step 4: Commit** `feat(homepage): upload-your-own-HTML in the drawer`.

---

## Workstream 4 — Docs, tests, verification

### Task 4.1: Doc-sync + upstream log + lessons

**Files:** `docs/reference/UPSTREAM_IMPACT_LOG.md` (schema enums + AdminSidebarNav + any prompt-kind type), `docs/reference/PROJECT_STRUCTURE.md` (new files: `settings.ts`, `prompt.ts`, `render-allowlist.ts`, admin settings page/actions, `upload-homepage.ts`), `docs/reference/LESSONS_LEARNED.md` (screenshot-vs-scroll-reveal → finalize step; allowlist-vs-full-block tradeoff), `docs/reference/ENVIRONMENT_VARIABLES.md` (none new expected — confirm), the homepage manual-testing doc.
- [ ] Walk the doc-sync set; confirm each updated or N/A. Commit `docs: sync homepage premium+config+upload`.

### Task 4.2: Manual ↔ E2E parity

**Files:** `docs/testing/target-homepage-manual-testing.md` (+ steps: admin config, premium motion present, upload override, refine-disabled-on-upload); `tests/e2e/target-homepage.spec.ts` (add an upload → serve assertion where feasible; note host/timing gaps as Known Gaps like the existing ones).
- [ ] Add manual steps + E2E counterparts (or logged gaps). Commit `test(e2e)+docs: upload override + config parity`.

---

## Self-review notes (author)

- **Spec coverage:** C1→WS1; C2→T1.1/2.2/2.5; C3 egress→T2.3, finalize→T2.4; C4→T2.2; C5→T1.2/2.5; C6 upload→WS3; migration→T1.1/3.1/2.2; security/testing→each task + WS4. All covered.
- **Type consistency:** `HomepageSettings`, `HomepageModel`, `buildSystemPrompt`, `isAllowedRenderRequest`, `homepageUploadKey`, `uploadHomepage`, event `homepage/target.upload` used consistently across tasks.
- **Review Focus:** allowlist bypass (T2.3), contract-appended (T2.1), clamp/model fallback (T1.2), upload authz/validation (T3.3), revert/refine-after-upload (T3.4/3.5) — each has a task + test, three flagged for revert-verify.
- **Open items to resolve during execution:** exact model token ceilings (verify via claude-api skill), pinned GSAP version, whether `AdminSidebarNav`/audit `entityType` are upstream-owned (log if so), and re-checking the max_tokens-vs-300s budget once the real default is set.
