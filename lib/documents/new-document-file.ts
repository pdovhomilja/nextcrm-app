import { prismadb } from "@/lib/prisma";
import { getMinioConfig } from "@/lib/minio";
import { isDocumentKey } from "./file-key";

/**
 * Key and stored URL for a file the client just uploaded.
 * The key comes from the client, so refuse one outside the document folders
 * or one another document already points at.
 */
export async function newDocumentFile(key: string) {
  if (!isDocumentKey(key)) throw new Error("Invalid file");

  const { bucket, publicEndpoint } = getMinioConfig();

  const taken =
    (await prismadb.documents.count({
      where: {
        OR: [
          { key },
          { document_file_url: { endsWith: `/${bucket}/${key}` } },
        ],
      },
    })) > 0;

  if (taken) throw new Error("Invalid file");

  return {
    key,
    document_file_url: `${publicEndpoint}/${bucket}/${key}`,
  };
}
