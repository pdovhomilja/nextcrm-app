"use server";
import {
  requireAuthenticated,
  assertCanWriteAccount,
  filterAuthorizedDocumentIds,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function bulkLinkToAccount(documentIds: string[], accountId: string) {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) throw new Error("Unauthenticated");
    throw e;
  }

  if (!accountId) throw new Error("Account ID is required");
  if (!documentIds || documentIds.length === 0) return;

  // Account must be writable by user (fail-closed).
  try {
    await assertCanWriteAccount(user, accountId);
  } catch (e) {
    if (e instanceof AuthorizationError) throw new Error("Forbidden");
    throw e;
  }

  // Fail-closed: every documentId must be authorized.
  const allowed = await filterAuthorizedDocumentIds(user, documentIds);
  if (allowed.length !== documentIds.length) {
    throw new Error("Forbidden");
  }

  await prismadb.documentsToAccounts.createMany({
    data: documentIds.map((document_id) => ({ document_id, account_id: accountId })),
    skipDuplicates: true,
  });

  revalidatePath("/[locale]/(routes)/documents");
}
