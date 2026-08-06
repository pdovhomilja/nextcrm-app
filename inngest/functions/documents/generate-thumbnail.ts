import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { getObjectBuffer, putObject, getObjectPublicUrl } from "@/lib/storage";
import sharp from "sharp";

const THUMB_WIDTH = 200;
const THUMB_HEIGHT = 200;

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

    const buffer = await getObjectBuffer(document.key);
    const thumbnail = await sharp(buffer)
      .resize(THUMB_WIDTH, THUMB_HEIGHT, { fit: "cover" })
      .png()
      .toBuffer();

    const thumbnailKey = `thumbnails/${documentId}.png`;

    await putObject(thumbnailKey, thumbnail, "image/png");

    const thumbnailUrl = getObjectPublicUrl(thumbnailKey);

    await prismadb.documents.update({
      where: { id: documentId },
      data: { thumbnail_url: thumbnailUrl },
    });

    return { documentId, thumbnailUrl };
  }
);
