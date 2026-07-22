"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  requireAuthenticated,
  assertCanWriteContact,
  assertCanWriteOpportunity,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const unlinkOpportunity = async (data: {
  contactId: string;
  opportunityId: string;
}) => {
  const { contactId, opportunityId } = data;

  if (!contactId) return { error: "contactId is required" };
  if (!opportunityId) return { error: "opportunityId is required" };

  // Bidirectional junction row: both endpoints must be writable by the caller.
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }
  try {
    await assertCanWriteContact(user, contactId);
    await assertCanWriteOpportunity(user, opportunityId);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  try {
    await prismadb.contactsToOpportunities.delete({
      where: {
        contact_id_opportunity_id: {
          contact_id: contactId,
          opportunity_id: opportunityId,
        },
      },
    });
    revalidatePath("/[locale]/(routes)/crm/contacts", "page");
    return { success: true };
  } catch (error) {
    console.log("[UNLINK_OPPORTUNITY]", error);
    return { error: "Failed to unlink opportunity" };
  }
};
