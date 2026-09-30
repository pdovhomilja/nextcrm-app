// Fork-owned. Best-effort view tracking for the public homepage preview
// (/p/<slug>). The link is public and gets prefetched by email clients and link
// scanners (Safe Links, spam filters, chat unfurlers), so this applies a BASIC
// user-agent filter — deliberately approximate (some scanners slip through, some
// privacy browsers are missed). For reliable traffic numbers, use real website
// analytics; this is a "did a human likely look?" signal.

import { prismadb } from "@/lib/prisma";

// Substrings that mark a non-human fetch (bots, crawlers, prefetchers, scanners,
// unfurlers, CLI/HTTP libraries). Lowercased comparison.
const BOT_MARKERS = [
  "bot", "crawl", "spider", "slurp", "preview", "scan", "monitor", "fetch",
  "facebookexternalhit", "whatsapp", "telegram", "slack", "discord", "skype",
  "bingpreview", "googlebot", "applebot", "yandex", "baidu", "duckduck",
  "headless", "phantom", "python", "curl", "wget", "go-http", "java/", "axios",
  "okhttp", "libwww", "http_request", "ms-office", "microsoft office", "outlook",
];

/**
 * Heuristic: does this look like a real browser view (not a bot/prefetcher)?
 * Requires a browser-like UA and no known bot marker. Approximate by design.
 */
export function isRealBrowserView(ua: string | null | undefined): boolean {
  if (!ua) return false;
  const s = ua.toLowerCase();
  if (!s.includes("mozilla")) return false; // real browsers identify as Mozilla/5.0
  return !BOT_MARKERS.some((b) => s.includes(b));
}

/**
 * Increment the homepage view counter (by slug), best-effort and NON-blocking:
 * bot UAs are ignored, and DB errors are swallowed so serving never fails on a
 * tracking write. Fire-and-forget — do not await in the request path.
 */
export function recordHomepageView(
  slug: string,
  ua: string | null | undefined
): void {
  if (!isRealBrowserView(ua)) return;
  void prismadb.crm_Target_Homepage
    .update({
      where: { slug },
      data: { view_count: { increment: 1 }, last_viewed_at: new Date() },
    })
    .catch((e) => console.error("[homepage-view]", e));
}
