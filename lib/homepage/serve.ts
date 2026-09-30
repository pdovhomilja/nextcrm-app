import { prismadb } from "@/lib/prisma";
import { isValidSlug } from "@/lib/homepage/slug";

// Shared helpers for the PUBLIC prospect-facing preview routes (app/p/[slug]).
// No auth. The slug is a readable, user-specifiable value BY DESIGN (guessable);
// the content is a non-sensitive prospect mockup, so it is not a secret. Every
// failure mode (bad slug,
// unknown slug, never published, missing R2 object, storage error) returns the SAME
// generic 404 so nothing can be enumerated and nothing 500s.

// isValidSlug() (lib/homepage/slug.ts) is the single canonical shape. Rejecting
// anything else up front keeps arbitrary input out of the DB query and the R2 key.

const NOT_FOUND_HTML =
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Not found</title></head><body style="font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center"><h2>Page not found</h2><p>This preview is not available.</p></body></html>`;

export function notFound(): Response {
  return new Response(NOT_FOUND_HTML, {
    status: 404,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
      "x-content-type-options": "nosniff",
    },
  });
}

// Static per publish; short public cache. A revert/republish is visible within 5 min.
export const OK_HEADERS = {
  "cache-control": "public, max-age=300",
  "x-robots-tag": "noindex",
  "x-content-type-options": "nosniff",
} as const;

// The served HTML is LLM-generated from scraped third-party content and /p/ is
// reachable on every host (incl. the authenticated CRM host). `sandbox` without
// `allow-same-origin` makes the document an opaque origin (no CRM cookies/storage)
// while page + CDN scripts (e.g. Tailwind Play) still run. NEVER add allow-same-origin.
export const HTML_CSP = "sandbox allow-scripts";

/**
 * Resolve a slug to a PUBLISHED homepage and fetch its R2 object; null on any miss.
 * The gate is `current_version_id` (a version has been published), deliberately NOT
 * `status`: during refine/regenerate/revert the job sets RUNNING (and FAILED on a
 * failed refine) while the previously published R2 object stays intact, so a live,
 * already-emailed link must keep serving. A never-published page (current_version_id
 * null, e.g. mid-first-generation or a first-gen failure) still 404s.
 */
export async function loadPublished<T>(
  slug: string,
  fetchObject: (slug: string) => Promise<T | null>
): Promise<T | null> {
  if (!isValidSlug(slug)) return null;
  try {
    const row = await prismadb.crm_Target_Homepage.findFirst({
      where: { slug, deletedAt: null, current_version_id: { not: null } },
      select: { id: true },
    });
    if (!row) return null;
    return await fetchObject(slug);
  } catch (e) {
    console.error("[homepage-serve] lookup/fetch failed", e);
    return null;
  }
}
