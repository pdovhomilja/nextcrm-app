import { generateWithFallback, resolveImageProviders } from "@/lib/homepage/images/resolve";
import type { ImageProvider, ImageSpec } from "@/lib/homepage/images/types";

const fake = (name: string, configured: boolean, impl: () => Promise<Buffer>): ImageProvider => ({
  name,
  isConfigured: () => configured,
  generateImage: impl,
});

const spec: ImageSpec = {
  token: "x",
  role: "hero" as const,
  prompt: "p",
  alt: "a",
  aspectRatio: "16:9" as const,
};

describe("resolveImageProviders", () => {
  it("auto order is higgsfield then openai", () => {
    expect(resolveImageProviders({ provider: "auto", model: "soul-v2" }).map((p) => p.name)).toEqual([
      "higgsfield",
      "openai",
    ]);
  });

  it("pinned provider yields only that one", () => {
    expect(resolveImageProviders({ provider: "openai", model: "soul-v2" }).map((p) => p.name)).toEqual(["openai"]);
  });

  it("higgsfield pinned", () => {
    expect(resolveImageProviders({ provider: "higgsfield", model: "soul-v2" }).map((p) => p.name)).toEqual([
      "higgsfield",
    ]);
  });
});

describe("generateWithFallback", () => {
  it("uses first configured success", async () => {
    const hg = fake("higgsfield", true, async () => Buffer.from("HG"));
    const oa = fake("openai", true, async () => Buffer.from("OA"));
    expect((await generateWithFallback(spec, [hg, oa]))!.toString()).toBe("HG");
  });

  it("skips unconfigured, falls to next", async () => {
    const hg = fake("higgsfield", false, async () => {
      throw new Error("no");
    });
    const oa = fake("openai", true, async () => Buffer.from("OA"));
    expect((await generateWithFallback(spec, [hg, oa]))!.toString()).toBe("OA");
  });

  it("skips a throwing provider, falls to next", async () => {
    const hg = fake("higgsfield", true, async () => {
      throw new Error("boom");
    });
    const oa = fake("openai", true, async () => Buffer.from("OA"));
    expect((await generateWithFallback(spec, [hg, oa]))!.toString()).toBe("OA");
  });

  it("returns null when none configured/succeed", async () => {
    const hg = fake("higgsfield", false, async () => Buffer.from("x"));
    expect(await generateWithFallback(spec, [hg])).toBeNull();
  });
});
