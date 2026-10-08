import { crm_AuditLog_Action } from "@prisma/client";

// Lifecycle audit rows are written with these actions; each must exist in the DB enum
// or writeAuditLog fails silently (AUDIT_LOG_WRITE_FAILED).
const PLUGIN_AUDIT_ACTIONS = ["installed", "uninstalled", "enabled", "disabled", "settings_changed", "upgraded"];

describe("plugin audit actions", () => {
  it.each(PLUGIN_AUDIT_ACTIONS)("%s exists in crm_AuditLog_Action", (action) => {
    expect(Object.values(crm_AuditLog_Action)).toContain(action);
  });
});
