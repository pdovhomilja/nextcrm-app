const mockScreenshot = jest.fn();
const mockSetContent = jest.fn();
const mockBrowserClose = jest.fn();
const mockNewPage = jest.fn();
const mockNewContext = jest.fn();
const mockRoute = jest.fn();
const mockRouteWebSocket = jest.fn();
const mockEvaluate = jest.fn();
const mockLaunch = jest.fn();
const mockExecutablePath = jest.fn();

jest.mock("playwright-core", () => ({ chromium: { launch: mockLaunch } }));
jest.mock("@sparticuz/chromium", () => ({
  __esModule: true,
  default: {
    args: ["--sparticuz-arg"],
    executablePath: mockExecutablePath,
  },
}));

import { renderAndScreenshot, finalizeAnimationsInPage } from "@/lib/homepage/render";

const ENV_KEYS = [
  "VERCEL",
  "AWS_LAMBDA_FUNCTION_NAME",
  "CHROMIUM_EXECUTABLE_PATH",
  "NEXT_PUBLIC_PREVIEWS_BASE_URL",
] as const;
const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  jest.clearAllMocks();
  for (const k of ENV_KEYS) {
    savedEnv[k] = process.env[k];
    delete process.env[k];
  }
  mockScreenshot.mockResolvedValue(Buffer.from("PNG"));
  mockSetContent.mockResolvedValue(undefined);
  mockBrowserClose.mockResolvedValue(undefined);
  mockRoute.mockResolvedValue(undefined);
  mockRouteWebSocket.mockResolvedValue(undefined);
  mockEvaluate.mockResolvedValue(undefined);
  mockNewPage.mockResolvedValue({
    setContent: mockSetContent,
    screenshot: mockScreenshot,
    evaluate: mockEvaluate,
  });
  mockNewContext.mockResolvedValue({
    route: mockRoute,
    routeWebSocket: mockRouteWebSocket,
    newPage: mockNewPage,
  });
  mockLaunch.mockResolvedValue({ newContext: mockNewContext, close: mockBrowserClose });
  mockExecutablePath.mockResolvedValue("/tmp/chromium");
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

it("launches, sets content, screenshots, and closes the browser", async () => {
  const png = await renderAndScreenshot("<h1>hi</h1>");
  expect(Buffer.isBuffer(png)).toBe(true);
  expect(png).toEqual(Buffer.from("PNG"));
  expect(mockNewContext).toHaveBeenCalledWith(
    expect.objectContaining({ viewport: { width: 1280, height: 900 } }),
  );
  expect(mockSetContent).toHaveBeenCalledWith(
    "<h1>hi</h1>",
    expect.objectContaining({ waitUntil: "load", timeout: 20000 }),
  );
  expect(mockScreenshot).toHaveBeenCalledWith({ fullPage: false });
  expect(mockBrowserClose).toHaveBeenCalledTimes(1);
});

it("egress: continues allowlisted requests and aborts everything else", async () => {
  await renderAndScreenshot("<h1>hi</h1>");
  expect(mockRoute).toHaveBeenCalledWith("**/*", expect.any(Function));
  type MockRoute = { request: () => { url: () => string }; continue: () => void; abort: () => void };
  const handler = mockRoute.mock.calls[0][1] as (r: MockRoute) => void;
  const makeRoute = (url: string) => ({
    request: () => ({ url: () => url }),
    continue: jest.fn(),
    abort: jest.fn(),
  });

  const allowed = makeRoute("https://fonts.googleapis.com/css2?family=Inter");
  handler(allowed);
  expect(allowed.continue).toHaveBeenCalledTimes(1);
  expect(allowed.abort).not.toHaveBeenCalled();

  const blocked = makeRoute("http://169.254.169.254/latest/meta-data/");
  handler(blocked);
  expect(blocked.abort).toHaveBeenCalledTimes(1);
  expect(blocked.continue).not.toHaveBeenCalled();
});

