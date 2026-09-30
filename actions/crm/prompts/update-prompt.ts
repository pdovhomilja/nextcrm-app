"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { writeAuditLog, diffObjects } from "@/lib/audit-log";
import {
  requireAuthenticated,
  requireRole,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

async function loadAndAuthorize(id: string) {
  const user = await requireAuthenticated();
  const existing = await prismadb.crm_Ai_Prompt.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return { error: "Prompt not found" as const };
  if (existing.scope === "ORG") {
    await requireRole(["admin"]);
  } else if (existing.user_id !== user.id) {
    throw new AuthorizationError();
  }
  return { user, existing };
}

export const updatePrompt = async (data: { id: string; name: string; body: string }) => {
  const name = data.name?.trim();
  const body = data.body?.trim();
  if (!name) return { error: "Name is required" };
  if (!body) return { error: "Prompt body is required" };
  try {
    const res = await loadAndAuthorize(data.id);
    if ("error" in res) return res;
    const updated = await prismadb.crm_Ai_Prompt.update({
      where: { id: data.id },
      data: { name, body },
    });
    await writeAuditLog({
      entityType: "prompt",
      entityId: data.id,
      action: "updated",
      changes: diffObjects(
        res.existing as unknown as Record<string, unknown>,
        updated as unknown as Record<string, unknown>
      ),
      userId: res.user.id,
    });
    revalidatePath("/[locale]/(routes)/campaigns/prompts", "page");
    return { data: updated };
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }
};
