"use server";

import { requireRole, AuthorizationError } from "@/lib/authz";
import { verifyVenturesMasterPassword } from "@/lib/ventures/master-password";
import {
  clearVenturesMasterSession,
  setVenturesMasterSession,
} from "@/lib/ventures/ventures-master-session";

async function requireVenturesAccess() {
  try {
    return await requireRole(["admin", "manager"]);
  } catch (e) {
    if (e instanceof AuthorizationError) throw new Error("Forbidden");
    throw new Error("Unauthorized");
  }
}

export async function loginVenturesMaster(password: string) {
  await requireVenturesAccess();

  if (!verifyVenturesMasterPassword(password)) {
    return { error: "Invalid Ventures password." };
  }

  await setVenturesMasterSession();
  return { success: true as const };
}

export async function logoutVenturesMaster() {
  await requireVenturesAccess();
  await clearVenturesMasterSession();
  return { success: true as const };
}
