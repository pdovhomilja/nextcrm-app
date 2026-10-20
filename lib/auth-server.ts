import { cache } from "react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// TODO: Add requireRole() helper for viewer restriction enforcement
// when viewer role is first assigned to users

/**
 * Session of an ACTIVE user, or null. Every authorization path goes through
 * this (directly or via lib/authz), so PENDING and INACTIVE users are treated
 * as signed out everywhere.
 */
export async function getSession() {
  const session = await getSessionAnyStatus();
  if (session?.user.userStatus !== "ACTIVE") return null;
  return session;
}

/**
 * Session regardless of account status. Only for pages that must tell
 * PENDING/INACTIVE users apart (the app layout and the /pending and
 * /inactive pages); never use it to authorize anything.
 */
export const getSessionAnyStatus = cache(async () => {
  try {
    return await auth.api.getSession({
      headers: await headers(),
    });
  } catch (error) {
    console.warn("[auth-server] Failed to retrieve session from database:", error);
    return null;
  }
});
