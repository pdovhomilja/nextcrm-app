import type { Browser } from "playwright-core";
import { assertPublicHost } from "@/lib/net/host-guard";

export type SourceBrand = {
  logoUrl: string | null;
  colors: string[];
  fonts: string[];
  copy: string;
};

export type HarvestResult = { screenshotB64: string; brand: SourceBrand };

const NAV_TIMEOUT_MS = 15000;
const MAX_COPY_CHARS = 2000;

/**
 * Environment switch — mirrors lib/homepage/render.ts (its launcher is not
 * exported and render.ts is deliberately left untouched; keep the two in sync).
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

/** Parse to an http(s) URL, or null. `new URL` also normalises odd host encodings (decimal/hex IPs). */
function parseHttpUrl(raw: string): URL | null {
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:" ? u : null;
  } catch {
    return null;
  }
}

/** URL.hostname wraps IPv6 literals in brackets; the guard wants the bare address. */
function bareHost(u: URL): string {
  return u.hostname.replace(/^\[|\]$/g, "");
}

async function hostIsPublic(host: string): Promise<boolean> {
  try {
    await assertPublicHost(host);
    return true;
  } catch {
    return false;
  }
}

/**
 * Runs inside the page. Must be self-contained (serialised into the browser).
 */
function extractBrand(maxCopy: number): SourceBrand {
  const abs = (href: string | null | undefined): string | null => {
    if (!href) return null;
    try {
      return new URL(href, document.baseURI).href;
    } catch {
      return null;
    }
  };

  const logoImg =
    document.querySelector<HTMLImageElement>(
      "header img, nav img, [class*='logo' i] img, img[class*='logo' i], img[alt*='logo' i]",
    ) ?? null;
  const iconLink = document.querySelector<HTMLLinkElement>("link[rel~='icon'], link[rel='apple-touch-icon']");
  const logoUrl = abs(logoImg?.currentSrc || logoImg?.src) ?? abs(iconLink?.href);

  const colorCounts = new Map<string, number>();
  const addColor = (c: string) => {
    if (!c || c === "transparent" || c === "rgba(0, 0, 0, 0)") return;
    colorCounts.set(c, (colorCounts.get(c) ?? 0) + 1);
  };
  const colorEls = document.querySelectorAll(
    "header, nav, footer, button, a[class*='btn' i], a[class*='button' i], [class*='cta' i], h1, h2",
  );
  Array.from(colorEls)
    .slice(0, 60)
    .forEach((el) => {
      const s = getComputedStyle(el);
      addColor(s.backgroundColor);
      addColor(s.color);
    });
  const colors = Array.from(colorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([c]) => c);

  const fontSet = new Set<string>();
  [document.body, document.querySelector("h1"), document.querySelector("h2")].forEach((el) => {
    if (!el) return;
    const fam = getComputedStyle(el).fontFamily;
    if (fam) fontSet.add(fam.split(",")[0].replace(/["']/g, "").trim());
  });
  const fonts = Array.from(fontSet).filter(Boolean).slice(0, 4);

  const parts: string[] = [];
  document.querySelectorAll("h1, h2, h3, p").forEach((el) => {
    const t = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (t.length > 2) parts.push(t);
  });
  const copy = parts.join("\n").slice(0, maxCopy);

  return { logoUrl, colors, fonts, copy };
}

/**
 * Visit a prospect's website with headless chromium and harvest a screenshot
 * plus brand context (logo, colours, fonts, key copy).
 *
 * SSRF: `company_website` is prospect-controlled. The URL host is validated
 * with the shared guard (lib/net/host-guard `assertPublicHost`) BEFORE any
 * browser launch, and every request the page makes — including redirects and
 * subresources — is re-validated via a route handler. Returns null (never
 * throws) for a blank/unsafe URL or any navigation/render failure.
 */
export async function harvestSource(url: string | null | undefined): Promise<HarvestResult | null> {
  const trimmed = url?.trim();
  if (!trimmed) return null;

  const target = parseHttpUrl(trimmed);
  if (!target) return null;

  const firstHost = bareHost(target);
  if (!(await hostIsPublic(firstHost))) return null;

  let browser: Browser | undefined;
  try {
    browser = await launchBrowser();
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      acceptDownloads: false,
      serviceWorkers: "block",
    });

    // Re-check every request (redirects, subresources) against the guard.
    const verdicts = new Map<string, Promise<boolean>>();
    verdicts.set(firstHost, Promise.resolve(true));
    await context.route("**/*", async (route) => {
      const reqUrl = parseHttpUrl(route.request().url());
      if (!reqUrl) return route.abort();
      const host = bareHost(reqUrl);
      let verdict = verdicts.get(host);
      if (!verdict) {
        verdict = hostIsPublic(host);
        verdicts.set(host, verdict);
      }
      return (await verdict) ? route.continue() : route.abort();
    });

    const page = await context.newPage();
    await page.goto(target.href, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });

    const raw = await page.evaluate(extractBrand, MAX_COPY_CHARS);
    const png = await page.screenshot({ fullPage: false, timeout: 15000 });

    return {
      screenshotB64: Buffer.from(png).toString("base64"),
      brand: {
        logoUrl: raw.logoUrl ?? null,
        colors: raw.colors ?? [],
        fonts: raw.fonts ?? [],
        copy: (raw.copy ?? "").slice(0, MAX_COPY_CHARS),
      },
    };
  } catch {
    return null;
  } finally {
    await browser?.close().catch(() => {});
  }
}
