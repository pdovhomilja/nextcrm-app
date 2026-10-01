import { inngest } from "@/inngest/client";
import { NonRetriableError } from "inngest";
import { prismadb } from "@/lib/prisma";
import { getApiKey } from "@/lib/api-keys";
import { harvestSource, type HarvestResult } from "@/lib/homepage/harvest-source";
import { generateHomepage as generateHomepageHtml } from "@/lib/homepage/provider";
import { buildSystemPrompt, buildImageBrief } from "@/lib/homepage/prompt";
import { planHomepageImages } from "@/lib/homepage/images/plan";
import { resolveImageProviders, generateWithFallback } from "@/lib/homepage/images/resolve";
import type { GeneratedImage } from "@/lib/homepage/images/types";
import { getHomepageSettings } from "@/lib/homepage/settings";
import { renderAndScreenshot } from "@/lib/homepage/render";
import {
  putHomepageHtml,
  putHomepageScreenshot,
  putHomepageTmpSource,
  getHomepageTmpSource,
  deleteHomepageTmpSource,
  getHomepageUpload,
  deleteHomepageUpload,
  putHomepageImage,
  homepageImageUrl,
} from "@/lib/homepage/storage";

/** Number of automatic render->critique->refine passes after the initial draft. Hard bound. */
export const AUTO_PASSES = 3;

/**
 * Upper bounds for the slow external calls. `generateHomepage` (Anthropic
 * vision) has no internal timeout, so a hung request would otherwise run to the
 * function's maxDuration (the provider also aborts its fetch at the same budget).
 * Each pass runs in its own `step.run`, so a timeout only fails (and retries)
 * that one step.
 */
// Budget note (vercel.json maxDuration: 300s): the auto-pass `generate-*` step
// does renderPng(previousHtml) (≤ RENDER_TIMEOUT_MS) AND the vision call
// (≤ GENERATE_TIMEOUT_MS) in ONE invocation, so their sum plus chromium-launch/R2
// overhead must stay under 300s or the platform kill beats our withTimeout/
// markFailed (the onFailure backstop still holds the "never stuck RUNNING"
// invariant, but the graceful path is preferred). 200 + 60 = 260s leaves ~40s.
export const GENERATE_TIMEOUT_MS = 200_000;
export const RENDER_TIMEOUT_MS = 60_000;
/** Upper bound for the whole parallel image-generation step (fail-open on expiry). */
export const IMAGE_TIMEOUT_MS = 120_000;

export type GenerateHomepageEventData = {
  targetId: string;
  /** Operator instructions appended to the base prompt. */
  prompt?: string;
  triggeredBy?: string;
};
export type RefineHomepageEventData = {
  homepageId: string;
  /** Required by the per-target concurrency key; the refine trigger must send it. */
  targetId: string;
  prompt: string;
  triggeredBy?: string;
};

export type RevertHomepageEventData = {
  homepageId: string;
  /** Required by the per-target concurrency key; the revert trigger must send it. */
  targetId: string;
  versionId: string;
  triggeredBy?: string;
};

export type UploadHomepageEventData = {
  homepageId: string;
  /** Required by the per-target concurrency key; the upload action must send it. */
  targetId: string;
  slug: string;
  triggeredBy?: string;
};

type StepLike = {
  run: <T>(name: string, fn: () => Promise<T> | T) => Promise<T>;
};

type HomepageRow = {
  id: string;
  targetId: string;
  slug: string;
  current_version_id: string | null;
  logo_data_uri?: string | null;
};

// The model is told to use this exact token as the logo <img> src (buildBrief);
// we swap in the harvested logo data: URI only at RENDER + UPLOAD time. Keeping
// the placeholder in the persisted/prompt HTML keeps prompts small (the base64
// never enters the model prompt or a step return) while the screenshot + served
// page still show the real logo under the render egress block.
const LOGO_PLACEHOLDER = "__RADE_LOGO_SRC__";

/**
 * Swap the logo placeholder AND every generated-image token for its real value.
 * Tokens (`__RADE_IMG_N__`) stay in the persisted/prompt HTML — like the logo
 * placeholder — and are only substituted at RENDER + UPLOAD time.
 */
