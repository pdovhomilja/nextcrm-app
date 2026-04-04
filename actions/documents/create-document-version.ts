"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { inngest } from "@/inngest/client";

interface CreateVersionInput {
  parentDocumentId: string;
  url: string;
  key: string;
  size: number;
  mimeType: string;
  contentHash?: string;
}

export async function createDocumentVersion(input: CreateVersionInput) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const parent = await prismadb.documents.findUnique({
    where: { id: input.parentDocumentId },
    select: { id: true, document_name: true, version: true, accounts: { select: { account_id: true } } },
  });
  if (!parent) throw new Error("Parent document not found");

  const newVersion = parent.version + 1;

  const [newDoc] = await prismadb.$transaction([
    prismadb.documents.create({
      data: {
        v: 0,
        document_name: parent.document_name,
        description: `Version ${newVersion}`,
        document_file_url: input.url,
        key: input.key,
        size: input.size,
        document_file_mimeType: input.mimeType,
        content_hash: input.contentHash ?? null,
        processing_status: "PENDING",
        version: newVersion,
        parent_document_id: input.parentDocumentId,
        createdBy: session.user.id,
        assigned_user: session.user.id,
      },
    }),
    prismadb.documents.update({
      where: { id: input.parentDocumentId },
      data: {
        document_file_url: input.url,
        key: input.key,
        size: input.size,
        version: newVersion,
      },
    }),
  ]);

  await inngest.send({
    name: "document/uploaded",
    data: { documentId: input.parentDocumentId },
  });

  revalidatePath("/[locale]/(routes)/documents");
  return newDoc;
}
