"use server";

import { revalidatePath } from "next/cache";

import { prismadb } from "@/lib/prisma";
import {
  AuthenticationError,
  AuthorizationError,
  isFeatureKey,
  isPermissionAction,
  parseRole,
  requireRole,
} from "@/lib/authz";

type Result<T = true> = { data: T } | { error: string };
type EffectChoice = "INHERIT" | "ALLOW" | "DENY";

const PERMISSIONS_PATH = "/[locale]/(routes)/admin/permissions";

async function requireAdmin(): Promise<{ error: string } | null> {
  try {
    await requireRole(["admin"]);
    return null;
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }
}

function validCell(feature: string, action: string) {
  return isFeatureKey(feature) && isPermissionAction(action);
}

function refresh() {
  revalidatePath(PERMISSIONS_PATH, "page");
  revalidatePath("/[locale]/(routes)", "layout");
}

export async function setRolePermission(
  role: string,
  feature: string,
  action: string,
  allowed: boolean
): Promise<Result> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const appRole = parseRole(role);
  if (!appRole || appRole === "admin") return { error: "Admin always has full access" };
  if (!validCell(feature, action)) return { error: "Unknown feature or action" };

  await prismadb.rolePermission.upsert({
    where: { role_feature_action: { role: appRole, feature, action } },
    create: { role: appRole, feature, action, allowed },
    update: { allowed },
  });
  refresh();
  return { data: true };
}

export async function resetRolePermissions(role: string): Promise<Result> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const appRole = parseRole(role);
  if (!appRole || appRole === "admin") return { error: "Admin always has full access" };

  await prismadb.rolePermission.deleteMany({ where: { role: appRole } });
  refresh();
  return { data: true };
}

export async function createPermissionGroup(
  name: string,
  description?: string
): Promise<Result<{ id: string }>> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const trimmed = name.trim();
  if (trimmed.length < 2) return { error: "Group name must be at least 2 characters" };

  const existing = await prismadb.permissionGroup.findUnique({ where: { name: trimmed } });
  if (existing) return { error: "A group with this name already exists" };

  const group = await prismadb.permissionGroup.create({
    data: { name: trimmed, description: description?.trim() || null },
    select: { id: true },
  });
  refresh();
  return { data: group };
}

export async function deletePermissionGroup(groupId: string): Promise<Result> {
  const denied = await requireAdmin();
  if (denied) return denied;
  await prismadb.permissionGroup.delete({ where: { id: groupId } });
  refresh();
  return { data: true };
}

export async function setGroupMembers(groupId: string, userIds: string[]): Promise<Result> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const unique = Array.from(new Set(userIds));

  await prismadb.$transaction([
    prismadb.permissionGroupMember.deleteMany({
      where: { groupId, userId: { notIn: unique } },
    }),
    prismadb.permissionGroupMember.createMany({
      data: unique.map((userId) => ({ groupId, userId })),
      skipDuplicates: true,
    }),
  ]);
  refresh();
  return { data: true };
}

export async function setGroupPermission(
  groupId: string,
  feature: string,
  action: string,
  effect: EffectChoice
): Promise<Result> {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!validCell(feature, action)) return { error: "Unknown feature or action" };

  if (effect === "INHERIT") {
    await prismadb.groupPermission.deleteMany({ where: { groupId, feature, action } });
  } else {
    await prismadb.groupPermission.upsert({
      where: { groupId_feature_action: { groupId, feature, action } },
      create: { groupId, feature, action, effect },
      update: { effect },
    });
  }
  refresh();
  return { data: true };
}

export async function setUserPermission(
  userId: string,
  feature: string,
  action: string,
  effect: EffectChoice
): Promise<Result> {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!validCell(feature, action)) return { error: "Unknown feature or action" };

  if (effect === "INHERIT") {
    await prismadb.userPermission.deleteMany({ where: { userId, feature, action } });
  } else {
    await prismadb.userPermission.upsert({
      where: { userId_feature_action: { userId, feature, action } },
      create: { userId, feature, action, effect },
      update: { effect },
    });
  }
  refresh();
  return { data: true };
}

export async function clearUserPermissions(userId: string): Promise<Result> {
  const denied = await requireAdmin();
  if (denied) return denied;
  await prismadb.userPermission.deleteMany({ where: { userId } });
  refresh();
  return { data: true };
}
