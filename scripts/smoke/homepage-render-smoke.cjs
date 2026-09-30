/**
 * Homepage-render smoke check (manual, documented). Proves headless chromium can
 * launch, render HTML and screenshot via playwright-core.
 *
 * Run:  node scripts/smoke/homepage-render-smoke.cjs
 * Expect: "OK: wrote <n> bytes ..." with n > 0.
 *
 * ---------------------------------------------------------------------------
 * ENVIRONMENT SWITCH (Task 4a copies this)
 * ---------------------------------------------------------------------------
 * @sparticuz/chromium ships a chromium built for serverless LINUX (AWS Lambda /
 * Vercel). Its executablePath() will NOT launch on macOS. So:
 *
 *   const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
 *   const { chromium } = require("playwright-core");
 *
 *   // SERVERLESS (Vercel / Inngest Node runtime):
 *   const sparticuz = require("@sparticuz/chromium").default ?? require("@sparticuz/chromium");
 *   const browser = await chromium.launch({
 *     executablePath: await sparticuz.executablePath(),
 *     args: sparticuz.args,
 *     headless: true,
 *   });
 *
 *   // LOCAL DEV (macOS/Linux workstation): use the Playwright-managed chromium
 *   // (installed by `pnpm exec playwright install chromium`, cached in
 *   // ~/Library/Caches/ms-playwright/):
 *   const browser = await chromium.launch({ headless: true });
 *   // (or { channel: "chromium" } for the new-headless build; or set
 *   //  executablePath to a local Chrome via CHROMIUM_EXECUTABLE_PATH)
 *
 *   // Then, identical for both:
 *   const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
 *   await page.setContent(html, { waitUntil: "load" });
 *   const png = await page.screenshot({ type: "png" });
 *   await browser.close();
 *
 * The serverless branch cannot be exercised on macOS; set SMOKE_SERVERLESS=1 on a
 * Linux host (e.g. a Vercel preview or `docker run` of a Lambda-like image) to try it.
 * Version note: playwright-core 1.58.x bundles chromium 145; @sparticuz/chromium
 * 147.x is the closest published build (no 145/146). Both speak CDP; pin them
 * together and re-verify on a Vercel preview after any bump.
 */
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

async function main() {
  const { chromium } = require("playwright-core");
  const serverless =
    process.env.SMOKE_SERVERLESS === "1" ||
    !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

  let launchOpts;
  if (serverless) {
    const mod = require("@sparticuz/chromium");
    const sparticuz = mod.default ?? mod;
    launchOpts = {
      executablePath: await sparticuz.executablePath(),
      args: sparticuz.args,
      headless: true,
    };
  } else {
    launchOpts = process.env.CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, headless: true }
      : { headless: true };
  }

  console.log(`mode: ${serverless ? "serverless (@sparticuz)" : "local (playwright chromium)"}`);
  const browser = await chromium.launch(launchOpts);
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.setContent("<h1>hi</h1>", { waitUntil: "load" });
    const out = path.join(os.tmpdir(), `homepage-smoke-${Date.now()}.png`);
    const png = await page.screenshot({ type: "png", path: out });
    if (!png.length) throw new Error("empty screenshot");
    console.log(`OK: wrote ${png.length} bytes to ${out}`);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error("SMOKE FAILED:", e);
  process.exit(1);
});
