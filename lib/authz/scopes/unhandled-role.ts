import { AuthorizationError } from "../errors";
import { SCOPED_ROLES } from "../roles";
import type { AuthzUser } from "../session";

// Deny by default. The scope helpers define full rules for SCOPED_ROLES only.
// Any other role must get no rows and be refused by every assert, never fall
// back to the user rules. `partner` gets explicit read branches (checked
// before isUnhandledRole) and is refused by every write assert.

export function isUnhandledRole(user: AuthzUser): boolean {
  return !SCOPED_ROLES.has(user.role);
}

export function assertHandledRole(user: AuthzUser): void {
  if (isUnhandledRole(user)) throw new AuthorizationError();
}

/**
 * A Prisma where that matches no rows: an OR whose only branch is false.
 * Not a bare `OR: []`: Prisma treats an empty OR as "no rows" at the top of a
 * where, but as "all rows" inside `AND: [...]` (checked on Postgres).
 */
export const NO_ROWS = { OR: [{ id: { in: [] as string[] } }] };
