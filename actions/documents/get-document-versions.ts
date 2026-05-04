"use server";
import {
  requireAuthenticated,
  assertCanReadDocument,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import { prismadb } from "@/lib/prisma";

export async function getDocumentVersions(documentId: string) {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return [];
    throw e;
  }

  // Versions inherit parent permissions: assert read on parent first.
  try {
    await assertCanReadDocument(user, documentId);
  } catch (e) {
    if (e instanceof AuthorizationError) return [];
    throw e;
  }

  const versions = await prismadb.documents.findMany({
    where: {
      OR: [
        { id: documentId },
        { parent_document_id: documentId },
      ],
    },
    orderBy: { version: "desc" },
    select: {
      id: true,
      version: true,
      document_file_url: true,
      createdAt: true,
      size: true,
      created_by: { select: { name: true } },
    },
  });

  return versions;
}
