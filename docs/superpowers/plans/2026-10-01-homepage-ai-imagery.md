# Homepage AI Imagery — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate on-brand AI photography during homepage generation and have the design model compose with it, so mockups read premium instead of text/CSS-only.

**Architecture:** A provider chain (Higgsfield → OpenAI → text-only) generates a fixed set of images once per run from the harvested brand; images are stored in R2 and served from the previews host; the model references `__RADE_IMG_n__` placeholder tokens that are substituted to served URLs at render/publish. Admin settings (provider/model/count) live on the existing Homepage Settings page; the API keys live in env (fail-open if absent).

**Tech Stack:** Next.js App Router, Inngest, Prisma/`crm_SystemSettings` (key/value), R2/S3 (`@aws-sdk/client-s3` via `lib/minio`), Jest, raw `fetch` (no new deps). Higgsfield REST (`api.higgsfield.ai`), OpenAI Images (`gpt-image-1`).

**Spec:** `docs/superpowers/specs/2026-10-01-homepage-ai-imagery-design.md`

## Global Constraints

- **No new npm dependency** — both adapters use raw `fetch` (matches `lib/homepage/provider.ts`).
- **No Prisma migration** — all new config is `crm_SystemSettings` key/value rows.
- **No base64 in Inngest step state** — image bytes live only in R2 and inside a single step; step returns only a small token→{url,alt} map.
- **Fail-open on images** — any image failure (no key, provider error, timeout, partial) proceeds text-only; it NEVER fails the generation run. (Terminal text errors still fail fast — unchanged.)
- **Secrets server-only** — `HIGGSFIELD_API_KEY` / `OPENAI_API_KEY` never `NEXT_PUBLIC_`, never returned to the client; the admin indicator sends a boolean presence flag only.
- **Egress stays code-owned** — the render allowlist adds only the previews host, path-scoped to `/p/<slug>/images/` for the slug being rendered.
- **Pattern parity** — image model allow-set + clamp mirror `HOMEPAGE_MODELS`/`resolveModel`/`clampMaxTokens`; admin save mirrors `saveHomepageSettings`.
- **Fork-owned** — every file here is fork-added except `.env.example` (additive). Log `.env.example` in `UPSTREAM_IMPACT_LOG.md`.

## Review Focus

Inputs the spec implies but no happy-path test exercises; each gets a test in the owning task:
- **Both image keys absent** → generation still reaches READY, text-only, model told "no image tokens." (Task 10)
- **Higgsfield absent, OpenAI present** → images come from OpenAI (fallback actually fires). (Task 5)
- **A provider throws mid-generation** → resolver skips to the next provider; a per-image failure drops only that token, run still succeeds. (Task 5, Task 10)
- **Render/egress** → the current slug's `/p/<slug>/images/` loads; any other host, or another slug's image path, is still aborted. (Task 8)
- **Key never leaks** → the admin page props carry presence booleans only; no key value in the serialized payload. (Task 11)

---

### Task 1: Image settings (model allow-set, count, provider)

**Files:**
- Modify: `lib/homepage/settings.ts`
- Test: `lib/homepage/__tests__/settings.test.ts`

**Interfaces:**
- Produces: `IMAGE_MODELS` (readonly string[]), `DEFAULT_IMAGE_MODEL`, `IMAGE_PROVIDERS`, `DEFAULT_IMAGE_PROVIDER`, `DEFAULT_IMAGE_COUNT`, `MAX_IMAGE_COUNT`, `resolveImageModel(s)`, `resolveImageProvider(s)`, `clampImageCount(n)`, and `HomepageSettings` extended with `imageModel: string; imageCount: number; imageProvider: string`. `getHomepageSettings()` returns them.

- [ ] **Step 1: Write failing tests**

```ts
// add to lib/homepage/__tests__/settings.test.ts
import { resolveImageModel, clampImageCount, resolveImageProvider, DEFAULT_IMAGE_MODEL, DEFAULT_IMAGE_PROVIDER, DEFAULT_IMAGE_COUNT, MAX_IMAGE_COUNT } from "@/lib/homepage/settings";

it("resolveImageModel: known passes, unknown/blank -> default", () => {
  expect(resolveImageModel("soul-v2")).toBe("soul-v2");
  expect(resolveImageModel("nope")).toBe(DEFAULT_IMAGE_MODEL);
  expect(resolveImageModel(null)).toBe(DEFAULT_IMAGE_MODEL);
});
it("resolveImageProvider: known/auto pass, unknown -> default", () => {
  expect(resolveImageProvider("higgsfield")).toBe("higgsfield");
  expect(resolveImageProvider("auto")).toBe("auto");
  expect(resolveImageProvider("x")).toBe(DEFAULT_IMAGE_PROVIDER);
});
it("clampImageCount: clamps to [0, MAX], NaN -> default", () => {
  expect(clampImageCount(-3)).toBe(0);
  expect(clampImageCount(999)).toBe(MAX_IMAGE_COUNT);
  expect(clampImageCount(NaN)).toBe(DEFAULT_IMAGE_COUNT);
  expect(clampImageCount(2)).toBe(2);
});
it("getHomepageSettings: image defaults when unset", async () => {
  (prismadb.crm_SystemSettings.findMany as jest.Mock).mockResolvedValue([]);
  const s = await getHomepageSettings();
  expect(s.imageModel).toBe(DEFAULT_IMAGE_MODEL);
  expect(s.imageProvider).toBe(DEFAULT_IMAGE_PROVIDER);
  expect(s.imageCount).toBe(DEFAULT_IMAGE_COUNT);
});
```

- [ ] **Step 2: Run, verify fail** — `pnpm exec jest lib/homepage/__tests__/settings.test.ts` → FAIL (exports missing).

- [ ] **Step 3: Implement in `lib/homepage/settings.ts`**

