"use server";
import { prismadb } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

/** Active users with role partner, for the account Partner picker (admins and managers only). */
export const getPartnerUsers = async () => {
  try {
    await requireRole(["admin", "manager"]);
  } catch {
    return [];
  }
  return prismadb.users.findMany({
    where: { role: "partner", userStatus: "ACTIVE" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
};
