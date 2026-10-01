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
jest.mock("@/lib/api-keys", () => ({ getApiKey: jest.fn() }));
jest.mock("@/lib/homepage/harvest-source", () => ({ harvestSource: jest.fn() }));
jest.mock("@/lib/homepage/provider", () => ({ generateHomepage: jest.fn() }));
jest.mock("@/lib/homepage/render", () => ({ renderAndScreenshot: jest.fn() }));
jest.mock("@/lib/homepage/storage", () => ({
  putHomepageHtml: jest.fn(),
  putHomepageScreenshot: jest.fn(),
  putHomepageTmpSource: jest.fn(),
  getHomepageTmpSource: jest.fn(),
  deleteHomepageTmpSource: jest.fn(),
  getHomepageUpload: jest.fn(),
  deleteHomepageUpload: jest.fn(),
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
  putHomepageHtml,
  putHomepageScreenshot,
  putHomepageTmpSource,
  getHomepageTmpSource,
  deleteHomepageTmpSource,
  getHomepageUpload,
  deleteHomepageUpload,
} from "@/lib/homepage/storage";
import { NonRetriableError } from "inngest";
import { AUTO_PASSES, onGenerateHomepageFailure } from "../generate-homepage";

// createFunction is called once at module load — capture config + handler.
const createFunctionMock = inngest.createFunction as jest.Mock;
const config = createFunctionMock.mock.calls[0][0] as {
  id: string;
  triggers: { event: string }[];
  retries: number;
  concurrency: { key?: string; limit: number }[];
  onFailure: unknown;
};
const handler = createFunctionMock.mock.results[0].value as (ctx: {
  event: { name: string; data: Record<string, unknown> };
  step: { run: (name: string, fn: () => unknown) => Promise<unknown> };
}) => Promise<unknown>;

const step = { run: (_n: string, f: () => unknown) => Promise.resolve().then(f) };

const SRC_B64 = Buffer.from("SRC_SHOT").toString("base64");
const PNG_B64 = Buffer.from("PNGDATA").toString("base64");

const homepageUpdate = prismadb.crm_Target_Homepage.update as jest.Mock;
const homepageUpdateMany = prismadb.crm_Target_Homepage.updateMany as jest.Mock;
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
  });
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
  it("registers the onFailure backstop", () => {
    expect(config.onFailure).toBe(onGenerateHomepageFailure);
  });
  it("bounds auto passes to 3", () => {
    expect(AUTO_PASSES).toBe(3);
  });
});

describe("onFailure backstop", () => {
  const failed = (data: Record<string, unknown>) => ({
    data: { function_id: "generate-homepage", run_id: "r1", event: { name: "x", data } },
  });

  it("generate (targetId): marks that target's PENDING/RUNNING homepage FAILED", async () => {
    homepageUpdateMany.mockResolvedValue({ count: 1 });
    await onGenerateHomepageFailure({ event: failed({ targetId: "t1" }) });
    expect(homepageUpdateMany).toHaveBeenCalledWith({
      where: { targetId: "t1", status: { in: ["PENDING", "RUNNING"] } },
      data: { status: "FAILED", error: expect.stringContaining("onFailure backstop") },
    });
  });

  it("refine (homepageId): marks that homepage FAILED", async () => {
    homepageUpdateMany.mockResolvedValue({ count: 1 });
    await onGenerateHomepageFailure({ event: failed({ homepageId: "h1", targetId: "t1" }) });
    expect(homepageUpdateMany).toHaveBeenCalledWith({
      where: { id: "h1", status: { in: ["PENDING", "RUNNING"] } },
      data: { status: "FAILED", error: expect.stringContaining("onFailure backstop") },
    });
  });

  it("never throws (DB error swallowed) and no-ops without ids", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    homepageUpdateMany.mockRejectedValue(new Error("db down"));
    await expect(onGenerateHomepageFailure({ event: failed({ targetId: "t1" }) })).resolves.toBeUndefined();
    homepageUpdateMany.mockClear();
    await onGenerateHomepageFailure({ event: failed({}) });
    expect(homepageUpdateMany).not.toHaveBeenCalled();
    spy.mockRestore();
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

  it("re-renders the version html, republishes to the live keys, repoints current_version_id, READY", async () => {
    const out = await handler({ event: revertEvent, step });
    expect(out).toEqual({ ready: true });
    expect(renderAndScreenshot).toHaveBeenCalledWith("<html>old</html>");
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

  it("onFailure backstop marks the homepage FAILED for a revert event (carries homepageId)", async () => {
    homepageUpdateMany.mockResolvedValue({ count: 1 });
    await onGenerateHomepageFailure({
      event: { data: { function_id: "generate-homepage", run_id: "r1", event: revertEvent } } as never,
    });
    expect(homepageUpdateMany).toHaveBeenCalledWith({
      where: { id: "h1", status: { in: ["PENDING", "RUNNING"] } },
      data: { status: "FAILED", error: expect.stringContaining("onFailure backstop") },
    });
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
    expect(renderAndScreenshot).toHaveBeenCalledWith(UPLOADED);
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

  it("onFailure backstop marks the homepage FAILED for an upload event (carries homepageId)", async () => {
    homepageUpdateMany.mockResolvedValue({ count: 1 });
    await onGenerateHomepageFailure({
      event: { data: { function_id: "generate-homepage", run_id: "r1", event: uploadEvent } } as never,
    });
    expect(homepageUpdateMany).toHaveBeenCalledWith({
      where: { id: "h1", status: { in: ["PENDING", "RUNNING"] } },
      data: { status: "FAILED", error: expect.stringContaining("onFailure backstop") },
    });
  });
});
