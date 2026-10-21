/** Client-side upload for email compose attachments. */

import { uploadFileToAppStorage } from "@/lib/upload/client-upload";

export type ComposeAttachmentMeta = {
  url: string;
  name: string;
  mime: string;
  size: number;
};

const MAX_BYTES = 10 * 1024 * 1024;

export async function uploadComposeAttachment(file: File): Promise<ComposeAttachmentMeta> {
  if (file.size > MAX_BYTES) {
    throw new Error("Each attachment must be 10 MB or smaller");
  }

  const uploaded = await uploadFileToAppStorage(file, { folder: "uploads" });
  return {
    url: uploaded.url,
    name: uploaded.name,
    mime: uploaded.mime,
    size: file.size,
  };
}
