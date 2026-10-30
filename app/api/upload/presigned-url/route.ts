import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { presignPut, MINIO_BUCKET, MINIO_PUBLIC_URL } from "@/lib/minio";
import { randomUUID } from "crypto";
import { DOCUMENT_FOLDERS } from "@/lib/documents/file-key";
import { uploadExtension } from "@/lib/upload-content-types";

const ALLOWED_FOLDERS = ["avatars", ...DOCUMENT_FOLDERS] as const;
type AllowedFolder = (typeof ALLOWED_FOLDERS)[number];

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { filename: rawFilename, contentType, folder: rawFolder = "uploads" } = await req.json();

  // Sanitize: strip any path components to prevent path traversal
  const filename = path.basename(rawFilename ?? "");
  // Whitelist folder to only allow known upload destinations
  const folder: AllowedFolder = ALLOWED_FOLDERS.includes(rawFolder as AllowedFolder)
    ? (rawFolder as AllowedFolder)
    : "uploads";

  if (!filename || !contentType) {
    return NextResponse.json({ error: "filename and contentType are required" }, { status: 400 });
  }

  // The extension follows the content type, never the filename. avatars/ is
  // public, so it takes images only.
  const ext = uploadExtension(contentType);
  if (!ext || (folder === "avatars" && !contentType.startsWith("image/"))) {
    return NextResponse.json({ error: "Content type not allowed" }, { status: 400 });
  }
  const key = `${folder}/${randomUUID()}.${ext}`;

  // Presigned URL valid for 10 minutes
  try {
    const presignedUrl = await presignPut(key, contentType);

    // Readable at this URL only under avatars/ (public); documents are read
    // through /api/documents/[documentId]/file.
    const fileUrl = `${MINIO_PUBLIC_URL}/${MINIO_BUCKET}/${key}`;

    return NextResponse.json({ presignedUrl, fileUrl, key });
  } catch (err) {
    console.error("Failed to generate presigned URL:", err);
    return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
  }
}
