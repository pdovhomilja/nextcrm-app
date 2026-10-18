import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  requireAuthenticated,
  assertCanReadDocument,
  unauthorizedResponse,
  notFoundOrForbiddenResponse,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { minioPresignClient, MINIO_BUCKET } from "@/lib/minio";

// Folders /api/upload/presigned-url writes documents to. Key and URL are sent
// by the client, so anything else (invoices/, avatars/) is refused.
const DOCUMENT_FOLDERS = ["documents", "images", "uploads"];

function isDocumentKey(key: string): boolean {
  const parts = key.split("/");
  return DOCUMENT_FOLDERS.includes(parts[0]) && parts.length > 1 && !parts.includes("..");
}

/** Rows uploaded before the key column was filled only have the public URL. */
function keyFromUrl(url: string): string | null {
  let path: string;
  try {
    path = decodeURIComponent(new URL(url).pathname);
  } catch {
    return null;
  }
  // indexOf, not startsWith: MINIO_PUBLIC_URL may sit under a path prefix.
  const marker = `/${MINIO_BUCKET}/`;
  const at = path.indexOf(marker);
  return at === -1 ? null : path.slice(at + marker.length);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return unauthorizedResponse();
    throw e;
  }

  try {
    await assertCanReadDocument(user, documentId);
  } catch (e) {
    if (e instanceof AuthorizationError) return notFoundOrForbiddenResponse();
    throw e;
  }

  const doc = await prismadb.documents.findUnique({
    where: { id: documentId },
    select: { key: true, document_file_url: true },
  });
  if (!doc) return notFoundOrForbiddenResponse();

  const urlKey = keyFromUrl(doc.document_file_url);
  if (urlKey === null && /^https?:\/\//.test(doc.document_file_url)) {
    // Not in our bucket (e.g. old UploadThing files): nothing to sign.
    return NextResponse.redirect(doc.document_file_url);
  }

  const key = doc.key || urlKey;
  if (!key || !isDocumentKey(key)) return notFoundOrForbiddenResponse();

  const url = await getSignedUrl(
    minioPresignClient,
    new GetObjectCommand({ Bucket: MINIO_BUCKET, Key: key }),
    { expiresIn: 300 },
  );
  const res = NextResponse.redirect(url);
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
