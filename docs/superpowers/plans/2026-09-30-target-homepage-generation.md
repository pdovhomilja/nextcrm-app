# Target Homepage Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** From an APPROVED target, generate a modern self-contained sample homepage via an Inngest background job that renders in headless chromium, screenshots, and runs a Claude-vision critique→refine loop (N=3 auto passes + unlimited human refinement rounds, versioned), grounded in assets harvested from the prospect's current site; store HTML+screenshot in a private R2 bucket; serve at `previews.radeengineering.com/p/<slug>`; and expose the link + screenshot to the already-shipped email subsystem via the `crm_Target_Homepage` seam.

**Architecture:** A new Inngest job (`homepage/target.generate` + `homepage/target.refine`) mirrors `enrich-target.ts`. Rendering uses `playwright-core` + `@sparticuz/chromium` (lazy-imported in the handler). Generation is an inline Anthropic **vision** call (`claude-sonnet-5-5`) behind a swappable provider. The prospect's `company_website` is harvested (screenshot + brand colors/fonts/logo-URL/copy) under the existing SSRF host guard. Pages live in the **private** existing R2/MinIO bucket under `previews/<slug>` and are streamed by public Vercel routes `app/p/[slug]/route.ts` (+ `/screenshot.png`). The email seam (`crm_Target_Homepage.preview_url`/`screenshot_url`) is unchanged.

**Tech Stack:** Next.js 16 App Router, Prisma, Inngest 4, `@aws-sdk/client-s3` (R2/MinIO), `playwright-core` + `@sparticuz/chromium` (new), better-auth, Anthropic Messages API (vision), pnpm 11 / Node 22.

**Spec:** `docs/superpowers/specs/2026-09-29-target-ai-outreach-design.md` (§4.2–4.3 data model, §6 homepage subsystem incl. 6.2 engine, 6.3 hosting, 6.5 source-asset harvest, §8 security). Read it alongside this plan.

## Global Constraints

