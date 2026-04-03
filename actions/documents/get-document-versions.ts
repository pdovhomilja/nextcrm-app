"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

export async function getDocumentVersions(documentId: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

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