```ts
// Image model names are the admin-facing allow-set; the Higgsfield adapter maps
// each name -> its REST endpoint. Keep names stable (stored in settings).
export const IMAGE_MODELS = ["soul-v2", "marketing-studio-image", "ideogram", "recraft", "qwen-image", "grok", "z-image"] as const;
export type ImageModel = (typeof IMAGE_MODELS)[number];
export const DEFAULT_IMAGE_MODEL: ImageModel = "soul-v2";

export const IMAGE_PROVIDERS = ["auto", "higgsfield", "openai"] as const;
export type ImageProviderSetting = (typeof IMAGE_PROVIDERS)[number];
export const DEFAULT_IMAGE_PROVIDER: ImageProviderSetting = "auto";

export const DEFAULT_IMAGE_COUNT = 3;
export const MAX_IMAGE_COUNT = 6;

const KEY_IMAGE_MODEL = "homepage.image_model";
const KEY_IMAGE_COUNT = "homepage.image_count";
const KEY_IMAGE_PROVIDER = "homepage.image_provider";

export function resolveImageModel(stored: string | null | undefined): ImageModel {
  return (IMAGE_MODELS as readonly string[]).includes(stored ?? "") ? (stored as ImageModel) : DEFAULT_IMAGE_MODEL;
}
export function resolveImageProvider(stored: string | null | undefined): ImageProviderSetting {
  return (IMAGE_PROVIDERS as readonly string[]).includes(stored ?? "") ? (stored as ImageProviderSetting) : DEFAULT_IMAGE_PROVIDER;
}
export function clampImageCount(n: number): number {
  const v = Number.isFinite(n) ? n : DEFAULT_IMAGE_COUNT;
  return Math.min(MAX_IMAGE_COUNT, Math.max(0, Math.trunc(v)));
}
```

Extend `HomepageSettings` with `imageModel: string; imageCount: number; imageProvider: string`, add the three keys to the `findMany` `in: [...]` list, and in the return:
```ts
imageModel: resolveImageModel(map.get(KEY_IMAGE_MODEL)),
imageCount: clampImageCount(parseInt(map.get(KEY_IMAGE_COUNT) ?? "", 10)),
imageProvider: resolveImageProvider(map.get(KEY_IMAGE_PROVIDER)),
```

- [ ] **Step 4: Run, verify pass.**
- [ ] **Step 5: Commit** — `git add lib/homepage/settings.ts lib/homepage/__tests__/settings.test.ts && git commit -m "feat(homepage): image generation settings (model/count/provider)"`

---

### Task 2: Image types + planning

**Files:**
- Create: `lib/homepage/images/types.ts`
- Create: `lib/homepage/images/plan.ts`
- Test: `lib/homepage/images/__tests__/plan.test.ts`

**Interfaces:**
- Produces:
  - `types.ts`: `ImageSpec = { token: string; role: "hero" | "section"; prompt: string; alt: string; aspectRatio: "16:9" | "4:5" }`; `GeneratedImage = { token: string; alt: string; url: string }`; `ImageProvider = { name: string; isConfigured(): boolean; generateImage(spec: ImageSpec): Promise<Buffer> }`; `imageToken(i: number): string` returning `__RADE_IMG_${i}__`.
  - `plan.ts`: `planHomepageImages(input: { count: number; industry: string | null; company: string | null; description: string | null; colors: string[] }) => ImageSpec[]`.

- [ ] **Step 1: Write failing test** (`lib/homepage/images/__tests__/plan.test.ts`)

```ts
import { planHomepageImages } from "@/lib/homepage/images/plan";

it("count 0 -> no specs", () => {
  expect(planHomepageImages({ count: 0, industry: "Salon", company: "X", description: null, colors: [] })).toEqual([]);
});
it("count 3 -> hero + 2 sections with unique tokens and bounded prompt", () => {
  const specs = planHomepageImages({ count: 3, industry: "Salon / spa", company: "Salon De Crist", description: "downtown salon", colors: ["#3a2130", "#b98a4e"] });
  expect(specs).toHaveLength(3);
  expect(specs[0].role).toBe("hero");
  expect(specs[0].aspectRatio).toBe("16:9");
  expect(specs.map((s) => s.token)).toEqual(["__RADE_IMG_1__", "__RADE_IMG_2__", "__RADE_IMG_3__"]);
  expect(specs[1].aspectRatio).toBe("4:5");
  // palette + industry steer the prompt; every spec has alt text
  expect(specs[0].prompt).toContain("Salon / spa");
  expect(specs[0].prompt).toContain("#3a2130");
  expect(specs.every((s) => s.alt.length > 0)).toBe(true);
  // bounded: no raw giant description injected
  expect(specs[0].prompt.length).toBeLessThan(600);
});
it("caps count at MAX via spec roles (hero always first)", () => {
  const specs = planHomepageImages({ count: 6, industry: null, company: null, description: null, colors: [] });
  expect(specs[0].role).toBe("hero");
  expect(specs.filter((s) => s.role === "section")).toHaveLength(5);
});
```

- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement `types.ts` then `plan.ts`.**

```ts
// lib/homepage/images/types.ts
export type ImageSpec = { token: string; role: "hero" | "section"; prompt: string; alt: string; aspectRatio: "16:9" | "4:5" };
export type GeneratedImage = { token: string; alt: string; url: string };
export interface ImageProvider {
  readonly name: string;
  isConfigured(): boolean;
  /** Returns PNG bytes, or throws on failure (caller handles fallback/fail-open). */
  generateImage(spec: ImageSpec): Promise<Buffer>;
}
export const imageToken = (i: number): string => `__RADE_IMG_${i}__`;
```