- **Branch:** `feat/target-homepage-generation` (already created). **Never commit to `main`/`qa`/`production`. Do NOT `git push` without explicit user permission.**
- **Package manager:** `pnpm` only (`pnpm add`, `pnpm install --frozen-lockfile` in CI). Never npm/yarn.
- **Migrations:** author with `pnpm exec prisma migrate dev --name <name>`. **NEVER `prisma db push`.** (Note the repo's benign baseline schema↔migration drift; the CI schema-sync check is git-based — a schema edit must ship with a migration file.)
- **Auth boundary (no RLS):** every server action / route handler calls `requireAuthenticated()` then `assertCanWriteTarget(user, targetId)` (from `@/lib/authz`); map `AuthenticationError`→Unauthorized, `AuthorizationError`→Forbidden, rethrow else. Inngest jobs resolve the ANTHROPIC key via `getApiKey("ANTHROPIC", triggeredBy)`.
- **Approval gate:** homepage generate/refine require `target.triage_status === "APPROVED"` (server-enforced).
- **Terminal status is `READY`** (not `COMPLETED`) — `crm_Homepage_Status` = PENDING｜RUNNING｜READY｜FAILED.
- **AI:** `claude-sonnet-5-5`, `https://api.anthropic.com/v1/messages` (base `process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com"`), headers `x-api-key`/`anthropic-version: 2023-06-01`; `max_tokens ≈ 12000`; vision via an `image` content block (base64 png). N=3 auto passes.
- **Heavy native deps MUST be lazy-imported inside the handler** (`const chromium = (await import("@sparticuz/chromium")).default`) — importing chromium/playwright at the `/api/inngest` route's module scope 500s the whole route (same rule the codebase applies to `sharp`).
- **R2 bucket stays PRIVATE:** reuse `minioClient`/`MINIO_BUCKET` (`lib/minio.ts`); objects keyed `previews/<slug>` (html) + `previews/<slug>/screenshot.png`. **Never** build a public bucket URL; serve only through the `/p/[slug]` routes.
- **SSRF:** harvesting `company_website` is a prospect-controlled server-side fetch — gate every navigation with the existing host guard (see `docs/superpowers/specs/2026-07-21-ssrf-host-guard-design.md`; find its implementation in `lib/`), plus a navigation timeout and downloads disabled.
- **Soft delete:** filter `deletedAt: null`.
- **Upstream-owned files touched (insert-only; log each in `docs/reference/UPSTREAM_IMPACT_LOG.md`):** `prisma/schema.prisma`, `app/api/inngest/route.ts`, `package.json`, `next.config.js`, `proxy.ts`. Fork-owned: `vercel.json`, everything under `lib/homepage/**`, `lib/ai/**`, `inngest/functions/generate-homepage.ts`, new `actions/**`, `app/p/**`, the drawer/UI additions, `docs/**`.
- **Import path casing** exact (CI is case-sensitive).

## Review Focus

- **Non-APPROVED / non-owner target** → generate/refine/status/revert refuse (gate + authz). (Tasks 9)
- **Missing/blank `company_website`** → harvest skipped, generation still succeeds from prompt/description. (Tasks 4b, 7)
- **SSRF: `company_website` pointing at a private/internal IP, localhost, cloud-metadata, or non-http(s)** → harvest refuses that URL, no internal request made. (Task 4b)
- **Chromium fails to launch / render times out** → job marks `crm_Target_Homepage.status = FAILED` with an error, never leaves it stuck RUNNING. (Task 7)
- **Unknown/unpublished slug on `/p/[slug]`** → 404-style generic page, no 500, no enumeration; private object never exposed except via the route. (Task 10)

---

### Task 1: Schema — version table, pass-kind enum, current_version pointer

**Files:**
- Modify: `prisma/schema.prisma` (add enum + model; add fields/relations to `crm_Target_Homepage`)
- Modify: `docs/reference/UPSTREAM_IMPACT_LOG.md`
- Create: `prisma/migrations/<ts>_homepage_versions/migration.sql` (generated)

**Interfaces:**
- Produces: enum `crm_Homepage_Pass_Kind { AUTO, HUMAN }`; model `crm_Target_Homepage_Version { id, homepage_id, html, screenshot_key, prompt, agent_critique, pass_kind, created_by, created_at }`; `crm_Target_Homepage` gains `current_version_id String? @db.Uuid`, `source_url String?`, and `versions crm_Target_Homepage_Version[]`.

- [ ] **Step 1: Add the enum + model + fields to `prisma/schema.prisma`**

Append:

```prisma
enum crm_Homepage_Pass_Kind {
  AUTO
  HUMAN
}

model crm_Target_Homepage_Version {
  id             String                 @id @default(uuid()) @db.Uuid
  homepage_id    String                 @db.Uuid
  html           String                 @db.Text
  screenshot_key String?
  prompt         String?                @db.Text
  agent_critique String?                @db.Text
  pass_kind      crm_Homepage_Pass_Kind
  created_by     String?                @db.Uuid
  created_at     DateTime               @default(now())

  homepage crm_Target_Homepage @relation(fields: [homepage_id], references: [id], onDelete: Cascade)

  @@index([homepage_id])
}
```

Inside `model crm_Target_Homepage` (after `error String?`), insert:

```prisma
  current_version_id String? @db.Uuid
  source_url         String?
  versions           crm_Target_Homepage_Version[]
```

- [ ] **Step 2: Validate + migrate**

Run: `pnpm exec prisma validate` (expect valid), then `pnpm exec prisma migrate dev --name homepage_versions` (expect a new migration folder creating the table + enum + the two added columns).

- [ ] **Step 3: Log the upstream touch**

Append a row to `docs/reference/UPSTREAM_IMPACT_LOG.md`: `prisma/schema.prisma` — insert-only: `crm_Homepage_Pass_Kind` enum + `crm_Target_Homepage_Version` model + `current_version_id`/`source_url`/`versions` on `crm_Target_Homepage`; risk Low (additive).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations docs/reference/UPSTREAM_IMPACT_LOG.md
git commit -m "feat(db): homepage version history + current-version pointer"
```

---

### Task 2: Dependencies + serverless-chromium config

**Files:**
- Modify: `package.json` (add `playwright-core`, `@sparticuz/chromium`)
- Modify: `next.config.js` (`serverExternalPackages`)
- Modify: `vercel.json` (function memory/duration for `/api/inngest`)
- Modify: `docs/reference/UPSTREAM_IMPACT_LOG.md`
- Create: `scripts/smoke/homepage-render-smoke.cjs` (throwaway-style local smoke, kept as a documented manual check)

**Interfaces:**
- Produces: `playwright-core` + `@sparticuz/chromium` available; a proven `renderAndScreenshot` recipe (used by Task 4a).

- [ ] **Step 1: Add deps**

Run: `pnpm add playwright-core @sparticuz/chromium` (pin the `@sparticuz/chromium` major to the chromium build compatible with `playwright-core`; verify they install cleanly).

- [ ] **Step 2: Mark chromium/playwright external in `next.config.js`**

Extend the existing `serverExternalPackages` array (currently `["pdf-parse", "pdfjs-dist"]`) to include `"@sparticuz/chromium"` and `"playwright-core"`:

```js
serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@sparticuz/chromium", "playwright-core"],
```

- [ ] **Step 3: Give the Inngest function room in `vercel.json`**

Chromium needs memory + time. Add a `functions` block (the file currently only has `$schema` + `git`):

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "git": { "deploymentEnabled": { "main": false } },
  "functions": {
    "app/api/inngest/route.ts": { "memory": 2048, "maxDuration": 300 }
  }
}
```

- [ ] **Step 4: Local smoke check (kept, documented) that chromium launches + screenshots**

Create `scripts/smoke/homepage-render-smoke.cjs` that lazy-imports `@sparticuz/chromium` + `playwright-core`, launches chromium with `chromium.args`/`executablePath()`, `setContent("<h1>hi</h1>")`, screenshots to a temp path, and logs the byte size. Run: `node scripts/smoke/homepage-render-smoke.cjs`. Expected: a non-zero PNG written (proves the serverless-chromium recipe locally). Record the exact launch snippet in the file's header comment — Task 4a copies it.

- [ ] **Step 5: Log upstream touches + commit**

Append `UPSTREAM_IMPACT_LOG.md` rows for `package.json` (add 2 deps) and `next.config.js` (extend serverExternalPackages), risk Low.

```bash
git add package.json pnpm-lock.yaml next.config.js vercel.json scripts/smoke docs/reference/UPSTREAM_IMPACT_LOG.md
git commit -m "chore(homepage): add serverless chromium (playwright-core + @sparticuz/chromium) + fn config"
```

---

### Task 3: Private R2 storage helpers

**Files:**
- Create: `lib/homepage/storage.ts`
- Test: `lib/homepage/__tests__/storage.test.ts`

**Interfaces:**
- Consumes: `minioClient`, `MINIO_BUCKET` (`@/lib/minio`), `@aws-sdk/client-s3`.
- Produces:
  - `homepageHtmlKey(slug): string` → `previews/<slug>/index.html`
  - `homepageShotKey(slug): string` → `previews/<slug>/screenshot.png`
  - `putHomepageHtml(slug, html): Promise<void>` (PutObject, `text/html; charset=utf-8`)
  - `putHomepageScreenshot(slug, png: Buffer): Promise<void>` (PutObject, `image/png`)
  - `getHomepageHtml(slug): Promise<string | null>` (GetObject→string; null on NoSuchKey)
  - `getHomepageScreenshotBuffer(slug): Promise<Buffer | null>`

- [ ] **Step 1: Write the failing test**

Create `lib/homepage/__tests__/storage.test.ts`:

```ts
const send = jest.fn();
jest.mock("@/lib/minio", () => ({ minioClient: { send }, MINIO_BUCKET: "bucket" }));
import { PutObjectCommand } from "@aws-sdk/client-s3";
import {
  homepageHtmlKey, homepageShotKey, putHomepageHtml, getHomepageHtml,
} from "@/lib/homepage/storage";

beforeEach(() => jest.clearAllMocks());

it("keys are slug-scoped under previews/", () => {
  expect(homepageHtmlKey("acme")).toBe("previews/acme/index.html");
  expect(homepageShotKey("acme")).toBe("previews/acme/screenshot.png");
});

it("uploads html with text/html content-type", async () => {
  send.mockResolvedValue({});
  await putHomepageHtml("acme", "<h1>hi</h1>");
  const cmd = send.mock.calls[0][0];
  expect(cmd).toBeInstanceOf(PutObjectCommand);
  expect(cmd.input).toMatchObject({ Bucket: "bucket", Key: "previews/acme/index.html", ContentType: "text/html; charset=utf-8" });
});

it("getHomepageHtml returns null on NoSuchKey", async () => {
  send.mockRejectedValue(Object.assign(new Error("x"), { name: "NoSuchKey" }));
  expect(await getHomepageHtml("nope")).toBeNull();
});
```

- [ ] **Step 2: Run it, expect FAIL** — `pnpm exec jest lib/homepage/__tests__/storage.test.ts` (module not found).

- [ ] **Step 3: Implement `lib/homepage/storage.ts`**

```ts
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { minioClient, MINIO_BUCKET } from "@/lib/minio";

export const homepageHtmlKey = (slug: string) => `previews/${slug}/index.html`;
export const homepageShotKey = (slug: string) => `previews/${slug}/screenshot.png`;

export async function putHomepageHtml(slug: string, html: string): Promise<void> {
  await minioClient.send(new PutObjectCommand({
    Bucket: MINIO_BUCKET, Key: homepageHtmlKey(slug), Body: html,
    ContentType: "text/html; charset=utf-8",
  }));
}

export async function putHomepageScreenshot(slug: string, png: Buffer): Promise<void> {
  await minioClient.send(new PutObjectCommand({
    Bucket: MINIO_BUCKET, Key: homepageShotKey(slug), Body: png, ContentType: "image/png",
  }));
}

async function getBuffer(key: string): Promise<Buffer | null> {
  try {
    const res = await minioClient.send(new GetObjectCommand({ Bucket: MINIO_BUCKET, Key: key }));
    const chunks: Uint8Array[] = [];
    for await (const c of res.Body as AsyncIterable<Uint8Array>) chunks.push(c);
    return Buffer.concat(chunks);
  } catch (e) {
    if ((e as { name?: string }).name === "NoSuchKey" || (e as { name?: string }).name === "NotFound") return null;
    throw e;
  }
}

export async function getHomepageHtml(slug: string): Promise<string | null> {
  const b = await getBuffer(homepageHtmlKey(slug));
  return b ? b.toString("utf-8") : null;
}

export async function getHomepageScreenshotBuffer(slug: string): Promise<Buffer | null> {
  return getBuffer(homepageShotKey(slug));
}
```

- [ ] **Step 4: Run tests, expect PASS.** **Step 5: Commit** (`feat(homepage): private R2 storage helpers`).

---

### Task 4a: Headless render + screenshot

**Files:**
- Create: `lib/homepage/render.ts`
- Test: `lib/homepage/__tests__/render.test.ts` (mocked playwright — verifies wiring, not real chromium)

**Interfaces:**
- Produces: `renderAndScreenshot(html: string, opts?: { width?: number; height?: number }): Promise<Buffer>` — lazy-imports chromium, launches, `setContent`, screenshots viewport, returns PNG Buffer; always closes the browser (finally).

- [ ] **Step 1: Write the failing test (mock the lazy imports)**

Create `lib/homepage/__tests__/render.test.ts`:

```ts
const screenshot = jest.fn().mockResolvedValue(Buffer.from("PNG"));
const setContent = jest.fn().mockResolvedValue(undefined);
const close = jest.fn().mockResolvedValue(undefined);
const newPage = jest.fn().mockResolvedValue({ setContent, screenshot, close: jest.fn() });
const launch = jest.fn().mockResolvedValue({ newPage, close });
jest.mock("playwright-core", () => ({ chromium: { launch } }));
jest.mock("@sparticuz/chromium", () => ({ __esModule: true, default: { args: [], headless: true, executablePath: async () => "/tmp/chromium" } }));

import { renderAndScreenshot } from "@/lib/homepage/render";

it("launches, sets content, screenshots, and closes the browser", async () => {
  const png = await renderAndScreenshot("<h1>hi</h1>");
  expect(png).toEqual(Buffer.from("PNG"));
  expect(setContent).toHaveBeenCalledWith("<h1>hi</h1>", expect.objectContaining({ waitUntil: "networkidle" }));
  expect(close).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run it, expect FAIL.**

- [ ] **Step 3: Implement `lib/homepage/render.ts`** (copy the launch recipe proven in Task 2's smoke script)

```ts
export async function renderAndScreenshot(
  html: string,
  opts: { width?: number; height?: number } = {},
): Promise<Buffer> {
  const chromium = (await import("@sparticuz/chromium")).default;
  const { chromium: pw } = await import("playwright-core");
  const browser = await pw.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
  try {
    const page = await browser.newPage({
      viewport: { width: opts.width ?? 1280, height: opts.height ?? 900 },
    });
    await page.setContent(html, { waitUntil: "networkidle", timeout: 20000 }).catch(() => {});
    const png = await page.screenshot({ fullPage: false });
    return Buffer.from(png);
  } finally {
    await browser.close();
  }
}
```

- [ ] **Step 4: Run tests, expect PASS.** Note in the report that real-chromium behavior is covered by the Task 2 smoke check + CI, not this unit test. **Step 5: Commit** (`feat(homepage): headless render+screenshot helper`).

---

### Task 4b: SSRF-guarded source-site harvest

**Files:**
- Create: `lib/homepage/harvest-source.ts`
- Test: `lib/homepage/__tests__/harvest-source.test.ts`

**Interfaces:**
- Consumes: the existing SSRF host guard (FIND it — search `lib/` for the guard from `docs/superpowers/specs/2026-07-21-ssrf-host-guard-design.md`, e.g. `assertPublicHttpUrl`/`isBlockedHost`; use it), `renderAndScreenshot`/a page from Task 4a's chromium.
- Produces: `harvestSource(url: string | null | undefined): Promise<{ screenshotB64: string; brand: { logoUrl: string | null; colors: string[]; fonts: string[]; copy: string } } | null>` — returns `null` when url is blank OR fails the SSRF guard OR navigation fails; never throws for a bad prospect URL.

- [ ] **Step 1: FIND the SSRF guard.** Run `grep -rniE "ssrf|isPrivate|blockedHost|assertPublic|metadata" lib/ | head` and read the guard module named in `docs/superpowers/specs/2026-07-21-ssrf-host-guard-design.md`. Use its exported validator. (If it exposes `assertSafeUrl(url)` that throws, wrap in try/catch → return null.)

- [ ] **Step 2: Write the failing test**

Create `lib/homepage/__tests__/harvest-source.test.ts` (mock the guard + a chromium page):

```ts
const assertSafe = jest.fn();
jest.mock("@/lib/<ssrf-guard-module>", () => ({ assertSafeUrl: assertSafe })); // fix path to the real guard
// mock playwright-core chromium so no real browser launches
const evaluate = jest.fn().mockResolvedValue({ logoUrl: "https://x/logo.png", colors: ["#123"], fonts: ["Inter"], copy: "We do plumbing" });
const screenshot = jest.fn().mockResolvedValue(Buffer.from("IMG"));
const goto = jest.fn().mockResolvedValue(undefined);
const close = jest.fn();
jest.mock("playwright-core", () => ({ chromium: { launch: jest.fn().mockResolvedValue({
  newPage: jest.fn().mockResolvedValue({ goto, evaluate, screenshot, close: jest.fn() }), close }) } }));
jest.mock("@sparticuz/chromium", () => ({ __esModule: true, default: { args: [], executablePath: async () => "/tmp/c" } }));

import { harvestSource } from "@/lib/homepage/harvest-source";

beforeEach(() => jest.clearAllMocks());

it("returns null for a blank url without touching the network", async () => {
  expect(await harvestSource("")).toBeNull();
  expect(goto).not.toHaveBeenCalled();
});

it("returns null (no navigation) when the SSRF guard rejects the url", async () => {
  assertSafe.mockImplementation(() => { throw new Error("blocked"); });
  expect(await harvestSource("http://169.254.169.254/")).toBeNull();
  expect(goto).not.toHaveBeenCalled();
});

it("harvests screenshot + brand for a safe url", async () => {
  assertSafe.mockReturnValue(undefined);
  const out = await harvestSource("https://acme.example");
  expect(out?.brand.copy).toContain("plumbing");
  expect(out?.screenshotB64).toBe(Buffer.from("IMG").toString("base64"));
});
```

- [ ] **Step 3: Implement `lib/homepage/harvest-source.ts`** — validate URL with the guard BEFORE launching/navigating; `goto(url, { waitUntil: "domcontentloaded", timeout: 15000 })`; `page.evaluate` to pull logo (`link[rel~=icon]`/first header `img`), colors (computed styles of header/nav/buttons), fonts (`getComputedStyle(document.body).fontFamily`), and copy (headings + first paragraphs, capped ~2k chars); screenshot; return base64 + brand. Wrap everything after the guard in try/catch → return null on any failure. Disable downloads; enforce the timeout.

- [ ] **Step 4: Run tests, expect PASS.** **Step 5: Commit** (`feat(homepage): SSRF-guarded source-site harvest`).

---

### Task 5: Anthropic JSON helper + vision provider

**Files:**
- Create: `lib/ai/anthropic-json.ts` (shared `extractJsonObject`)
- Create: `lib/homepage/provider.ts`
- Test: `lib/homepage/__tests__/provider.test.ts`

**Interfaces:**
- Consumes: `getApiKey` (`@/lib/api-keys`), global `fetch`, `extractJsonObject`.
- Produces:
  - `extractJsonObject(text: string): string | null` (moved/duplicated from `generate-target-email.ts`'s private copy — do NOT edit the shipped email file; just add the shared one).
  - `generateHomepage(input: { apiKey: string; brief: string; prompt: string; previousHtml?: string; sourceScreenshotB64?: string; refinedScreenshotB64?: string }): Promise<{ html: string; critique: string }>` — inline vision `fetch`, `claude-sonnet-5-5`, `max_tokens: 12000`, builds a `content` array with any provided screenshots as `image` blocks + a text instruction; parses `{critique, html}` via `extractJsonObject`; throws on non-ok/malformed.

- [ ] **Step 1: Write the failing test** (mock `fetch`)

Create `lib/homepage/__tests__/provider.test.ts`:

```ts
jest.mock("@/lib/api-keys", () => ({ getApiKey: jest.fn() }));
import { extractJsonObject } from "@/lib/ai/anthropic-json";
import { generateHomepage } from "@/lib/homepage/provider";

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ content: [{ type: "text", text: "```json\n{\"critique\":\"dated\",\"html\":\"<main>new</main>\"}\n```" }] }),
  }) as unknown as typeof fetch;
});

