/**
 * Code-owned egress allowlist for the homepage render step (headless chromium).
 *
 * SECURITY: the rendered HTML is LLM-generated from prospect-controlled copy, so
 * any network request it makes is untrusted. Everything is blocked except:
 *  - Google Fonts (exact hosts), and
 *  - ONE pinned GSAP path on cdnjs.
 * Matching is on the parsed URL's exact hostname, never startsWith/includes on
 * the host, so look-alikes (`fonts.googleapis.com.evil.com`) and userinfo tricks
 * (`fonts.googleapis.com@evil.com`) are rejected. data:/blob: are not routed by
 * Playwright and never reach this check.
 */
export const GSAP_VERSION = "3.13.0";

export const ALLOWED_RENDER_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"] as const;

const CDNJS_HOST = "cdnjs.cloudflare.com";
const GSAP_PATH_PREFIX = `/ajax/libs/gsap/${GSAP_VERSION}/`;

export function isAllowedRenderRequest(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;

  const host = parsed.hostname.toLowerCase();
  if ((ALLOWED_RENDER_HOSTS as readonly string[]).includes(host)) return true;
  // pathname is already dot-segment-normalised by URL, so `..` cannot escape the prefix.
  return host === CDNJS_HOST && parsed.pathname.startsWith(GSAP_PATH_PREFIX);
}
