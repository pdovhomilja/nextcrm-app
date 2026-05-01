import { prismadb } from "@/lib/prisma";
import { AuthzUser } from "../session";

type ContactWhere = NonNullable<
  Parameters<typeof prismadb.crm_Contacts.updateMany>[0]
>["where"];
type TargetWhere = NonNullable<
  Parameters<typeof prismadb.crm_Targets.updateMany>[0]
>["where"];

function contactScopedWhere(user: AuthzUser, contactId: string): ContactWhere {
  if (user.role === "admin" || user.role === "manager") {
    return { id: contactId };
  }
  // user role: own contact (assigned, created_by, or legacy createdBy).
  // TODO(phase-4): include linked account scope (assigned/creator/watcher).
  return {
    id: contactId,
    OR: [
      { assigned_to: user.id },
      { created_by: user.id },
      { createdBy: user.id },
    ],
  };
}

function targetScopedWhere(user: AuthzUser, targetId: string): TargetWhere {
  if (user.role === "admin" || user.role === "manager") {
    return { id: targetId };
  }
  return { id: targetId, created_by: user.id };
}

export async function tryScopedUpdateContact(
  user: AuthzUser,
  contactId: string,
  data: Record<string, string>,
): Promise<boolean> {
  const result = await prismadb.crm_Contacts.updateMany({
    where: contactScopedWhere(user, contactId),
    data: { ...data, updatedBy: user.id },
  });
  return result.count > 0;
}

export async function tryScopedUpdateTarget(
  user: AuthzUser,
  targetId: string,
  data: Record<string, string>,
): Promise<boolean> {
  const result = await prismadb.crm_Targets.updateMany({
    where: targetScopedWhere(user, targetId),
    data: { ...data, updatedBy: user.id },
  });
  return result.count > 0;
}