describe("egress: per-slug image allowance wiring", () => {
  type MockRoute = { request: () => { url: () => string }; continue: () => void; abort: () => void };
  const run = async (url: string, o?: { slug?: string }) => {
    await renderAndScreenshot("<p/>", o);
    const handler = mockRoute.mock.calls[0][1] as (r: MockRoute) => void;
    const r = { request: () => ({ url: () => url }), continue: jest.fn(), abort: jest.fn() };
    handler(r);
    return r;
  };
  const IMG = "https://previews.example.com/p/acme/images/img-1.png";

  it("allows this slug's images when slug + NEXT_PUBLIC_PREVIEWS_BASE_URL are set", async () => {
    process.env.NEXT_PUBLIC_PREVIEWS_BASE_URL = "https://previews.example.com";
    const r = await run(IMG, { slug: "acme" });
    expect(r.continue).toHaveBeenCalledTimes(1);
    expect(r.abort).not.toHaveBeenCalled();
  });

  it("still aborts another slug's images and other hosts", async () => {
    process.env.NEXT_PUBLIC_PREVIEWS_BASE_URL = "https://previews.example.com";
    const other = await run("https://previews.example.com/p/other/images/x.png", { slug: "acme" });
    expect(other.abort).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();
    mockLaunch.mockResolvedValue({ newContext: mockNewContext, close: mockBrowserClose });
    const evil = await run("https://evil.com/p/acme/images/x.png", { slug: "acme" });
    expect(evil.abort).toHaveBeenCalledTimes(1);
  });

  it("blocks images when no slug is given", async () => {
    process.env.NEXT_PUBLIC_PREVIEWS_BASE_URL = "https://previews.example.com";
    const r = await run(IMG);
    expect(r.abort).toHaveBeenCalledTimes(1);
  });

  it("blocks images when the base URL is unset or malformed (fail closed)", async () => {
    const unset = await run(IMG, { slug: "acme" });
    expect(unset.abort).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();
    mockLaunch.mockResolvedValue({ newContext: mockNewContext, close: mockBrowserClose });
    process.env.NEXT_PUBLIC_PREVIEWS_BASE_URL = "not a url";
    const bad = await run(IMG, { slug: "acme" });
    expect(bad.abort).toHaveBeenCalledTimes(1);
  });
});

it("finalizes animations after setContent and before the screenshot", async () => {
  const png = await renderAndScreenshot("<h1>hi</h1>");
  expect(mockEvaluate).toHaveBeenCalledTimes(1);
  expect(mockEvaluate).toHaveBeenCalledWith(finalizeAnimationsInPage);
  const setOrder = mockSetContent.mock.invocationCallOrder[0];
  const evalOrder = mockEvaluate.mock.invocationCallOrder[0];
  const shotOrder = mockScreenshot.mock.invocationCallOrder[0];
  expect(setOrder).toBeLessThan(evalOrder);
  expect(evalOrder).toBeLessThan(shotOrder);
  expect(png).toEqual(Buffer.from("PNG"));
});

it("a failing finalize evaluate does not prevent the screenshot", async () => {
  mockEvaluate.mockRejectedValue(new Error("page crashed"));
  const png = await renderAndScreenshot("<p/>");
  expect(png).toEqual(Buffer.from("PNG"));
});

it("blocks WebSocket egress via context.routeWebSocket", async () => {
  await renderAndScreenshot("<p/>");
  expect(mockRouteWebSocket).toHaveBeenCalledWith("**", expect.any(Function));
  const handler = mockRouteWebSocket.mock.calls[0][1] as (ws: { close: () => void }) => void;
  const ws = { close: jest.fn() };
  handler(ws);
  expect(ws.close).toHaveBeenCalledTimes(1);
});

it("still renders when the context has no routeWebSocket (older Playwright)", async () => {
  mockNewContext.mockResolvedValue({ route: mockRoute, newPage: mockNewPage });
  const png = await renderAndScreenshot("<p/>");
  expect(png).toEqual(Buffer.from("PNG"));
});

it("honours custom viewport dimensions", async () => {
  await renderAndScreenshot("<p/>", { width: 800, height: 600 });
  expect(mockNewContext).toHaveBeenCalledWith(
    expect.objectContaining({ viewport: { width: 800, height: 600 } }),
  );
});

