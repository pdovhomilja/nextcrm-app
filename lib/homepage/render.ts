import type { Browser } from "playwright-core";
import { isAllowedRenderRequest } from "./render-allowlist";

/**
 * Serverless (Vercel / AWS Lambda) vs local-dev chromium switch.
 * Shared by render.ts and harvest-source.ts (import from here) so the chromium
 * launch recipe — and any version-skew fix — lives in exactly one place.
 * See scripts/smoke/homepage-render-smoke.cjs for the two launch recipes.
 */
export function isServerless(): boolean {
  return !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

export async function launchBrowser(): Promise<Browser> {
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

/**
 * Render an HTML string in headless chromium and return a viewport PNG.
 *
 * SSRF / egress: the HTML is LLM-generated and grounded in prospect-controlled
 * harvested copy, so it could be steered (indirect prompt injection) to emit
 * `<img>`/`<script src>`/`fetch()` pointing at internal or attacker hosts. The
 * system prompt restricts remote assets, so we ENFORCE it here with a code-owned
 * exact-host allowlist (see render-allowlist.ts): only Google Fonts and a pinned
 * GSAP path may load; every other network request is aborted. The in-memory
 * `setContent` document and `data:`/`blob:` URIs render as usual.
 */
export async function renderAndScreenshot(
  html: string,
  opts: { width?: number; height?: number } = {},
): Promise<Buffer> {
  const browser = await launchBrowser();
  try {
    const context = await browser.newContext({
      viewport: { width: opts.width ?? 1280, height: opts.height ?? 900 },
      acceptDownloads: false,
      serviceWorkers: "block",
    });
    // Egress allowlist: only Google Fonts + the pinned GSAP path continue; every
    // other request (internal/metadata/attacker hosts) is aborted. `**/*` matches
    // http/https/ws requests; data:/blob: are handled in-process and not routed.
    await context.route("**/*", (route) =>
      isAllowedRenderRequest(route.request().url()) ? route.continue() : route.abort(),
    );
    // route() does not cover WebSockets; block them entirely (no allowlisted WS use).
    // Capability-checked so this no-ops on a Playwright without routeWebSocket.
    const ctxWs = context as any;
    if (typeof ctxWs.routeWebSocket === "function") {
      await ctxWs.routeWebSocket("**", (ws: any) => {
        try {
          ws.close?.();
        } catch {
          /* best-effort close */
        }
      });
    }
    const page = await context.newPage();
    // Document is otherwise self-contained; allowlisted fonts/GSAP may load, so
    // "load" can wait on them (bounded by the timeout). A slow/partial render
    // still yields a screenshot of what painted.
    await page.setContent(html, { waitUntil: "load", timeout: 20000 }).catch((e) => {
      console.warn("[HOMEPAGE_RENDER] setContent did not fully settle", (e as Error)?.message);
    });
    // Force the designed final state so scroll-reveal/GSAP targets that start
    // hidden are visible in the screenshot. Screenshot-only: the served /p/ page
    // still animates normally. Non-throwing: a page without GSAP still renders.
    await page
      .evaluate(() => {
        try {
          const g = (window as any).gsap;
          if (g?.globalTimeline) g.globalTimeline.progress(1);
          const ST = (window as any).ScrollTrigger;
          if (ST?.getAll) ST.getAll().forEach((t: any) => t.progress?.(1));
          document
            .querySelectorAll<HTMLElement>(
              '[style*="opacity:0"],[style*="opacity: 0"],.reveal,[data-reveal]',
            )
            .forEach((el) => {
              el.style.opacity = "1";
              el.style.transform = "none";
              el.style.visibility = "visible";
            });
        } catch {
          /* best-effort finalize */
        }
      })
      .catch(() => {});
    const png = await page.screenshot({ fullPage: false });
    return Buffer.from(png);
  } finally {
    await browser.close();
  }
}
