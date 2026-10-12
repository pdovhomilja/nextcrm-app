import { AuthorizationError } from "../errors";
import type { AuthzUser } from "../session";

/** Managers and admins edit CRM price lists; nobody edits EXTERNAL lists by hand (spec § 4). */
export function assertCanWritePriceList(user: AuthzUser, list: { source: string } | null): void {
  if (user.role !== "manager" && user.role !== "admin") throw new AuthorizationError("Only managers can change price lists");
  if (list?.source === "EXTERNAL") throw new AuthorizationError("Price lists synced from an external system are read-only");
}
