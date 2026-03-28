// lib/audit-log.ts
import { prismadb } from "@/lib/prisma";

export type AuditEntityType =
  | "account"
  | "contact"
  | "lead"
  | "opportunity"
  | "contract";

export type AuditAction =
  | "created"
  | "updated"
  | "deleted"
  | "restored"
  | "relation_added"
  | "relation_removed";

export interface AuditChange {
  field: string;
  old: unknown;
  new: unknown;
}

const INTERNAL_FIELDS: Record<string, true> = {
  updatedAt: true, updatedBy: true, createdAt: true, createdBy: true,
  created_on: true, cratedAt: true, v: true, deletedAt: true, deletedBy: true,
};

export function diffObjects(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): AuditChange[] {
  const changes: AuditChange[] = [];
  const seen: Record<string, boolean> = {};

  const process = (key: string) => {
    if (seen[key] || INTERNAL_FIELDS[key]) return;
    seen[key] = true;
    const oldVal = before[key];
    const newVal = after[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({ field: key, old: oldVal ?? null, new: newVal ?? null });
    }
  };

  Object.keys(before).forEach(process);
  Object.keys(after).forEach(process);
  return changes;
}

interface WriteAuditLogParams {
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  changes?: AuditChange[] | null;
  userId: string | null;
}

export async function writeAuditLog(params: WriteAuditLogParams): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prismadb as any).crm_AuditLog.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        changes: params.changes ?? undefined,
        userId: params.userId ?? undefined,
      },
    });
  } catch (err) {
    console.error("[AUDIT_LOG_WRITE_FAILED]", err);
    // Never rethrow — audit failures must not block CRM mutations
  }
}
