# Homepage Prompt Layers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decompose the homepage generation prompt into composable, user-configurable layers (base · industry · style · avoid · per-target · machine contract), reusing the `crm_Ai_Prompt` library, so different businesses get genuinely different on-brand designs.

**Architecture:** New prompt `kind`s (`HOMEPAGE_INDUSTRY`, `HOMEPAGE_STYLE`, `HOMEPAGE_AVOID`) in the existing prompt library. A pure composition engine in `lib/homepage/prompt.ts` assembles the layers in a fixed precedence with the machine contract always last and a hard length cap. Style is picked stable-per-target by hashing the target id; industry is chosen by a dropdown on the target (a nullable `homepage_industry_prompt_id`); avoid is always applied. Everything degrades to today's base-only behavior when the library is empty. Seeds ship idempotently (fixed UUIDs) via the existing seed-module + migration pattern.

**Tech Stack:** Next.js 16 App Router, Prisma 7 (Postgres), Inngest, better-auth, Jest. pnpm.

**Spec:** `docs/superpowers/specs/2026-10-01-homepage-prompt-layers-design.md` (read it — the full seed prompt bodies live in its Appendix A and are the canonical content for Task 2).

## Global Constraints

- **Additive-only / upstream-friendly.** New logic in new files; touch upstream-owned files (`prisma/schema.prisma`, `lib/mcp/tools/index.ts`, the `/campaigns/prompts` UI, `GenerateHomepageDrawer.tsx`, `prisma/seeds/seed.ts`) with thin insertion-only hooks, and log every upstream-owned edit in `docs/reference/UPSTREAM_IMPACT_LOG.md`. Verify ownership with `git cat-file -e upstream/main:<path>`.
- **Graceful fallback is mandatory.** Empty / all-soft-deleted `HOMEPAGE_STYLE`/`HOMEPAGE_INDUSTRY`/`HOMEPAGE_AVOID` sets contribute nothing; composition falls back to exactly today's `base + MACHINE_CONTRACT`. No layer may ever throw or fail a generation.
- **Machine contract is absolute and last.** No layer can change the output JSON shape, egress hosts, or logo/image tokens.
- **Token cap.** The composed system prompt is capped; when over, trim lowest-precedence *optional* layers first (avoid → style → industry), never the base or machine contract. Default `max_tokens` stays 24000.
- **Selection:** style is deterministic from the homepage/target id (same across generate AND refine); industry from `crm_Targets.homepage_industry_prompt_id` (null → the `is_default` Generic industry prompt, else nothing). The free-text `crm_Targets.industry` is KEPT (still feeds the brief + image planning).
- **Authz (no RLS):** prompt CRUD for ORG scope and the three new kinds is admin-gated server-side; the `vary_design` toggle is admin-gated; the target industry-dropdown write is owner/role-scoped like other target writes. All reads filter `deletedAt IS NULL`.
- **Migrations are committed files** (`prisma migrate dev`), additive, migration-first. Never `db push`.
- **Seeds idempotent:** fixed UUIDs, upsert; re-running never duplicates and never clobbers operator-created prompts.

## Review Focus

- **Empty / soft-deleted layer set** → generation still succeeds base-only. (Task 6 test.)
- **Target points at a missing/soft-deleted industry prompt** → falls back to Generic (or nothing), never crashes. (Task 6 test.)
- **Oversized composed prompt** (several long layers) → cap enforced, lowest-precedence optional layers trimmed, base + machine contract preserved, output not truncated. (Task 5 test.)
- **Stable-per-target style** holds across generate AND refine (same seed source); adding/removing a style may change which card a target maps to — that's acceptable and must be documented, but selection must be stable for a fixed active set. (Task 4 test.)
- **Non-admin** attempting prompt CRUD on a new kind or flipping `vary_design` → server-side denial. (Tasks 7, 9 tests.)

---

## Task 1: Migration — new prompt kinds + target industry column

**Files:**
- Modify: `prisma/schema.prisma` (upstream-owned — insertion-only; log it)
- Create: `prisma/migrations/<timestamp>_homepage_prompt_layers/migration.sql`

**Interfaces:**
- Produces: enum `crm_Ai_Prompt_Kind` gains `HOMEPAGE_INDUSTRY`, `HOMEPAGE_STYLE`, `HOMEPAGE_AVOID`; `crm_Targets.homepage_industry_prompt_id String? @db.Uuid`.

