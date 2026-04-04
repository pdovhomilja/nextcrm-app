import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { minioClient, MINIO_BUCKET } from "@/lib/minio";
import sharp from "sharp";

const THUMB_WIDTH = 200;
const THUMB_HEIGHT = 200;

async function fetchFileBuffer(key: string): Promise<Buffer> {
  const response = await minioClient.send(
    new GetObjectCommand({ Bucket: MINIO_BUCKET, Key: key })
  );
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export const generateDocumentThumbnail = inngest.createFunction(
  {
    id: "document-generate-thumbnail",
    name: "Generate Document Thumbnail",
    triggers: [{ event: "document/uploaded" }],
    retries: 2,
  },
  async ({ event }) => {
    const { documentId } = event.data as { documentId: string };

    const document = await prismadb.documents.findUnique({
      where: { id: documentId },
      select: { id: true, key: true, document_file_mimeType: true },
    });
    if (!document?.key) return { skipped: "no key" };

    const isImage = document.document_file_mimeType.startsWith("image/");
    if (!isImage) {
      // For non-image files (PDF, DOCX), skip thumbnail for now.
      return { skipped: "non-image file" };
    }

    const buffer = await fetchFileBuffer(document.key);
    const thumbnail = await sharp(buffer)
      .resize(THUMB_WIDTH, THUMB_HEIGHT, { fit: "cover" })
      .png()
      .toBuffer();

    const thumbnailKey = `thumbnails/${documentId}.png`;

    await minioClient.send(
      new PutObjectCommand({
        Bucket: MINIO_BUCKET,
        Key: thumbnailKey,
        Body: thumbnail,
        ContentType: "image/png",
      })
    );

    const thumbnailUrl = `${process.env.NEXT_PUBLIC_MINIO_ENDPOINT}/${MINIO_BUCKET}/${thumbnailKey}`;

    await prismadb.documents.update({
      where: { id: documentId },
      data: { thumbnail_url: thumbnailUrl },
    });

    return { documentId, thumbnailUrl };
  }
);
