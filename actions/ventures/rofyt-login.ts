"use server";

import { requireRole, AuthorizationError } from "@/lib/authz";
import { verifyVenturePassword } from "@/lib/ventures/password";
import { setRofytAdminSession, clearRofytAdminSession } from "@/lib/ventures/rofyt-session";
import { getVentureBySlug } from "@/actions/ventures/list-ventures";
import { ROFYT_SLUG } from "@/lib/ventures/catalog";

async function requireVenturesAccess() {
  try {
    return await requireRole(["admin", "manager"]);
  } catch (e) {
    if (e instanceof AuthorizationError) throw new Error("Forbidden");
    throw new Error("Unauthorized");
  }
}

export async function loginRofytAdmin(password: string) {
  await requireVenturesAccess();
  const venture = await getVentureBySlug(ROFYT_SLUG);
  if (!venture) return { error: "Rofyt is not configured." };

  const ok = await verifyVenturePassword(password, venture.adminPasswordHash);
  if (!ok) {
    const envPassword = process.env.ROFYT_ADMIN_PASSWORD?.trim();
    if (!envPassword || password !== envPassword) {
      return { error: "Invalid Rofyt admin password." };
    }
  }

  await setRofytAdminSession(venture.id);
  return { success: true as const };
}

export async function logoutRofytAdmin() {
  await requireVenturesAccess();
  await clearRofytAdminSession();
  return { success: true as const };
}
