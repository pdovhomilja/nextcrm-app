import type { AuthzUser } from "../session";
import { isManagerOrAdmin } from "../roles";
import { NO_ROWS } from "./unhandled-role";

// Who a caller may see in the user directory and assignee pickers.
// Internal roles: everyone (they assign records to colleagues).
// Partner: only himself. Other roles: nobody.
export function userDirectoryWhere(user: AuthzUser): Record<string, unknown> {
  if (isManagerOrAdmin(user) || user.role === "user") return {};
  if (user.role === "partner") return { id: user.id };
  return { ...NO_ROWS };
}
