import { crm_AuditLog_Action } from "@prisma/client";
import type { AuditAction } from "@/lib/audit-log";

// Every action writeAuditLog accepts must exist in the DB enum,
// or the write fails silently (AUDIT_LOG_WRITE_FAILED).
const ALL: Record<AuditAction, true> = {
  created: true, updated: true, deleted: true, restored: true, relation_added: true, relation_removed: true,
  imported: true, cancelled: true,
  installed: true, uninstalled: true, enabled: true, disabled: true, settings_changed: true, upgraded: true,
};

it.each(Object.keys(ALL))("%s exists in crm_AuditLog_Action", (action) => {
  expect(Object.values(crm_AuditLog_Action)).toContain(action);
});
