import { AuthorizationError } from "./errors";

// Server actions receive whatever the client posts, so an id typed `string`
// can arrive as an object that Prisma reads as a filter. The scope helpers
// check the id with findFirst and the caller then reuses it in findMany or
// deleteMany, so a filter would pass on one row and act on many. Every scope
// helper therefore accepts only plain string ids.
export function isIdString(id: unknown): id is string {
  return typeof id === "string" && id.length > 0;
}

export function assertIdString(id: unknown): asserts id is string {
  if (!isIdString(id)) throw new AuthorizationError();
}

export function assertIdStrings(ids: unknown): asserts ids is string[] {
  if (!Array.isArray(ids)) throw new AuthorizationError();
  ids.forEach(assertIdString);
}
