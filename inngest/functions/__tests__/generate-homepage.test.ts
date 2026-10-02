jest.mock("@/inngest/client", () => ({
  inngest: { createFunction: jest.fn((_config: unknown, handler: unknown) => handler) },
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Targets: { findUnique: jest.fn() },
    crm_Target_Homepage: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    crm_Target_Homepage_Version: { create: jest.fn(), findUnique: jest.fn() },
    crm_Ai_Prompt: { findFirst: jest.fn() },
  },
}));
jest.mock("@/lib/homepage/settings", () => ({ getHomepageSettings: jest.fn() }));
jest.mock("@/lib/homepage/prompt-layers/load-layers", () => ({
  loadActiveStyles: jest.fn(),
  loadAvoidText: jest.fn(),
  loadIndustryBody: jest.fn(),
}));
jest.mock("@/lib/api-keys", () => ({ getApiKey: jest.fn() }));
jest.mock("@/lib/homepage/harvest-source", () => ({ harvestSource: jest.fn() }));
jest.mock("@/lib/homepage/provider", () => ({ generateHomepage: jest.fn() }));
jest.mock("@/lib/homepage/render", () => ({ renderAndScreenshot: jest.fn() }));
jest.mock("@/lib/homepage/images/resolve", () => ({
  resolveImageProviders: jest.fn(),
  generateWithFallback: jest.fn(),
}));
jest.mock("@/lib/homepage/images/plan", () => ({ planHomepageImages: jest.fn() }));
jest.mock("@/lib/homepage/storage", () => ({
  putHomepageHtml: jest.fn(),
  putHomepageScreenshot: jest.fn(),
  putHomepageTmpSource: jest.fn(),
  getHomepageTmpSource: jest.fn(),
  deleteHomepageTmpSource: jest.fn(),
  getHomepageUpload: jest.fn(),
  deleteHomepageUpload: jest.fn(),
  putHomepageImage: jest.fn(),
  homepageImageUrl: (slug: string, name: string) => `https://previews.example.com/p/${slug}/images/${name}`,
  homepageShotKey: (slug: string) => `previews/${slug}/screenshot.png`,
}));

import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { getApiKey } from "@/lib/api-keys";
import { harvestSource } from "@/lib/homepage/harvest-source";
import { generateHomepage } from "@/lib/homepage/provider";
import { renderAndScreenshot } from "@/lib/homepage/render";
import { getHomepageSettings } from "@/lib/homepage/settings";
import {
  loadActiveStyles,
  loadAvoidText,
  loadIndustryBody,
} from "@/lib/homepage/prompt-layers/load-layers";
import { buildSystemPrompt } from "@/lib/homepage/prompt";
import { pickStyleDirection } from "@/lib/homepage/prompt-layers/select-style";
import {
  putHomepageHtml,
  putHomepageScreenshot,
  putHomepageTmpSource,
  getHomepageTmpSource,
  deleteHomepageTmpSource,
  getHomepageUpload,
  deleteHomepageUpload,
  putHomepageImage,
} from "@/lib/homepage/storage";
import { resolveImageProviders, generateWithFallback } from "@/lib/homepage/images/resolve";
import { planHomepageImages } from "@/lib/homepage/images/plan";
import { NonRetriableError } from "inngest";
import { AUTO_PASSES, MAX_RETRIES } from "../generate-homepage";

// createFunction is called once at module load — capture config + handler.
const createFunctionMock = inngest.createFunction as jest.Mock;
const config = createFunctionMock.mock.calls[0][0] as {
  id: string;
  triggers: { event: string }[];
  retries: number;
  concurrency: { key?: string; limit: number }[];
  onFailure?: unknown;
};
const handler = createFunctionMock.mock.results[0].value as (ctx: {
  event: { name: string; data: Record<string, unknown> };
  step: { run: (name: string, fn: () => unknown) => Promise<unknown> };
  attempt?: number;
  maxAttempts?: number;
}) => Promise<unknown>;

const step = { run: (_n: string, f: () => unknown) => Promise.resolve().then(f) };

const IMG_B64 = Buffer.from("IMG").toString("base64");
const SRC_B64 = Buffer.from("SRC_SHOT").toString("base64");
const PNG_B64 = Buffer.from("PNGDATA").toString("base64");

const homepageUpdate = prismadb.crm_Target_Homepage.update as jest.Mock;
const versionCreate = prismadb.crm_Target_Homepage_Version.create as jest.Mock;

const target = {
  id: "t1",
  company: "Acme Plumbing",
  company_website: "https://acme.example",
  description: "Family plumbers",
  triage_status: "APPROVED",
};
const homepage = { id: "h1", targetId: "t1", slug: "acme-plumbing", current_version_id: null };

const generateEvent = {
  name: "homepage/target.generate",
  data: { targetId: "t1", triggeredBy: "u1", prompt: "Make it bold" },
};

const statuses = () =>
  homepageUpdate.mock.calls.map((c) => (c[0] as { data: { status?: string } }).data.status);

beforeEach(() => {
  jest.resetAllMocks();
  process.env.NEXT_PUBLIC_PREVIEWS_BASE_URL = "https://previews.example.com";
  (getApiKey as jest.Mock).mockResolvedValue("sk-test");
  (getHomepageSettings as jest.Mock).mockResolvedValue({
    model: "claude-opus-5-5",
    maxTokens: 40000,
    basePromptId: "bp1",
    imageModel: "soul-v2",
    imageCount: 1,
    imageProvider: "auto",
  });
  // Empty prompt-layer libraries by default (== pre-layers behaviour).
  (loadActiveStyles as jest.Mock).mockResolvedValue([]);
  (loadAvoidText as jest.Mock).mockResolvedValue(null);
  (loadIndustryBody as jest.Mock).mockResolvedValue(null);
  (planHomepageImages as jest.Mock).mockReturnValue([
    { token: "__RADE_IMG_1__", role: "hero", prompt: "p", alt: "hero shot", aspectRatio: "16:9" },
  ]);
  (resolveImageProviders as jest.Mock).mockReturnValue([
    { name: "higgsfield", isConfigured: () => true, generateImage: jest.fn() },
  ]);
  (generateWithFallback as jest.Mock).mockResolvedValue(Buffer.from("IMG"));
  (putHomepageImage as jest.Mock).mockResolvedValue(undefined);
  (prismadb.crm_Ai_Prompt.findFirst as jest.Mock).mockResolvedValue({ body: "BASE_BODY" });
  (prismadb.crm_Targets.findUnique as jest.Mock).mockResolvedValue(target);
  (prismadb.crm_Target_Homepage.findUnique as jest.Mock).mockResolvedValue(homepage);
  (harvestSource as jest.Mock).mockResolvedValue({
    screenshotB64: SRC_B64,
    brand: { logoUrl: null, colors: ["#123456"], fonts: ["Inter"], copy: "We fix pipes" },
  });
  let n = 0;
  (generateHomepage as jest.Mock).mockImplementation(async () => ({
    html: `<html>v${++n}</html>`,
    critique: `critique ${n}`,
  }));
  (renderAndScreenshot as jest.Mock).mockResolvedValue(Buffer.from("PNGDATA"));
  (putHomepageTmpSource as jest.Mock).mockResolvedValue(undefined);
  (getHomepageTmpSource as jest.Mock).mockResolvedValue(Buffer.from("SRC_SHOT"));
  (deleteHomepageTmpSource as jest.Mock).mockResolvedValue(undefined);
  let v = 0;
  versionCreate.mockImplementation(async () => ({ id: `ver${++v}` }));
  homepageUpdate.mockResolvedValue({});
});

