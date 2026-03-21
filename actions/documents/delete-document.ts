"use server";

import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { minioClient, MINIO_BUCKET } from "@/lib/minio";

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
    await minioClient.send(
      new DeleteObjectCommand({
        Bucket: MINIO_BUCKET,
        Key: document.key,
      })
    );
  }
}
