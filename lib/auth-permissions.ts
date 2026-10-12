import { createAccessControl } from "better-auth/plugins/access";

// These roles are read only by BetterAuth's admin plugin, and only to gate its
// own /api/auth/admin/* endpoints (list/create/update/remove users, sessions,
// impersonation). NextCRM does not use those endpoints: user management runs
// through the server actions in actions/admin/users, and every app permission
// (CRM, projects, reports, settings) is enforced in lib/authz. No role is
// granted anything here, so the plugin endpoints cannot bypass those checks.
const statements = {
  user: ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password", "set-email", "get", "update"],
  session: ["list", "revoke", "delete"],
} as const;

export const ac = createAccessControl(statements);

export const admin = ac.newRole({ user: [], session: [] });

export const manager = ac.newRole({ user: [], session: [] });

export const user = ac.newRole({ user: [], session: [] });
