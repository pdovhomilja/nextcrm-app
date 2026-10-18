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
