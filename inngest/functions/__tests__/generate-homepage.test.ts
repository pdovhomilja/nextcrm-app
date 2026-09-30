jest.mock("@/inngest/client", () => ({
  inngest: { createFunction: jest.fn((_config: unknown, handler: unknown) => handler) },
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Targets: { findUnique: jest.fn() },
    crm_Target_Homepage: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    crm_Target_Homepage_Version: { create: jest.fn(), findUnique: jest.fn() },
  },
}));
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
  homepageShotKey: (slug: string) => `previews/${slug}/screenshot.png`,
}));

import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { getApiKey } from "@/lib/api-keys";
import { harvestSource } from "@/lib/homepage/harvest-source";
import { generateHomepage } from "@/lib/homepage/provider";
import { renderAndScreenshot } from "@/lib/homepage/render";
import {
  putHomepageHtml,
  putHomepageScreenshot,
  putHomepageTmpSource,
  getHomepageTmpSource,
  deleteHomepageTmpSource,
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

// Failure flows now log the error and throw NonRetriableError (so Inngest marks
// the run FAILED and the dashboard shows red) AFTER persisting FAILED to the row.
// Silence the expected log noise and give tests a helper that runs a flow expected
// to fail: it ASSERTS the run threw NonRetriableError (not swallow), so a fix that
// stops throwing — or throws the wrong error — fails the test. The handler has
// fully run by the time it rejects, so the post-failure DB assertions still hold.
beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
});
const runExpectingFailure = async (
  ctx: { event: { name: string; data: Record<string, unknown> }; step: { run: (n: string, f: () => unknown) => Promise<unknown> } },
) => {
  await expect(handler(ctx)).rejects.toBeInstanceOf(NonRetriableError);
};