```ts
// lib/homepage/images/plan.ts
import { imageToken, type ImageSpec } from "./types";

const clampText = (s: string | null, n: number) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

/** Build a fixed, code-owned set of on-brand image prompts. Prompts use bounded brand
 * fields only (never raw harvested HTML) to limit indirect prompt-injection. */
export function planHomepageImages(input: {
  count: number; industry: string | null; company: string | null; description: string | null; colors: string[];
}): ImageSpec[] {
  const n = Math.max(0, Math.trunc(input.count));
  if (n === 0) return [];
  const industry = clampText(input.industry, 60) || "small business";
  const desc = clampText(input.description, 180);
  const palette = input.colors.slice(0, 4).join(", ");
  const paletteClause = palette ? ` Color palette: ${palette}.` : "";
  const common = `Premium editorial photograph for a ${industry}.${paletteClause} Warm, sophisticated, photorealistic, Architectural Digest style, soft natural light, shallow depth of field. No text, no signage, no logos, no watermarks.`;
  const sectionSubjects = ["a detail vignette of the space", "a service/treatment moment", "a welcoming interior corner", "textures and materials close-up", "the storefront or entrance"];
  const specs: ImageSpec[] = [{
    token: imageToken(1), role: "hero", aspectRatio: "16:9",
    prompt: `${common} Wide establishing hero shot of the interior.${desc ? ` Context: ${desc}.` : ""}`,
    alt: `${industry} interior`,
  }];
  for (let i = 1; i < n; i++) {
    specs.push({
      token: imageToken(i + 1), role: "section", aspectRatio: "4:5",
      prompt: `${common} ${sectionSubjects[(i - 1) % sectionSubjects.length]}.`,
      alt: `${industry} — ${sectionSubjects[(i - 1) % sectionSubjects.length]}`,
    });
  }
  return specs;
}
```

- [ ] **Step 4: Run, verify pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat(homepage): image spec planning + token types"`

---

### Task 3: Higgsfield adapter

**Files:**
- Create: `lib/homepage/images/higgsfield.ts`
- Test: `lib/homepage/images/__tests__/higgsfield.test.ts`

**Interfaces:**
- Consumes: `ImageProvider`, `ImageSpec` (Task 2); `ImageModel` name (Task 1).
- Produces: `higgsfieldProvider(model: string): ImageProvider`. `isConfigured()` = `!!process.env.HIGGSFIELD_API_KEY`. `generateImage` POSTs to the model endpoint, polls `status_url`, downloads the result, returns a `Buffer`.

> **Implementation note for this task:** the exact completed-status JSON field holding the image URL was not fully documented in the fetched docs. In Step 3, confirm the result field + request body against `https://docs.higgsfield.ai/docs` (model page for SOUL V2) before finalizing; the shape below (`{ request_id, status_url }` → poll `{ status, results:[{url}] }`) is the documented async pattern and is what the test mocks.

- [ ] **Step 1: Write failing test** (mock `fetch` + env)

```ts
const KEY = "HIGGSFIELD_API_KEY";
beforeEach(() => { process.env[KEY] = "id:secret"; jest.restoreAllMocks(); });
afterEach(() => { delete process.env[KEY]; });
import { higgsfieldProvider } from "@/lib/homepage/images/higgsfield";

it("isConfigured reflects the key", () => {
  expect(higgsfieldProvider("soul-v2").isConfigured()).toBe(true);
  delete process.env[KEY];
  expect(higgsfieldProvider("soul-v2").isConfigured()).toBe(false);
});
it("submits, polls to completion, downloads PNG bytes", async () => {
  const png = Buffer.from("PNGDATA");
  const fetchMock = jest.spyOn(global, "fetch" as any)
    .mockResolvedValueOnce({ ok: true, json: async () => ({ request_id: "r1", status_url: "https://api.higgsfield.ai/s/r1" }) } as any)
    .mockResolvedValueOnce({ ok: true, json: async () => ({ status: "completed", results: [{ url: "https://cdn/x.png" }] }) } as any)
    .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => png.buffer } as any);
  const out = await higgsfieldProvider("soul-v2").generateImage({ token: "__RADE_IMG_1__", role: "hero", prompt: "p", alt: "a", aspectRatio: "16:9" });
  expect(Buffer.isBuffer(out)).toBe(true);
  // auth header present on submit
  const authHeader = (fetchMock.mock.calls[0][1] as any).headers["Authorization"];
  expect(authHeader).toBe("Key id:secret");
});
it("throws when not configured", async () => {
  delete process.env[KEY];
  await expect(higgsfieldProvider("soul-v2").generateImage({ token: "__RADE_IMG_1__", role: "hero", prompt: "p", alt: "a", aspectRatio: "16:9" }))
    .rejects.toThrow(/not configured/i);
});
it("throws on provider error status", async () => {
  jest.spyOn(global, "fetch" as any).mockResolvedValueOnce({ ok: false, status: 500, text: async () => "boom" } as any);
  await expect(higgsfieldProvider("soul-v2").generateImage({ token: "x", role: "hero", prompt: "p", alt: "a", aspectRatio: "16:9" })).rejects.toThrow();
});
```

- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement** (confirm fields per the note above)

