"use server";

import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { utapi } from "@/lib/server/uploadthings";
import { getServerSession } from "next-auth";

export async function deleteDocument(documentId: string) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthenticated");

  if (!documentId) throw new Error("Document ID is required");

  const document = await prismadb.documents.findUnique({
    where: { id: documentId },
  });

  if (!document) throw new Error("Document not found");

  await prismadb.documents.delete({ where: { id: documentId } });

  if (document.key) {
    await utapi.deleteFiles([document.key]);
  }
}
