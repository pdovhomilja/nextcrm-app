import { z } from "zod";

// ── Pagination ──────────────────────────────────────────────────

export const paginationSchema = {
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
};

export function paginationArgs(args: { limit: number; offset: number }) {
  return { take: args.limit, skip: args.offset };
}

// ── Search ──────────────────────────────────────────────────────

export function ilike(field: string, value: string) {
  return { [field]: { contains: value, mode: "insensitive" as const } };
}

// ── Soft Delete ─────────────────────────────────────────────────

export function softDeleteData(userId: string) {
  return { deletedAt: new Date(), deletedBy: userId };
}

export function isNotDeleted() {
  return { deletedAt: null };
}

// ── Response Helpers ────────────────────────────────────────────

export function listResponse<T>(data: T[], total: number, offset: number) {
  return { data, total, offset };
}

export function itemResponse<T>(data: T) {
  return { data };
}

// ── Error Helpers ───────────────────────────────────────────────

export function notFound(_entity: string): never {
  throw new Error("NOT_FOUND");
}

export function conflict(msg: string): never {
  throw new Error(`CONFLICT: ${msg}`);
}

export function validationError(msg: string): never {
  throw new Error(`VALIDATION_ERROR: ${msg}`);
}

export function externalError(msg: string): never {
  throw new Error(`EXTERNAL_ERROR: ${msg}`);
}
