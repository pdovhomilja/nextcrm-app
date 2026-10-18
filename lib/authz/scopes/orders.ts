import type { AuthzUser } from "../session";
import { isManagerOrAdmin } from "../roles";
import { accountUserScopeOR } from "./crm";
import { partnerVisibleAccountWhere } from "./partner";
import { NO_ROWS, isUnhandledRole } from "./unhandled-role";

/** Spec § 5: reps read orders they own or created, or on accounts in their account scope. */
export function orderReadScopeWhere(user: AuthzUser): Record<string, unknown> {
  if (isManagerOrAdmin(user)) return {};
  if (user.role === "partner") return { account: partnerVisibleAccountWhere(user.id) };
  if (isUnhandledRole(user)) return { ...NO_ROWS };
  return {
    OR: [
      { ownerId: user.id },
      { createdBy: user.id },
      { account: { OR: accountUserScopeOR(user.id) } },
    ],
  };
}
