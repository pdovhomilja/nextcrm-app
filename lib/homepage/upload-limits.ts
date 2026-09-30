/**
 * Max size of an uploaded homepage override (UTF-8 bytes). Kept under Vercel's
 * 4.5MB request body limit. Lives outside the "use server" action file because
 * a "use server" module may only export async functions, and the upload UI needs
 * this constant client-side too.
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
