import { prismadb } from "@/lib/prisma";
import { MINIO_BUCKET, MINIO_PUBLIC_URL } from "@/lib/minio";
import { isDocumentKey } from "./file-key";

/**
 * Key and stored URL for a file the client just uploaded. The key comes from
 * the client, so refuse one outside the document folders or one another
 * document already points at (that would be a way to read someone else's
 * file). The URL is built here, never taken from the client.
 */
export async function newDocumentFile(key: string) {
  const taken =
    isDocumentKey(key) &&
    (await prismadb.documents.count({
      where: {
        OR: [
          { key },
          { document_file_url: { endsWith: `/${MINIO_BUCKET}/${key}` } },
        ],
      },
    })) > 0;
  if (!isDocumentKey(key) || taken) throw new Error("Invalid file");
  return { key, document_file_url: `${MINIO_PUBLIC_URL}/${MINIO_BUCKET}/${key}` };
}