function materialize(
  html: string,
  logoDataUri: string | null | undefined,
  images: GeneratedImage[],
): string {
  let out = html.split(LOGO_PLACEHOLDER).join(logoDataUri ?? "");
  for (const img of images) out = out.split(img.token).join(img.url);
  return out;
}

const IMAGE_TOKEN_RE = /__RADE_IMG_(\d+)__/g;

/** Stored object name for a token: `__RADE_IMG_2__` -> `img-2.png` (index fallback if malformed). */
const imageName = (token: string, index: number): string => {
  const n = /^__RADE_IMG_(\d+)__$/.exec(token)?.[1];
  return `img-${n ?? index + 1}.png`;
};

/**
 * Refine / revert don't regenerate images, and the generate step's list isn't
 * persisted. The objects live at deterministic keys, so rebuild the token->url map
 * from the tokens actually present in the stored html. A missing object just 404s
 * (a broken image) rather than failing the run.
 */
function imagesInHtml(html: string, slug: string): GeneratedImage[] {
  const nums = Array.from(new Set(Array.from(html.matchAll(IMAGE_TOKEN_RE), (m) => m[1])));
  return nums.map((n) => ({
    token: `__RADE_IMG_${n}__`,
    alt: "existing page image",
    url: homepageImageUrl(slug, `img-${n}.png`),
  }));
}

type TargetRow = {
  id: string;
  company: string | null;
  company_website: string | null;
  description: string | null;
  industry?: string | null;
};

const BASE_PROMPT =
  "Redesign this small business's homepage as a modern, professional, conversion-focused page.";
const AUTO_REFINE_PROMPT =
  "Critique the rendered draft against the rubric (hierarchy, spacing, contrast, mobile layout, brand fidelity) and produce an improved version. Fix concrete weaknesses; do not invent facts.";

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

function buildBrief(
  target: TargetRow,
  brand: HarvestResult["brand"] | null,
  logoDataUri: string | null | undefined,
): string {
  const lines = [`Business: ${target.company ?? "(unknown)"}`];
  if (target.company_website) lines.push(`Current website: ${target.company_website}`);
  if (target.description) lines.push(`Description: ${target.description}`);
  if (brand) {
    if (brand.colors.length) lines.push(`Brand colors: ${brand.colors.join(", ")}`);
    if (brand.fonts.length) lines.push(`Brand fonts: ${brand.fonts.join(", ")}`);
    if (brand.copy) lines.push(`Copy from the current site:\n${brand.copy}`);
  }
  // Never hand the model a remote logo URL — it wouldn't load under the render
  // egress block. When we have the logo, tell the model to use the placeholder
  // token we substitute at render time; otherwise it uses a text wordmark.
  if (logoDataUri) {
    lines.push(
      `Business logo: set the logo <img> src attribute to the EXACT token ${LOGO_PLACEHOLDER} (it is replaced with the real logo). Do not use any other logo URL.`,
    );
  }
  return lines.join("\n");
}

function previewUrls(slug: string): { preview_url: string | null; screenshot_url: string | null } {
  const base = process.env.NEXT_PUBLIC_PREVIEWS_BASE_URL?.replace(/\/+$/, "");
  // Fail closed on the URL only: objects + versions are still stored when unset.
  if (!base) return { preview_url: null, screenshot_url: null };
  return { preview_url: `${base}/p/${slug}`, screenshot_url: `${base}/p/${slug}/screenshot.png` };
}

// NOTE: no base64 image data may appear in any step.run RETURN value — Inngest
// persists every step output in the run's state, and a harvest shot + several PNGs
// + HTML drafts can exceed its output limits on media-rich pages. Screenshots are
// produced and consumed inside a single step (in-memory only); the harvested source
// shot travels via a transient R2 key.
type PassResult = { html: string; critique: string; versionId: string };

// `slug` lets the render egress allowlist permit this page's own /images/ prefix.
const renderPng = (html: string, slug: string) =>
  withTimeout(renderAndScreenshot(html, { slug }), RENDER_TIMEOUT_MS, "Homepage render");