```ts
// lib/homepage/images/higgsfield.ts
import type { ImageProvider, ImageSpec } from "./types";

const BASE = "https://api.higgsfield.ai";
// Admin-facing model name -> REST endpoint path. Confirm/extend from docs.higgsfield.ai.
const MODEL_ENDPOINTS: Record<string, string> = {
  "soul-v2": "/higgsfield-ai/soul/v2/standard",
  "marketing-studio-image": "/higgsfield-ai/marketing-studio/image",
  "ideogram": "/higgsfield-ai/ideogram/v3",
  "recraft": "/higgsfield-ai/recraft/v3",
  "qwen-image": "/higgsfield-ai/qwen/image",
  "grok": "/higgsfield-ai/grok/image",
  "z-image": "/higgsfield-ai/z-image/standard",
};
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 90_000;

export function higgsfieldProvider(model: string): ImageProvider {
  const key = () => process.env.HIGGSFIELD_API_KEY;
  return {
    name: "higgsfield",
    isConfigured: () => !!key(),
    async generateImage(spec: ImageSpec): Promise<Buffer> {
      const k = key();
      if (!k) throw new Error("higgsfield not configured");
      const endpoint = MODEL_ENDPOINTS[model] ?? MODEL_ENDPOINTS["soul-v2"];
      const headers = { Authorization: `Key ${k}`, "content-type": "application/json" };
      const submit = await fetch(`${BASE}${endpoint}`, {
        method: "POST", headers,
        body: JSON.stringify({ prompt: spec.prompt, aspect_ratio: spec.aspectRatio }),
      });
      if (!submit.ok) throw new Error(`higgsfield submit ${submit.status}: ${await submit.text()}`);
      const { status_url } = (await submit.json()) as { request_id: string; status_url: string };
      const deadline = Date.now() + POLL_TIMEOUT_MS;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (Date.now() > deadline) throw new Error("higgsfield poll timed out");
        const st = await fetch(status_url, { headers });
        if (!st.ok) throw new Error(`higgsfield status ${st.status}`);
        const data = (await st.json()) as { status: string; results?: { url: string }[] };
        if (data.status === "completed" && data.results?.[0]?.url) {
          const img = await fetch(data.results[0].url);
          if (!img.ok) throw new Error(`higgsfield download ${img.status}`);
          return Buffer.from(await img.arrayBuffer());
        }
        if (data.status === "failed") throw new Error("higgsfield generation failed");
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
    },
  };
}
```

- [ ] **Step 4: Run, verify pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat(homepage): Higgsfield image adapter"`

---

### Task 4: OpenAI adapter

**Files:**
- Create: `lib/homepage/images/openai.ts`
- Test: `lib/homepage/images/__tests__/openai.test.ts`

**Interfaces:**
- Produces: `openaiProvider(): ImageProvider`. `isConfigured()` = `!!process.env.OPENAI_API_KEY`. `generateImage` POSTs to `https://api.openai.com/v1/images/generations` (`gpt-image-1`), returns PNG bytes from `data[0].b64_json`.

- [ ] **Step 1: Write failing test**

```ts
beforeEach(() => { process.env.OPENAI_API_KEY = "sk-x"; jest.restoreAllMocks(); });
afterEach(() => { delete process.env.OPENAI_API_KEY; });
import { openaiProvider } from "@/lib/homepage/images/openai";

it("isConfigured reflects the key", () => {
  expect(openaiProvider().isConfigured()).toBe(true);
  delete process.env.OPENAI_API_KEY;
  expect(openaiProvider().isConfigured()).toBe(false);
});
it("returns PNG bytes from b64_json and maps aspect ratio to size", async () => {
  const b64 = Buffer.from("PNGDATA").toString("base64");
  const fetchMock = jest.spyOn(global, "fetch" as any)
    .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ b64_json: b64 }] }) } as any);
  const out = await openaiProvider().generateImage({ token: "x", role: "hero", prompt: "p", alt: "a", aspectRatio: "16:9" });
  expect(out.toString()).toBe("PNGDATA");
  const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
  expect(body.model).toBe("gpt-image-1");
  expect(body.size).toBe("1536x1024"); // 16:9-ish landscape
});
it("throws on error", async () => {
  jest.spyOn(global, "fetch" as any).mockResolvedValueOnce({ ok: false, status: 400, text: async () => "bad" } as any);
  await expect(openaiProvider().generateImage({ token: "x", role: "hero", prompt: "p", alt: "a", aspectRatio: "16:9" })).rejects.toThrow();
});
```

- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement**

```ts
// lib/homepage/images/openai.ts
import type { ImageProvider, ImageSpec } from "./types";

// gpt-image-1 supports 1024x1024, 1536x1024 (landscape), 1024x1536 (portrait).
const SIZE: Record<ImageSpec["aspectRatio"], string> = { "16:9": "1536x1024", "4:5": "1024x1536" };

export function openaiProvider(): ImageProvider {
  const key = () => process.env.OPENAI_API_KEY;
  return {
    name: "openai",
    isConfigured: () => !!key(),
    async generateImage(spec: ImageSpec): Promise<Buffer> {
      const k = key();
      if (!k) throw new Error("openai not configured");
      const base = process.env.OPENAI_BASE_URL || "https://api.openai.com";
      const res = await fetch(`${base}/v1/images/generations`, {
        method: "POST",
        headers: { Authorization: `Bearer ${k}`, "content-type": "application/json" },
        body: JSON.stringify({ model: "gpt-image-1", prompt: spec.prompt, size: SIZE[spec.aspectRatio], n: 1 }),
      });
      if (!res.ok) throw new Error(`openai images ${res.status}: ${await res.text()}`);
      const data = (await res.json()) as { data: { b64_json?: string }[] };
      const b64 = data.data?.[0]?.b64_json;
      if (!b64) throw new Error("openai images: no b64_json");
      return Buffer.from(b64, "base64");
    },
  };
}
```

- [ ] **Step 4: Run, verify pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat(homepage): OpenAI image fallback adapter"`

---

### Task 5: Provider resolver + fallback

**Files:**
- Create: `lib/homepage/images/resolve.ts`
- Test: `lib/homepage/images/__tests__/resolve.test.ts`

**Interfaces:**
- Consumes: adapters (Tasks 3–4), `ImageProvider`/`ImageSpec`.
- Produces: `resolveImageProviders(opts: { provider: string; model: string }) => ImageProvider[]` (chain order, filtered by nothing yet — configuration is checked at call time); `generateWithFallback(spec: ImageSpec, providers: ImageProvider[]) => Promise<Buffer | null>` (first configured provider that succeeds; skip unconfigured/throwing; null if none).

