import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { getApiKey } from "@/lib/api-keys";
import { harvestSource, type HarvestResult } from "@/lib/homepage/harvest-source";
import { generateHomepage as generateHomepageHtml } from "@/lib/homepage/provider";
import { renderAndScreenshot } from "@/lib/homepage/render";
import {
  putHomepageHtml,
  putHomepageScreenshot,
  putHomepageTmpSource,
  getHomepageTmpSource,
  deleteHomepageTmpSource,
  homepageShotKey,
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
export const GENERATE_TIMEOUT_MS = 120_000;
export const RENDER_TIMEOUT_MS = 60_000;

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

type StepLike = {
  run: <T>(name: string, fn: () => Promise<T> | T) => Promise<T>;
};

type HomepageRow = {
  id: string;
  targetId: string;
  slug: string;
  current_version_id: string | null;
};

type TargetRow = {
  id: string;
  company: string | null;
  company_website: string | null;
  description: string | null;
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

function buildBrief(target: TargetRow, brand: HarvestResult["brand"] | null): string {
  const lines = [`Business: ${target.company ?? "(unknown)"}`];
  if (target.company_website) lines.push(`Current website: ${target.company_website}`);
  if (target.description) lines.push(`Description: ${target.description}`);
  if (brand) {
    if (brand.logoUrl) lines.push(`Logo URL: ${brand.logoUrl}`);
    if (brand.colors.length) lines.push(`Brand colors: ${brand.colors.join(", ")}`);
    if (brand.fonts.length) lines.push(`Brand fonts: ${brand.fonts.join(", ")}`);
    if (brand.copy) lines.push(`Copy from the current site:\n${brand.copy}`);
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

const renderPng = (html: string) =>
  withTimeout(renderAndScreenshot(html), RENDER_TIMEOUT_MS, "Homepage render");

/** generate (+ in-step render of the previous draft for vision) -> persist version, each in its own bounded step. */
async function runPass(
  step: StepLike,
  label: string,
  args: {
    apiKey: string;
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
    isFinal: boolean;
  },
): Promise<PassResult> {
  const gen = await step.run(`generate-${label}`, async () => {
    // Both screenshots live only in memory inside this step; the step returns html + critique.
    const sourceScreenshotB64 = args.hasSourceShot
      ? (await getHomepageTmpSource(args.homepage.slug))?.toString("base64")
      : undefined;
    const refinedScreenshotB64 =
      args.visionOfPrevious && args.previousHtml
        ? (await renderPng(args.previousHtml)).toString("base64")
        : undefined;
    return withTimeout(
      generateHomepageHtml({
        apiKey: args.apiKey,
        brief: args.brief,
        prompt: args.prompt,
        previousHtml: args.previousHtml,
        sourceScreenshotB64,
        refinedScreenshotB64,
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
        // Only the final version's screenshot is stored (at the live key);
        // intermediate passes keep html + critique only.
        screenshot_key: args.isFinal ? homepageShotKey(args.homepage.slug) : null,
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

/** Render + upload the html and screenshot to the live keys (screenshot stays in-step). */
async function renderAndUpload(step: StepLike, name: string, homepage: HomepageRow, html: string) {
  await step.run(name, async () => {
    const png = await renderPng(html);
    await putHomepageHtml(homepage.slug, html);
    await putHomepageScreenshot(homepage.slug, png);
  });
}

/** Upload the final html + screenshot, then flip the homepage to READY. */
async function publish(step: StepLike, homepage: HomepageRow, final: PassResult) {
  await renderAndUpload(step, "upload-final", homepage, final.html);
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

const NO_API_KEY = "NO_API_KEY: configure ANTHROPIC key in admin or profile settings";

async function generateFlow(step: StepLike, data: GenerateHomepageEventData) {
  const loaded = await step.run("load-target", async () => {
    const [target, homepage] = await Promise.all([
      prismadb.crm_Targets.findUnique({
        where: { id: data.targetId, deletedAt: null },
        select: { id: true, company: true, company_website: true, description: true },
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
    if (!target) throw new Error("Target not found");

    const apiKey = await step.run("resolve-api-key", () => getApiKey("ANTHROPIC", data.triggeredBy));
    if (!apiKey) {
      await markFailed(step, homepage.id, NO_API_KEY);
      return { failed: "NO_API_KEY" };
    }

    // The harvest screenshot is uploaded to a transient R2 key inside this step and
    // only the brand + a flag are returned, so no base64 PNG enters step state.
    const harvest = target.company_website
      ? await step.run("harvest-source", async () => {
          const h = await harvestSource(target.company_website);
          if (!h) return null;
          await putHomepageTmpSource(homepage.slug, Buffer.from(h.screenshotB64, "base64"));
          return { brand: h.brand, hasSourceShot: true };
        })
      : null;
    storedSourceShot = !!harvest?.hasSourceShot;

    const brief = buildBrief(target, harvest?.brand ?? null);
    const baseArgs = {
      apiKey,
      brief,
      hasSourceShot: storedSourceShot,
      homepage,
      createdBy: null,
      versionPrompt: data.prompt ?? null,
    };
    const operator = data.prompt ? `${BASE_PROMPT}\n\nOperator instructions: ${data.prompt}` : BASE_PROMPT;

    let current = await runPass(step, "initial", {
      ...baseArgs,
      prompt: operator,
      passKind: "AUTO",
      isFinal: false, // AUTO_PASSES >= 1, so a refinement pass always follows
    });
    for (let i = 1; i <= AUTO_PASSES; i++) {
      current = await runPass(step, `auto-${i}`, {
        ...baseArgs,
        prompt: `${operator}\n\n${AUTO_REFINE_PROMPT}`,
        previousHtml: current.html,
        visionOfPrevious: true,
        passKind: "AUTO",
        isFinal: i === AUTO_PASSES,
      });
    }

    await publish(step, homepage, current);
    if (storedSourceShot) await cleanupTmp(step, homepage.slug);
    return { ready: true, versions: 1 + AUTO_PASSES };
  } catch (err) {
    await markFailed(step, homepage.id, err instanceof Error ? err.message : String(err));
    if (storedSourceShot) await cleanupTmp(step, homepage.slug);
    return { failed: true };
  }
}

async function refineFlow(step: StepLike, data: RefineHomepageEventData) {
  const homepage = await step.run("load-homepage", () =>
    prismadb.crm_Target_Homepage.findUnique({
      where: { id: data.homepageId, deletedAt: null },
      select: { id: true, targetId: true, slug: true, current_version_id: true },
    }),
  );
  if (!homepage) return { skipped: "no homepage row" };

  try {
    await step.run("mark-running", () =>
      prismadb.crm_Target_Homepage.update({
        where: { id: homepage.id },
        data: { status: "RUNNING", error: null },
      }),
    );
    if (!homepage.current_version_id) throw new Error("NO_CURRENT_VERSION: nothing to refine");

    const apiKey = await step.run("resolve-api-key", () => getApiKey("ANTHROPIC", data.triggeredBy));
    if (!apiKey) {
      await markFailed(step, homepage.id, NO_API_KEY);
      return { failed: "NO_API_KEY" };
    }

    const seed = await step.run("load-current-version", async () => {
      const [version, target] = await Promise.all([
        prismadb.crm_Target_Homepage_Version.findUnique({
          where: { id: homepage.current_version_id as string },
          select: { id: true, html: true },
        }),
        prismadb.crm_Targets.findUnique({
          where: { id: homepage.targetId },
          select: { id: true, company: true, company_website: true, description: true },
        }),
      ]);
      return { html: version?.html ?? null, target };
    });
    if (!seed.html) throw new Error("Current version not found");

    const current = await runPass(step, "human", {
      apiKey,
      brief: seed.target ? buildBrief(seed.target, null) : "",
      prompt: data.prompt,
      previousHtml: seed.html,
      homepage,
      passKind: "HUMAN",
      createdBy: data.triggeredBy ?? null,
      versionPrompt: data.prompt,
      isFinal: true,
    });

    await publish(step, homepage, current);
    return { ready: true, versions: 1 };
  } catch (err) {
    await markFailed(step, homepage.id, err instanceof Error ? err.message : String(err));
    return { failed: true };
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
      select: { id: true, targetId: true, slug: true, current_version_id: true },
    }),
  );
  if (!homepage) return { skipped: "no homepage row" };

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
      throw new Error("Version not found for this homepage");
    }

    await renderAndUpload(step, "upload-revert", homepage, version.html);
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
    await markFailed(step, homepage.id, err instanceof Error ? err.message : String(err));
    return { failed: true };
  }
}

const BACKSTOP_ERROR = "run failed (onFailure backstop)";

/**
 * Backstop for the "never stuck RUNNING" invariant. The in-body `mark-failed`
 * step can itself throw (DB blip) and function-level cancellation/timeouts skip
 * the body's catch entirely; Inngest calls this once the run has terminally
 * failed. `event.data.event` is the ORIGINAL triggering event (generate carries
 * targetId, refine carries homepageId). Never throws.
 */
export async function onGenerateHomepageFailure({
  event,
}: {
  event: { data: { event?: { data?: Partial<GenerateHomepageEventData & RefineHomepageEventData & RevertHomepageEventData> } } };
}): Promise<void> {
  const orig = event?.data?.event?.data ?? {};
  try {
    if (orig.homepageId) {
      await prismadb.crm_Target_Homepage.updateMany({
        where: { id: orig.homepageId },
        data: { status: "FAILED", error: BACKSTOP_ERROR },
      });
    } else if (orig.targetId) {
      await prismadb.crm_Target_Homepage.updateMany({
        where: { targetId: orig.targetId, status: { in: ["PENDING", "RUNNING"] } },
        data: { status: "FAILED", error: BACKSTOP_ERROR },
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
    ],
    // Serialize generate/refine (or a double-click) per target so RUNNING/READY
    // and version writes never interleave. All three events carry targetId.
    concurrency: { key: "event.data.targetId", limit: 1 },
    retries: 2,
    onFailure: onGenerateHomepageFailure,
  },
  async ({ event, step }) => {
    const s = step as unknown as StepLike;
    if (event.name === "homepage/target.refine") {
      return refineFlow(s, event.data as RefineHomepageEventData);
    }
    if (event.name === "homepage/target.revert") {
      return revertFlow(s, event.data as RevertHomepageEventData);
    }
    return generateFlow(s, event.data as GenerateHomepageEventData);
  },
);
