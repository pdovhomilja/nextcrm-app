import { prismadb } from "@/lib/prisma";
import type { AppRole } from "./roles";
import type { EffectEntry, RoleEntry } from "./permissions";

export type PermissionRows = {
  roleOverrides: RoleEntry[];
  groupEntries: EffectEntry[];
  userEntries: EffectEntry[];
};

export async function loadPermissionRows(userId: string, role: AppRole): Promise<PermissionRows> {
  const [roleOverrides, groupEntries, userEntries] = await Promise.all([
    prismadb.rolePermission.findMany({
      where: { role },
      select: { feature: true, action: true, allowed: true },
    }),
    prismadb.groupPermission.findMany({
      where: { group: { members: { some: { userId } } } },
      select: { feature: true, action: true, effect: true },
    }),
    prismadb.userPermission.findMany({
      where: { userId },
      select: { feature: true, action: true, effect: true },
    }),
  ]);
  return { roleOverrides, groupEntries, userEntries };
}