// endRun splits failures by whether a retry could help:
//  - TERMINAL (NonRetriableError at the source: no API key, guard, not-found) ->
//    persist FAILED in-body + rethrow NonRetriableError. `runExpectingTerminal`.
//  - TRANSIENT (render crash, provider 5xx, timeout, R2 blip) -> rethrow the
//    ORIGINAL error unchanged so Inngest retries it (replaying the completed
//    passes from memoized step state); the row is NOT marked FAILED in-body
//    (onGenerateHomepageFailure records FAILED once retries run out).
//    `runExpectingRetriable`.
// Silence the expected log noise. Each helper ASSERTS the exact rejection type,
// so a regression that mis-classifies an error fails the test.
beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
});
type FlowCtx = {
  event: { name: string; data: Record<string, unknown> };
  step: { run: (n: string, f: () => unknown) => Promise<unknown> };
  attempt?: number;
};
const runExpectingTerminal = async (ctx: FlowCtx) => {
  await expect(handler(ctx)).rejects.toBeInstanceOf(NonRetriableError);
};
// A transient failure must reject with the original (retriable) error — an
// Error that is NOT a NonRetriableError, so Inngest keeps retrying it.
const runExpectingRetriable = async (ctx: FlowCtx): Promise<Error> => {
  const err = await handler(ctx).catch((e: unknown) => e);
  expect(err).toBeInstanceOf(Error);
  expect(err).not.toBeInstanceOf(NonRetriableError);
  return err as Error;
};
// Inngest surfaces a NonRetriableError thrown INSIDE a step to the flow catch as a
// StepError: it copies the original `.name` ("NonRetriableError") but the prototype
// is a plain Error, NOT NonRetriableError. This builds that exact shape so the tests
// exercise the step→flow boundary (where `instanceof` alone silently misclassifies).
const stepBoundaryNonRetriable = (message: string): Error => {
  const e = new Error(message);
  e.name = "NonRetriableError";
  (e as { stepId?: string }).stepId = "generate-initial";
  return e;
};

describe("generate-homepage function config", () => {
  it("handles both events with bounded retries", () => {
    expect(config.id).toBe("generate-homepage");
    expect(config.triggers.map((t) => t.event).sort()).toEqual([
      "homepage/target.generate",
      "homepage/target.refine",
      "homepage/target.revert",
      "homepage/target.upload",
    ]);
    // Bounded, but > 0 so transient failures get intra-run resume via retries.
    expect(config.retries).toBeGreaterThanOrEqual(2);
    expect(config.retries).toBeLessThanOrEqual(3);
  });
  it("serializes runs per target and caps total concurrent chromium runs", () => {
    expect(config.concurrency).toEqual(
      expect.arrayContaining([
        { key: "event.data.targetId", limit: 1 },
        expect.objectContaining({ limit: expect.any(Number) }),
      ]),
    );
    // A global (unkeyed) cap must exist so parallel targets can't OOM the function.
    expect(config.concurrency.some((c) => !c.key && c.limit > 0)).toBe(true);
  });
  it("does NOT wire the SDK onFailure backstop (inngest v4 rejects function.failed for a triggered fn)", () => {
    // The invariant is held in-body (final-attempt markFailed) + the cron sweep,
    // NOT via onFailure — wiring it would only emit misleading 400s in prod.
    expect(config.onFailure).toBeUndefined();
  });
  it("uses a bounded retry budget exported as MAX_RETRIES", () => {
    expect(config.retries).toBe(MAX_RETRIES);
    expect(MAX_RETRIES).toBeGreaterThanOrEqual(2);
    expect(MAX_RETRIES).toBeLessThanOrEqual(3);
  });
  it("bounds auto passes to 3", () => {
    expect(AUTO_PASSES).toBe(3);
  });
});

