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
import { getMinioConfig, presignGet } from "@/lib/minio";
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

  let config;
  try {
    config = getMinioConfig();
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Object storage is not configured.")) {
      return NextResponse.json({ error: "File storage is not configured" }, { status: 503 });
    }
    throw error;
  }

  const key =
    doc.key ||
    keyFromUrl(doc.document_file_url, config.bucket, [
      config.publicEndpoint,
      config.endpoint,
    ]);
  if (!key || !isDocumentKey(key)) return notFoundOrForbiddenResponse();

  try {
    const res = NextResponse.redirect(await presignGet(key));
    res.headers.set("Cache-Control", "private, no-store");
    return res;
  } catch (error) {
    console.error("Failed to generate document download URL:", error);
    return NextResponse.json({ error: "Failed to generate download URL" }, { status: 500 });
  }
}
