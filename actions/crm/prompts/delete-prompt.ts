"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit-log";
import {
  requireAuthenticated,
  requireRole,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const deletePrompt = async ({ id }: { id: string }) => {
  try {
    const user = await requireAuthenticated();
    const existing = await prismadb.crm_Ai_Prompt.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return { error: "Prompt not found" };
    if (existing.kind === "HOMEPAGE_BASE") await requireRole(["admin"]);
    if (existing.scope === "ORG") await requireRole(["admin"]);
    else if (existing.user_id !== user.id) throw new AuthorizationError();

    await prismadb.crm_Ai_Prompt.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: user.id },
    });
    await writeAuditLog({
      entityType: "prompt",
      entityId: id,
      action: "deleted",
      changes: null,
      userId: user.id,
    });
    revalidatePath("/[locale]/(routes)/campaigns/prompts", "page");
    return { data: { id } };
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }
};