/** generate (+ in-step render of the previous draft for vision) -> persist version, each in its own bounded step. */
async function runPass(
  step: StepLike,
  label: string,
  args: {
    apiKey: string;
    /** Admin-resolved generation settings (see resolveGenerationConfig). */
    system: string;
    model: string;
    maxTokens: number;
    brief: string;
    prompt: string;
    previousHtml?: string;
    /** Render previousHtml in-step and send it to the model as an image (auto passes). */
    visionOfPrevious?: boolean;
    /** The harvest step stored the source screenshot at the transient R2 key. */
    hasSourceShot?: boolean;
    homepage: HomepageRow;
    passKind: "AUTO" | "HUMAN";
    createdBy: string | null;
    versionPrompt: string | null;
    /** Harvested logo, substituted into the placeholder before any render. */
    logoDataUri: string | null;
    /** Generated images whose tokens are substituted before any render. */
    images: GeneratedImage[];
  },
): Promise<PassResult> {
  const gen = await step.run(`generate-${label}`, async () => {
    // Both screenshots live only in memory inside this step; the step returns html + critique.
    const sourceScreenshotB64 = args.hasSourceShot
      ? (await getHomepageTmpSource(args.homepage.slug))?.toString("base64")
      : undefined;
    const refinedScreenshotB64 =
      args.visionOfPrevious && args.previousHtml
        ? (
            await renderPng(
              materialize(args.previousHtml, args.logoDataUri, args.images),
              args.homepage.slug,
            )
          ).toString("base64")
        : undefined;
    return withTimeout(
      generateHomepageHtml({
        apiKey: args.apiKey,
        brief: args.brief,
        prompt: args.prompt,
        previousHtml: args.previousHtml,
        sourceScreenshotB64,
        refinedScreenshotB64,
        system: args.system,
        model: args.model,
        maxTokens: args.maxTokens,
      }),
      GENERATE_TIMEOUT_MS,
      "Homepage generation",
    );
  });

  const versionId = await step.run(`persist-version-${label}`, async () => {
    const v = await prismadb.crm_Target_Homepage_Version.create({
      data: {
        homepage_id: args.homepage.id,
        html: gen.html,
        prompt: args.versionPrompt,
        agent_critique: gen.critique,
        pass_kind: args.passKind,
        created_by: args.createdBy,
      },
      select: { id: true },
    });
    return v.id;
  });

  return { html: gen.html, critique: gen.critique, versionId };
}

/**
 * Render + upload the html and screenshot to the live keys (screenshot stays
 * in-step). The logo placeholder is substituted here so both the served HTML and
 * the screenshot carry the real (inline) logo, while the persisted version keeps
 * the placeholder.
 */
async function renderAndUpload(
  step: StepLike,
  name: string,
  homepage: HomepageRow,
  html: string,
  logoDataUri: string | null,
  images: GeneratedImage[],
) {
  await step.run(name, async () => {
    const materialized = materialize(html, logoDataUri, images);
    const png = await renderPng(materialized, homepage.slug);
    await putHomepageHtml(homepage.slug, materialized);
    await putHomepageScreenshot(homepage.slug, png);
  });
}

/** Upload the final html + screenshot, then flip the homepage to READY. */
async function publish(
  step: StepLike,
  homepage: HomepageRow,
  final: PassResult,
  logoDataUri: string | null,
  images: GeneratedImage[],
) {
  await renderAndUpload(step, "upload-final", homepage, final.html, logoDataUri, images);
  await step.run("mark-ready", () =>
    prismadb.crm_Target_Homepage.update({
      where: { id: homepage.id },
      data: {
        status: "READY",
        current_version_id: final.versionId,
        ...previewUrls(homepage.slug),
        error: null,
      },
    }),
  );
}

/** Best-effort removal of the transient source screenshot; never throws. */
async function cleanupTmp(step: StepLike, slug: string) {
  try {
    await step.run("cleanup-tmp", () => deleteHomepageTmpSource(slug));
  } catch (e) {
    console.error("[GENERATE_HOMEPAGE_CLEANUP]", e);
  }
}

const markFailed = (step: StepLike, homepageId: string, error: string) =>
  step.run("mark-failed", () =>
    prismadb.crm_Target_Homepage.update({
      where: { id: homepageId },
      data: { status: "FAILED", error: error.slice(0, 1000) },
    }),
  );

