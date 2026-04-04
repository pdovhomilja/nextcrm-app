"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { inngest } from "@/inngest/client";

interface CreateDocumentInput {
  name: string;
  url: string;
  key: string;
  size: number;
  mimeType: string;
  contentHash?: string;
  accountId?: string;
}

export async function createDocument(input: CreateDocumentInput) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const document = await prismadb.documents.create({
    data: {
      v: 0,
      document_name: input.name,
      description: "new document",
      document_file_url: input.url,
      key: input.key,
      size: input.size,
      document_file_mimeType: input.mimeType,
      content_hash: input.contentHash ?? null,
      processing_status: "PENDING",
      createdBy: session.user.id,
      assigned_user: session.user.id,
      ...(input.accountId
        ? { accounts: { create: { account_id: input.accountId } } }
        : {}),
    },
  });

  await inngest.send({
    name: "document/uploaded",
    data: { documentId: document.id },
  });

  revalidatePath("/[locale]/(routes)/documents");
  return document;
}