describe("generate event", () => {
  it("happy path: harvest -> initial + N passes -> READY with urls + versions", async () => {
    await handler({ event: generateEvent, step });

    expect(harvestSource).toHaveBeenCalledWith("https://acme.example");
    // 1 initial + AUTO_PASSES refinements
    expect(generateHomepage).toHaveBeenCalledTimes(1 + AUTO_PASSES);
    const first = (generateHomepage as jest.Mock).mock.calls[0][0];
    expect(first).toMatchObject({ apiKey: "sk-test", sourceScreenshotB64: SRC_B64 });
    expect(first.previousHtml).toBeUndefined();
    expect(first.refinedScreenshotB64).toBeUndefined();
    // the source shot goes to a transient R2 key, not through step state
    expect(putHomepageTmpSource).toHaveBeenCalledWith("acme-plumbing", Buffer.from("SRC_SHOT"));
    expect(first.brief).toContain("Acme Plumbing");
    expect(first.brief).toContain("#123456");
    expect(first.prompt).toContain("Make it bold");
    // later passes are seeded with previous html + the rendered screenshot
    const second = (generateHomepage as jest.Mock).mock.calls[1][0];
    expect(second.previousHtml).toBe("<html>v1</html>");
    expect(second.refinedScreenshotB64).toBe(PNG_B64);
    expect(second.sourceScreenshotB64).toBe(SRC_B64);
    // each auto pass renders the PREVIOUS html in-step; the final html is rendered for publish
    expect((renderAndScreenshot as jest.Mock).mock.calls.map((c) => c[0])).toEqual([
      "<html>v1</html>",
      "<html>v2</html>",
      "<html>v3</html>",
      "<html>v4</html>",
    ]);
    // every render passes the slug so the egress allowlist permits this page's images
    for (const c of (renderAndScreenshot as jest.Mock).mock.calls) {
      expect(c[1]).toEqual({ slug: "acme-plumbing" });
    }

    // every pass persisted as an AUTO version with its critique
    expect(versionCreate).toHaveBeenCalledTimes(1 + AUTO_PASSES);
    for (const call of versionCreate.mock.calls) {
      expect(call[0].data.pass_kind).toBe("AUTO");
      expect(call[0].data.agent_critique).toMatch(/^critique/);
      expect(call[0].data.homepage_id).toBe("h1");
    }

    // final html + screenshot uploaded under the slug
    expect(putHomepageHtml).toHaveBeenCalledTimes(1);
    expect(putHomepageHtml).toHaveBeenCalledWith("acme-plumbing", `<html>v${1 + AUTO_PASSES}</html>`);
    expect(putHomepageScreenshot).toHaveBeenCalledWith("acme-plumbing", expect.any(Buffer));

    expect(statuses()[0]).toBe("RUNNING");
    const last = homepageUpdate.mock.calls.at(-1)![0];
    expect(last.data).toMatchObject({
      status: "READY",
      current_version_id: `ver${1 + AUTO_PASSES}`,
      preview_url: "https://previews.example.com/p/acme-plumbing",
      screenshot_url: "https://previews.example.com/p/acme-plumbing/screenshot.png",
      error: null,
    });
    expect(statuses()).not.toContain("FAILED");
    // transient source screenshot cleaned up after the run
    expect(deleteHomepageTmpSource).toHaveBeenCalledWith("acme-plumbing");
  });

  it("uses the admin-resolved model/maxTokens/base prompt on every pass", async () => {
    await handler({ event: generateEvent, step });
    expect(prismadb.crm_Ai_Prompt.findFirst).toHaveBeenCalledWith({
      where: { id: "bp1", kind: "HOMEPAGE_BASE", deletedAt: null },
      select: { body: true },
    });
    const calls = (generateHomepage as jest.Mock).mock.calls;
    expect(calls).toHaveLength(1 + AUTO_PASSES);
    for (const [arg] of calls) {
      expect(arg.model).toBe("claude-opus-5-5");
      expect(arg.maxTokens).toBe(40000);
      expect(arg.system).toContain("BASE_BODY");
      expect(arg.system).toContain("Output contract");
    }
  });

  it("no base prompt id: skips the lookup and falls back to the default base", async () => {
    (getHomepageSettings as jest.Mock).mockResolvedValue({
      model: "claude-sonnet-5-5",
      maxTokens: 16000,
      basePromptId: null,
    });
    await handler({ event: generateEvent, step });
    expect(prismadb.crm_Ai_Prompt.findFirst).not.toHaveBeenCalled();
    const arg = (generateHomepage as jest.Mock).mock.calls[0][0];
    expect(arg.model).toBe("claude-sonnet-5-5");
    expect(arg.maxTokens).toBe(16000);
    expect(arg.system).toContain("senior web designer");
    expect(arg.system).toContain("Output contract");
  });

  it("base prompt missing/deleted: falls back to the default base", async () => {
    (prismadb.crm_Ai_Prompt.findFirst as jest.Mock).mockResolvedValue(null);
    await handler({ event: generateEvent, step });
    const arg = (generateHomepage as jest.Mock).mock.calls[0][0];
    expect(arg.system).not.toContain("BASE_BODY");
    expect(arg.system).toContain("senior web designer");
  });

  it("keeps base64 image data out of every persisted step return value", async () => {
    const outputs: { name: string; out: unknown }[] = [];
    const recording = {
      run: async (name: string, f: () => unknown) => {
        const out = await f();
        outputs.push({ name, out });
        return out;
      },
    };
    await handler({ event: generateEvent, step: recording });
    expect(outputs.length).toBeGreaterThan(0);
    const blob = JSON.stringify(outputs);
    expect(blob).not.toContain(PNG_B64);
    expect(blob).not.toContain(SRC_B64);
    expect(blob).not.toMatch(/screenshotB64/);
    expect(outputs.at(-1)!.name).not.toBe("mark-failed");
  });

  describe("AI imagery", () => {
    const briefs = () => (generateHomepage as jest.Mock).mock.calls.map((c) => c[0].brief as string);

    it("generates images ONCE (not per pass), stores them, and teaches the model the tokens", async () => {
      await handler({ event: generateEvent, step });
      expect(generateWithFallback).toHaveBeenCalledTimes(1);
      expect(planHomepageImages).toHaveBeenCalledTimes(1);
      expect(planHomepageImages).toHaveBeenCalledWith(
        expect.objectContaining({ count: 1, company: "Acme Plumbing", colors: ["#123456"] }),
      );
      expect(resolveImageProviders).toHaveBeenCalledWith({ provider: "auto", model: "soul-v2" });
      expect(putHomepageImage).toHaveBeenCalledWith("acme-plumbing", "img-1.png", Buffer.from("IMG"));
      expect(briefs()).toHaveLength(1 + AUTO_PASSES);
      for (const b of briefs()) expect(b).toContain("__RADE_IMG_1__");
    });

    it("strips an image token with no generated image behind it; provided tokens + logo still materialize", async () => {
      (harvestSource as jest.Mock).mockResolvedValue({
        screenshotB64: SRC_B64,
        brand: { logoUrl: null, colors: [], fonts: [], copy: "c", logoDataUri: "data:image/png;base64,LOGO" },
      });
      (generateHomepage as jest.Mock).mockReset();
      (generateHomepage as jest.Mock).mockResolvedValue({
        html: '<html><img src="__RADE_LOGO_SRC__"><img src="__RADE_IMG_1__"><img src="__RADE_IMG_9__"></html>',
        critique: "c",
      });
      await handler({ event: generateEvent, step });
      const url = "https://previews.example.com/p/acme-plumbing/images/img-1.png";
      const expected = `<html><img src="data:image/png;base64,LOGO"><img src="${url}"><img src=""></html>`;
      expect(putHomepageHtml).toHaveBeenCalledWith("acme-plumbing", expected);
      for (const c of (renderAndScreenshot as jest.Mock).mock.calls) {
        expect(c[0]).not.toContain("__RADE_IMG_9__");
        expect(c[0]).toContain(url);
      }
    });

    it("materializes image tokens for render + upload but persists versions WITH tokens", async () => {
      (generateHomepage as jest.Mock).mockReset();
      (generateHomepage as jest.Mock).mockResolvedValue({
        html: '<html><img src="__RADE_IMG_1__"></html>',
        critique: "c",
      });
      await handler({ event: generateEvent, step });
      const url = "https://previews.example.com/p/acme-plumbing/images/img-1.png";
      for (const c of versionCreate.mock.calls) expect(c[0].data.html).toContain("__RADE_IMG_1__");
      for (const c of (renderAndScreenshot as jest.Mock).mock.calls) {
        expect(c[0]).toContain(url);
        expect(c[0]).not.toContain("__RADE_IMG_1__");
      }
      expect(putHomepageHtml).toHaveBeenCalledWith("acme-plumbing", `<html><img src="${url}"></html>`);
    });

    it("fail-open: no image from any provider still reaches READY, brief says no images", async () => {
      (generateWithFallback as jest.Mock).mockResolvedValue(null);
      await handler({ event: generateEvent, step });
      expect(putHomepageImage).not.toHaveBeenCalled();
      for (const b of briefs()) {
        expect(b).toContain("No images available");
        expect(b).not.toContain("__RADE_IMG_1__");
      }
      expect(statuses()).not.toContain("FAILED");
      expect(homepageUpdate.mock.calls.at(-1)![0].data.status).toBe("READY");
    });

    it("fail-open: generation / storage / planning throwing is swallowed (never terminal, never retried)", async () => {
      for (const arm of [
        () => (generateWithFallback as jest.Mock).mockRejectedValue(new Error("provider boom")),
        () => (putHomepageImage as jest.Mock).mockRejectedValue(new Error("r2 down")),
        () => (planHomepageImages as jest.Mock).mockImplementation(() => { throw new Error("plan boom"); }),
        () => (resolveImageProviders as jest.Mock).mockImplementation(() => { throw new Error("resolve boom"); }),
      ]) {
        jest.clearAllMocks();
        arm();
        await expect(handler({ event: generateEvent, step })).resolves.toMatchObject({ ready: true });
        expect(statuses()).not.toContain("FAILED");
        expect(homepageUpdate.mock.calls.at(-1)![0].data.status).toBe("READY");
        for (const b of briefs()) expect(b).toContain("No images available");
      }
    });

    it("one image failing keeps the others", async () => {
      (planHomepageImages as jest.Mock).mockReturnValue([
        { token: "__RADE_IMG_1__", role: "hero", prompt: "p", alt: "hero", aspectRatio: "16:9" },
        { token: "__RADE_IMG_2__", role: "section", prompt: "p", alt: "sec", aspectRatio: "2:3" },
      ]);
      (generateWithFallback as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(Buffer.from("IMG"));
      await handler({ event: generateEvent, step });
      expect(putHomepageImage).toHaveBeenCalledTimes(1);
      expect(putHomepageImage).toHaveBeenCalledWith("acme-plumbing", "img-2.png", Buffer.from("IMG"));
      const b = briefs()[0];
      expect(b).toContain("__RADE_IMG_2__");
      expect(b).not.toContain("__RADE_IMG_1__");
    });

    it("keeps image bytes (base64) out of every persisted step return value", async () => {
      const outputs: unknown[] = [];
      const recording = {
        run: async (_n: string, f: () => unknown) => {
          const out = await f();
          outputs.push(out);
          return out;
        },
      };
      await handler({ event: generateEvent, step: recording });
      const blob = JSON.stringify(outputs);
      expect(blob).not.toContain(IMG_B64);
      // the small token/alt/url list IS what the step returns
      expect(blob).toContain("img-1.png");
    });
  });

  it("loads the target and homepage with the soft-delete filter", async () => {
    await handler({ event: generateEvent, step });
    expect(prismadb.crm_Targets.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "t1", deletedAt: null } }),
    );
    expect(prismadb.crm_Target_Homepage.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { targetId: "t1", deletedAt: null } }),
    );
  });

  it("transient render failure: retriable, row kept RUNNING, transient source shot KEPT for the retry", async () => {
    (renderAndScreenshot as jest.Mock).mockRejectedValue(new Error("chromium exploded"));
    const err = await runExpectingRetriable({ event: generateEvent, step });
    expect(err.message).toContain("chromium exploded");
    // The shot is reused by the memoized harvest step when Inngest retries, so it
    // must NOT be cleaned up on a retriable failure.
    expect(deleteHomepageTmpSource).not.toHaveBeenCalled();
    // No in-body FAILED — the onFailure backstop records that only after retries run out.
    expect(statuses()).not.toContain("FAILED");
  });

  it("no company_website: harvest yields null, still READY", async () => {
    (prismadb.crm_Targets.findUnique as jest.Mock).mockResolvedValue({ ...target, company_website: null });
    (harvestSource as jest.Mock).mockResolvedValue(null);
    await handler({ event: generateEvent, step });

    expect((generateHomepage as jest.Mock).mock.calls[0][0].sourceScreenshotB64).toBeUndefined();
    expect(putHomepageTmpSource).not.toHaveBeenCalled();
    expect(getHomepageTmpSource).not.toHaveBeenCalled();
    expect(deleteHomepageTmpSource).not.toHaveBeenCalled();
    expect(homepageUpdate.mock.calls.at(-1)![0].data.status).toBe("READY");
  });

  it("unset NEXT_PUBLIC_PREVIEWS_BASE_URL: stores objects + READY but leaves urls null", async () => {
    delete process.env.NEXT_PUBLIC_PREVIEWS_BASE_URL;
    await handler({ event: generateEvent, step });
    const last = homepageUpdate.mock.calls.at(-1)![0];
    expect(putHomepageHtml).toHaveBeenCalled();
    expect(last.data.status).toBe("READY");
    expect(last.data.preview_url).toBeNull();
    expect(last.data.screenshot_url).toBeNull();
  });

  it("no Anthropic key: terminal (NonRetriable) FAILED with NO_API_KEY, no provider call", async () => {
    (getApiKey as jest.Mock).mockResolvedValue(null);
    await runExpectingTerminal({ event: generateEvent, step });
    expect(generateHomepage).not.toHaveBeenCalled();
    const last = homepageUpdate.mock.calls.at(-1)![0];
    expect(last.data.status).toBe("FAILED");
    expect(last.data.error).toMatch(/^NO_API_KEY/);
  });

  it("deleted target: terminal (NonRetriable) FAILED, no provider call", async () => {
    (prismadb.crm_Targets.findUnique as jest.Mock).mockResolvedValue(null);
    await runExpectingTerminal({ event: generateEvent, step });
    expect(generateHomepage).not.toHaveBeenCalled();
    const last = homepageUpdate.mock.calls.at(-1)![0];
    expect(last.data.status).toBe("FAILED");
    expect(last.data.error).toContain("Target not found");
  });

  it("render error: retriable, never marked FAILED in-body, live keys untouched", async () => {
    (renderAndScreenshot as jest.Mock).mockRejectedValue(new Error("chromium exploded"));
    const err = await runExpectingRetriable({ event: generateEvent, step });
    expect(err.message).toContain("chromium exploded");
    expect(statuses()).not.toContain("FAILED");
    expect(putHomepageHtml).not.toHaveBeenCalled();
  });

  it("provider error mid-loop (529): retriable, not marked FAILED in-body", async () => {
    (generateHomepage as jest.Mock)
      .mockReset()
      .mockResolvedValueOnce({ html: "<html>ok</html>", critique: "c" })
      .mockRejectedValue(new Error("Anthropic request failed (529)"));
    const err = await runExpectingRetriable({ event: generateEvent, step });
    expect(err.message).toContain("529");
    expect(statuses()).not.toContain("FAILED");
  });

  it("storage error: retriable, not marked FAILED in-body", async () => {
    (putHomepageHtml as jest.Mock).mockRejectedValue(new Error("R2 down"));
    const err = await runExpectingRetriable({ event: generateEvent, step });
    expect(err.message).toContain("R2 down");
    expect(statuses()).not.toContain("FAILED");
  });

  it("FINAL retry attempt: a transient error is recorded FAILED in-body (not left to the broken onFailure)", async () => {
    // Same transient error as the retriable test above, but on the last attempt
    // Inngest won't retry again — so instead of waiting for the (unusable v4)
    // onFailure backstop, endRun must mark FAILED here or the row stays RUNNING.
    (putHomepageHtml as jest.Mock).mockRejectedValue(new Error("R2 down"));
    const err = await handler({ event: generateEvent, step, attempt: MAX_RETRIES }).catch((e) => e);
    expect((err as Error).message).toContain("R2 down");
    expect(statuses()).toContain("FAILED");
    const failed = homepageUpdate.mock.calls.find((c) => c[0].data.status === "FAILED");
    expect(failed![0].data.error).toContain("R2 down");
  });

  it("uses the runtime maxAttempts to decide the final attempt (not just MAX_RETRIES)", async () => {
    // maxAttempts=2 => final at attempt 1 (attempt+1 >= maxAttempts), even though
    // 1 < MAX_RETRIES. Proves we honor the runtime signal over the constant.
    (putHomepageHtml as jest.Mock).mockRejectedValue(new Error("R2 down"));
    await handler({ event: generateEvent, step, attempt: 1, maxAttempts: 2 }).catch((e) => e);
    expect(statuses()).toContain("FAILED");
  });

  it("NOT the final attempt (attempt+1 < maxAttempts): stays retriable, not marked FAILED", async () => {
    (putHomepageHtml as jest.Mock).mockRejectedValue(new Error("R2 down"));
    const err = await handler({ event: generateEvent, step, attempt: 1, maxAttempts: 4 }).catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(NonRetriableError);
    expect(statuses()).not.toContain("FAILED");
  });

  it("vision render crash is NON-FATAL: passes refine from HTML only and the run still reaches READY", async () => {
    // The 3 auto passes each render the PREVIOUS draft for vision; make those
    // crash but let the final publish render succeed.
    (renderAndScreenshot as jest.Mock)
      .mockRejectedValueOnce(new Error("renderer gone"))
      .mockRejectedValueOnce(new Error("renderer gone"))
      .mockRejectedValueOnce(new Error("renderer gone"))
      .mockResolvedValue(Buffer.from("PNGDATA"));
    await handler({ event: generateEvent, step });
    // All passes still ran despite the vision renders failing.
    expect(generateHomepage).toHaveBeenCalledTimes(1 + AUTO_PASSES);
    // Auto passes degraded to text-only (no screenshot fed to the model).
    for (const [arg] of (generateHomepage as jest.Mock).mock.calls.slice(1)) {
      expect(arg.refinedScreenshotB64).toBeUndefined();
    }
    // ...and the run still published + reached READY, never FAILED.
    expect(putHomepageHtml).toHaveBeenCalledTimes(1);
    expect(homepageUpdate.mock.calls.at(-1)![0].data.status).toBe("READY");
    expect(statuses()).not.toContain("FAILED");
  });

  it("a hung provider call is bounded by a timeout and stays retriable", async () => {
    jest.useFakeTimers();
    try {
      (generateHomepage as jest.Mock).mockReset().mockReturnValue(new Promise(() => {}));
      const p = handler({ event: generateEvent, step }).catch((e: unknown) => e);
      await jest.advanceTimersByTimeAsync(241_000);
      const err = (await p) as Error;
      expect(err).toBeInstanceOf(Error);
      expect(err).not.toBeInstanceOf(NonRetriableError);
      expect(err.message).toMatch(/timed out/i);
      // A timeout is transient — left for Inngest to retry, not marked FAILED here.
      expect(statuses()).not.toContain("FAILED");
    } finally {
      jest.useRealTimers();
    }
  });

  it("missing homepage row: no crash, nothing generated", async () => {
    (prismadb.crm_Target_Homepage.findUnique as jest.Mock).mockResolvedValue(null);
    await handler({ event: generateEvent, step });
    expect(generateHomepage).not.toHaveBeenCalled();
  });

  it("surfaces a transient failure to Inngest as the ORIGINAL (retriable) error, so it retries instead of failing red", async () => {
    (renderAndScreenshot as jest.Mock).mockRejectedValue(new Error("chromium exploded"));
    const err = await handler({ event: generateEvent, step }).catch((e) => e);
    // Not a NonRetriableError — Inngest replays the memoized passes and retries.
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(NonRetriableError);
    expect((err as Error).message).toMatch(/chromium exploded/);
    expect(statuses()).not.toContain("FAILED");
  });

  it("terminal error from INSIDE a step (max_tokens as a StepError) fails fast, not retried", async () => {
    // Reproduces the QA bug: the provider throws NonRetriableError inside the
    // generate step; Inngest surfaces it as a StepError (name preserved, class
    // lost). endRun must still treat it terminal — mark FAILED and re-throw a
    // genuine NonRetriableError so Inngest stops retrying (no silent RUNNING loop).
    (generateHomepage as jest.Mock)
      .mockReset()
      .mockRejectedValue(
        stepBoundaryNonRetriable(
          "AI response was cut off (max_tokens). Try a shorter prompt or simpler design.",
        ),
      );
    const err = await handler({ event: generateEvent, step }).catch((e) => e);
    expect(err).toBeInstanceOf(NonRetriableError);
    expect((err as Error).message).toContain("max_tokens");
    const last = homepageUpdate.mock.calls.at(-1)![0];
    expect(last.data.status).toBe("FAILED");
    expect(last.data.error).toContain("max_tokens");
    expect(statuses()).toContain("FAILED");
  });

  it("rejects an unknown event name", async () => {
    await expect(
      handler({ event: { name: "homepage/target.bogus", data: {} }, step }),
    ).rejects.toThrow(/Unexpected event/);
  });
});

