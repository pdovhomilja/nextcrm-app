export type AppRole = "user" | "trainee" | "manager" | "admin";

export const APP_ROLES: readonly AppRole[] = ["user", "trainee", "manager", "admin"] as const;

/** Plugin pages only know user, manager, and admin. Trainees use the user pages. */
export function isEndUserRole(role: AppRole): boolean {
  return role === "user" || role === "trainee";
}

export function toPluginRole(role: AppRole): "user" | "manager" | "admin" {
  if (role === "admin" || role === "manager") return role;
  return "user";
}

const APP_ROLE_SET = new Set<string>(APP_ROLES);

export function parseRole(value: unknown): AppRole | null {
  if (typeof value !== "string") return null;
  return APP_ROLE_SET.has(value) ? (value as AppRole) : null;
}

const LEGACY_MAP: Record<string, AppRole> = {
  admin: "admin",
  member: "manager",
  viewer: "user",
  user: "user",
  trainee: "trainee",
  manager: "manager",
};

export function mapLegacyRole(value: unknown): AppRole {
  if (typeof value !== "string") return "user";
  return LEGACY_MAP[value] ?? "user";
}