/**
 * Failure handler for every flow, split by whether a retry could help:
 *
 * - TERMINAL (thrown as NonRetriableError at the source: missing API key, a
 *   soft-deleted target, a guard, a not-found): a retry cannot fix it, so we
 *   persist FAILED in-body and rethrow the NonRetriableError — Inngest marks the
 *   run FAILED immediately, with no wasted retries.
 * - TRANSIENT (anything else: a Chromium crash, an Anthropic 5xx/429, a render
 *   or generation timeout, an R2 blip): a retry CAN help, so we rethrow the
 *   original error unchanged. Inngest retries the run and REPLAYS the already
 *   completed passes from memoized step state — only the failed step re-runs, so
 *   a late flaky pass no longer discards the earlier drafts (intra-run resume).
 *   We deliberately do NOT mark FAILED here: the row stays RUNNING across the
 *   retry window, and onGenerateHomepageFailure flips it to FAILED once Inngest
 *   exhausts its retries — preserving the "never stuck RUNNING" invariant.
 *
 * Returns `never`.
 */
/**
 * Is this error terminal (a retry cannot help)?
 *
 * A `NonRetriableError` thrown INSIDE a `step.run` (e.g. the provider's
 * max_tokens / non-transient 4xx guards, or upload-not-found) does NOT survive
 * the Inngest step→flow boundary as an instance: Inngest surfaces it to the flow
 * `catch` as a `StepError` whose `.name` is copied from the original error
 * (`StepError` does `this.name = parsedErr.name`) but whose prototype is not
 * `NonRetriableError`. So `instanceof` alone silently misclassifies those as
 * transient and retries them (observed on QA: a max_tokens cutoff looped for
 * ~25min at RUNNING). Match the preserved `.name` as well. Inngest registers
 * `NonRetriableError` in its serialize-error constructors, so the name is stable.
 */
function isTerminalError(err: unknown): boolean {
  if (err instanceof NonRetriableError) return true;
  return (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    (err as { name?: unknown }).name === "NonRetriableError"
  );
}

async function endRun(step: StepLike, flow: string, homepageId: string, err: unknown): Promise<never> {
  const message = err instanceof Error ? err.message : String(err);
  if (isTerminalError(err)) {
    console.error("[GENERATE_HOMEPAGE]", { flow, homepageId, error: message, terminal: true });
    await markFailed(step, homepageId, message);
    // Re-throw as a genuine NonRetriableError. When the terminal error reached us
    // as a StepError from inside a step, `throw err` would NOT stop Inngest's
    // function-level retry (it checks `instanceof NonRetriableError`, which the
    // StepError fails) — so we must construct a fresh one to actually fail fast.
    throw err instanceof NonRetriableError
      ? err
      : new NonRetriableError(message, { cause: err instanceof Error ? err : undefined });
  }
  // Transient: rethrow unchanged so Inngest retries (completed steps are
  // memoized and not redone); the onFailure backstop records FAILED if the
  // retries run out.
  console.error("[GENERATE_HOMEPAGE]", { flow, homepageId, error: message, retrying: true });
  throw err;
}

/**
 * Resolve the admin-configured model / max_tokens / base prompt once per run.
 * Each lookup is its own step and returns only small scalars (settings + the
 * base prompt text), never image data. A missing/deleted base prompt falls back
 * to the built-in default inside buildSystemPrompt.
 */
async function resolveGenerationConfig(
  step: StepLike,
): Promise<{
  system: string;
  model: string;
  maxTokens: number;
  imageModel: string;
  imageCount: number;
  imageProvider: string;
}> {
  const settings = await step.run("resolve-settings", () => getHomepageSettings());
  const basePromptId = settings.basePromptId;
  const base = basePromptId
    ? await step.run("load-base-prompt", () =>
        prismadb.crm_Ai_Prompt.findFirst({
          where: { id: basePromptId, kind: "HOMEPAGE_BASE", deletedAt: null },
          select: { body: true },
        }),
      )
    : null;
  return {
    system: buildSystemPrompt(base?.body ?? null),
    model: settings.model,
    maxTokens: settings.maxTokens,
    imageModel: settings.imageModel,
    imageCount: settings.imageCount,
    imageProvider: settings.imageProvider,
  };
}

