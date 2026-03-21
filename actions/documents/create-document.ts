"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

interface CreateDocumentInput {
  name: string;
  url: string;
  key: string;
  size: number;
  mimeType: string;
}

export async function createDocument(input: CreateDocumentInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");

  await prismadb.documents.create({
    data: {
      v: 0,
      document_name: input.name,
      description: "new document",
      document_file_url: input.url,
      key: input.key,
      size: input.size,
      document_file_mimeType: input.mimeType,
      createdBy: session.user.id,
      assigned_user: session.user.id,
    },
  });

  revalidatePath("/[locale]/(routes)/documents");
}
