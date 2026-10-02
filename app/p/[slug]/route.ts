import { getHomepageHtml } from "@/lib/homepage/storage";
import { HTML_CSP, loadPublished, notFound, OK_HEADERS } from "@/lib/homepage/serve";
import { recordHomepageView } from "@/lib/homepage/views";

// Public, unauthenticated prospect preview (served on previews.radeengineering.com).
// proxy.ts passes `/p/` through untouched. Private R2 object is reachable only here.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await params;
  const html = await loadPublished(slug, getHomepageHtml);
  if (html === null) return notFound();
  // Best-effort, non-blocking, UA-filtered view count (not on the screenshot route).
  // The cookie header lets it skip the operator's own logged-in CRM previews.
  recordHomepageView(slug, req.headers.get("user-agent"), req.headers.get("cookie"));
  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": HTML_CSP,
      ...OK_HEADERS,
    },
  });
}