/**
 * Generate the page's on-brand images ONCE per run, in a single step, and return
 * only {token, alt, url} (never bytes — Inngest persists step output). FAIL-OPEN by
 * construction: every failure path (plan, provider resolve, generation, R2 put,
 * timeout) is caught HERE and yields [] / drops that image, so imagery can never fail
 * the run. It deliberately never throws, so it cannot reach endRun / NonRetriableError
 * and Inngest never retries the step.
 */
async function generateImages(
  step: StepLike,
  cfg: { imageModel: string; imageCount: number; imageProvider: string },
  target: TargetRow,
  slug: string,
  colors: string[],
): Promise<GeneratedImage[]> {
  return step.run("generate-images", async (): Promise<GeneratedImage[]> => {
    try {
      const specs = planHomepageImages({
        count: cfg.imageCount,
        industry: target.industry ?? null,
        company: target.company,
        description: target.description,
        colors,
      });
      if (!specs.length) return [];
      const providers = resolveImageProviders({ provider: cfg.imageProvider, model: cfg.imageModel });
      const results = await withTimeout(
        Promise.all(
          specs.map(async (spec, i): Promise<GeneratedImage | null> => {
            // Per-image isolation: one image failing never drops its siblings.
            try {
              const bytes = await generateWithFallback(spec, providers);
              if (!bytes) return null;
              const name = imageName(spec.token, i);
              await putHomepageImage(slug, name, bytes);
              return { token: spec.token, alt: spec.alt, url: homepageImageUrl(slug, name) };
            } catch (e) {
              console.warn("[HOMEPAGE_IMAGE] image dropped:", (e as Error)?.message);
              return null;
            }
          }),
        ),
        IMAGE_TIMEOUT_MS,
        "Homepage image generation",
      );
      return results.filter((r): r is GeneratedImage => r !== null);
    } catch (e) {
      console.warn("[HOMEPAGE_IMAGE] generation skipped (fail-open):", (e as Error)?.message);
      return [];
    }
  });
}

const NO_API_KEY = "NO_API_KEY: configure ANTHROPIC key in admin or profile settings";

