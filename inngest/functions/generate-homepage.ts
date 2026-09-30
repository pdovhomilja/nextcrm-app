import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { getApiKey } from "@/lib/api-keys";
import { harvestSource, type HarvestResult } from "@/lib/homepage/harvest-source";
import { generateHomepage as generateHomepageHtml } from "@/lib/homepage/provider";
import { renderAndScreenshot } from "@/lib/homepage/render";
import { putHomepageHtml, putHomepageScreenshot, homepageShotKey } from "@/lib/homepage/storage";

/** Number of automatic render->critique->refine passes after the initial draft. Hard bound. */
export const AUTO_PASSES = 3;

/**
 * Upper bounds for the slow external calls. `generateHomepage` (Anthropic
 * vision) has no internal timeout, so a hung request would otherwise run to the
 * function's maxDuration. Each call also runs in its own `step.run`, so a
 * timeout only fails (and retries) that one step.
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
  prompt: string;
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

type PassResult = { html: string; critique: string; screenshotB64: string; versionId: string };

/** generate -> render -> persist version, each in its own bounded step. */
async function runPass(
  step: StepLike,
  label: string,
  args: {
    apiKey: string;
    brief: string;
    prompt: string;
    previousHtml?: string;
    sourceScreenshotB64?: string;
    refinedScreenshotB64?: string;
    homepage: HomepageRow;
    passKind: "AUTO" | "HUMAN";
    createdBy: string | null;
    versionPrompt: string | null;
    isFinal: boolean;
  },
): Promise<PassResult> {
  const gen = await step.run(`generate-${label}`, () =>
    withTimeout(
      generateHomepageHtml({
        apiKey: args.apiKey,
        brief: args.brief,
        prompt: args.prompt,
        previousHtml: args.previousHtml,
        sourceScreenshotB64: args.sourceScreenshotB64,
        refinedScreenshotB64: args.refinedScreenshotB64,
      }),
      GENERATE_TIMEOUT_MS,
      "Homepage generation",
    ),
  );

  const screenshotB64 = await step.run(`render-${label}`, async () => {
    const png = await withTimeout(renderAndScreenshot(gen.html), RENDER_TIMEOUT_MS, "Homepage render");
    return png.toString("base64");
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

  return { html: gen.html, critique: gen.critique, screenshotB64, versionId };
}

/** Upload the final html + screenshot, then flip the homepage to READY. */
async function publish(step: StepLike, homepage: HomepageRow, final: PassResult) {
  await step.run("upload-final", async () => {
    await putHomepageHtml(homepage.slug, final.html);
    await putHomepageScreenshot(homepage.slug, Buffer.from(final.screenshotB64, "base64"));
  });
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
        where: { id: data.targetId },
        select: { id: true, company: true, company_website: true, description: true },
      }),
      prismadb.crm_Target_Homepage.findUnique({
        where: { targetId: data.targetId },
        select: { id: true, targetId: true, slug: true, current_version_id: true },
      }),
    ]);
    return { target, homepage };
  });
  const { target, homepage } = loaded;
  // The trigger route creates the homepage row before sending the event; with
  // no row there is nothing to report status on.
  if (!homepage) return { skipped: "no homepage row" };

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

    const harvest = target.company_website
      ? await step.run("harvest-source", () => harvestSource(target.company_website))
      : null;

    const brief = buildBrief(target, harvest?.brand ?? null);
    const baseArgs = {
      apiKey,
      brief,
      sourceScreenshotB64: harvest?.screenshotB64,
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
        refinedScreenshotB64: current.screenshotB64,
        passKind: "AUTO",
        isFinal: i === AUTO_PASSES,
      });
    }

    await publish(step, homepage, current);
    return { ready: true, versions: 1 + AUTO_PASSES };
  } catch (err) {
    await markFailed(step, homepage.id, err instanceof Error ? err.message : String(err));
    return { failed: true };
  }
}

async function refineFlow(step: StepLike, data: RefineHomepageEventData) {
  const homepage = await step.run("load-homepage", () =>
    prismadb.crm_Target_Homepage.findUnique({
      where: { id: data.homepageId },
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

export const generateHomepage = inngest.createFunction(
  {
    id: "generate-homepage",
    name: "Generate Homepage",
    triggers: [{ event: "homepage/target.generate" }, { event: "homepage/target.refine" }],
    retries: 2,
  },
  async ({ event, step }) => {
    const s = step as unknown as StepLike;
    if (event.name === "homepage/target.refine") {
      return refineFlow(s, event.data as RefineHomepageEventData);
    }
    return generateFlow(s, event.data as GenerateHomepageEventData);
  },
);