- [ ] **Step 1:** Add the three values to the `crm_Ai_Prompt_Kind` enum and `homepage_industry_prompt_id String? @db.Uuid` to `crm_Targets` in `schema.prisma`.
- [ ] **Step 2:** `pnpm exec prisma migrate dev --name homepage_prompt_layers` (local Supabase on :54622). Confirm the generated SQL is additive (ALTER TYPE ... ADD VALUE; ALTER TABLE ... ADD COLUMN).
- [ ] **Step 3:** Run `bash scripts/check-invariants.sh` and the schema/migration-sync guard; confirm green.
- [ ] **Step 4:** Commit. `git add prisma/schema.prisma prisma/migrations && git commit -m "feat(db): homepage prompt-layer kinds + target industry prompt ref"`

> Note (ordering): this additive migration PR lands/deploys to QA before the code that reads the new kinds/column (CLAUDE.md migration-first). Remind the user after merge that the deploy applies it.

## Task 2: Seed content — refactored base + avoid + 10 styles + 15 industries (idempotent)

**Files:**
- Create: `prisma/seeds/homepage-prompt-layers.ts`
- Modify: `prisma/seeds/homepage-base-prompt.ts` (trim the hardcoded "Structure" section out of `HOMEPAGE_BASE_PROMPT_BODY` — structure now comes from the industry/style layers; keep craft/art-direction/motion/quality)
- Modify: `prisma/seeds/seed.ts` (upstream-owned — call the new seeder; insertion-only)
- Create: migration `prisma/migrations/<timestamp>_seed_homepage_prompt_layers/migration.sql` (idempotent upsert of the same rows, mirroring `20260930130200_seed_homepage_base_prompt`)
- Modify: `package.json` (upstream-owned — add `"seed:homepage-prompts"` script; insertion-only)
- Test: `prisma/seeds/__tests__/homepage-prompt-layers.test.ts`

**Interfaces:**
- Consumes: `crm_Ai_Prompt` (kind/scope/name/body/is_default), the new enum values from Task 1.
- Produces: `seedHomepagePromptLayers(prisma): Promise<void>` — idempotent upsert by fixed UUID; 1 avoid, 10 `HOMEPAGE_STYLE`, 15 `HOMEPAGE_INDUSTRY` (Generic flagged `is_default`), all `scope: ORG`, `created_by: null`. Bodies verbatim from the spec Appendix A.

- [ ] **Step 1: Write the failing test.** Assert: running `seedHomepagePromptLayers` twice yields exactly 26 system rows (1 avoid + 10 style + 15 industry) — no duplicates; exactly one `HOMEPAGE_INDUSTRY` has `is_default: true` and its name is "Generic"; a row's body matches the spec text. (Mock `prisma` with an in-memory upsert keyed by id, or run against the test DB per the `__tests__/invoices` integration convention.)

```ts
// homepage-prompt-layers.test.ts (unit form with a fake upsert store)
import { STYLE_PROMPTS, INDUSTRY_PROMPTS, AVOID_PROMPT, seedHomepagePromptLayers } from "../homepage-prompt-layers";
it("is idempotent and flags one Generic default", async () => {
  const store = new Map<string, any>();
  const prisma: any = { crm_Ai_Prompt: { upsert: async ({ where, create, update }: any) => {
    store.set(where.id, { ...(store.get(where.id) ?? create), ...update, id: where.id });
  } } };
  await seedHomepagePromptLayers(prisma);
  await seedHomepagePromptLayers(prisma); // re-run
  const rows = [...store.values()];
  expect(rows).toHaveLength(1 + STYLE_PROMPTS.length + INDUSTRY_PROMPTS.length);
  expect(STYLE_PROMPTS).toHaveLength(10);
  expect(INDUSTRY_PROMPTS).toHaveLength(15);
  expect(rows.filter((r) => r.kind === "HOMEPAGE_INDUSTRY" && r.is_default)).toHaveLength(1);
});
```