async function generateFlow(step: StepLike, data: GenerateHomepageEventData) {
  const loaded = await step.run("load-target", async () => {
    const [target, homepage] = await Promise.all([
      prismadb.crm_Targets.findUnique({
        where: { id: data.targetId, deletedAt: null },
        select: { id: true, company: true, company_website: true, description: true, industry: true },
      }),
      prismadb.crm_Target_Homepage.findUnique({
        where: { targetId: data.targetId, deletedAt: null },
        select: { id: true, targetId: true, slug: true, current_version_id: true },
      }),
    ]);
    return { target, homepage };
  });
  const { target, homepage } = loaded;
  // The trigger route creates the homepage row before sending the event; with
  // no row there is nothing to report status on.
  if (!homepage) return { skipped: "no homepage row" };

  let storedSourceShot = false;
  try {
    await step.run("mark-running", () =>
      prismadb.crm_Target_Homepage.update({
        where: { id: homepage.id },
        data: { status: "RUNNING", error: null },
      }),
    );
    if (!target) throw new NonRetriableError("Target not found");

    const apiKey = await step.run("resolve-api-key", () => getApiKey("ANTHROPIC", data.triggeredBy));
    if (!apiKey) throw new NonRetriableError(NO_API_KEY);
    const genConfig = await resolveGenerationConfig(step);

    // The harvest screenshot is uploaded to a transient R2 key inside this step and
    // only the brand + a flag are returned, so no base64 PNG enters step state.
    const harvest = target.company_website
      ? await step.run("harvest-source", async () => {
          const h = await harvestSource(target.company_website);
          if (!h) return null;
          await putHomepageTmpSource(homepage.slug, Buffer.from(h.screenshotB64, "base64"));
          // Persist the inlined logo so refine/revert can reuse it later.
          if (h.brand.logoDataUri) {
            await prismadb.crm_Target_Homepage.update({
              where: { id: homepage.id },
              data: { logo_data_uri: h.brand.logoDataUri },
            });
          }
          return { brand: h.brand, hasSourceShot: true, logoDataUri: h.brand.logoDataUri };
        })
      : null;
    storedSourceShot = !!harvest?.hasSourceShot;
    const logoDataUri = harvest?.logoDataUri ?? null;

    // Generated ONCE, reused by every pass (fail-open: [] on any failure).
    const images = await generateImages(
      step,
      genConfig,
      target,
      homepage.slug,
      harvest?.brand.colors ?? [],
    );

    const brief = `${buildBrief(target, harvest?.brand ?? null, logoDataUri)}\n${buildImageBrief(images)}`;
    const baseArgs = {
      apiKey,
      ...genConfig,
      brief,
      hasSourceShot: storedSourceShot,
      homepage,
      createdBy: null,
      versionPrompt: data.prompt ?? null,
      logoDataUri,
      images,
    };
    const operator = data.prompt ? `${BASE_PROMPT}\n\nOperator instructions: ${data.prompt}` : BASE_PROMPT;

    let current = await runPass(step, "initial", {
      ...baseArgs,
      prompt: operator,
      passKind: "AUTO",
    });
    for (let i = 1; i <= AUTO_PASSES; i++) {
      current = await runPass(step, `auto-${i}`, {
        ...baseArgs,
        prompt: `${operator}\n\n${AUTO_REFINE_PROMPT}`,
        previousHtml: current.html,
        visionOfPrevious: true,
        passKind: "AUTO",
      });
    }

    await publish(step, homepage, current, logoDataUri, images);
    if (storedSourceShot) await cleanupTmp(step, homepage.slug);
    return { ready: true, versions: 1 + AUTO_PASSES };
  } catch (err) {
    // Drop the transient source shot only on a terminal failure; on a retriable
    // error keep it so the memoized harvest step's screenshot is still present
    // when Inngest retries the failed pass.
    if (storedSourceShot && isTerminalError(err)) await cleanupTmp(step, homepage.slug);
    return endRun(step, "generate", homepage.id, err);
  }
}

async function refineFlow(step: StepLike, data: RefineHomepageEventData) {
  const homepage = await step.run("load-homepage", () =>
    prismadb.crm_Target_Homepage.findUnique({
      where: { id: data.homepageId, deletedAt: null },
      select: { id: true, targetId: true, slug: true, current_version_id: true, logo_data_uri: true },
    }),
  );
  if (!homepage) return { skipped: "no homepage row" };
  const logoDataUri = homepage.logo_data_uri ?? null;

  try {
    await step.run("mark-running", () =>
      prismadb.crm_Target_Homepage.update({
        where: { id: homepage.id },
        data: { status: "RUNNING", error: null },
      }),
    );
    if (!homepage.current_version_id) {
      throw new NonRetriableError("Nothing to refine yet — generate the homepage first.");
    }

    const apiKey = await step.run("resolve-api-key", () => getApiKey("ANTHROPIC", data.triggeredBy));
    if (!apiKey) throw new NonRetriableError(NO_API_KEY);
    const genConfig = await resolveGenerationConfig(step);

    const seed = await step.run("load-current-version", async () => {
      const [version, target] = await Promise.all([
        prismadb.crm_Target_Homepage_Version.findUnique({
          where: { id: homepage.current_version_id as string },
          select: { id: true, html: true, pass_kind: true },
        }),
        prismadb.crm_Targets.findUnique({
          where: { id: homepage.targetId },
          select: { id: true, company: true, company_website: true, description: true },
        }),
      ]);
      return { html: version?.html ?? null, pass_kind: version?.pass_kind ?? null, target };
    });
    if (!seed.html) throw new NonRetriableError("Current version not found");
    // Defense-in-depth: the trigger gates on UPLOAD, but a refine queued BEFORE an
    // upload can run AFTER it repoints current_version_id. Don't trust the caller —
    // never AI-refine an operator-uploaded page. Same wording as the trigger action.
    if (seed.pass_kind === "UPLOAD") {
      throw new NonRetriableError(
        "This page was uploaded; AI refine isn't available. Regenerate to use AI.",
      );
    }

    // Images aren't regenerated on refine; keep the tokens already in the page valid.
    const images = imagesInHtml(seed.html, homepage.slug);
    const current = await runPass(step, "human", {
      apiKey,
      ...genConfig,
      brief: seed.target
        ? `${buildBrief(seed.target, null, logoDataUri)}\n${buildImageBrief(images)}`
        : "",
      prompt: data.prompt,
      previousHtml: seed.html,
      homepage,
      passKind: "HUMAN",
      createdBy: data.triggeredBy ?? null,
      versionPrompt: data.prompt,
      logoDataUri,
      images,
    });

    await publish(step, homepage, current, logoDataUri, imagesInHtml(current.html, homepage.slug));
    return { ready: true, versions: 1 };
  } catch (err) {
    return endRun(step, "refine", homepage.id, err);
  }
}

