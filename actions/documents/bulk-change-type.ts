"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { DocumentSystemType } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function bulkChangeType(documentIds: string[], systemType: DocumentSystemType) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  await prismadb.documents.updateMany({
    where: { id: { in: documentIds } },
    data: { document_system_type: systemType },
  });

  revalidatePath("/[locale]/(routes)/documents");
}
