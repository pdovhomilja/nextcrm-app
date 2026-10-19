import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { isBlobStorageConfigured } from "@/lib/storage/env";
import { ALLOWED_UPLOAD_CONTENT_TYPES } from "@/lib/upload/allowed-content-types";

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request): Promise<NextResponse> {
  if (!isBlobStorageConfigured()) {
    return NextResponse.json({ error: "Blob storage is not configured" }, { status: 503 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: Array.from(ALLOWED_UPLOAD_CONTENT_TYPES).concat([
            "application/octet-stream",
          ]),
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: session.user.id }),
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    console.error("[upload/blob]", err);
    const message = err instanceof Error ? err.message : "Upload failed";
    const status = message === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
