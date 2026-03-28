// lib/audit-log.ts
import { prismadb } from "@/lib/prisma";
import { crm_AuditLog_Action } from "@prisma/client";

export type AuditEntityType =
  | "account"
  | "contact"
  | "lead"
  | "opportunity"
  | "contract";

export type AuditAction = crm_AuditLog_Action;

export interface AuditChange {
  field: string;
  old: unknown;
  new: unknown;
}

const INTERNAL_FIELDS = new Set([
  "updatedAt", "updatedBy", "createdAt", "createdBy",
  "created_on", "cratedAt", "v", "deletedAt", "deletedBy",
]);

export function diffObjects(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): AuditChange[] {
  const changes: AuditChange[] = [];
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    if (INTERNAL_FIELDS.has(key)) continue;
    const oldVal = before[key];
    const newVal = after[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({ field: key, old: oldVal ?? null, new: newVal ?? null });
    }
  }
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
    await prismadb.crm_AuditLog.create({
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
