"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { minioClient, MINIO_BUCKET } from "@/lib/minio";

export async function bulkDeleteDocuments(documentIds: string[]) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const documents = await prismadb.documents.findMany({
    where: { id: { in: documentIds } },
    select: { id: true, key: true },
  });

  // Delete from MinIO
  await Promise.allSettled(
    documents.map((doc) =>
      doc.key
        ? minioClient.send(new DeleteObjectCommand({ Bucket: MINIO_BUCKET, Key: doc.key }))
        : Promise.resolve()
    )
  );

  // Delete from DB (cascade handles chunks, embeddings, junction tables)
  await prismadb.documents.deleteMany({
    where: { id: { in: documentIds } },
  });

  revalidatePath("/[locale]/(routes)/documents");
}
