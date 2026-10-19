import type { PermissionMatrix } from "@/lib/authz/permissions";
import { FEATURES } from "@/lib/authz/permissions";

/** Hide CRM modules when CRM access is turned off for this user. */
export function permissionsForCrmAccess(
  matrix: PermissionMatrix,
  crmEnabled: boolean,
): PermissionMatrix {
  if (crmEnabled) return matrix;
  const denied = { view: false, create: false, edit: false, delete: false } as const;
  return Object.fromEntries(FEATURES.map((f) => [f.key, { ...denied }])) as PermissionMatrix;
}
