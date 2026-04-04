"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { revalidatePath } from "next/cache";

export async function retryEnrichment(documentId: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  await prismadb.documents.update({
    where: { id: documentId },
    data: { processing_status: "PENDING", processing_error: null },
  });

  await inngest.send({
    name: "document/uploaded",
    data: { documentId },
  });

  revalidatePath("/[locale]/(routes)/documents");
}
