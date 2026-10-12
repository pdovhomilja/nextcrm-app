import { cache } from "react";
import { redirect } from "next/navigation";

import { AuthorizationError } from "./errors";
import { loadPermissionRows } from "./permission-store";
import {
  type FeatureKey,
  type PermissionAction,
  type PermissionMatrix,
  resolvePermissions,
} from "./permissions";
import { type AppRole, mapLegacyRole } from "./roles";
import { type AuthzUser, requireAuthenticated } from "./session";

/** Effective permissions for a user, loaded once per request. */
export const getUserPermissions = cache(
  async (userId: string, rawRole: unknown): Promise<PermissionMatrix> => {
    const role: AppRole = mapLegacyRole(rawRole);
    if (role === "admin") {
      return resolvePermissions({ role, roleOverrides: [], groupEntries: [], userEntries: [] });
    }
    const rows = await loadPermissionRows(userId, role);
    return resolvePermissions({ role, ...rows });
  }
);

export async function can(
  user: AuthzUser,
  feature: FeatureKey,
  action: PermissionAction
): Promise<boolean> {
  if (user.role === "admin") return true;
  const matrix = await getUserPermissions(user.id, user.role);
  return matrix[feature][action];
}

/** Signed-in user who holds this feature permission; throws AuthorizationError otherwise. */
export async function requireFeature(
  feature: FeatureKey,
  action: PermissionAction
): Promise<AuthzUser> {
  const user = await requireAuthenticated();
  if (!(await can(user, feature, action))) throw new AuthorizationError();
  return user;
}

/** For page layouts: sends users without "view" back to the dashboard. */
export async function requireFeaturePage(feature: FeatureKey): Promise<void> {
  let allowed = false;
  try {
    await requireFeature(feature, "view");
    allowed = true;
  } catch {
    allowed = false;
  }
  if (!allowed) redirect(`/?denied=${feature}`);
}
