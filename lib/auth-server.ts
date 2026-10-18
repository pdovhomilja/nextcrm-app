import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// TODO: Add requireRole() helper for viewer restriction enforcement
// when viewer role is first assigned to users

/**
 * Session of an ACTIVE user, or null. Every authorization path goes through
 * this (directly or via lib/authz), so PENDING and INACTIVE users are treated
 * as signed out everywhere. So are partners, by default: only the call sites a
 * partner needs pass { partner: true } (partner-role spec, ticket 4), so any
 * other action, page or route, including new ones, refuses him. proxy.ts also
 * limits his routes (lib/partner-routes.ts) and lib/authz his rows.
 */
export async function getSession(opts?: { partner?: boolean }) {
  const session = await getSessionAnyStatus();
  if (session?.user.userStatus !== "ACTIVE") return null;
  if (session.user.role === "partner" && !opts?.partner) return null;
  return session;
}

/**
 * Session regardless of account status. Only for pages that must tell
 * PENDING/INACTIVE users apart (the app layout and the /pending and
 * /inactive pages); never use it to authorize anything.
 */
export async function getSessionAnyStatus() {
  return auth.api.getSession({
    headers: await headers(),
  });
}
