import { NextRequest, NextResponse } from "next/server";
import {
  requireAuthenticated,
  assertCanReadDocument,
  unauthorizedResponse,
  notFoundOrForbiddenResponse,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import { prismaBase } from "@/lib/prisma-base";
import { MINIO_BUCKET, MINIO_ENDPOINT, MINIO_PUBLIC_URL, presignGet } from "@/lib/minio";
import { isDocumentKey, isUploadThingUrl, keyFromUrl } from "@/lib/documents/file-key";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;
  let user;
  try {
    user = await requireAuthenticated({ partner: true });
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

  // prismaBase: prismadb maps document_file_url to this route for clients.
  const doc = await prismaBase.documents.findUnique({
    where: { id: documentId },
    select: { key: true, document_file_url: true },
  });
  if (!doc) return notFoundOrForbiddenResponse();

  if (isUploadThingUrl(doc.document_file_url)) {
    // Not in our bucket: nothing to sign.
    return NextResponse.redirect(doc.document_file_url);
  }

  const key =
    doc.key ||
    keyFromUrl(doc.document_file_url, MINIO_BUCKET!, [MINIO_PUBLIC_URL, MINIO_ENDPOINT!]);
  if (!key || !isDocumentKey(key)) return notFoundOrForbiddenResponse();

  const res = NextResponse.redirect(await presignGet(key));
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
