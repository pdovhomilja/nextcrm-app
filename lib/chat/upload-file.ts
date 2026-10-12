/** Client-side upload for chat attachments (MinIO presigned URL). */

export async function uploadChatFile(file: File): Promise<{ url: string; name: string; mime: string }> {
  const res = await fetch("/api/upload/presigned-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      folder: "uploads",
    }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "Upload failed");
  }
  const { presignedUrl, fileUrl } = (await res.json()) as {
    presignedUrl: string;
    fileUrl: string;
  };

  const put = await fetch(presignedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!put.ok) throw new Error("Upload to storage failed");

  return { url: fileUrl, name: file.name, mime: file.type || "application/octet-stream" };
}
