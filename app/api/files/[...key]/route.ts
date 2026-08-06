import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticated, unauthorizedResponse, AuthenticationError } from "@/lib/authz";
import { getObjectStream, assertSafeKey } from "@/lib/storage";

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
  json: "application/json",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params;
  const joined = (key ?? []).join("/");

  let safeKey: string;
  try {
    safeKey = assertSafeKey(joined);
  } catch {
    return NextResponse.json({ error: "Invalid storage key" }, { status: 400 });
  }

  try {
    await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return unauthorizedResponse();
    throw e;
  }

  try {
    const body = await getObjectStream(safeKey);
    const chunks: Uint8Array[] = [];
    for await (const chunk of body) chunks.push(chunk);

    const ext = safeKey.split(".").pop()?.toLowerCase() ?? "";
    const contentType = MIME_BY_EXT[ext] ?? "application/octet-stream";

    return new NextResponse(Buffer.concat(chunks), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${safeKey.split("/").pop()}"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    console.error("[api/files] failed to read object:", err);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
