"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const deleteContact = async (contactId: string) => {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  if (!contactId) return { error: "contactId is required" };

  try {
    await prismadb.crm_Contacts.delete({ where: { id: contactId } });
    revalidatePath("/[locale]/(routes)/crm/contacts", "page");
    return { success: true };
  } catch (error) {
    console.log("[DELETE_CONTACT]", error);
    return { error: "Failed to delete contact" };
  }
};
