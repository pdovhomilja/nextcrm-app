export type AppRole = "user" | "manager" | "admin" | "partner";

export const APP_ROLES: readonly AppRole[] = ["user", "manager", "admin", "partner"] as const;

const APP_ROLE_SET = new Set<string>(APP_ROLES);

/**
 * Roles the lib/authz scope helpers have rules for. Every other role in
 * APP_ROLES (partner) is denied by default: no rows, every assert refuses.
 */
export const SCOPED_ROLES: ReadonlySet<AppRole> = new Set<AppRole>(["user", "manager", "admin"]);

export function parseRole(value: unknown): AppRole | null {
  if (typeof value !== "string") return null;
  return APP_ROLE_SET.has(value) ? (value as AppRole) : null;
}

const LEGACY_MAP: Record<string, AppRole> = {
  admin: "admin",
  member: "manager",
  viewer: "user",
  user: "user",
  manager: "manager",
  partner: "partner",
};

export function mapLegacyRole(value: unknown): AppRole {
  if (typeof value !== "string") return "user";
  return LEGACY_MAP[value] ?? "user";
}
