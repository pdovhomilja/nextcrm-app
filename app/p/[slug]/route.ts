import { getHomepageHtml } from "@/lib/homepage/storage";
import { HTML_CSP, loadPublished, notFound, OK_HEADERS } from "@/lib/homepage/serve";

// Public, unauthenticated prospect preview (served on previews.radeengineering.com).
// proxy.ts passes `/p/` through untouched. Private R2 object is reachable only here.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await params;
  const html = await loadPublished(slug, getHomepageHtml);
  if (html === null) return notFound();
  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": HTML_CSP,
      ...OK_HEADERS,
    },
  });
}
