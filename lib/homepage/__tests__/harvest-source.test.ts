const assertPublicHost = jest.fn();
jest.mock("@/lib/net/host-guard", () => ({
  assertPublicHost: (...a: unknown[]) => assertPublicHost(...a),
}));

const evaluate = jest.fn();
const screenshot = jest.fn();
const goto = jest.fn();
const route = jest.fn();
const browserClose = jest.fn();
const newContext = jest.fn();
const setDefaultTimeout = jest.fn();
const launch = jest.fn();
const logoGet = jest.fn();

jest.mock("playwright-core", () => ({ chromium: { launch: (...a: unknown[]) => launch(...a) } }));
jest.mock("@sparticuz/chromium", () => ({
  __esModule: true,
  default: { args: [], executablePath: async () => "/tmp/c" },
}));

import { harvestSource } from "@/lib/homepage/harvest-source";

beforeEach(() => {
  jest.clearAllMocks();
  assertPublicHost.mockResolvedValue({ address: "93.184.216.34", hostname: "acme.example" });
  evaluate.mockResolvedValue({
    logoUrl: "https://x/logo.png",
    colors: ["#123"],
    fonts: ["Inter"],
    copy: "We do plumbing",
  });
  screenshot.mockResolvedValue(Buffer.from("IMG"));
  goto.mockResolvedValue(undefined);
  route.mockResolvedValue(undefined);
  browserClose.mockResolvedValue(undefined);
  logoGet.mockResolvedValue({
    ok: () => true,
    headers: () => ({ "content-type": "image/png" }),
    body: async () => Buffer.from("LOGOBYTES"),
  });
  newContext.mockResolvedValue({
    route,
    setDefaultTimeout,
    newPage: jest.fn().mockResolvedValue({ goto, evaluate, screenshot, request: { get: logoGet } }),
  });
  launch.mockResolvedValue({ newContext, close: browserClose });
});