describe("refine event", () => {
  const refineEvent = {
    name: "homepage/target.refine",
    data: { homepageId: "h1", targetId: "t1", prompt: "Bigger hero", triggeredBy: "u1" },
  };

  beforeEach(() => {
    (prismadb.crm_Target_Homepage.findUnique as jest.Mock).mockResolvedValue({
      ...homepage,
      current_version_id: "verCur",
    });
    (prismadb.crm_Target_Homepage_Version.findUnique as jest.Mock).mockResolvedValue({
      id: "verCur",
      html: "<html>current</html>",
    });
  });

  it("runs ONE human pass seeded with the current html and writes a new version", async () => {
    await handler({ event: refineEvent, step });

    expect(harvestSource).not.toHaveBeenCalled();
    expect(generateHomepage).toHaveBeenCalledTimes(1);
    expect((generateHomepage as jest.Mock).mock.calls[0][0]).toMatchObject({
      previousHtml: "<html>current</html>",
      prompt: expect.stringContaining("Bigger hero"),
    });
    expect(versionCreate).toHaveBeenCalledTimes(1);
    expect(versionCreate.mock.calls[0][0].data).toMatchObject({
      pass_kind: "HUMAN",
      homepage_id: "h1",
      prompt: "Bigger hero",
      created_by: "u1",
    });
    expect(putHomepageHtml).toHaveBeenCalledWith("acme-plumbing", "<html>v1</html>");
    const last = homepageUpdate.mock.calls.at(-1)![0];
    expect(last.data).toMatchObject({ status: "READY", current_version_id: "ver1" });
    // human pass sends no rendered-draft image (unchanged behavior)
    expect((generateHomepage as jest.Mock).mock.calls[0][0].refinedScreenshotB64).toBeUndefined();
  });

  it("uses the admin-resolved model/maxTokens/base prompt", async () => {
    await handler({ event: refineEvent, step });
    const arg = (generateHomepage as jest.Mock).mock.calls[0][0];
    expect(arg.model).toBe("claude-opus-5-5");
    expect(arg.maxTokens).toBe(40000);
    expect(arg.system).toContain("BASE_BODY");
  });

  it("loads the homepage with the soft-delete filter", async () => {
    await handler({ event: refineEvent, step });
    expect(prismadb.crm_Target_Homepage.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "h1", deletedAt: null } }),
    );
  });

  it("no current version: terminal (NonRetriable) FAILED", async () => {
    (prismadb.crm_Target_Homepage.findUnique as jest.Mock).mockResolvedValue({
      ...homepage,
      current_version_id: null,
    });
    await runExpectingTerminal({ event: refineEvent, step });
    expect(generateHomepage).not.toHaveBeenCalled();
    expect(homepageUpdate.mock.calls.at(-1)![0].data.status).toBe("FAILED");
  });

  it("provider error: retriable, not marked FAILED in-body", async () => {
    (generateHomepage as jest.Mock).mockReset().mockRejectedValue(new Error("boom"));
    const err = await runExpectingRetriable({ event: refineEvent, step });
    expect(err.message).toContain("boom");
    expect(statuses()).not.toContain("FAILED");
  });

  it("FINAL attempt: a transient refine error is recorded FAILED in-body", async () => {
    (generateHomepage as jest.Mock).mockReset().mockRejectedValue(new Error("boom"));
    const err = await handler({ event: refineEvent, step, attempt: MAX_RETRIES }).catch((e) => e);
    expect((err as Error).message).toContain("boom");
    expect(statuses()).toContain("FAILED");
  });

  it("run-time re-check: an UPLOAD current version is never AI-refined (queued-refine vs upload race)", async () => {
    // The trigger gated on pass_kind, but a queued refine can run AFTER an upload
    // repointed current_version_id to an UPLOAD version. The job must not trust it.
    (prismadb.crm_Target_Homepage_Version.findUnique as jest.Mock).mockResolvedValue({
      id: "verCur",
      html: "<html>uploaded</html>",
      pass_kind: "UPLOAD",
    });
    await runExpectingTerminal({ event: refineEvent, step });
    expect(generateHomepage).not.toHaveBeenCalled();
    expect(versionCreate).not.toHaveBeenCalled();
    const last = homepageUpdate.mock.calls.at(-1)![0];
    expect(last.data.status).toBe("FAILED");
    expect(last.data.error).toBe(
      "This page was uploaded; AI refine isn't available. Regenerate to use AI.",
    );
  });
});