/**
 * Re-publish an earlier version: re-render its stored html (chromium runs here,
 * never in the trigger action), overwrite the live html + screenshot, and
 * repoint current_version_id. No model call and no new version row.
 */
async function revertFlow(step: StepLike, data: RevertHomepageEventData) {
  const homepage = await step.run("load-homepage", () =>
    prismadb.crm_Target_Homepage.findUnique({
      where: { id: data.homepageId, deletedAt: null },
      select: { id: true, targetId: true, slug: true, current_version_id: true, logo_data_uri: true },
    }),
  );
  if (!homepage) return { skipped: "no homepage row" };
  const logoDataUri = homepage.logo_data_uri ?? null;

  try {
    await step.run("mark-running", () =>
      prismadb.crm_Target_Homepage.update({
        where: { id: homepage.id },
        data: { status: "RUNNING", error: null },
      }),
    );

    const version = await step.run("load-version", () =>
      prismadb.crm_Target_Homepage_Version.findUnique({
        where: { id: data.versionId },
        select: { id: true, homepage_id: true, html: true },
      }),
    );
    // A version id from another homepage must never be published here.
    if (!version || version.homepage_id !== homepage.id) {
      throw new NonRetriableError("Version not found for this homepage");
    }

    await renderAndUpload(
      step,
      "upload-revert",
      homepage,
      version.html,
      logoDataUri,
      imagesInHtml(version.html, homepage.slug),
    );
    await step.run("mark-ready", () =>
      prismadb.crm_Target_Homepage.update({
        where: { id: homepage.id },
        data: {
          status: "READY",
          current_version_id: version.id,
          ...previewUrls(homepage.slug),
          error: null,
        },
      }),
    );
    return { ready: true };
  } catch (err) {
    return endRun(step, "revert", homepage.id, err);
  }
}

/**
 * Publish an operator-uploaded HTML override. The html (up to ~4 MB) sits at a
 * transient R2 key; it is read, rendered (same allowlisted egress + finalize as
 * every other flow, via renderPng), published, and recorded as an UPLOAD version
 * all inside ONE step so the html never enters persisted step state — only the
 * small version id is returned. The transient blob is removed best-effort after
 * READY (kept on failure so a retry can reuse it).
 */
async function uploadFlow(step: StepLike, data: UploadHomepageEventData) {
  const homepage = await step.run("load-homepage", () =>
    prismadb.crm_Target_Homepage.findUnique({
      where: { id: data.homepageId, deletedAt: null },
      select: { id: true, targetId: true, slug: true, current_version_id: true, logo_data_uri: true },
    }),
  );
  if (!homepage) return { skipped: "no homepage row" };
  const logoDataUri = homepage.logo_data_uri ?? null;

  try {
    await step.run("mark-running", () =>
      prismadb.crm_Target_Homepage.update({
        where: { id: homepage.id },
        data: { status: "RUNNING", error: null },
      }),
    );

    const versionId = await step.run("publish-upload", async () => {
      const html = await getHomepageUpload(homepage.slug);
      if (!html) throw new NonRetriableError("Uploaded file not found");
      const materialized = materialize(html, logoDataUri, []);
      const png = await renderPng(materialized, homepage.slug);
      await putHomepageHtml(homepage.slug, materialized);
      await putHomepageScreenshot(homepage.slug, png);
      const v = await prismadb.crm_Target_Homepage_Version.create({
        data: {
          homepage_id: homepage.id,
          html: materialized,
          prompt: null,
          agent_critique: null,
          pass_kind: "UPLOAD",
          created_by: data.triggeredBy ?? null,
        },
        select: { id: true },
      });
      return v.id;
    });

    await step.run("mark-ready", () =>
      prismadb.crm_Target_Homepage.update({
        where: { id: homepage.id },
        data: {
          status: "READY",
          current_version_id: versionId,
          ...previewUrls(homepage.slug),
          error: null,
        },
      }),
    );
    try {
      await step.run("cleanup-upload", () => deleteHomepageUpload(homepage.slug));
    } catch (e) {
      console.error("[GENERATE_HOMEPAGE_CLEANUP]", e);
    }
    return { ready: true };
  } catch (err) {
    return endRun(step, "upload", homepage.id, err);
  }
}

