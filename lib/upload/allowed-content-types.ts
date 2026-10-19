const EXT_TO_MIME: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  zip: "application/zip",
  txt: "text/plain",
  csv: "text/csv",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};

export const ALLOWED_UPLOAD_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "text/plain",
  "text/csv",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

/** Accept generic octet-stream when the filename extension is on the allowlist. */
export function resolveUploadContentType(filename: string, contentType: string): string | null {
  const normalized = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (ALLOWED_UPLOAD_CONTENT_TYPES.has(normalized)) return normalized;

  if (normalized === "application/octet-stream" || normalized === "") {
    const ext = filename.includes(".") ? filename.split(".").pop()?.trim().toLowerCase() : "";
    if (ext && EXT_TO_MIME[ext]) return EXT_TO_MIME[ext];
  }

  return null;
}
