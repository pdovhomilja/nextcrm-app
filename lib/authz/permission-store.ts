import { unstable_cache } from "next/cache";
import { prismadb } from "@/lib/prisma";
import type { AppRole } from "./roles";
import type { EffectEntry, RoleEntry } from "./permissions";

export type PermissionRows = {
  roleOverrides: RoleEntry[];
  groupEntries: EffectEntry[];
  userEntries: EffectEntry[];
};

async function loadPermissionRowsFromDb(
  userId: string,
  role: AppRole
): Promise<PermissionRows> {
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

/** Permission matrix inputs — cached across navigations (invalidates on TTL). */
export async function loadPermissionRows(userId: string, role: AppRole): Promise<PermissionRows> {
  return unstable_cache(
    () => loadPermissionRowsFromDb(userId, role),
    ["permission-rows-v1", userId, role],
    { revalidate: 180, tags: [`permissions-${userId}`] }
  )();
}
