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
  homepageShotKey: (slug: string) => `previews/${slug}/screenshot.png`,
}));

import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { getApiKey } from "@/lib/api-keys";
import { harvestSource } from "@/lib/homepage/harvest-source";
import { generateHomepage } from "@/lib/homepage/provider";
import { renderAndScreenshot } from "@/lib/homepage/render";
import { putHomepageHtml, putHomepageScreenshot } from "@/lib/homepage/storage";
import { AUTO_PASSES, onGenerateHomepageFailure } from "../generate-homepage";

// createFunction is called once at module load — capture config + handler.
const createFunctionMock = inngest.createFunction as jest.Mock;
const config = createFunctionMock.mock.calls[0][0] as {
  id: string;
  triggers: { event: string }[];
  retries: number;
  concurrency: { key: string; limit: number };
  onFailure: unknown;
};
const handler = createFunctionMock.mock.results[0].value as (ctx: {
  event: { name: string; data: Record<string, unknown> };
  step: { run: (name: string, fn: () => unknown) => Promise<unknown> };
}) => Promise<unknown>;

const step = { run: (_n: string, f: () => unknown) => Promise.resolve().then(f) };

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
    screenshotB64: "SRC_SHOT",
    brand: { logoUrl: null, colors: ["#123456"], fonts: ["Inter"], copy: "We fix pipes" },
  });
  let n = 0;
  (generateHomepage as jest.Mock).mockImplementation(async () => ({
    html: `<html>v${++n}</html>`,
    critique: `critique ${n}`,
  }));
  (renderAndScreenshot as jest.Mock).mockResolvedValue(Buffer.from("PNGDATA"));
  let v = 0;
  versionCreate.mockImplementation(async () => ({ id: `ver${++v}` }));
  homepageUpdate.mockResolvedValue({});
});

describe("generate-homepage function config", () => {
  it("handles both events with bounded retries", () => {
    expect(config.id).toBe("generate-homepage");
    expect(config.triggers.map((t) => t.event).sort()).toEqual([
      "homepage/target.generate",
      "homepage/target.refine",
    ]);
    expect(config.retries).toBeLessThanOrEqual(2);
  });
  it("serializes runs per target (concurrency limit 1 keyed on targetId)", () => {
    expect(config.concurrency).toEqual({ key: "event.data.targetId", limit: 1 });
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
      where: { id: "h1" },
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
    expect(first).toMatchObject({ apiKey: "sk-test", sourceScreenshotB64: "SRC_SHOT" });
    expect(first.previousHtml).toBeUndefined();
    expect(first.brief).toContain("Acme Plumbing");
    expect(first.brief).toContain("#123456");
    expect(first.prompt).toContain("Make it bold");
    // later passes are seeded with previous html + the rendered screenshot
    const second = (generateHomepage as jest.Mock).mock.calls[1][0];
    expect(second.previousHtml).toBe("<html>v1</html>");
    expect(second.refinedScreenshotB64).toBe(Buffer.from("PNGDATA").toString("base64"));
    expect(second.sourceScreenshotB64).toBe("SRC_SHOT");

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
  });

  it("no company_website: harvest yields null, still READY", async () => {
    (prismadb.crm_Targets.findUnique as jest.Mock).mockResolvedValue({ ...target, company_website: null });
    (harvestSource as jest.Mock).mockResolvedValue(null);
    await handler({ event: generateEvent, step });

    expect((generateHomepage as jest.Mock).mock.calls[0][0].sourceScreenshotB64).toBeUndefined();
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
    await handler({ event: generateEvent, step });
    expect(generateHomepage).not.toHaveBeenCalled();
    const last = homepageUpdate.mock.calls.at(-1)![0];
    expect(last.data.status).toBe("FAILED");
    expect(last.data.error).toMatch(/^NO_API_KEY/);
  });

  it("render error: FAILED, never left RUNNING", async () => {
    (renderAndScreenshot as jest.Mock).mockRejectedValue(new Error("chromium exploded"));
    await handler({ event: generateEvent, step });
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
    await handler({ event: generateEvent, step });
    const last = homepageUpdate.mock.calls.at(-1)![0];
    expect(last.data.status).toBe("FAILED");
    expect(last.data.error).toContain("529");
  });

  it("storage error: FAILED", async () => {
    (putHomepageHtml as jest.Mock).mockRejectedValue(new Error("R2 down"));
    await handler({ event: generateEvent, step });
    expect(homepageUpdate.mock.calls.at(-1)![0].data.status).toBe("FAILED");
  });

  it("a hung provider call is bounded by a timeout and ends FAILED", async () => {
    jest.useFakeTimers();
    try {
      (generateHomepage as jest.Mock).mockReset().mockReturnValue(new Promise(() => {}));
      const p = handler({ event: generateEvent, step });
      await jest.advanceTimersByTimeAsync(121_000);
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
  });

  it("no current version: FAILED", async () => {
    (prismadb.crm_Target_Homepage.findUnique as jest.Mock).mockResolvedValue({
      ...homepage,
      current_version_id: null,
    });
    await handler({ event: refineEvent, step });
    expect(generateHomepage).not.toHaveBeenCalled();
    expect(homepageUpdate.mock.calls.at(-1)![0].data.status).toBe("FAILED");
  });

  it("provider error: FAILED, not RUNNING", async () => {
    (generateHomepage as jest.Mock).mockReset().mockRejectedValue(new Error("boom"));
    await handler({ event: refineEvent, step });
    expect(homepageUpdate.mock.calls.at(-1)![0].data.status).toBe("FAILED");
  });
});
