/** Client-side upload for chat attachments. */

import { uploadFileToAppStorage } from "@/lib/upload/client-upload";

export async function uploadChatFile(file: File): Promise<{ url: string; name: string; mime: string }> {
  return uploadFileToAppStorage(file, { folder: "uploads" });
}