- [ ] **Step 1: Write failing test** (fake providers)

```ts
import { generateWithFallback, resolveImageProviders } from "@/lib/homepage/images/resolve";
const fake = (name: string, configured: boolean, impl: () => Promise<Buffer>) => ({ name, isConfigured: () => configured, generateImage: impl });
const spec = { token: "x", role: "hero" as const, prompt: "p", alt: "a", aspectRatio: "16:9" as const };

it("auto order is higgsfield then openai", () => {
  expect(resolveImageProviders({ provider: "auto", model: "soul-v2" }).map((p) => p.name)).toEqual(["higgsfield", "openai"]);
});
it("pinned provider yields only that one", () => {
  expect(resolveImageProviders({ provider: "openai", model: "soul-v2" }).map((p) => p.name)).toEqual(["openai"]);
});
it("uses first configured success", async () => {
  const hg = fake("higgsfield", true, async () => Buffer.from("HG"));
  const oa = fake("openai", true, async () => Buffer.from("OA"));
  expect((await generateWithFallback(spec, [hg, oa]))!.toString()).toBe("HG");
});
it("skips unconfigured, falls to next", async () => {
  const hg = fake("higgsfield", false, async () => { throw new Error("no"); });
  const oa = fake("openai", true, async () => Buffer.from("OA"));
  expect((await generateWithFallback(spec, [hg, oa]))!.toString()).toBe("OA");
});
it("skips a throwing provider, falls to next", async () => {
  const hg = fake("higgsfield", true, async () => { throw new Error("boom"); });
  const oa = fake("openai", true, async () => Buffer.from("OA"));
  expect((await generateWithFallback(spec, [hg, oa]))!.toString()).toBe("OA");
});
it("returns null when none configured/succeed", async () => {
  const hg = fake("higgsfield", false, async () => Buffer.from("x"));
  expect(await generateWithFallback(spec, [hg])).toBeNull();
});
```

- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement**

```ts
// lib/homepage/images/resolve.ts
import type { ImageProvider, ImageSpec } from "./types";
import { higgsfieldProvider } from "./higgsfield";
import { openaiProvider } from "./openai";

export function resolveImageProviders(opts: { provider: string; model: string }): ImageProvider[] {
  const hg = higgsfieldProvider(opts.model);
  const oa = openaiProvider();
  if (opts.provider === "higgsfield") return [hg];
  if (opts.provider === "openai") return [oa];
  return [hg, oa]; // auto
}

export async function generateWithFallback(spec: ImageSpec, providers: ImageProvider[]): Promise<Buffer | null> {
  for (const p of providers) {
    if (!p.isConfigured()) continue;
    try {
      return await p.generateImage(spec);
    } catch (e) {
      console.warn(`[HOMEPAGE_IMAGE] ${p.name} failed for ${spec.token}:`, (e as Error)?.message);
    }
  }
  return null;
}
```

- [ ] **Step 4: Run, verify pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat(homepage): image provider resolver + fallback"`

---

### Task 6: Image storage + served route

**Files:**
- Modify: `lib/homepage/storage.ts`
- Create: `app/p/[slug]/images/[name]/route.ts`
- Test: `lib/homepage/__tests__/image-storage.test.ts` (unit), `app/p/[slug]/images/[name]/__tests__/route.test.ts`

**Interfaces:**
- Produces: `homepageImageKey(slug, name)`, `putHomepageImage(slug, name, png)`, `getHomepageImageBuffer(slug, name)`, `homepageImageUrl(slug, name)` (served absolute URL from `NEXT_PUBLIC_PREVIEWS_BASE_URL`, or relative `/p/<slug>/images/<name>` when unset — mirrors `previewUrls`).

- [ ] **Step 1: Write failing tests**

```ts
// image-storage.test.ts — mock lib/minio like other storage tests; assert key + url
import { homepageImageKey, homepageImageUrl } from "@/lib/homepage/storage";
it("image key is under previews/<slug>/images", () => {
  expect(homepageImageKey("acme", "img-1.png")).toBe("previews/acme/images/img-1.png");
});
it("image url honors NEXT_PUBLIC_PREVIEWS_BASE_URL, else relative", () => {
  process.env.NEXT_PUBLIC_PREVIEWS_BASE_URL = "https://previews.example.com";
  expect(homepageImageUrl("acme", "img-1.png")).toBe("https://previews.example.com/p/acme/images/img-1.png");
  delete process.env.NEXT_PUBLIC_PREVIEWS_BASE_URL;
  expect(homepageImageUrl("acme", "img-1.png")).toBe("/p/acme/images/img-1.png");
});
```

- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement storage helpers** (append to `lib/homepage/storage.ts`)

```ts
export const homepageImageKey = (slug: string, name: string) => `previews/${slug}/images/${name}`;
export async function putHomepageImage(slug: string, name: string, png: Buffer): Promise<void> {
  await minioClient.send(new PutObjectCommand({ Bucket: MINIO_BUCKET, Key: homepageImageKey(slug, name), Body: png, ContentType: "image/png" }));
}
export async function getHomepageImageBuffer(slug: string, name: string): Promise<Buffer | null> {
  return getBuffer(homepageImageKey(slug, name));
}
export function homepageImageUrl(slug: string, name: string): string {
  const base = process.env.NEXT_PUBLIC_PREVIEWS_BASE_URL?.replace(/\/+$/, "");
  return base ? `${base}/p/${slug}/images/${name}` : `/p/${slug}/images/${name}`;
}
```

- [ ] **Step 4: Implement route** (`app/p/[slug]/images/[name]/route.ts`, mirrors `screenshot.png/route.ts`)