it("extractJsonObject strips fences", () => {
  expect(extractJsonObject("```json\n{\"a\":1}\n```")).toBe('{"a":1}');
  expect(extractJsonObject("no json")).toBeNull();
});

it("generateHomepage returns html + critique and sends an image block when a screenshot is given", async () => {
  const out = await generateHomepage({ apiKey: "k", brief: "Acme", prompt: "modern", sourceScreenshotB64: "AAAA" });
  expect(out).toEqual({ html: "<main>new</main>", critique: "dated" });
  const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
  expect(body.model).toBe("claude-sonnet-5-5");
  const parts = body.messages[0].content;
  expect(parts.some((p: { type: string }) => p.type === "image")).toBe(true);
});
```

- [ ] **Step 2: Run it, expect FAIL.**

- [ ] **Step 3: Implement `lib/ai/anthropic-json.ts`** (copy `extractJsonObject` verbatim from `actions/crm/targets/generate-target-email.ts`) and **`lib/homepage/provider.ts`** (inline vision fetch; content array = `[...imageBlocks, {type:"text", text: instruction}]`; system prompt = curated design rubric requiring a single self-contained responsive HTML doc that reuses supplied brand colors/logo/copy; return `{critique, html}`; throw `Error` on `!res.ok` or when `extractJsonObject`→parse fails or subject fields missing).

- [ ] **Step 4: Run tests, expect PASS.** **Step 5: Commit** (`feat(homepage): shared anthropic-json + vision generation provider`).

---

### Task 6: Slug proposal + uniqueness

**Files:**
- Create: `lib/homepage/slug.ts`
- Test: `lib/homepage/__tests__/slug.test.ts`

**Interfaces:**
- Consumes: `prismadb.crm_Target_Homepage`.
- Produces:
  - `slugify(input: string): string` (lowercase, alnum+hyphen, collapse/trim hyphens, cap length).
  - `ensureUniqueSlug(base: string): Promise<string>` — if `base` (slugified) is taken (any `crm_Target_Homepage.slug`), append `-2`, `-3`, … until free.

- [ ] **Step 1: Write the failing test**

```ts
jest.mock("@/lib/prisma", () => ({ prismadb: { crm_Target_Homepage: { findUnique: jest.fn() } } }));
import { prismadb } from "@/lib/prisma";
import { slugify, ensureUniqueSlug } from "@/lib/homepage/slug";