describe("prompt layers", () => {
  const styles = [
    { id: "s-a", body: "STYLE_CARD_A" },
    { id: "s-b", body: "STYLE_CARD_B" },
    { id: "s-c", body: "STYLE_CARD_C" },
  ];
  const picked = pickStyleDirection("h1", styles)!;
  const others = styles.filter((s) => s.id !== picked.id);
  const refineEvent = {
    name: "homepage/target.refine",
    data: { homepageId: "h1", targetId: "t1", prompt: "Bigger hero", triggeredBy: "u1" },
  };
  const systems = () =>
    (generateHomepage as jest.Mock).mock.calls.map((c) => (c[0] as { system: string }).system);

  const populate = () => {
    (loadActiveStyles as jest.Mock).mockResolvedValue(styles);
    (loadAvoidText as jest.Mock).mockResolvedValue("AVOID_TEXT");
    (loadIndustryBody as jest.Mock).mockResolvedValue("INDUSTRY_BODY");
    (prismadb.crm_Targets.findUnique as jest.Mock).mockResolvedValue({
      ...target,
      homepage_industry_prompt_id: "11111111-1111-4111-8111-111111111111",
    });
  };
  const seedRefine = () => {
    (prismadb.crm_Target_Homepage.findUnique as jest.Mock).mockResolvedValue({
      ...homepage,
      current_version_id: "verCur",
    });
    (prismadb.crm_Target_Homepage_Version.findUnique as jest.Mock).mockResolvedValue({
      id: "verCur",
      html: "<html>current</html>",
    });
  };

  it("composes base + industry + style + avoid + contract (contract last) on every pass", async () => {
    populate();
    await handler({ event: generateEvent, step });
    const all = systems();
    expect(all).toHaveLength(1 + AUTO_PASSES);
    for (const system of all) {
      const idx = ["BASE_BODY", "INDUSTRY_BODY", picked.body, "AVOID_TEXT", "Output contract"].map(
        (needle) => system.indexOf(needle),
      );
      expect(idx.every((i) => i >= 0)).toBe(true);
      expect([...idx].sort((a, b) => a - b)).toEqual(idx); // precedence order, contract last
    }
    // industry is resolved from the target's selected prompt id
    expect(loadIndustryBody).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111");
  });

  it("uses the SAME style card on the initial pass, every auto pass and refine (seed = homepage.id)", async () => {
    populate();
    await handler({ event: generateEvent, step });
    for (const system of systems()) {
      expect(system).toContain(picked.body);
      for (const o of others) expect(system).not.toContain(o.body);
    }

    jest.clearAllMocks();
    seedRefine();
    (generateHomepage as jest.Mock).mockResolvedValue({ html: "<html>r</html>", critique: "c" });
    versionCreate.mockResolvedValue({ id: "verR" });
    homepageUpdate.mockResolvedValue({});
    (renderAndScreenshot as jest.Mock).mockResolvedValue(Buffer.from("PNGDATA"));
    await handler({ event: refineEvent, step });
    const refineSystem = systems()[0];
    expect(refineSystem).toContain(picked.body);
    for (const o of others) expect(refineSystem).not.toContain(o.body);
    expect(refineSystem).toContain("INDUSTRY_BODY");
    expect(refineSystem).toContain("AVOID_TEXT");
  });

  it("varyDesign=false: base + machine contract only, layers never loaded", async () => {
    populate();
    (getHomepageSettings as jest.Mock).mockResolvedValue({
      model: "claude-opus-5-5",
      maxTokens: 40000,
      basePromptId: "bp1",
      imageModel: "soul-v2",
      imageCount: 1,
      imageProvider: "auto",
      varyDesign: false,
    });
    await handler({ event: generateEvent, step });
    for (const system of systems()) {
      expect(system).toContain("BASE_BODY");
      expect(system).toContain("Output contract");
      expect(system).not.toContain("INDUSTRY_BODY");
      expect(system).not.toContain("AVOID_TEXT");
      for (const st of styles) expect(system).not.toContain(st.body);
    }
    expect(loadActiveStyles).not.toHaveBeenCalled();
    expect(loadAvoidText).not.toHaveBeenCalled();
    expect(loadIndustryBody).not.toHaveBeenCalled();
  });

  it("a soft-deleted/missing industry id falls back to the Generic default", async () => {
    populate();
    // Exercise the real loader against the mocked prisma: the selected id misses
    // (soft-deleted/unknown), the is_default row is returned.
    (loadIndustryBody as jest.Mock).mockImplementation(
      jest.requireActual("@/lib/homepage/prompt-layers/load-layers").loadIndustryBody,
    );
    (prismadb.crm_Ai_Prompt.findFirst as jest.Mock).mockImplementation(
      async (args: { where: { kind: string; id?: string; is_default?: boolean } }) => {
        if (args.where.kind === "HOMEPAGE_BASE") return { body: "BASE_BODY" };
        if (args.where.id) return null; // soft-deleted / missing selected industry
        if (args.where.is_default) return { body: "GENERIC_INDUSTRY" };
        return null;
      },
    );
    await handler({ event: generateEvent, step });
    for (const system of systems()) {
      expect(system).toContain("GENERIC_INDUSTRY");
      expect(system).not.toContain("INDUSTRY_BODY");
    }
  });

  it("empty libraries: system is base + contract (today's behaviour) and the run still reaches READY", async () => {
    await handler({ event: generateEvent, step });
    for (const system of systems()) {
      expect(system).toBe(buildSystemPrompt({ base: "BASE_BODY" }));
    }
    const last = homepageUpdate.mock.calls.at(-1)![0];
    expect(last.data.status).toBe("READY");
  });

  it("selects homepage_industry_prompt_id when loading the target (generate + refine)", async () => {
    await handler({ event: generateEvent, step });
    expect(prismadb.crm_Targets.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({ homepage_industry_prompt_id: true }),
      }),
    );
    jest.clearAllMocks();
    seedRefine();
    (generateHomepage as jest.Mock).mockResolvedValue({ html: "<html>r</html>", critique: "c" });
    versionCreate.mockResolvedValue({ id: "verR" });
    homepageUpdate.mockResolvedValue({});
    (prismadb.crm_Targets.findUnique as jest.Mock).mockResolvedValue(target);
    await handler({ event: refineEvent, step });
    expect(prismadb.crm_Targets.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({ homepage_industry_prompt_id: true }),
      }),
    );
  });
});