```ts
import { getHomepageImageBuffer } from "@/lib/homepage/storage";
import { loadPublished, notFound, OK_HEADERS } from "@/lib/homepage/serve";

// Public image object of a prospect preview. Only PNGs are stored; the name is a
// stored filename, not user input (generated as img-N.png by the job).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; name: string }> }
): Promise<Response> {
  const { slug, name } = await params;
  // Defense-in-depth: only serve simple filenames within the slug's images dir.
  if (!/^[a-z0-9._-]+$/i.test(name)) return notFound();
  const png = await loadPublished(slug, (s) => getHomepageImageBuffer(s, name));
  if (png === null) return notFound();
  return new Response(new Uint8Array(png), { status: 200, headers: { "content-type": "image/png", ...OK_HEADERS } });
}
```

- [ ] **Step 5: Route test** — mirror `app/p/[slug]/__tests__/route.test.ts`: returns 404 on miss / bad name, 200 + image/png on hit.
- [ ] **Step 6: Run both test files, verify pass.**
- [ ] **Step 7: Commit** — `git commit -m "feat(homepage): R2 image storage + served /p/<slug>/images route"`

---

### Task 7: Render egress — allow the slug's image path

**Files:**
- Modify: `lib/homepage/render-allowlist.ts`
- Modify: `lib/homepage/render.ts`
- Test: `lib/homepage/__tests__/render-allowlist.test.ts`

**Interfaces:**
- Produces: `isAllowedRenderRequest(url, opts?: { previewsHost?: string; imagePathPrefix?: string })` — still allows fonts/GSAP; additionally allows `opts.previewsHost` + pathname starting with `opts.imagePathPrefix`. `renderAndScreenshot(html, opts)` gains `opts.slug` and builds the predicate from `NEXT_PUBLIC_PREVIEWS_BASE_URL`'s host + `/p/<slug>/images/`.

- [ ] **Step 1: Write failing test**

```ts
import { isAllowedRenderRequest } from "@/lib/homepage/render-allowlist";
const opts = { previewsHost: "previews.example.com", imagePathPrefix: "/p/acme/images/" };
it("allows fonts + gsap (unchanged)", () => {
  expect(isAllowedRenderRequest("https://fonts.googleapis.com/css2", opts)).toBe(true);
  expect(isAllowedRenderRequest("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/gsap.min.js", opts)).toBe(true);
});
it("allows this slug's image path on the previews host", () => {
  expect(isAllowedRenderRequest("https://previews.example.com/p/acme/images/img-1.png", opts)).toBe(true);
});
it("blocks another slug's path and other hosts", () => {
  expect(isAllowedRenderRequest("https://previews.example.com/p/other/images/x.png", opts)).toBe(false);
  expect(isAllowedRenderRequest("https://evil.com/p/acme/images/x.png", opts)).toBe(false);
  expect(isAllowedRenderRequest("https://previews.example.com/p/acme/index.html", opts)).toBe(false);
});
it("without opts, image host is blocked (back-compat)", () => {
  expect(isAllowedRenderRequest("https://previews.example.com/p/acme/images/img-1.png")).toBe(false);
});
```

- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement** — extend `isAllowedRenderRequest` to accept `opts` and add, after the existing checks:

```ts
export function isAllowedRenderRequest(
  url: string,
  opts?: { previewsHost?: string; imagePathPrefix?: string },
): boolean {
  // ... existing parse + protocol + fonts + gsap checks ...
  if (opts?.previewsHost && opts.imagePathPrefix &&
      host === opts.previewsHost.toLowerCase() &&
      parsed.pathname.startsWith(opts.imagePathPrefix)) return true;
  return false;
}
```

In `render.ts`: add `slug?: string` to `renderAndScreenshot` opts; derive `previewsHost` from `new URL(process.env.NEXT_PUBLIC_PREVIEWS_BASE_URL).host` (guarded) and `imagePathPrefix = `/p/${slug}/images/`` when slug present; pass `opts` into the `context.route` predicate call: `isAllowedRenderRequest(route.request().url(), allow)`.

- [ ] **Step 4: Run, verify pass. Revert-verify:** temporarily drop the `opts` branch → the "allows this slug's image path" test fails → restore.
- [ ] **Step 5: Commit** — `git commit -m "feat(homepage): render egress allows the slug's image objects"`

---

### Task 8: Prompt — teach the model about images

**Files:**
- Modify: `lib/homepage/prompt.ts`
- Test: `lib/homepage/__tests__/prompt.test.ts` (create if absent)

**Interfaces:**
- Produces: `MACHINE_CONTRACT` includes image-token rules + the previews host placeholder; `DEFAULT_BASE_PROMPT` includes the photography expectation; a new `buildImageBrief(images: GeneratedImage[]): string` returning the per-run token list (or the "no images" line) to append to the business brief.

- [ ] **Step 1: Write failing test**

```ts
import { MACHINE_CONTRACT, DEFAULT_BASE_PROMPT, buildImageBrief } from "@/lib/homepage/prompt";
it("machine contract states image-token rules", () => {
  expect(MACHINE_CONTRACT).toMatch(/__RADE_IMG_/);
  expect(MACHINE_CONTRACT).toMatch(/alt/i);
});
it("base prompt expects photography", () => {
  expect(DEFAULT_BASE_PROMPT.toLowerCase()).toContain("photograph");
});
it("buildImageBrief lists provided tokens with alt", () => {
  const b = buildImageBrief([{ token: "__RADE_IMG_1__", alt: "hero", url: "u" }]);
  expect(b).toContain("__RADE_IMG_1__");
  expect(b).toContain("hero");
});
it("buildImageBrief with none tells the model there are no images", () => {
  expect(buildImageBrief([]).toLowerCase()).toContain("no image");
});
```

- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement** — add to `MACHINE_CONTRACT`:
  `- Images: use ONLY the provided image tokens (__RADE_IMG_1__ …) as <img> src where imagery strengthens the design; each token at most once; every <img> needs descriptive alt text; the tokens resolve to hosted images and will load. Do not reference any other image URL. If no image tokens are provided, use strong typography, color and CSS/SVG instead.`
  Add to `DEFAULT_BASE_PROMPT` creative direction: `- Design AROUND real photography: a photographic hero and image-led sections carry the premium feel — avoid flat color-block layouts when images are provided.`
  Add:
```ts
import type { GeneratedImage } from "@/lib/homepage/images/types";
export function buildImageBrief(images: GeneratedImage[]): string {
  if (!images.length) return "Images: none available — rely on typography, color and CSS/SVG art.";
  const lines = images.map((i) => `- ${i.token} — ${i.alt}`);
  return `Available image tokens (use as <img> src; each once; add alt text):\n${lines.join("\n")}`;
}
```

- [ ] **Step 4: Run, verify pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat(homepage): prompt teaches image tokens + photography expectation"`

---

### Task 9: Flow — generate images, thread tokens, substitute, fail-open

**Files:**
- Modify: `inngest/functions/generate-homepage.ts`
- Test: `inngest/functions/__tests__/generate-homepage.test.ts`

**Interfaces:**
- Consumes: `planHomepageImages` (T2), `resolveImageProviders`/`generateWithFallback` (T5), `putHomepageImage`/`homepageImageUrl` (T6), `buildImageBrief` (T8), settings `imageModel/imageCount/imageProvider` (T1).
- Produces: a `generate-images` step returning `GeneratedImage[]`; `materialize(html, logoDataUri, images)` generalizing `materializeLogo`; `renderAndScreenshot` called with `{ slug }`.

- [ ] **Step 1: Write failing tests** (extend the suite; mock the new image modules)

```ts
jest.mock("@/lib/homepage/images/resolve", () => ({
  resolveImageProviders: jest.fn(() => [{ name: "higgsfield", isConfigured: () => true, generateImage: jest.fn() }]),
  generateWithFallback: jest.fn(async () => Buffer.from("IMG")),
}));
jest.mock("@/lib/homepage/images/plan", () => ({ planHomepageImages: jest.fn(() => [{ token: "__RADE_IMG_1__", role: "hero", prompt: "p", alt: "hero", aspectRatio: "16:9" }]) }));
// putHomepageImage mocked in the storage mock; homepageImageUrl returns a deterministic url

it("generates images once and passes tokens into the brief", async () => {
  (getHomepageSettings as jest.Mock).mockResolvedValue({ model: "claude-sonnet-5-5", maxTokens: 24000, basePromptId: null, imageModel: "soul-v2", imageCount: 1, imageProvider: "auto" });
  await handler({ event: generateEvent, step });
  const { generateWithFallback } = require("@/lib/homepage/images/resolve");
  expect(generateWithFallback).toHaveBeenCalledTimes(1); // once, not per pass
  expect((generateHomepage as jest.Mock).mock.calls[0][0].brief).toContain("__RADE_IMG_1__");
});
it("fail-open: image generation failure still reaches READY text-only", async () => {
  const { generateWithFallback } = require("@/lib/homepage/images/resolve");
  (generateWithFallback as jest.Mock).mockResolvedValue(null);
  await handler({ event: generateEvent, step });
  expect((generateHomepage as jest.Mock).mock.calls[0][0].brief.toLowerCase()).toContain("none available");
  expect(homepageUpdate.mock.calls.at(-1)![0].data.status).toBe("READY");
});
it("no base64 of image bytes in step state", async () => {
  // recording step: assert serialized outputs never contain the IMG bytes base64
  const outputs: unknown[] = [];
  const recording = { run: async (_n: string, f: () => unknown) => { const o = await f(); outputs.push(o); return o; } };
  await handler({ event: generateEvent, step: recording });
  expect(JSON.stringify(outputs)).not.toContain(Buffer.from("IMG").toString("base64"));
});
```

- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement**
  - After `harvest-source`, add a `generate-images` step: read `planHomepageImages({ count: settings.imageCount, industry, company, description, colors })`; `const providers = resolveImageProviders({ provider: settings.imageProvider, model: settings.imageModel })`; for each spec in **parallel** `generateWithFallback(spec, providers)`; for successes, `putHomepageImage(slug, `${specIndexName}.png`, bytes)` and collect `{ token, alt, url: homepageImageUrl(slug, name) }`. Wrap the whole step body in try/catch → on throw return `[]` (fail-open). Return `GeneratedImage[]` (small — tokens/urls/alt only).
  - Thread `images` into `baseArgs`; append `buildImageBrief(images)` to the `brief`.
  - Generalize `materializeLogo` → `materialize(html, logoDataUri, images)` that also replaces each `image.token` with `image.url`; use it in `runPass`'s in-step render, `renderAndUpload`, and `publish`. Persisted version HTML keeps tokens (do not materialize before `crm_Target_Homepage_Version.create`).
  - Pass `{ slug: homepage.slug }` to `renderAndScreenshot` via `renderPng`.
  - Image settings are already loaded via `resolveGenerationConfig`/`getHomepageSettings`; extend the returned config to carry `imageModel/imageCount/imageProvider`.

- [ ] **Step 4: Run the full suite, verify pass** (`pnpm exec jest inngest/functions/__tests__/generate-homepage.test.ts lib/homepage`).
- [ ] **Step 5: Commit** — `git commit -m "feat(homepage): generate + compose on-brand images in the flow (fail-open)"`

---

### Task 10: Admin settings + availability indicator