describe("generate-homepage function config", () => {
  it("handles both events with bounded retries", () => {
    expect(config.id).toBe("generate-homepage");
    expect(config.triggers.map((t) => t.event).sort()).toEqual([
      "homepage/target.generate",
      "homepage/target.refine",
      "homepage/target.revert",
    ]);
    expect(config.retries).toBeLessThanOrEqual(2);
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

  it("failure still FAILED and cleans up the transient source screenshot; cleanup errors never mask it", async () => {
    (deleteHomepageTmpSource as jest.Mock).mockRejectedValue(new Error("r2 delete down"));
    (renderAndScreenshot as jest.Mock).mockRejectedValue(new Error("chromium exploded"));
    await runExpectingFailure({ event: generateEvent, step });
    expect(deleteHomepageTmpSource).toHaveBeenCalledWith("acme-plumbing");
    const last = homepageUpdate.mock.calls.at(-1)![0];
    expect(last.data.status).toBe("FAILED");
    expect(last.data.error).toContain("chromium exploded");
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

  it("no Anthropic key: FAILED with NO_API_KEY, no provider call", async () => {
    (getApiKey as jest.Mock).mockResolvedValue(null);
    await runExpectingFailure({ event: generateEvent, step });
    expect(generateHomepage).not.toHaveBeenCalled();
    const last = homepageUpdate.mock.calls.at(-1)![0];
    expect(last.data.status).toBe("FAILED");
    expect(last.data.error).toMatch(/^NO_API_KEY/);
  });

  it("render error: FAILED, never left RUNNING", async () => {
    (renderAndScreenshot as jest.Mock).mockRejectedValue(new Error("chromium exploded"));
    await runExpectingFailure({ event: generateEvent, step });
    const last = homepageUpdate.mock.calls.at(-1)![0];
    expect(last.data.status).toBe("FAILED");
    expect(last.data.error).toContain("chromium exploded");
    expect(putHomepageHtml).not.toHaveBeenCalled();
  });

  it("provider error mid-loop: FAILED", async () => {
    (generateHomepage as jest.Mock)
      .mockReset()
      .mockResolvedValueOnce({ html: "<html>ok</html>", critique: "c" })
      .mockRejectedValue(new Error("Anthropic request failed (529)"));
    await runExpectingFailure({ event: generateEvent, step });
    const last = homepageUpdate.mock.calls.at(-1)![0];
    expect(last.data.status).toBe("FAILED");
    expect(last.data.error).toContain("529");
  });

  it("storage error: FAILED", async () => {
    (putHomepageHtml as jest.Mock).mockRejectedValue(new Error("R2 down"));
    await runExpectingFailure({ event: generateEvent, step });
    expect(homepageUpdate.mock.calls.at(-1)![0].data.status).toBe("FAILED");
  });

  it("a hung provider call is bounded by a timeout and ends FAILED", async () => {
    jest.useFakeTimers();
    try {
      (generateHomepage as jest.Mock).mockReset().mockReturnValue(new Promise(() => {}));
      const p = handler({ event: generateEvent, step }).catch(() => {});
      await jest.advanceTimersByTimeAsync(241_000);
      await p;
      const last = homepageUpdate.mock.calls.at(-1)![0];
      expect(last.data.status).toBe("FAILED");
      expect(last.data.error).toMatch(/timed out/i);
    } finally {
      jest.useRealTimers();
    }
  });

  it("missing homepage row: no crash, nothing generated", async () => {
    (prismadb.crm_Target_Homepage.findUnique as jest.Mock).mockResolvedValue(null);
    await handler({ event: generateEvent, step });
    expect(generateHomepage).not.toHaveBeenCalled();
  });

  it("surfaces the failure to Inngest (throws NonRetriableError) AFTER persisting FAILED, so the run shows red", async () => {
    (renderAndScreenshot as jest.Mock).mockRejectedValue(new Error("chromium exploded"));
    const err = await handler({ event: generateEvent, step }).catch((e) => e);
    expect(err).toBeInstanceOf(NonRetriableError);
    expect((err as Error).message).toMatch(/chromium exploded/);
    expect(homepageUpdate.mock.calls.at(-1)![0].data.status).toBe("FAILED");
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

  it("loads the homepage with the soft-delete filter", async () => {
    await handler({ event: refineEvent, step });
    expect(prismadb.crm_Target_Homepage.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "h1", deletedAt: null } }),
    );
  });

  it("no current version: FAILED", async () => {
    (prismadb.crm_Target_Homepage.findUnique as jest.Mock).mockResolvedValue({
      ...homepage,
      current_version_id: null,
    });
    await runExpectingFailure({ event: refineEvent, step });
    expect(generateHomepage).not.toHaveBeenCalled();
    expect(homepageUpdate.mock.calls.at(-1)![0].data.status).toBe("FAILED");
  });

  it("provider error: FAILED, not RUNNING", async () => {
    (generateHomepage as jest.Mock).mockReset().mockRejectedValue(new Error("boom"));
    await runExpectingFailure({ event: refineEvent, step });
    expect(homepageUpdate.mock.calls.at(-1)![0].data.status).toBe("FAILED");
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

  it("version belonging to another homepage: FAILED, nothing published", async () => {
    versionFindUnique.mockResolvedValue({ id: "ver9", homepage_id: "OTHER", html: "<html>x</html>" });
    await runExpectingFailure({ event: revertEvent, step });
    expect(putHomepageHtml).not.toHaveBeenCalled();
    expect(statuses()).toEqual(["RUNNING", "FAILED"]);
  });

  it("missing version: FAILED", async () => {
    versionFindUnique.mockResolvedValue(null);
    await runExpectingFailure({ event: revertEvent, step });
    expect(renderAndScreenshot).not.toHaveBeenCalled();
    expect(statuses()).toEqual(["RUNNING", "FAILED"]);
  });

  it("render error: FAILED, never left RUNNING, live keys untouched", async () => {
    (renderAndScreenshot as jest.Mock).mockRejectedValue(new Error("chromium crashed"));
    await runExpectingFailure({ event: revertEvent, step });
    expect(putHomepageHtml).not.toHaveBeenCalled();
    expect(statuses()).toEqual(["RUNNING", "FAILED"]);
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