describe("revert event", () => {
  const versionFindUnique = prismadb.crm_Target_Homepage_Version.findUnique as jest.Mock;
  const revertEvent = {
    name: "homepage/target.revert",
    data: { homepageId: "h1", targetId: "t1", versionId: "ver9", triggeredBy: "u1" },
  };
  const hp = { ...homepage, current_version_id: "ver2" };

  beforeEach(() => {
    (prismadb.crm_Target_Homepage.findUnique as jest.Mock).mockResolvedValue(hp);
    versionFindUnique.mockResolvedValue({ id: "ver9", homepage_id: "h1", html: "<html>old</html>" });
  });

  it("materializes image tokens present in the stored html (served page keeps working)", async () => {
    versionFindUnique.mockResolvedValue({
      id: "ver9",
      homepage_id: "h1",
      html: '<html><img src="__RADE_IMG_2__"></html>',
    });
    await handler({ event: revertEvent, step });
    const url = "https://previews.example.com/p/acme-plumbing/images/img-2.png";
    expect(renderAndScreenshot).toHaveBeenCalledWith(`<html><img src="${url}"></html>`, { slug: "acme-plumbing" });
    expect(putHomepageHtml).toHaveBeenCalledWith("acme-plumbing", `<html><img src="${url}"></html>`);
    expect(generateWithFallback).not.toHaveBeenCalled();
  });

  it("re-renders the version html, republishes to the live keys, repoints current_version_id, READY", async () => {
    const out = await handler({ event: revertEvent, step });
    expect(out).toEqual({ ready: true });
    expect(renderAndScreenshot).toHaveBeenCalledWith("<html>old</html>", { slug: "acme-plumbing" });
    expect(putHomepageHtml).toHaveBeenCalledWith("acme-plumbing", "<html>old</html>");
    expect(putHomepageScreenshot).toHaveBeenCalledWith("acme-plumbing", Buffer.from("PNGDATA"));
    expect(statuses()).toEqual(["RUNNING", "READY"]);
    expect(homepageUpdate).toHaveBeenLastCalledWith({
      where: { id: "h1" },
      data: {
        status: "READY",
        current_version_id: "ver9",
        preview_url: "https://previews.example.com/p/acme-plumbing",
        screenshot_url: "https://previews.example.com/p/acme-plumbing/screenshot.png",
        error: null,
      },
    });
    // No model call and no new version row on a revert.
    expect(generateHomepage).not.toHaveBeenCalled();
    expect(versionCreate).not.toHaveBeenCalled();
  });

  it("keeps base64 screenshot data out of persisted step return values", async () => {
    const outputs: unknown[] = [];
    const recording = {
      run: async (_n: string, f: () => unknown) => {
        const out = await f();
        outputs.push(out);
        return out;
      },
    };
    await handler({ event: revertEvent, step: recording });
    expect(JSON.stringify(outputs)).not.toContain(PNG_B64);
  });

  it("unset NEXT_PUBLIC_PREVIEWS_BASE_URL: still republishes + READY, urls null", async () => {
    delete process.env.NEXT_PUBLIC_PREVIEWS_BASE_URL;
    await handler({ event: revertEvent, step });
    expect(putHomepageHtml).toHaveBeenCalled();
    expect(homepageUpdate).toHaveBeenLastCalledWith({
      where: { id: "h1" },
      data: expect.objectContaining({ status: "READY", preview_url: null, screenshot_url: null }),
    });
  });

  it("version belonging to another homepage: terminal (NonRetriable) FAILED, nothing published", async () => {
    versionFindUnique.mockResolvedValue({ id: "ver9", homepage_id: "OTHER", html: "<html>x</html>" });
    await runExpectingTerminal({ event: revertEvent, step });
    expect(putHomepageHtml).not.toHaveBeenCalled();
    expect(statuses()).toEqual(["RUNNING", "FAILED"]);
  });

  it("missing version: terminal (NonRetriable) FAILED", async () => {
    versionFindUnique.mockResolvedValue(null);
    await runExpectingTerminal({ event: revertEvent, step });
    expect(renderAndScreenshot).not.toHaveBeenCalled();
    expect(statuses()).toEqual(["RUNNING", "FAILED"]);
  });

  it("render error: retriable, left RUNNING for the retry, live keys untouched", async () => {
    (renderAndScreenshot as jest.Mock).mockRejectedValue(new Error("chromium crashed"));
    const err = await runExpectingRetriable({ event: revertEvent, step });
    expect(err.message).toContain("chromium crashed");
    expect(putHomepageHtml).not.toHaveBeenCalled();
    // Only RUNNING in-body; onFailure records FAILED after retries run out.
    expect(statuses()).toEqual(["RUNNING"]);
  });

  it("loads the homepage with the soft-delete filter", async () => {
    await handler({ event: revertEvent, step });
    expect(prismadb.crm_Target_Homepage.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "h1", deletedAt: null } }),
    );
  });

  it("missing homepage row: no crash, nothing rendered", async () => {
    (prismadb.crm_Target_Homepage.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(handler({ event: revertEvent, step })).resolves.toEqual({ skipped: "no homepage row" });
    expect(renderAndScreenshot).not.toHaveBeenCalled();
  });
});