**Files:**
- Modify: `actions/admin/homepage-settings.ts`
- Modify: `app/[locale]/(routes)/admin/homepage-settings/_components/HomepageSettingsForm.tsx`
- Modify: `app/[locale]/(routes)/admin/homepage-settings/page.tsx`
- Test: `actions/admin/__tests__/homepage-settings.test.ts` (extend/create)

**Interfaces:**
- Consumes: `resolveImageModel/clampImageCount/resolveImageProvider` (T1); adapters' `isConfigured` (T3/T4); `IMAGE_MODELS`/`IMAGE_PROVIDERS` (T1).
- Produces: `saveHomepageSettings` accepts `imageModel/imageCount/imageProvider` (validated/clamped); `getHomepageSettingsForAdmin` returns `imageProviders: { higgsfield: boolean; openai: boolean }` (presence only); form renders the three controls + a read-only status row.

- [ ] **Step 1: Write failing test**

```ts
it("saveHomepageSettings validates image fields", async () => {
  // admin mocked; assert unknown model -> default, count clamped, provider validated, rows upserted
});
it("getHomepageSettingsForAdmin exposes provider presence booleans, not keys", async () => {
  process.env.HIGGSFIELD_API_KEY = "id:sec"; delete process.env.OPENAI_API_KEY;
  const res = await getHomepageSettingsForAdmin();
  expect(res.data.imageProviders).toEqual({ higgsfield: true, openai: false });
  expect(JSON.stringify(res)).not.toContain("id:sec");
});
```

- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement**
  - `saveHomepageSettings` input gains `imageModel/imageCount/imageProvider`; resolve/clamp them and upsert `homepage.image_model/image_count/image_provider` rows alongside the existing ones; audit entry unchanged.
  - `getHomepageSettingsForAdmin` adds `imageProviders: { higgsfield: !!process.env.HIGGSFIELD_API_KEY, openai: !!process.env.OPENAI_API_KEY }` to the returned `data` (booleans only — never the key).
  - `page.tsx` passes `IMAGE_MODELS`/`IMAGE_PROVIDERS` + `data.imageProviders` to the form.
  - `HomepageSettingsForm.tsx`: add a provider `Select` (auto/higgsfield/openai), an image-model `Select` (from `IMAGE_MODELS`), an image-count number input (0–6), and a read-only line: `Higgsfield: Connected|Not configured · OpenAI: Connected|Not configured`. Include the new fields in the `saveHomepageSettings` call + the `res.data` reset.

- [ ] **Step 4: Run, verify pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat(homepage): admin image controls + provider availability indicator"`

---

### Task 11: Env + docs

**Files:**
- Modify: `.env.example`, `docs/reference/ENVIRONMENT_VARIABLES.md`, `docs/testing/target-homepage-manual-testing.md`, `docs/reference/LESSONS_LEARNED.md`, `docs/reference/UPSTREAM_IMPACT_LOG.md`, `CUSTOMIZATIONS.md`

- [ ] **Step 1:** Add `HIGGSFIELD_API_KEY=` to `.env.example` (optional) and document it + the `OPENAI_API_KEY` dual-use in `ENVIRONMENT_VARIABLES.md`. Run `bash scripts/check-env-docs.sh` → passes.
- [ ] **Step 2:** Manual-test doc: new section — set the key, set image_count, generate, confirm hero/section images on the preview + screenshot; no-key → text-only; the egress scope. Add the matching E2E note (image client stays mocked in E2E).
- [ ] **Step 3:** LESSONS_LEARNED: image pipeline gotchas (provider-chain fail-open; Higgsfield async/poll; egress path-scope; "no base64 in step state" extends to images). UPSTREAM_IMPACT_LOG: `.env.example` additive entry. CUSTOMIZATIONS: note the AI-imagery deviation + the image providers.
- [ ] **Step 4: Commit** — `git commit -m "docs(homepage): env + manual-test + lessons + impact log for AI imagery"`

---

### Task 12: Full verification + PR

- [ ] **Step 1:** `pnpm exec tsc --noEmit` clean.
- [ ] **Step 2:** `pnpm exec jest lib/homepage inngest/functions/__tests__/generate-homepage.test.ts actions/admin app/p` green; `pnpm lint` on changed files clean.
- [ ] **Step 3:** Run the `deep-review` skill; fix findings.
- [ ] **Step 4:** Doc-sync walk (confirm each target updated or N/A).
- [ ] **Step 5:** Provision `HIGGSFIELD_API_KEY` locally (confirmed with operator), run a real DEV generation, confirm images appear + egress works. **QA-verify** after deploy (serverless image gen is only proven on a real deploy, like Chromium).
- [ ] **Step 6:** Open PR (house style); flag `.env.example` as the one upstream-owned file; note the new `HIGGSFIELD_API_KEY` must be added to Preview+Production (optional/fail-closed) before/with promotion.

---

## Self-Review

- **Spec coverage:** provider chain (T3/T4/T5), fixed set once (T2/T9), R2-served + allowlisted host path-scoped (T6/T7), tokens persisted + substitution (T9), fail-open (T5/T9), admin settings + indicator (T1/T10), prompt (T8), env/no-migration (T1/T11), security (T7/T10/T11), acceptance 1–7 each map to a task's tests. ✓
- **Placeholders:** external-API exact fields flagged for in-step confirmation (Higgsfield result field) with a concrete documented shape + mocked test — not a structural placeholder. No "TBD/handle errors" steps. ✓
- **Type consistency:** `ImageProvider`/`ImageSpec`/`GeneratedImage`/`imageToken` defined in T2 and used verbatim in T3–T9; `generateWithFallback`/`resolveImageProviders` signatures match between T5 and T9; settings exports match between T1, T10. ✓
- **Review Focus:** both-keys-absent (T10 env + T9 fail-open test), fallback fires (T5), provider-throws/partial (T5/T9), egress other-slug/other-host (T7), key-never-leaks (T10) — each pinned to a test in the owning task. ✓