- [ ] **Step 2:** Run it, confirm it fails (module not found).
- [ ] **Step 3: Implement** `homepage-prompt-layers.ts`: export `AVOID_PROMPT`, `STYLE_PROMPTS[]`, `INDUSTRY_PROMPTS[]` (each `{ id, name, body, kind, is_default? }` with a fixed UUID literal), and `seedHomepagePromptLayers(prisma)` that upserts each by id (`where:{id}`, `create:{...all fields, scope:"ORG", created_by:null}`, `update:{name, body, kind, is_default}`). Bodies copied verbatim from spec Appendix A.2–A.4. Mirror the `homepage-base-prompt.ts` header doc.
- [ ] **Step 4:** Trim `HOMEPAGE_BASE_PROMPT_BODY` to craft-only (remove the `Structure` block) per spec A.1; update its seed migration body to match (keep its fixed id).
- [ ] **Step 5:** Wire `seedHomepagePromptLayers` into `prisma/seeds/seed.ts` (after `seedHomepageBasePrompt`); add `"seed:homepage-prompts": "ts-node ./prisma/seeds/run-homepage-prompts.ts"` (a tiny runner that news a PrismaClient from `DATABASE_URL` and calls the seeder — NOT behind the local-only guard, so it can target any env).
- [ ] **Step 6:** Author the idempotent upsert migration SQL (INSERT … ON CONFLICT (id) DO UPDATE) so hosted QA/prod get the rows on deploy — the hands-off channel, consistent with the base-prompt migration. (Deploy-time is primary; the script is for local/dev or ad-hoc.)
- [ ] **Step 7:** Run the test (pass), `pnpm db:migrate && pnpm db:seed` locally, verify 26 rows.
- [ ] **Step 8:** Commit.

## Task 3: Style selection (pure, stable-per-target)

**Files:**
- Create: `lib/homepage/prompt-layers/select-style.ts`
- Test: `lib/homepage/prompt-layers/__tests__/select-style.test.ts`

**Interfaces:**
- Produces: `pickStyleDirection(seed: string, styles: {id:string;body:string}[]): {id:string;body:string} | null` — deterministic FNV-1a hash of `seed` → index over `styles` sorted by `id`; `[]` → `null`.

- [ ] **Step 1: Write the failing test.** Same seed+set → same pick every call; two different seeds spread across a set of 10 (not all identical); empty set → null; sorting by id makes the result independent of input array order.

```ts
import { pickStyleDirection } from "../select-style";
const styles = Array.from({ length: 10 }, (_, i) => ({ id: `s${i}`, body: `b${i}` }));
it("is deterministic and order-independent", () => {
  const a = pickStyleDirection("target-123", styles);
  const b = pickStyleDirection("target-123", [...styles].reverse());
  expect(a).toEqual(b);
  expect(a).not.toBeNull();
});
it("empty set -> null", () => expect(pickStyleDirection("x", [])).toBeNull());
it("spreads across seeds", () => {
  const picks = new Set(Array.from({ length: 50 }, (_, i) => pickStyleDirection(`t${i}`, styles)!.id));
  expect(picks.size).toBeGreaterThan(3);
});
```

- [ ] **Step 2:** Run, confirm fail.
- [ ] **Step 3: Implement** FNV-1a over the UTF-8 bytes of `seed`, `index = hash % styles.length` on an id-sorted copy; return the entry or null.
- [ ] **Step 4:** Run, pass. **Step 5:** Commit.

## Task 4: Composition engine (`buildSystemPrompt` refactor)

**Files:**
- Modify: `lib/homepage/prompt.ts`
- Test: `lib/homepage/__tests__/prompt.test.ts` (extend)

**Interfaces:**
- Consumes: `MACHINE_CONTRACT`, `DEFAULT_BASE_PROMPT`.
- Produces: `buildSystemPrompt(layers: { base: string | null; industry?: string | null; style?: string | null; avoid?: string | null }, opts?: { maxChars?: number }): string` — assembles, in order, base (or `DEFAULT_BASE_PROMPT`), industry, style, avoid, each under a labeled header, then `MACHINE_CONTRACT` LAST; drops empty layers; if over `maxChars`, trims optional layers in reverse-precedence order (avoid → style → industry) until it fits, never dropping base or `MACHINE_CONTRACT`. **Back-compat:** keep the old single-arg behavior working, or update the one caller (Task 6) in lockstep.

- [ ] **Step 1: Write failing tests:** (a) order is base → industry → style → avoid → machine contract, with machine contract last; (b) all optional layers null → output equals today's `${base}\n\n${MACHINE_CONTRACT}`; (c) a huge avoid layer over the cap is dropped while base + machine contract remain; (d) machine contract text is always present.
- [ ] **Step 2:** Run, fail. **Step 3:** Implement the ordered assembly + cap. **Step 4:** Run, pass. **Step 5:** Commit.

