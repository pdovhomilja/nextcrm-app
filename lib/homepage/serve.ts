import { prismadb } from "@/lib/prisma";

// Shared helpers for the PUBLIC prospect-facing preview routes (app/p/[slug]).
// No auth: the unguessable slug is the capability. Every failure mode (bad slug,
// unknown slug, not READY, missing R2 object, storage error) returns the SAME
// generic 404 so nothing can be enumerated and nothing 500s.

// slugify() output only: lowercase alnum + hyphens. Rejecting anything else up
// front keeps arbitrary input out of the DB query and out of the R2 object key.
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;

const NOT_FOUND_HTML =
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Not found</title></head><body style="font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center"><h2>Page not found</h2><p>This preview is not available.</p></body></html>`;

export function notFound(): Response {
  return new Response(NOT_FOUND_HTML, {
    status: 404,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  });
}

// Static per publish; short public cache. A revert/republish is visible within 5 min.
export const OK_HEADERS = {
  "cache-control": "public, max-age=300",
  "x-robots-tag": "noindex",
} as const;

/** Resolve a slug to a live READY homepage and fetch its R2 object; null on any miss. */
export async function loadPublished<T>(
  slug: string,
  fetchObject: (slug: string) => Promise<T | null>
): Promise<T | null> {
  if (!SLUG_RE.test(slug)) return null;
  try {
    const row = await prismadb.crm_Target_Homepage.findFirst({
      where: { slug, deletedAt: null, status: "READY" },
      select: { id: true },
    });
    if (!row) return null;
    return await fetchObject(slug);
  } catch (e) {
    console.error("[homepage-serve] lookup/fetch failed", e);
    return null;
  }
}
