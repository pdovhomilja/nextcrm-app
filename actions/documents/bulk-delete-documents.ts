"use server";
import {
  requireAuthenticated,
  filterWritableDocumentIds,
  AuthenticationError,
} from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getMinioClient, getMinioConfig } from "@/lib/minio";

export async function bulkDeleteDocuments(documentIds: string[]) {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) throw new Error("Unauthenticated");
    throw e;
  }

  if (!documentIds || documentIds.length === 0) return;

  // Fail-closed: if any id is not authorized, reject the whole request.
  const allowed = await filterWritableDocumentIds(user, documentIds);
  if (allowed.length !== documentIds.length) {
    throw new Error("Forbidden");
  }

  const documents = await prismadb.documents.findMany({
    where: { id: { in: documentIds } },
    select: { id: true, key: true },
  });

  // Delete from MinIO
  await Promise.allSettled(
    documents.map(async (doc) => {
      if (!doc.key) return;
      const { bucket } = getMinioConfig();
      await getMinioClient().send(
        new DeleteObjectCommand({ Bucket: bucket, Key: doc.key })
      );
    }
    )
  );

  // Delete from DB (cascade handles chunks, embeddings, junction tables)
  await prismadb.documents.deleteMany({
    where: { id: { in: documentIds } },
  });

  revalidatePath("/[locale]/(routes)/documents");
}
