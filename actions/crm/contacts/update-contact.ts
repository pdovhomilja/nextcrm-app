"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { inngest } from "@/inngest/client";

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
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  const userId = session.user.id;
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

  try {
    const contact = await prismadb.crm_Contacts.update({
      where: { id },
      data: {
        v: 0,
        updatedBy: userId,
        accountsIDs: assigned_account ?? undefined,
        assigned_to: assigned_to ?? undefined,
        contact_type_id: contact_type_id ?? undefined,
        birthday:
          birthday_day && birthday_month && birthday_year
            ? birthday_day + "/" + birthday_month + "/" + birthday_year
            : null,
        ...rest,
      },
    });
    void inngest.send({ name: "crm/contact.saved", data: { record_id: contact.id } });
    revalidatePath("/[locale]/(routes)/crm/contacts", "page");
    return { data: contact };
  } catch (error) {
    console.log("[UPDATE_CONTACT]", error);
    return { error: "Failed to update contact" };
  }
};
