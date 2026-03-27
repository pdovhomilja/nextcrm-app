"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import sendEmail from "@/lib/sendmail";
import { inngest } from "@/inngest/client";

export const createContact = async (data: {
  assigned_to?: string;
  assigned_account?: string;
  birthday_day?: string;
  birthday_month?: string;
  birthday_year?: string;
  description?: string;
  email?: string;
  personal_email?: string;
  first_name?: string;
  last_name: string;
  office_phone?: string;
  mobile_phone?: string;
  website?: string;
  status?: boolean;
  social_twitter?: string;
  social_facebook?: string;
  social_linkedin?: string;
  social_skype?: string;
  social_instagram?: string;
  social_youtube?: string;
  social_tiktok?: string;
  contact_type_id?: string;
}) => {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  const userId = session.user.id;
  const {
    assigned_to,
    assigned_account,
    birthday_day,
    birthday_month,
    birthday_year,
    contact_type_id,
    ...rest
  } = data;

  try {
    const contact = await prismadb.crm_Contacts.create({
      data: {
        v: 0,
        createdBy: userId,
        updatedBy: userId,
        ...(assigned_account
          ? {
              assigned_accounts: {
                connect: { id: assigned_account },
              },
            }
          : {}),
        ...(assigned_to
          ? {
              assigned_to_user: {
                connect: { id: assigned_to },
              },
            }
          : {}),
        ...(contact_type_id
          ? { contact_type: { connect: { id: contact_type_id } } }
          : {}),
        birthday:
          birthday_day && birthday_month && birthday_year
            ? birthday_day + "/" + birthday_month + "/" + birthday_year
            : null,
        ...rest,
      },
    });

    if (assigned_to && assigned_to !== userId) {
      const notifyRecipient = await prismadb.users.findFirst({
        where: { id: assigned_to },
      });

      if (notifyRecipient) {
        await sendEmail({
          from: process.env.EMAIL_FROM as string,
          to: notifyRecipient.email || "info@softbase.cz",
          subject:
            notifyRecipient.userLanguage === "en"
              ? `New contact ${data.first_name} ${data.last_name} has been added to the system and assigned to you.`
              : `Nový kontakt ${data.first_name} ${data.last_name} byla přidána do systému a přidělena vám.`,
          text:
            notifyRecipient.userLanguage === "en"
              ? `New contact ${data.first_name} ${data.last_name} has been added to the system and assigned to you. You can click here for detail: ${process.env.NEXT_PUBLIC_APP_URL}/crm/contacts/${contact.id}`
              : `Nový kontakt ${data.first_name} ${data.last_name} byla přidán do systému a přidělena vám. Detaily naleznete zde: ${process.env.NEXT_PUBLIC_APP_URL}/crm/contact/${contact.id}`,
        });
      }
    }

    void inngest.send({ name: "crm/contact.saved", data: { record_id: contact.id } });
    revalidatePath("/[locale]/crm/contacts", "page");
    return { data: contact };
  } catch (error) {
    console.log("[CREATE_CONTACT]", error);
    return { error: "Failed to create contact" };
  }
};
