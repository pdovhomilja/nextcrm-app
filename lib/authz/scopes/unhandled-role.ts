import { AuthorizationError } from "../errors";
import { SCOPED_ROLES } from "../roles";
import type { AuthzUser } from "../session";

// Deny by default. The scope helpers define rules for SCOPED_ROLES only. Any
// other role (partner, until it gets its own branch) must get no rows and be
// refused by every assert, never fall back to the user rules.

export function isUnhandledRole(user: AuthzUser): boolean {
  return !SCOPED_ROLES.has(user.role);
}

export function assertHandledRole(user: AuthzUser): void {
  if (isUnhandledRole(user)) throw new AuthorizationError();
}

/** A Prisma where that matches no rows: an empty OR. */
export const NO_ROWS = { OR: [] as never[] };
