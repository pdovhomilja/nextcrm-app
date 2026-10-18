import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// TODO: Add requireRole() helper for viewer restriction enforcement
// when viewer role is first assigned to users

/**
 * Session of an ACTIVE user, or null. Every authorization path goes through
 * this (directly or via lib/authz), so PENDING and INACTIVE users are treated
 * as signed out everywhere. So are partners, until the partner app exists
 * (partner-role spec, ticket 4); the app layout sends them to /partner-pending.
 */
export async function getSession() {
  const session = await getSessionAnyStatus();
  if (session?.user.userStatus !== "ACTIVE") return null;
  if (session.user.role === "partner") return null;
  return session;
}

/**
 * Session regardless of account status. Only for pages that must tell
 * PENDING/INACTIVE users and partners apart (the app layout and the
 * /pending, /inactive and /partner-pending pages); never use it to authorize anything.
 */
export async function getSessionAnyStatus() {
  return auth.api.getSession({
    headers: await headers(),
  });
}