it("slugifies company names", () => {
  expect(slugify("Summit Plumbing Co.")).toBe("summit-plumbing-co");
  expect(slugify("  A/B  &  C ")).toBe("a-b-c");
});

it("suffixes on collision", async () => {
  (prismadb.crm_Target_Homepage.findUnique as jest.Mock)
    .mockResolvedValueOnce({ id: "1" })   // "acme" taken
    .mockResolvedValueOnce(null);          // "acme-2" free
  expect(await ensureUniqueSlug("Acme")).toBe("acme-2");
});
```

- [ ] **Step 2: FAIL → Step 3: implement `lib/homepage/slug.ts`** (regex slugify; loop `findUnique({where:{slug}})` until null). **Step 4: PASS → Step 5: Commit** (`feat(homepage): slug proposal + uniqueness`).

---

### Task 7: Inngest generate + refine job

**Files:**
- Create: `inngest/functions/generate-homepage.ts`
- Modify: `app/api/inngest/route.ts` (register), `docs/reference/UPSTREAM_IMPACT_LOG.md`
- Test: `inngest/functions/__tests__/generate-homepage.test.ts`

**Interfaces:**
- Consumes: `inngest` (`@/inngest/client`), `prismadb`, `getApiKey`, `harvestSource` (4b), `generateHomepage` (5), `renderAndScreenshot` (4a), `putHomepageHtml`/`putHomepageScreenshot` (3), N=3.
- Produces: `generateHomepage` Inngest fn handling BOTH events: `homepage/target.generate` (fresh: harvest → initial gen → N auto passes) and `homepage/target.refine` (`{ homepageId, prompt, triggeredBy }`: one HUMAN pass seeded with current version html). Event payloads typed. On success: upload final html+screenshot, insert a `crm_Target_Homepage_Version`, set `crm_Target_Homepage.current_version_id` + `preview_url` (`${NEXT_PUBLIC_PREVIEWS_BASE_URL}/p/<slug>`) + `screenshot_url` (`…/p/<slug>/screenshot.png`) + `status = READY`. On any failure: `status = FAILED` + `error`. Terminal status **READY**.

- [ ] **Step 1: Write the failing test** (mock every heavy dep; assert orchestration + FAILED-on-throw)

Create `inngest/functions/__tests__/generate-homepage.test.ts`. Mock `@/lib/homepage/harvest-source`, `provider`, `render`, `storage`, `@/lib/api-keys`, `@/lib/prisma`, and drive the fn's handler with a fake `step` (`step.run = (n, f) => f()`). Cases:
- generate happy path (APPROVED target, company_website present) → harvestSource called, provider called (1 initial + up to N passes), storage puts called, homepage updated to `status:"READY"` with preview_url/screenshot_url set and a version row created;
- no `company_website` → harvestSource returns null, generation still completes READY;
- `getApiKey`→null → homepage set FAILED with a NO_API_KEY error, no provider call;
- a thrown render/provider error → homepage set FAILED (never left RUNNING).

- [ ] **Step 2: FAIL → Step 3: implement `inngest/functions/generate-homepage.ts`** mirroring `enrich-target.ts`: `createFunction({ id:"generate-homepage", name:"Generate Homepage", triggers:[{event:"homepage/target.generate"},{event:"homepage/target.refine"}], retries:2 }, …)`. Branch on `event.name`. Wrap the whole body so any throw → `prismadb.crm_Target_Homepage.update({status:"FAILED", error})`. Bound auto passes to `N=3`. Each pass persists a version (`pass_kind:"AUTO"`/`"HUMAN"`). Lazy-import nothing here directly (render.ts already lazy-imports chromium).

- [ ] **Step 4: Register in `app/api/inngest/route.ts`** — `import { generateHomepage } from "@/inngest/functions/generate-homepage";` and append to the `functions` array (insert-only). Log the touch in `UPSTREAM_IMPACT_LOG.md`.

- [ ] **Step 5: Run tests, expect PASS.** **Step 6: Commit** (`feat(homepage): inngest generate+refine job (render→vision→refine loop)`).

---

### Task 8: Trigger routes + status/revert/slug actions

**Files:**
- Create: `app/api/crm/targets/[id]/generate-homepage/route.ts` (POST: create/reset homepage row + send `homepage/target.generate`)
- Create: `actions/crm/homepage/refine-homepage.ts` (send `homepage/target.refine`), `actions/crm/homepage/get-homepage-status.ts` (poll), `actions/crm/homepage/revert-homepage-version.ts`, `actions/crm/homepage/update-homepage-slug.ts`
- Test: `actions/crm/homepage/__tests__/homepage-actions.test.ts`

**Interfaces:**
- Consumes: authz, `prismadb`, `inngest`, `ensureUniqueSlug` (6). All gated on APPROVED + `assertCanWriteTarget`.
- Produces: `POST` generate route (mirror the enrich route; body may carry `{ prompt, slug }`; slugify+ensureUnique from company name when slug absent; upsert `crm_Target_Homepage` to `status:"PENDING"`, set `base_prompt`/`source_url=target.company_website`; `inngest.send`); `refineHomepage({homepageId, prompt})`; `getHomepageStatus({targetId}) → { status, slug, preview_url, screenshot_url, current_version_id, versions: [{id, pass_kind, agent_critique, created_at}] }`; `revertHomepageVersion({homepageId, versionId})` (repoint current_version_id + re-publish that version's html/screenshot to the live keys + preview_url/screenshot_url); `updateHomepageSlug({homepageId, slug})` (ensure-unique).

- [ ] **Step 1: Write the failing test** — mock authz/prisma/inngest. Assert: non-APPROVED → refuse (no `inngest.send`); non-owner → Forbidden; generate sends `homepage/target.generate` with the target id + resolved slug; refine sends `homepage/target.refine`; getHomepageStatus returns the shape; revert repoints current_version_id.

- [ ] **Step 2: FAIL → Step 3: implement** the route + four actions (mirror `app/api/crm/targets/[id]/enrich/route.ts` for the route; the shipped `actions/crm/targets/*` for the action auth/gate pattern). Write an audit-log entry on generate + revert (`entityType:"target"`, action `"updated"`).

- [ ] **Step 4: PASS → Step 5: Commit** (`feat(homepage): generate/refine/status/revert/slug triggers`).

---

### Task 9: Public serving routes + proxy pass-through

**Files:**
- Create: `app/p/[slug]/route.ts` (GET → HTML from R2), `app/p/[slug]/screenshot.png/route.ts` (GET → PNG from R2)
- Modify: `proxy.ts` (pass-through for `/p/`), `docs/reference/UPSTREAM_IMPACT_LOG.md`
- Test: `app/p/[slug]/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `getHomepageHtml`/`getHomepageScreenshotBuffer` (3), `prismadb.crm_Target_Homepage` (validate slug exists + READY).
- Produces: public GET handlers streaming private R2 objects; unknown/not-ready slug → generic 404 HTML (no 500, no enumeration); headers `cache-control: no-store` (or short public cache), `x-robots-tag: noindex`, correct content-type. `proxy.ts` returns `NextResponse.next()` early for `path.startsWith("/p/")`.

- [ ] **Step 1: Write the failing test** — mock storage + prisma. `GET /p/known` (READY) → 200 `text/html` with the stored HTML; `GET /p/unknown` → 404 generic page, no throw; slug with weird chars → safe (no prisma error). Screenshot route → 200 `image/png` for known, 404 for unknown.

- [ ] **Step 2: FAIL → Step 3: implement** both route handlers (look up `crm_Target_Homepage` by slug where `deletedAt:null` and `status:"READY"`; then stream from R2). Then **edit `proxy.ts`**: near the top, beside the existing `if (path.startsWith("/api/inngest")) return NextResponse.next();`, add `if (path.startsWith("/p/")) return NextResponse.next();`. (The `/screenshot.png` path already dodges the matcher via the dot, but the pass-through makes intent explicit and covers `/p/[slug]`.) Log the `proxy.ts` touch in `UPSTREAM_IMPACT_LOG.md`.

- [ ] **Step 4: PASS → Step 5: Commit** (`feat(homepage): public /p/[slug] preview + screenshot routes`).

---

### Task 10: Generate Homepage drawer + wire the dropdown

**Files:**
- Create: `app/[locale]/(routes)/campaigns/targets/[targetId]/components/GenerateHomepageDrawer.tsx`
- Modify: `TargetAiMenu.tsx` (enable the "Generate homepage" item, render the drawer), `BasicView.tsx` (load HOMEPAGE prompts + the homepage record for the drawer)

**Interfaces:**
- Consumes: the generate route (fetch POST), `refineHomepage`/`getHomepageStatus`/`revertHomepageVersion`/`updateHomepageSlug` (8), `listPrompts({kind:"HOMEPAGE"})`.
- Produces: `<GenerateHomepageDrawer targetId company companyWebsite prompts hasHomepage initialSlug initialStatus />` (client) — slug field (proposed from company, editable), HOMEPAGE prompt picker (bodies as props, no round-trip — mirror `GenerateEmailDrawer`), **Generate** (POST → poll `getHomepageStatus` on an interval until READY/FAILED), preview via `<iframe srcDoc sandbox="">` of the current version + the screenshot, a **change-request** field → refine (new version, re-poll), a **version list** with **revert**. Reuse the `reqIdRef`/state-reset discipline from `GenerateEmailDrawer`.

> Verification is tsc + lint + the E2E in Task 12 (no unit tests for the React component). Preserve/introduce `data-testid`s: `ai-generate-homepage`, `generate-homepage-drawer`, `homepage-slug`, `homepage-prompt-select`, `homepage-generate-btn`, `homepage-preview`, `homepage-refine-input`, `homepage-refine-btn`, `homepage-version-<n>`, `homepage-revert-<n>`.

- [ ] **Step 1** Read `GenerateEmailDrawer.tsx` + `TargetAiMenu.tsx` + `EnrichTargetDrawer.tsx` (polling/SSE) and `components/ui` (sheet/select/input/button) to match APIs.
- [ ] **Step 2** Implement `GenerateHomepageDrawer.tsx` (Sheet; polling via `setInterval` guarded by `reqIdRef`, cleared on close/unmount; disable Generate while a job is RUNNING; show FAILED error).
- [ ] **Step 3** In `TargetAiMenu.tsx`, replace the disabled "Generate homepage (coming soon)" item with an APPROVED-gated item that opens the drawer; render `<GenerateHomepageDrawer .../>` next to `<GenerateEmailDrawer/>`. Thread new props.
- [ ] **Step 4** In `BasicView.tsx` (already APPROVED-gated), add `listPrompts({kind:"HOMEPAGE"})` to the `Promise.all`, and select `slug`/`status`/`preview_url`/`screenshot_url` from the homepage record; pass to the menu. (Update the existing BasicView `UPSTREAM_IMPACT_LOG` entry to reflect the added loads.)
- [ ] **Step 5** Verify `pnpm exec tsc --noEmit` clean + `pnpm exec eslint` clean on the touched dirs. **Step 6: Commit** (`feat(homepage): generate-homepage drawer + dropdown wiring`).

---

### Task 11: MCP parity (trigger + status)

**Files:**
- Create: `lib/mcp/tools/crm-homepage.ts` (`crm_generate_homepage`, `crm_get_homepage_status`)
- Modify: `lib/mcp/tools/index.ts`, `docs/reference/UPSTREAM_IMPACT_LOG.md`
- Test: `lib/mcp/__tests__/crm-homepage.test.ts`

**Interfaces:**
- Consumes: `prismadb`, `inngest`, `ensureUniqueSlug`, MCP helpers (`itemResponse`/`notFound`), `handler(args, userId)` scoped by `created_by: userId`.
- Produces: `crmHomepageTools` — `crm_generate_homepage({ target_id, prompt?, slug? })` (gate APPROVED, scope by created_by, create PENDING row + send event) and `crm_get_homepage_status({ target_id })` (returns status/slug/urls/versions). Register in `index.ts` (log). Homepage generation from MCP is trigger-only (the loop runs in Inngest).

- [ ] **Step 1** failing test (mirror `crm-ai-prompts.test.ts`): generate scoped by created_by + gate; not-approved → throws validation; status returns shape.
- [ ] **Step 2** FAIL → **Step 3** implement + register + log. **Step 4** PASS → **Step 5** Commit (`feat(mcp): homepage generate + status tools`).

---

### Task 12: Env + docs + E2E

**Files:**
- Modify: `.env.example`, `docs/reference/ENVIRONMENT_VARIABLES.md`, `docs/reference/PROJECT_STRUCTURE.md`, `docs/reference/LESSONS_LEARNED.md`, `CUSTOMIZATIONS.md`
- Create: `tests/e2e/target-homepage.spec.ts` + manual-test doc steps

**Interfaces:** consumes the whole feature.

- [ ] **Step 1** Env: add `NEXT_PUBLIC_PREVIEWS_BASE_URL` to `.env.example` + `ENVIRONMENT_VARIABLES.md` (optional; fail-closed consumer — the generate job leaves `preview_url` null / job errors gracefully if unset until the domain is live). Keep `.env.example`↔doc parity (env-doc guard). Note R2 reuse (no new bucket/creds; `previews/` prefix, private).
- [ ] **Step 2** `PROJECT_STRUCTURE.md`: new dirs `lib/homepage/**`, `lib/ai/**`, `inngest/functions/generate-homepage.ts`, `app/p/**`, `actions/crm/homepage/**`, `lib/mcp/tools/crm-homepage.ts`. `LESSONS_LEARNED.md`: (a) chromium/playwright must be lazy-imported in the handler (module-scope import 500s `/api/inngest`); (b) fetching a prospect URL (`company_website`) for asset harvest is SSRF — always host-guard + timeout + downloads-off; (c) serving model-generated HTML on the isolated `previews.` host (not the app host) contains XSS to a cookieless origin. `CUSTOMIZATIONS.md`: record the homepage-generation deviation + the previews serving model.
- [ ] **Step 3** E2E `tests/e2e/target-homepage.spec.ts` (per `docs/testing/e2e-patterns.md`): from an APPROVED target, open the dropdown → Generate homepage → (mock the Anthropic base-URL seam; **stub the Inngest job / chromium** — E2E should not launch a real browser: instead seed a READY `crm_Target_Homepage` + version and assert the drawer shows the preview, and that `/p/<slug>` serves the stored HTML). Add matching manual-test steps; maintain manual↔E2E parity.
- [ ] **Step 4** Run `pnpm exec jest` (full), `pnpm exec tsc --noEmit`, `pnpm exec eslint <changed dirs> --max-warnings=0`, `bash scripts/check-env-docs.sh`, `bash scripts/check-invariants.sh` — all green. **Step 5** Commit (`test(e2e)+docs: homepage generation`).

---

## Self-Review (completed by plan author)

**1. Spec coverage:** Engine/loop §6.2 → Tasks 4a,5,7. Hosting §6.3 (Vercel route + private R2) → Tasks 3,9. Source-asset harvest §6.5 → Task 4b (+7 wiring). Data model §4.2–4.3 (version table, current_version) → Task 1. Iteration (N=3 auto + human rounds + versions/revert) → Tasks 7,8,10. Slug → Task 6. Security §8 (gate, authz, SSRF, isolated preview host, no-store/noindex) → Tasks 4b,8,9. Prompt library HOMEPAGE → reused (Task 10). MCP §9 (was deferred; included now) → Task 11. Env/docs/E2E → Task 12. Deps/config (net-new) → Task 2.

**2. Placeholder scan:** No TBD/"handle errors" — each code step has real code or a concrete mirror-this-file instruction. Two deliberate lookups the implementer must resolve (both named, not vague): the SSRF guard module path (Task 4b Step 1) and the exact `@sparticuz/chromium` launch args (proven in Task 2 smoke, copied in 4a).

**3. Type consistency:** `renderAndScreenshot(html)→Buffer`, `harvestSource(url)→{screenshotB64,brand}|null`, `generateHomepage({apiKey,brief,prompt,previousHtml?,sourceScreenshotB64?})→{html,critique}`, `homepageHtmlKey/homepageShotKey(slug)`, `ensureUniqueSlug(base)→string`, status enum `PENDING|RUNNING|READY|FAILED`, pass kind `AUTO|HUMAN`, events `homepage/target.generate|refine` — used consistently across tasks. Terminal status **READY** everywhere.

**4. Review Focus:** non-approved/non-owner → Task 8 tests; blank company_website → Tasks 4b,7 tests; SSRF blocked URL → Task 4b test; chromium/render failure → FAILED (Task 7 test); unknown slug → Task 9 test. Section non-empty; each pinned.
