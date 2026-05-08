"use server";
import {
  requireAuthenticated,
  filterAuthorizedDocumentIds,
  AuthenticationError,
} from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { DocumentSystemType } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function bulkChangeType(documentIds: string[], systemType: DocumentSystemType) {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) throw new Error("Unauthenticated");
    throw e;
  }

  if (!documentIds || documentIds.length === 0) return;

  // Fail-closed: every documentId must be authorized.
  const allowed = await filterAuthorizedDocumentIds(user, documentIds);
  if (allowed.length !== documentIds.length) {
    throw new Error("Forbidden");
  }

  await prismadb.documents.updateMany({
    where: { id: { in: documentIds } },
    data: { document_system_type: systemType },
  });

  revalidatePath("/[locale]/(routes)/documents");
}
