// Pure, dependency-free host-gate for the public preview routes (/p/[slug]).
// Kept separate from proxy.ts so it can be unit-tested without the middleware.

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/** Strip a :port suffix, leaving IPv6 brackets intact (`[::1]:3000` -> `[::1]`). */
function hostname(host: string): string {
  const h = host.trim().toLowerCase();
  if (h.startsWith("[")) return h.slice(0, h.indexOf("]") + 1) || h; // [::1]:port -> [::1]
  const colon = h.indexOf(":");
  return colon === -1 ? h : h.slice(0, colon);
}

/**
 * Decide whether `/p/` may be served for a request Host.
 * - No configured previews base (local dev) -> allow everywhere.
 * - Malformed base -> allow (fail-open on the CONVENIENCE gate, never breaks
 *   previews) but the caller logs it.
 * - Otherwise: allow only the exact previews host, or a localhost/loopback host.
 * Exact hostname compare (no `startsWith`, so `localhost.evil.com` is rejected).
 */
export function isPreviewHostAllowed(reqHost: string | null, previewsBase: string | undefined): boolean {
  if (!previewsBase) return true;
  let wantHost: string;
  try {
    wantHost = hostname(new URL(previewsBase).host);
  } catch {
    return true; // malformed env — don't hard-fail previews; caller logs it
  }
  const got = hostname(reqHost ?? "");
  if (!got) return false;
  return got === wantHost || LOCAL_HOSTS.has(got);
}

/** True when the configured previews base is present but unparseable (caller logs). */
export function isPreviewsBaseMalformed(previewsBase: string | undefined): boolean {
  if (!previewsBase) return false;
  try {
    new URL(previewsBase);
    return false;
  } catch {
    return true;
  }
}