## Task 5: Layer loaders + settings toggle

**Files:**
- Modify: `lib/homepage/settings.ts` (add `varyDesign` to `HomepageSettings` + `KEY_VARY_DESIGN = "homepage.vary_design"`, default true)
- Create: `lib/homepage/prompt-layers/load-layers.ts` — DB loaders for the active style set, the avoid text, and a target's industry body (+ Generic fallback)
- Test: `lib/homepage/prompt-layers/__tests__/load-layers.test.ts`

**Interfaces:**
- Produces: `loadActiveStyles(): Promise<{id;body}[]>`, `loadAvoidText(): Promise<string|null>` (concatenate active `HOMEPAGE_AVOID`), `loadIndustryBody(promptId: string|null): Promise<string|null>` (by id when set & not deleted; else the `is_default` `HOMEPAGE_INDUSTRY`; else null). All filter `deletedAt:null`, `scope` ORG, and the right `kind`.
- Consumes (Task 6): these feed `resolveGenerationConfig`.

- [ ] **Step 1: Write failing tests** (mock prismadb): active styles exclude soft-deleted; `loadIndustryBody("missing")` → Generic default; `loadIndustryBody(null)` → Generic; no Generic present → null; avoid concatenates multiple.
- [ ] **Step 2:** Run, fail. **Step 3:** Implement. **Step 4:** Run, pass. **Step 5:** Commit.

## Task 6: Wire layers into the generate + refine flows

**Files:**
- Modify: `inngest/functions/generate-homepage.ts` (`resolveGenerationConfig` + `runPass` system construction; pass the homepage/target id as the style seed)
- Modify: `lib/homepage/settings.ts` consumers as needed
- Test: `inngest/functions/__tests__/generate-homepage.test.ts` (extend)

**Interfaces:**
- Consumes: `buildSystemPrompt` (Task 4), `pickStyleDirection` (Task 3), `loadActiveStyles/loadAvoidText/loadIndustryBody` (Task 5), `varyDesign` (Task 5).
- Produces: each pass's `system` = `buildSystemPrompt({ base, industry, style, avoid })` where style is `pickStyleDirection(homepage.id, activeStyles)` (stable across passes), industry from the target's `homepage_industry_prompt_id`. When `varyDesign` is false → only `{ base }`.

- [ ] **Step 1: Write failing tests:** (a) with styles+industry+avoid mocked, the `system` passed to the provider contains all four layers and the machine contract; (b) the SAME style card is used on the initial pass and every auto/refine pass (stable seed); (c) `varyDesign:false` → system is base + machine contract only; (d) a target with a soft-deleted industry id → Generic; (e) empty libraries → today's behavior, run still READY.
- [ ] **Step 2:** Run, fail. **Step 3:** Implement: load layers once in `resolveGenerationConfig`, compute the style pick from `homepage.id`, store on the config, build `system` per pass. Refine uses the same `homepage.id` seed so the look is stable. **Step 4:** Run full `generate-homepage.test.ts`, pass (existing tests must stay green — the default/empty path equals today). **Step 5:** Commit.

## Task 7: Prompt CRUD + MCP accept the new kinds

**Files:**
- Modify: `actions/crm/prompts/list-prompts.ts` (`AiPromptKind` union), `create-prompt.ts` / `update-prompt.ts` / `delete-prompt.ts` (admin-gate the new kinds like `HOMEPAGE_BASE`)
- Modify: `lib/mcp/tools/crm-ai-prompts.ts` (upstream-owned? verify — extend the `z.enum` to include the new kinds)
- Test: `actions/crm/prompts/__tests__/*` (extend), `lib/mcp/__tests__/*` (extend)

- [ ] **Step 1: Write failing tests:** a non-admin creating a `HOMEPAGE_STYLE` is rejected (`requireRole(["admin"])`); an admin can create/list/soft-delete each new kind; `listPrompts({kind:"HOMEPAGE_STYLE"})` filters by kind + `deletedAt:null`.
- [ ] **Step 2:** Run, fail. **Step 3:** Implement: extend the union and the `z.enum`; include the three kinds in the admin-gate condition (`scope === "ORG" || kind !== "EMAIL"` or an explicit set). **Step 4:** Run, pass. **Step 5:** Commit.

