// Content types the app accepts for uploads, and the file extension each one
// is stored under. The extension comes from here, never from a filename.
export const UPLOAD_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "txt",
};

/** Extension for an allowed content type, or undefined. */
export function uploadExtension(contentType: string): string | undefined {
  return Object.hasOwn(UPLOAD_EXTENSIONS, contentType) ? UPLOAD_EXTENSIONS[contentType] : undefined;
}
