export type AppRole = "user" | "manager" | "admin";

export const APP_ROLES: readonly AppRole[] = ["user", "manager", "admin"] as const;

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
  manager: "manager",
};

export function mapLegacyRole(value: unknown): AppRole {
  if (typeof value !== "string") return "user";
  return LEGACY_MAP[value] ?? "user";
}
