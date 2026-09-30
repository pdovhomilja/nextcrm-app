import { getHomepageScreenshotBuffer } from "@/lib/homepage/storage";
import { loadPublished, notFound, OK_HEADERS } from "@/lib/homepage/serve";

// Public screenshot of the prospect preview (used as the email merge-tag image).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await params;
  const png = await loadPublished(slug, getHomepageScreenshotBuffer);
  if (png === null) return notFound();
  return new Response(new Uint8Array(png), {
    status: 200,
    headers: { "content-type": "image/png", ...OK_HEADERS },
  });
}
