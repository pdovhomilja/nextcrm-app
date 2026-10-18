import type { AuthzUser } from "../session";
import { accountUserScopeOR } from "./crm";
import { NO_ROWS, isUnhandledRole } from "./unhandled-role";

/** Spec § 5: reps read orders they own or created, or on accounts in their account scope. */
export function orderReadScopeWhere(user: AuthzUser): Record<string, unknown> {
  if (user.role === "admin" || user.role === "manager") return {};
  if (isUnhandledRole(user)) return { ...NO_ROWS };
  return {
    OR: [
      { ownerId: user.id },
      { createdBy: user.id },
      { account: { OR: accountUserScopeOR(user.id) } },
    ],
  };
}
