"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit-log";

export const restoreContact = async (contactId: string) => {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };
  if (!session.user.role === "admin") return { error: "Forbidden" };
  if (!contactId) return { error: "contactId is required" };

  try {
    await prismadb.crm_Contacts.update({
      where: { id: contactId },
      data: { deletedAt: null, deletedBy: null },
    });
    await writeAuditLog({
      entityType: "contact",
      entityId: contactId,
      action: "restored",
      changes: null,
      userId: session.user.id,
    });
    revalidatePath("/[locale]/(routes)/crm/contacts", "page");
    revalidatePath("/[locale]/(routes)/admin/audit-log", "page");
    return { success: true };
  } catch (error) {
    console.log("[RESTORE_CONTACT]", error);
    return { error: "Failed to restore contact" };
  }
};
