const mockScreenshot = jest.fn();
const mockSetContent = jest.fn();
const mockBrowserClose = jest.fn();
const mockNewPage = jest.fn();
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

import { renderAndScreenshot } from "@/lib/homepage/render";

const ENV_KEYS = ["VERCEL", "AWS_LAMBDA_FUNCTION_NAME", "CHROMIUM_EXECUTABLE_PATH"] as const;
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
  mockNewPage.mockResolvedValue({ setContent: mockSetContent, screenshot: mockScreenshot });
  mockLaunch.mockResolvedValue({ newPage: mockNewPage, close: mockBrowserClose });
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
  expect(mockNewPage).toHaveBeenCalledWith({ viewport: { width: 1280, height: 900 } });
  expect(mockSetContent).toHaveBeenCalledWith(
    "<h1>hi</h1>",
    expect.objectContaining({ waitUntil: "networkidle", timeout: 20000 }),
  );
  expect(mockScreenshot).toHaveBeenCalledWith({ fullPage: false });
  expect(mockBrowserClose).toHaveBeenCalledTimes(1);
});

it("honours custom viewport dimensions", async () => {
  await renderAndScreenshot("<p/>", { width: 800, height: 600 });
  expect(mockNewPage).toHaveBeenCalledWith({ viewport: { width: 800, height: 600 } });
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
