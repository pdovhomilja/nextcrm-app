import { createAccessControl } from "better-auth/plugins/access";

const statements = {
  user: ["create", "read", "update", "delete", "changeRole", "activate", "deactivate"],
  crm: ["create", "read", "update", "delete"],
  project: ["create", "read", "update", "delete"],
  report: ["read", "export"],
  settings: ["read", "update"],
} as const;

export const ac = createAccessControl(statements);

export const admin = ac.newRole({
  user: ["create", "read", "update", "delete", "changeRole", "activate", "deactivate"],
  crm: ["create", "read", "update", "delete"],
  project: ["create", "read", "update", "delete"],
  report: ["read", "export"],
  settings: ["read", "update"],
});

export const member = ac.newRole({
  user: ["read"],
  crm: ["create", "read", "update", "delete"],
  project: ["create", "read", "update", "delete"],
  report: ["read", "export"],
  settings: ["read"],
});

export const viewer = ac.newRole({
  user: ["read"],
  crm: ["read"],
  project: ["read"],
  report: ["read"],
  settings: ["read"],
});
