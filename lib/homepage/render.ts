import type { Browser } from "playwright-core";

/**
 * Render an HTML string in headless chromium and return a viewport PNG.
 *
 * Environment switch (see scripts/smoke/homepage-render-smoke.cjs header):
 *  - Serverless (Vercel / AWS Lambda): @sparticuz/chromium ships a serverless
 *    Linux chromium — use its args + executablePath.
 *  - Local dev (macOS/Linux workstation): that binary will NOT launch, so use the
 *    Playwright-managed chromium (`pnpm exec playwright install chromium`), or a
 *    local browser via CHROMIUM_EXECUTABLE_PATH.
 */
function isServerless(): boolean {
  return !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

async function launchBrowser(): Promise<Browser> {
  const { chromium: pw } = await import("playwright-core");
  if (isServerless()) {
    const mod = await import("@sparticuz/chromium");
    const sparticuz = mod.default;
    return pw.launch({
      args: sparticuz.args,
      executablePath: await sparticuz.executablePath(),
      headless: true,
    });
  }
  return pw.launch(
    process.env.CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, headless: true }
      : { headless: true },
  );
}

export async function renderAndScreenshot(
  html: string,
  opts: { width?: number; height?: number } = {},
): Promise<Buffer> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage({
      viewport: { width: opts.width ?? 1280, height: opts.height ?? 900 },
    });
    // networkidle can time out on chatty pages; render what we have.
    await page.setContent(html, { waitUntil: "networkidle", timeout: 20000 }).catch(() => {});
    const png = await page.screenshot({ fullPage: false });
    return Buffer.from(png);
  } finally {
    await browser.close();
  }
}
