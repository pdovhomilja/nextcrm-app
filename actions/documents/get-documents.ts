"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

export const getDocuments = async () => {
  const session = await getSession();
  if (!session) return [];

  const documents = await prismadb.documents.findMany({
    where: {
      parent_document_id: null, // Only show root documents, not old versions
    },
    orderBy: { date_created: "desc" },
    include: {
      created_by: { select: { id: true, name: true, email: true } },
      assigned_to_user: { select: { id: true, name: true, email: true } },
      accounts: {
        select: {
          account: { select: { id: true, name: true } },
        },
      },
    },
  });

  return documents;
};
