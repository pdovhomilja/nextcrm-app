"use server";

import { revalidatePath } from "next/cache";
import {
  requireRole,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import { setUserVentureAccess } from "@/lib/vensai/user-access";
import { listVentureOptions } from "@/lib/vensai/venture-catalog";

export async function setVentureAccess(input: {
  userId: string;
  ventureSlugs: string[];
  crmEnabled: boolean;
}) {
  try {
    await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  const allowed = new Set(listVentureOptions().map((v) => v.slug));
  const ventureSlugs = input.ventureSlugs.filter((s) => allowed.has(s));
  if (!input.crmEnabled && ventureSlugs.length === 0) {
    return { error: "Enable CRM access or assign at least one venture." };
  }

  try {
    await setUserVentureAccess({
      userId: input.userId,
      ventureSlugs,
      crmEnabled: input.crmEnabled,
    });
    revalidatePath("/[locale]/(routes)/admin/users", "page");
    revalidatePath("/[locale]/(routes)/ventures", "page");
    return { ok: true as const };
  } catch {
    return { error: "Could not save venture access." };
  }
}
