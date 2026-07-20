"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { inngest } from "@/inngest/client";
import { writeAuditLog, diffObjects } from "@/lib/audit-log";
import {
  requireAuthenticated,
  assertCanWriteContact,
  assertCanWriteAccount,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const updateContact = async (data: {
  id: string;
  assigned_to?: string;
  assigned_account?: string | null;
  birthday_day?: string | null;
  birthday_month?: string | null;
  birthday_year?: string | null;
  description?: string | null;
  email?: string;
  personal_email?: string | null;
  first_name?: string | null;
  last_name?: string;
  office_phone?: string | null;
  mobile_phone?: string | null;
  website?: string | null;
  status?: boolean;
  social_twitter?: string | null;
  social_facebook?: string | null;
  social_linkedin?: string | null;
  social_skype?: string | null;
  social_instagram?: string | null;
  social_youtube?: string | null;
  social_tiktok?: string | null;
  contact_type_id?: string;
}) => {
  const {
    id,
    assigned_to,
    assigned_account,
    birthday_day,
    birthday_month,
    birthday_year,
    contact_type_id,
    ...rest
  } = data;

  if (!id) return { error: "id is required" };

  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }
  try {
    await assertCanWriteContact(user, id);
    // Parent-write: relinking the contact to an account requires write on it.
    if (assigned_account) await assertCanWriteAccount(user, assigned_account);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }
  const userId = user.id;

  try {
    const before = await prismadb.crm_Contacts.findUnique({ where: { id, deletedAt: null } });
    const contact = await prismadb.crm_Contacts.update({
      where: { id },
      data: {
        v: 0,
        updatedBy: userId,
        accountsIDs: assigned_account || undefined,
        assigned_to: assigned_to || undefined,
        contact_type_id: contact_type_id || undefined,
        birthday:
          birthday_day && birthday_month && birthday_year
            ? birthday_day + "/" + birthday_month + "/" + birthday_year
            : null,
        ...rest,
      } as any,
    });
    const changes = before ? diffObjects(before as Record<string, unknown>, contact as Record<string, unknown>) : null;
    await writeAuditLog({
      entityType: "contact",
      entityId: contact.id,
      action: "updated",
      changes,
      userId: user.id,
    });
    void inngest.send({ name: "crm/contact.saved", data: { record_id: contact.id } });
    revalidatePath("/[locale]/(routes)/crm/contacts", "page");
    return { data: contact };
  } catch (error) {
    console.log("[UPDATE_CONTACT]", error);
    return { error: "Failed to update contact" };
  }
};