describe("harvestSource", () => {
  it.each([null, undefined, "", "   "])("returns null for blank url %p without launching", async (v) => {
    expect(await harvestSource(v as string | null | undefined)).toBeNull();
    expect(assertPublicHost).not.toHaveBeenCalled();
    expect(launch).not.toHaveBeenCalled();
    expect(goto).not.toHaveBeenCalled();
  });

  it("returns null (no launch, no navigation) when the SSRF guard rejects the host", async () => {
    assertPublicHost.mockRejectedValue(new Error("blocked"));
    expect(await harvestSource("http://169.254.169.254/")).toBeNull();
    expect(assertPublicHost).toHaveBeenCalledWith("169.254.169.254");
    expect(launch).not.toHaveBeenCalled();
    expect(goto).not.toHaveBeenCalled();
  });

  it("returns null for non-http(s) schemes without consulting the network", async () => {
    expect(await harvestSource("file:///etc/passwd")).toBeNull();
    expect(await harvestSource("ftp://acme.example")).toBeNull();
    expect(launch).not.toHaveBeenCalled();
    expect(goto).not.toHaveBeenCalled();
  });

  it("returns null for an unparseable url", async () => {
    expect(await harvestSource("http://")).toBeNull();
    expect(launch).not.toHaveBeenCalled();
  });

  it("runs the guard before launching or navigating", async () => {
    // No logo here so the (separate) logo-host guard call doesn't muddy the order.
    evaluate.mockResolvedValue({ logoUrl: null, colors: [], fonts: [], copy: "x" });
    const order: string[] = [];
    assertPublicHost.mockImplementation(async () => {
      order.push("guard");
      return { address: "1.2.3.4", hostname: "acme.example" };
    });
    launch.mockImplementation(async () => {
      order.push("launch");
      return { newContext, close: browserClose };
    });
    goto.mockImplementation(async () => {
      order.push("goto");
    });
    await harvestSource("https://acme.example");
    expect(order).toEqual(["guard", "launch", "goto"]);
  });

  it("inlines the logo as a data: URI (re-validating the logo host with the SSRF guard) — F3", async () => {
    const out = await harvestSource("https://acme.example");
    // logo host re-validated before fetch, then fetched via page.request (bypasses CORS)
    expect(assertPublicHost).toHaveBeenCalledWith("x");
    expect(logoGet).toHaveBeenCalledWith("https://x/logo.png", expect.objectContaining({ timeout: expect.any(Number) }));
    expect(out?.brand.logoDataUri).toBe(`data:image/png;base64,${Buffer.from("LOGOBYTES").toString("base64")}`);
  });

  it("skips the logo (null data URI) when its host fails the SSRF guard", async () => {
    // First call (page host) passes; second call (logo host) rejects.
    assertPublicHost.mockResolvedValueOnce({ address: "1.2.3.4", hostname: "acme.example" });
    assertPublicHost.mockRejectedValueOnce(new Error("blocked"));
    const out = await harvestSource("https://acme.example");
    expect(out).not.toBeNull();
    expect(logoGet).not.toHaveBeenCalled();
    expect(out?.brand.logoDataUri).toBeNull();
  });

  it("skips a logo larger than the cap, and a non-image response", async () => {
    logoGet.mockResolvedValueOnce({
      ok: () => true,
      headers: () => ({ "content-type": "image/png" }),
      body: async () => Buffer.alloc(200 * 1024, 1), // > 128 KB cap
    });
    expect((await harvestSource("https://acme.example"))?.brand.logoDataUri).toBeNull();
    logoGet.mockResolvedValueOnce({
      ok: () => true,
      headers: () => ({ "content-type": "text/html" }),
      body: async () => Buffer.from("<html>"),
    });
    expect((await harvestSource("https://acme.example"))?.brand.logoDataUri).toBeNull();
  });

  it("harvests screenshot + brand for a safe url, with downloads disabled and a nav timeout", async () => {
    const out = await harvestSource("https://acme.example");
    expect(out?.brand.copy).toContain("plumbing");
    expect(out?.brand.logoUrl).toBe("https://x/logo.png");
    expect(out?.screenshotB64).toBe(Buffer.from("IMG").toString("base64"));
    expect(newContext).toHaveBeenCalledWith(expect.objectContaining({ acceptDownloads: false }));
    expect(goto).toHaveBeenCalledWith(
      "https://acme.example/",
      expect.objectContaining({ waitUntil: "domcontentloaded", timeout: expect.any(Number) }),
    );
    expect(browserClose).toHaveBeenCalled();
  });

  it("caps copy at 2000 chars", async () => {
    evaluate.mockResolvedValue({ logoUrl: null, colors: [], fonts: [], copy: "a".repeat(5000) });
    const out = await harvestSource("https://acme.example");
    expect(out?.brand.copy.length).toBe(2000);
  });

  it("returns null and still closes the browser when navigation fails", async () => {
    goto.mockRejectedValue(new Error("net::ERR_NAME_NOT_RESOLVED"));
    expect(await harvestSource("https://acme.example")).toBeNull();
    expect(browserClose).toHaveBeenCalled();
  });

  it("returns null when the browser fails to launch", async () => {
    launch.mockRejectedValue(new Error("no chromium"));
    expect(await harvestSource("https://acme.example")).toBeNull();
  });

  describe("hosted-env fail-safe", () => {
    const saved = { ...process.env };
    afterEach(() => {
      process.env = { ...saved };
    });

    it.each(["production", "preview"])(
      "refuses (null, no launch/goto) when MAIL_ALLOW_PRIVATE_HOSTS=true and VERCEL_ENV=%s",
      async (env) => {
        process.env.MAIL_ALLOW_PRIVATE_HOSTS = "true";
        process.env.VERCEL_ENV = env;
        const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
        expect(await harvestSource("https://acme.example")).toBeNull();
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("[HARVEST_SOURCE] refused"));
        expect(assertPublicHost).not.toHaveBeenCalled();
        expect(launch).not.toHaveBeenCalled();
        expect(goto).not.toHaveBeenCalled();
        warn.mockRestore();
      },
    );

    it("still harvests locally when the flag is set and VERCEL_ENV is unset", async () => {
      process.env.MAIL_ALLOW_PRIVATE_HOSTS = "true";
      delete process.env.VERCEL_ENV;
      const out = await harvestSource("https://acme.example");
      expect(out).not.toBeNull();
      expect(goto).toHaveBeenCalled();
    });
  });

  it("bounds page operations with a default timeout", async () => {
    await harvestSource("https://acme.example");
    expect(setDefaultTimeout).toHaveBeenCalledWith(15000);
  });

  describe("per-request guard (redirects / subresources)", () => {
    async function getHandler() {
      await harvestSource("https://acme.example");
      expect(route).toHaveBeenCalledWith("**/*", expect.any(Function));
      return route.mock.calls[0][1] as (r: unknown) => Promise<void>;
    }
    const mkRoute = (url: string) => ({
      request: () => ({ url: () => url }),
      continue: jest.fn().mockResolvedValue(undefined),
      abort: jest.fn().mockResolvedValue(undefined),
    });

    it("continues requests to public hosts", async () => {
      const handler = await getHandler();
      const r = mkRoute("https://cdn.example/a.png");
      await handler(r);
      expect(r.continue).toHaveBeenCalled();
      expect(r.abort).not.toHaveBeenCalled();
    });

    it("aborts requests (e.g. a redirect) to hosts the guard rejects", async () => {
      const handler = await getHandler();
      assertPublicHost.mockRejectedValue(new Error("blocked"));
      const r = mkRoute("http://169.254.169.254/latest/meta-data");
      await handler(r);
      expect(r.abort).toHaveBeenCalled();
      expect(r.continue).not.toHaveBeenCalled();
    });

    it("does not throw if continue/abort reject (page closed mid-flight)", async () => {
      const handler = await getHandler();
      const r = mkRoute("https://cdn.example/a.png");
      r.continue.mockRejectedValue(new Error("Target closed"));
      await expect(handler(r)).resolves.toBeUndefined();
    });

    it("aborts non-http(s) requests", async () => {
      const handler = await getHandler();
      const r = mkRoute("file:///etc/passwd");
      await handler(r);
      expect(r.abort).toHaveBeenCalled();
    });
  });
});
