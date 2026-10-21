"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { invalidateAfterContactWrite } from "@/lib/server/invalidate-after-write";
import { pluginRuleErrorMessage } from "@/lib/plugins/action-errors";
import { writeAuditLog } from "@/lib/audit-log";
import {
  requireFeature,
  assertCanWriteContact,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const deleteContact = async (contactId: string) => {
  if (!contactId) return { error: "contactId is required" };

  let user;
  try {
    user = await requireFeature("contacts", "delete");
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { error: "You don't have permission to do this." };
    throw e;
  }
  try {
    await assertCanWriteContact(user, contactId);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  try {
    await prismadb.crm_Contacts.update({
      where: { id: contactId },
      data: { deletedAt: new Date(), deletedBy: user.id },
    });
    await writeAuditLog({
      entityType: "contact",
      entityId: contactId,
      action: "deleted",
      changes: null,
      userId: user.id,
    });
    revalidatePath("/[locale]/(routes)/crm/contacts", "page");
    invalidateAfterContactWrite(user);
    return { success: true };
  } catch (error) {
    const ruleMessage = await pluginRuleErrorMessage(error);
    if (ruleMessage) return { error: ruleMessage };
    console.log("[DELETE_CONTACT]", error);
    return { error: "Failed to delete contact" };
  }
};
