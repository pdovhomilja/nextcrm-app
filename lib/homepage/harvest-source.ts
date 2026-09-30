import type { Browser } from "playwright-core";
import { assertPublicHost } from "@/lib/net/host-guard";
import { launchBrowser } from "@/lib/homepage/render";

export type SourceBrand = {
  logoUrl: string | null;
  /** The logo fetched and inlined as a data: URI (so it survives the render egress
   *  block); null when there's no logo or it couldn't be fetched/was too large. */
  logoDataUri: string | null;
  colors: string[];
  fonts: string[];
  copy: string;
};

export type HarvestResult = { screenshotB64: string; brand: SourceBrand };

const NAV_TIMEOUT_MS = 15000;
const MAX_COPY_CHARS = 2000;
// Cap the inlined logo so it never bloats the stored HTML / screenshot payload.
const MAX_LOGO_BYTES = 128 * 1024;

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
function extractBrand(maxCopy: number): Omit<SourceBrand, "logoDataUri"> {
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
  // Fail-safe: assertPublicHost is a no-op when MAIL_ALLOW_PRIVATE_HOSTS=true
  // (a local dev/test hatch). It must never weaken SSRF protection for
  // prospect-site browsing in a hosted environment.
  if (
    process.env.MAIL_ALLOW_PRIVATE_HOSTS === "true" &&
    (process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview")
  ) {
    console.warn("[HARVEST_SOURCE] refused: MAIL_ALLOW_PRIVATE_HOSTS set in hosted env");
    return null;
  }

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

    // Bound every page operation (evaluate, etc.), not just goto/screenshot.
    context.setDefaultTimeout(NAV_TIMEOUT_MS);

    // Re-check every request (redirects, subresources) against the guard.
    //
    // ACCEPTED RESIDUAL (documented): DNS-rebinding TOCTOU. Chromium re-resolves
    // the hostname at connect time, so a rebinding attacker can pass this check
    // and then resolve to an internal address. Exfil is bounded to the screenshot
    // and capped copy. Host-resolver pinning (--host-resolver-rules) or an egress
    // proxy is a possible fast-follow; intentionally not attempted here.
    const verdicts = new Map<string, Promise<boolean>>();
    verdicts.set(firstHost, Promise.resolve(true));
    await context.route("**/*", async (route) => {
      try {
        const reqUrl = parseHttpUrl(route.request().url());
        if (!reqUrl) return await route.abort();
        const host = bareHost(reqUrl);
        let verdict = verdicts.get(host);
        if (!verdict) {
          verdict = hostIsPublic(host);
          verdicts.set(host, verdict);
        }
        return (await verdict) ? await route.continue() : await route.abort();
      } catch {
        // route may reject if the page/context closed mid-flight; nothing to do.
      }
    });

    const page = await context.newPage();
    await page.goto(target.href, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });

    const raw = await page.evaluate(extractBrand, MAX_COPY_CHARS);
    const png = await page.screenshot({ fullPage: false, timeout: 15000 });

    // Fetch the logo bytes and inline them as a data: URI. The render step blocks
    // all network egress, so a remote <img src> would never load there (the
    // screenshot + vision critique would miss the logo); a data: URI renders.
    // page.request bypasses page CORS, so re-validate the logo host with the SAME
    // SSRF guard before fetching. Best-effort: any failure just yields no logo.
    let logoDataUri: string | null = null;
    const logoTarget = raw.logoUrl ? parseHttpUrl(raw.logoUrl) : null;
    if (logoTarget && (await hostIsPublic(bareHost(logoTarget)))) {
      try {
        const resp = await page.request.get(logoTarget.href, { timeout: 10000 });
        const ct = resp.headers()["content-type"] || "";
        if (resp.ok() && ct.startsWith("image/")) {
          const body = await resp.body();
          if (body.length > 0 && body.length <= MAX_LOGO_BYTES) {
            logoDataUri = `data:${ct.split(";")[0]};base64,${body.toString("base64")}`;
          }
        }
      } catch {
        // best-effort; leave logoDataUri null
      }
    }

    return {
      screenshotB64: Buffer.from(png).toString("base64"),
      brand: {
        logoUrl: raw.logoUrl ?? null,
        logoDataUri,
        colors: raw.colors ?? [],
        fonts: raw.fonts ?? [],
        copy: (raw.copy ?? "").slice(0, MAX_COPY_CHARS),
      },
    };
  } catch (e) {
    // Log host + error NAME only. Playwright navigation errors embed the full
    // navigated URL in `.message`, so never log the message (SSRF/PII hygiene).
    // On Vercel a chromium launch failure surfaces here and would otherwise be
    // indistinguishable from "prospect has no website"; this is the breadcrumb
    // for the first-deploy chromium verification.
    console.warn("[HARVEST_SOURCE] failed for host", firstHost, (e as Error)?.name);
    return null;
  } finally {
    await browser?.close().catch(() => {});
  }
}