## Task 8: Admin `vary_design` toggle (settings action + UI)

**Files:**
- Modify: `actions/admin/homepage-settings.ts` (save/get `homepage.vary_design`; validate boolean; include in the audit `new=` line)
- Modify: the admin Homepage-Generation settings component under `app/[locale]/(routes)/admin/homepage-settings/` (add the checkbox)
- Test: `actions/admin/__tests__/homepage-settings.test.ts` (extend)

- [ ] **Step 1: Write failing test:** saving `varyDesign:false` persists `homepage.vary_design="false"` and `getHomepageSettingsForAdmin` returns it; non-admin save rejected. **Step 2:** fail. **Step 3:** implement (mirror the existing scalar settings). **Step 4:** pass. **Step 5:** commit.

## Task 9: Prompt-library UI surfaces the new kinds

**Files:**
- Modify: `app/[locale]/(routes)/campaigns/prompts/page.tsx`, `_components/PromptList.tsx`, `_components/PromptDialog.tsx` (verify upstream ownership; likely fork-owned)

- [ ] **Step 1:** Add Industry / Style / Avoid to the kind selector/tabs and the create/edit dialog's kind options, reusing the existing list/dialog wiring. (Confirm the exact UI location with the user per the UI-surface rule before building.)
- [ ] **Step 2:** Manually verify CRUD for each new kind in the running app (preview_start), screenshot. **Step 3:** Commit.

## Task 10: Target industry dropdown + create-time pre-match

**Files:**
- Modify: `app/[locale]/(routes)/campaigns/targets/[targetId]/components/GenerateHomepageDrawer.tsx` (add the Industry dropdown; options = active `HOMEPAGE_INDUSTRY` prompts; default = the target's saved value or Generic)
- Create: `actions/crm/targets/set-homepage-industry.ts` (owner/role-scoped write of `homepage_industry_prompt_id`)
- Create: `lib/homepage/prompt-layers/match-industry.ts` (pure `matchIndustry(freeText, industryPrompts): id|null` keyword match) + wire into the target-create path
- Tests: action test + `match-industry` unit test

- [ ] **Step 1: Write failing tests:** `matchIndustry("Nail salon", prompts)` → the salon/beauty prompt id; unknown → null (→ Generic at read time); the action rejects a non-owner/non-admin and persists the id for an allowed caller. **Step 2:** fail. **Step 3:** implement the pure matcher + the scoped action + the drawer dropdown; call `matchIndustry` on target create to pre-fill. **Step 4:** pass; verify the dropdown in the app (screenshot). **Step 5:** commit.

## Task 11: Docs sync

**Files:** `CUSTOMIZATIONS.md`, `docs/reference/PROJECT_STRUCTURE.md`, `docs/reference/LESSONS_LEARNED.md` (if a gotcha emerges), `docs/reference/UPSTREAM_IMPACT_LOG.md` (schema.prisma, seed.ts, package.json, mcp tools, any upstream UI), new `docs/testing/homepage-prompt-layers-manual-testing.md`. ENVIRONMENT_VARIABLES: N/A (no env var).

- [ ] **Step 1:** Add a CUSTOMIZATIONS row (layered prompts feature). **Step 2:** PROJECT_STRUCTURE entries for `lib/homepage/prompt-layers/*` and the seed module. **Step 3:** UPSTREAM_IMPACT_LOG entries for every upstream-owned touch. **Step 4:** Write the manual-testing doc (the 7 acceptance criteria as manual steps). **Step 5:** Commit.

## Self-review

- **Spec coverage:** base refactor (T2/T4), industry (T1/T2/T5/T10), style (T2/T3/T5/T6), avoid (T2/T5/T6), per-target (unchanged, composed last-but-one in T4/T6), machine contract last (T4), dropdown-from-library (T10), stable-per-target (T3/T6), idempotent seed (T2), toggle (T5/T8), MCP/UI (T7/T9), token cap (T4), graceful fallback (T4/T5/T6). Covered.
- **Type consistency:** `pickStyleDirection`, `buildSystemPrompt(layers)`, `loadActiveStyles/loadAvoidText/loadIndustryBody`, `AiPromptKind` union, `homepage_industry_prompt_id` used consistently across tasks.
- **Review Focus:** empty set (T4/T5/T6), missing industry (T5/T6), oversized prompt (T4), stable across passes (T6), non-admin denial (T7/T8) — each has an owning task + test.
