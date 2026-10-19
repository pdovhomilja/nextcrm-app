/** Browser upload via MinIO presigned URL or Vercel Blob (whichever is configured on the server). */

type PresignResponse =
  | { provider: "s3"; presignedUrl: string; fileUrl: string }
  | { provider: "blob"; handleUploadUrl: string };

export async function uploadFileToAppStorage(
  file: File,
  options?: { folder?: string }
): Promise<{ url: string; name: string; mime: string; key: string }> {
  const res = await fetch("/api/upload/presigned-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      folder: options?.folder ?? "uploads",
    }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "Upload failed");
  }

  const data = (await res.json()) as PresignResponse & {
    presignedUrl?: string;
    fileUrl?: string;
    key?: string;
    provider?: string;
  };

  const mime = file.type || "application/octet-stream";

  if (data.provider === "blob") {
    const { upload } = await import("@vercel/blob/client");
    const blob = await upload(file.name, file, {
      access: "public",
      handleUploadUrl: data.handleUploadUrl,
    });
    return {
      url: blob.url,
      name: file.name,
      mime,
      key: blob.pathname,
    };
  }

  const presignedUrl = data.presignedUrl;
  const fileUrl = data.fileUrl;
  if (!presignedUrl || !fileUrl) {
    throw new Error("Invalid upload response from server");
  }

  const put = await fetch(presignedUrl, {
    method: "PUT",
    headers: { "Content-Type": mime },
    body: file,
  });
  if (!put.ok) throw new Error("Upload to storage failed");

  return {
    url: fileUrl,
    name: file.name,
    mime,
    key: data.key ?? fileUrl,
  };
}