describe("upload event", () => {
  const uploadEvent = {
    name: "homepage/target.upload",
    data: { homepageId: "h1", targetId: "t1", slug: "acme-plumbing", triggeredBy: "u1" },
  };
  const UPLOADED = "<html>uploaded</html>";
  const hp = { ...homepage, current_version_id: "ver2", logo_data_uri: null };

  beforeEach(() => {
    (prismadb.crm_Target_Homepage.findUnique as jest.Mock).mockResolvedValue(hp);
    (getHomepageUpload as jest.Mock).mockResolvedValue(UPLOADED);
    (deleteHomepageUpload as jest.Mock).mockResolvedValue(undefined);
  });

  it("renders the uploaded html, publishes, records an UPLOAD version, repoints + READY, cleans up", async () => {
    const out = await handler({ event: uploadEvent, step });
    expect(out).toEqual({ ready: true });
    expect(getHomepageUpload).toHaveBeenCalledWith("acme-plumbing");
    // Same allowlisted render path as every other flow.
    expect(renderAndScreenshot).toHaveBeenCalledWith(UPLOADED, { slug: "acme-plumbing" });
    expect(putHomepageHtml).toHaveBeenCalledWith("acme-plumbing", UPLOADED);
    expect(putHomepageScreenshot).toHaveBeenCalledWith("acme-plumbing", Buffer.from("PNGDATA"));
    expect(versionCreate).toHaveBeenCalledWith({
      data: {
        homepage_id: "h1",
        html: UPLOADED,
        prompt: null,
        agent_critique: null,
        pass_kind: "UPLOAD",
        created_by: "u1",
      },
      select: { id: true },
    });
    expect(statuses()).toEqual(["RUNNING", "READY"]);
    expect(homepageUpdate).toHaveBeenLastCalledWith({
      where: { id: "h1" },
      data: {
        status: "READY",
        current_version_id: "ver1",
        preview_url: "https://previews.example.com/p/acme-plumbing",
        screenshot_url: "https://previews.example.com/p/acme-plumbing/screenshot.png",
        error: null,
      },
    });
    expect(deleteHomepageUpload).toHaveBeenCalledWith("acme-plumbing");
    expect(generateHomepage).not.toHaveBeenCalled();
  });

  it("keeps base64 data and the uploaded html out of every step return value", async () => {
    const outputs: unknown[] = [];
    const recording = {
      run: async (_n: string, f: () => unknown) => {
        const out = await f();
        outputs.push(out);
        return out;
      },
    };
    await handler({ event: uploadEvent, step: recording });
    const serialized = JSON.stringify(outputs);
    expect(serialized).not.toContain(PNG_B64);
    expect(serialized).not.toContain("uploaded");
    expect(outputs).toContain("ver1");
  });

  it("no upload blob: terminal (NonRetriable) FAILED, nothing rendered or published", async () => {
    (getHomepageUpload as jest.Mock).mockResolvedValue(null);
    await runExpectingTerminal({ event: uploadEvent, step });
    expect(renderAndScreenshot).not.toHaveBeenCalled();
    expect(putHomepageHtml).not.toHaveBeenCalled();
    expect(versionCreate).not.toHaveBeenCalled();
    expect(statuses()).toEqual(["RUNNING", "FAILED"]);
  });

  it("render error: retriable, live keys and versions untouched, upload blob kept for retry", async () => {
    (renderAndScreenshot as jest.Mock).mockRejectedValue(new Error("chromium crashed"));
    const err = await runExpectingRetriable({ event: uploadEvent, step });
    expect(err.message).toContain("chromium crashed");
    expect(putHomepageHtml).not.toHaveBeenCalled();
    expect(versionCreate).not.toHaveBeenCalled();
    // Only RUNNING in-body; onFailure records FAILED after retries run out.
    expect(statuses()).toEqual(["RUNNING"]);
    // The upload action keeps the blob on failure, so a retry can reuse it.
    expect(deleteHomepageUpload).not.toHaveBeenCalled();
  });

  it("cleanup failure is best-effort: still READY", async () => {
    (deleteHomepageUpload as jest.Mock).mockRejectedValue(new Error("r2 down"));
    await expect(handler({ event: uploadEvent, step })).resolves.toEqual({ ready: true });
    expect(statuses()).toEqual(["RUNNING", "READY"]);
  });

  it("loads the homepage with the soft-delete filter", async () => {
    await handler({ event: uploadEvent, step });
    expect(prismadb.crm_Target_Homepage.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "h1", deletedAt: null } }),
    );
  });

  it("missing homepage row: skipped, nothing read or rendered", async () => {
    (prismadb.crm_Target_Homepage.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(handler({ event: uploadEvent, step })).resolves.toEqual({ skipped: "no homepage row" });
    expect(getHomepageUpload).not.toHaveBeenCalled();
    expect(renderAndScreenshot).not.toHaveBeenCalled();
  });
});
