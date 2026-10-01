import { generateWithFallback, resolveImageProviders } from "@/lib/homepage/images/resolve";
import type { ImageProvider, ImageSpec } from "@/lib/homepage/images/types";

const fake = (name: string, configured: boolean, impl: () => Promise<Buffer>): ImageProvider => ({
  name,
  isConfigured: () => configured,
  generateImage: jest.fn(impl),
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
    const result = await generateWithFallback(spec, [hg, oa]);
    expect(result!.toString()).toBe("HG");
    // Second provider should not be called when first succeeds (short-circuit)
    expect(oa.generateImage).not.toHaveBeenCalled();
  });

  it("skips unconfigured, falls to next", async () => {
    const hg = fake("higgsfield", false, async () => {
      throw new Error("no");
    });
    const oa = fake("openai", true, async () => Buffer.from("OA"));
    const result = await generateWithFallback(spec, [hg, oa]);
    expect(result!.toString()).toBe("OA");
    // Unconfigured provider should not have generateImage called at all
    expect(hg.generateImage).not.toHaveBeenCalled();
  });

  it("skips a throwing provider, falls to next", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    const hg = fake("higgsfield", true, async () => {
      throw new Error("boom");
    });
    const oa = fake("openai", true, async () => Buffer.from("OA"));
    const result = await generateWithFallback(spec, [hg, oa]);
    expect(result!.toString()).toBe("OA");
    expect(hg.generateImage).toHaveBeenCalledTimes(1);
    expect(oa.generateImage).toHaveBeenCalledTimes(1);
  });

  it("returns null when none configured/succeed", async () => {
    const hg = fake("higgsfield", false, async () => Buffer.from("x"));
    const result = await generateWithFallback(spec, [hg]);
    expect(result).toBeNull();
    expect(hg.generateImage).not.toHaveBeenCalled();
  });

  it("returns null when all configured providers throw", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    const hg = fake("higgsfield", true, async () => {
      throw new Error("boom1");
    });
    const oa = fake("openai", true, async () => {
      throw new Error("boom2");
    });
    const result = await generateWithFallback(spec, [hg, oa]);
    expect(result).toBeNull();
    expect(hg.generateImage).toHaveBeenCalledTimes(1);
    expect(oa.generateImage).toHaveBeenCalledTimes(1);
  });

  it("attempts providers in order (auto: higgsfield then openai)", async () => {
    const order: string[] = [];
    const hg = fake("higgsfield", true, async () => {
      order.push("higgsfield");
      throw new Error("hg fails");
    });
    const oa = fake("openai", true, async () => {
      order.push("openai");
      return Buffer.from("OA");
    });
    jest.spyOn(console, "warn").mockImplementation(() => {});
    await generateWithFallback(spec, [hg, oa]);
    expect(order).toEqual(["higgsfield", "openai"]);
  });
});