const BACKSTOP_ERROR = "run failed (onFailure backstop)";

/**
 * Backstop for the "never stuck RUNNING" invariant. The in-body `mark-failed`
 * step can itself throw (DB blip) and function-level cancellation/timeouts skip
 * the body's catch entirely; Inngest calls this once the run has terminally
 * failed. `event.data.event` is the ORIGINAL triggering event (generate carries
 * targetId, refine/revert carry homepageId). Only ever flips a row that is still
 * PENDING/RUNNING, so it can never clobber a newer READY row from a late failure
 * event. Never throws.
 */
export async function onGenerateHomepageFailure({
  error,
  event,
}: {
  error?: { message?: string };
  event: { data: { event?: { data?: Partial<
          GenerateHomepageEventData & RefineHomepageEventData & RevertHomepageEventData & UploadHomepageEventData
        > } } };
}): Promise<void> {
  const orig = event?.data?.event?.data ?? {};
  const message = error?.message ? `${BACKSTOP_ERROR}: ${error.message}`.slice(0, 1000) : BACKSTOP_ERROR;
  try {
    if (orig.homepageId) {
      await prismadb.crm_Target_Homepage.updateMany({
        where: { id: orig.homepageId, status: { in: ["PENDING", "RUNNING"] } },
        data: { status: "FAILED", error: message },
      });
    } else if (orig.targetId) {
      await prismadb.crm_Target_Homepage.updateMany({
        where: { targetId: orig.targetId, status: { in: ["PENDING", "RUNNING"] } },
        data: { status: "FAILED", error: message },
      });
    }
  } catch (e) {
    console.error("[GENERATE_HOMEPAGE_ONFAILURE]", e);
  }
}

export const generateHomepage = inngest.createFunction(
  {
    id: "generate-homepage",
    name: "Generate Homepage",
    triggers: [
      { event: "homepage/target.generate" },
      { event: "homepage/target.refine" },
      { event: "homepage/target.revert" },
      { event: "homepage/target.upload" },
    ],
    concurrency: [
      // Serialize generate/refine/revert/upload (or a double-click) per target so
      // RUNNING/READY and version writes never interleave. All events carry targetId.
      { key: "event.data.targetId", limit: 1 },
      // Cap total concurrent runs: each launches a headless chromium in the
      // 2048 MB function, so unbounded fan-out across targets would OOM.
      { limit: 2 },
    ],
    // Transient failures (endRun rethrows them unchanged) are retried here;
    // each retry replays the completed passes from memoized step state and only
    // re-runs the failed step, so a higher count buys resilience cheaply.
    // Terminal errors are thrown as NonRetriableError and skip retries entirely.
    retries: 3,
    onFailure: onGenerateHomepageFailure,
  },
  async ({ event, step }) => {
    const s = step as unknown as StepLike;
    switch (event.name) {
      case "homepage/target.generate":
        return generateFlow(s, event.data as GenerateHomepageEventData);
      case "homepage/target.refine":
        return refineFlow(s, event.data as RefineHomepageEventData);
      case "homepage/target.revert":
        return revertFlow(s, event.data as RevertHomepageEventData);
      case "homepage/target.upload":
        return uploadFlow(s, event.data as UploadHomepageEventData);
      default:
        throw new NonRetriableError(`Unexpected event ${event.name}`);
    }
  },
);
