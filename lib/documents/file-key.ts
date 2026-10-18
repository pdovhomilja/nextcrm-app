// Document files live in a private bucket. Pure helpers, no env or DB access.

/** Folders documents are uploaded to. Also used by /api/upload/presigned-url
 *  and the file route; docker-entrypoint.sh keeps them out of the public policy. */
export const DOCUMENT_FOLDERS = ["documents", "images", "uploads"] as const;

export function isDocumentKey(key: string): boolean {
  const parts = key.split("/");
  return (
    (DOCUMENT_FOLDERS as readonly string[]).includes(parts[0]) &&
    parts.length > 1 &&
    !parts.includes("..")
  );
}

/** Where clients read a document's file: an access check, then a presigned GET. */
export function documentFileRoute(documentId: string): string {
  return `/api/documents/${documentId}/file`;
}

/**
 * Key of a file in our bucket from a stored URL (rows written before the key
 * column was filled). Only URLs on one of our MinIO origins count; a path
 * prefix in front of the bucket is allowed.
 */
export function keyFromUrl(url: string, bucket: string, origins: string[]): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const ours = origins.some((o) => {
    try {
      return new URL(o).origin === parsed.origin;
    } catch {
      return false;
    }
  });
  if (!ours) return null;
  const path = decodeURIComponent(parsed.pathname);
  const marker = `/${bucket}/`;
  const at = path.indexOf(marker);
  return at === -1 ? null : path.slice(at + marker.length);
}

/** Files from the UploadThing era (before MinIO) stay where they are. */
export function isUploadThingUrl(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return (
      protocol === "https:" &&
      (hostname === "utfs.io" || hostname === "uploadthing.com" || hostname.endsWith(".ufs.sh"))
    );
  } catch {
    return false;
  }
}

/**
 * Walk a query result and replace every document's stored URL with its file
 * route (in place). Only plain objects and arrays are walked, so Dates and
 * Decimals stay as they are. A row selected without its id gets "".
 */
export function withDocumentFileRoutes<T>(value: T): T {
  if (Array.isArray(value)) {
    value.forEach(withDocumentFileRoutes);
  } else if (value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    const row = value as Record<string, unknown>;
    for (const k in row) {
      if (k === "document_file_url") {
        row[k] = typeof row.id === "string" ? documentFileRoute(row.id) : "";
      } else {
        withDocumentFileRoutes(row[k]);
      }
    }
  }
  return value;
}