it("uses @sparticuz chromium when running serverless (VERCEL)", async () => {
  process.env.VERCEL = "1";
  await renderAndScreenshot("<p/>");
  expect(mockLaunch).toHaveBeenCalledWith({
    args: ["--sparticuz-arg"],
    executablePath: "/tmp/chromium",
    headless: true,
  });
});

it("uses @sparticuz chromium when running serverless (AWS_LAMBDA_FUNCTION_NAME)", async () => {
  process.env.AWS_LAMBDA_FUNCTION_NAME = "fn";
  await renderAndScreenshot("<p/>");
  expect(mockExecutablePath).toHaveBeenCalled();
  expect(mockLaunch).toHaveBeenCalledWith(expect.objectContaining({ executablePath: "/tmp/chromium" }));
});

it("launches the Playwright-managed chromium locally (no @sparticuz)", async () => {
  await renderAndScreenshot("<p/>");
  expect(mockExecutablePath).not.toHaveBeenCalled();
  expect(mockLaunch).toHaveBeenCalledWith({ headless: true });
});

it("honours CHROMIUM_EXECUTABLE_PATH locally", async () => {
  process.env.CHROMIUM_EXECUTABLE_PATH = "/opt/chrome";
  await renderAndScreenshot("<p/>");
  expect(mockLaunch).toHaveBeenCalledWith({ executablePath: "/opt/chrome", headless: true });
});

it("ignores a setContent timeout and still screenshots", async () => {
  mockSetContent.mockRejectedValue(new Error("timeout"));
  const png = await renderAndScreenshot("<p/>");
  expect(png).toEqual(Buffer.from("PNG"));
  expect(mockBrowserClose).toHaveBeenCalledTimes(1);
});

it("always closes the browser when the screenshot fails", async () => {
  mockScreenshot.mockRejectedValue(new Error("boom"));
  await expect(renderAndScreenshot("<p/>")).rejects.toThrow("boom");
  expect(mockBrowserClose).toHaveBeenCalledTimes(1);
});

describe("finalizeAnimationsInPage (in-page callback)", () => {
  const g = globalThis as unknown as { window?: unknown; document?: unknown };
  const saved = { window: g.window, document: g.document };
  afterEach(() => {
    g.window = saved.window;
    g.document = saved.document;
  });

  const makeEl = () => ({ style: {} as Record<string, string> });

  it("drives gsap + ScrollTrigger animations and reveals DOM targets even with numeric ScrollTrigger.progress", () => {
    const globalProgress = jest.fn();
    const animProgress = jest.fn();
    // ScrollTrigger#progress is a read-only NUMBER, not a method.
    const trigger = { progress: 0.3, animation: { progress: animProgress } };
    const els = [makeEl(), makeEl()];
    g.window = {
      gsap: { globalTimeline: { progress: globalProgress } },
      ScrollTrigger: { getAll: () => [trigger] },
    };
    g.document = { querySelectorAll: () => els };

    expect(() => finalizeAnimationsInPage()).not.toThrow();
    expect(globalProgress).toHaveBeenCalledWith(1);
    expect(animProgress).toHaveBeenCalledWith(1);
    for (const el of els) {
      expect(el.style.opacity).toBe("1");
      expect(el.style.visibility).toBe("visible");
      expect(el.style.transform).toBe("none");
    }
  });

  it("still reveals DOM targets when gsap and ScrollTrigger throw", () => {
    const els = [makeEl()];
    g.window = {
      gsap: {
        get globalTimeline(): never {
          throw new Error("gsap boom");
        },
      },
      ScrollTrigger: {
        getAll: () => {
          throw new Error("st boom");
        },
      },
    };
    g.document = { querySelectorAll: () => els };
    expect(() => finalizeAnimationsInPage()).not.toThrow();
    expect(els[0].style.opacity).toBe("1");
    expect(els[0].style.visibility).toBe("visible");
  });

  it("does not throw when gsap/ScrollTrigger are absent", () => {
    const els = [makeEl()];
    g.window = {};
    g.document = { querySelectorAll: () => els };
    expect(() => finalizeAnimationsInPage()).not.toThrow();
    expect(els[0].style.opacity).toBe("1");
  });
});
