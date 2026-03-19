"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import sendEmail from "@/lib/sendmail";

export const updateLead = async (data: {
  id: string;
  firstName?: string | null;
  lastName: string;
  company?: string | null;
  jobTitle?: string | null;
  email?: string | null;
  phone?: string | null;
  description?: string | null;
  lead_source?: string | null;
  refered_by?: string | null;
  campaign?: string | null;
  assigned_to?: string;
  status?: string;
  type?: string;
  accountIDs?: string;
}) => {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  const userId = session.user.id;
  const {
    id,
    firstName,
    lastName,
    company,
    jobTitle,
    email,
    phone,
    description,
    lead_source,
    refered_by,
    campaign,
    assigned_to,
    accountIDs,
    status,
    type,
  } = data;

  if (!id) return { error: "id is required" };

  try {
    const lead = await prismadb.crm_Leads.update({
      where: { id },
      data: {
        v: 1,
        updatedBy: userId,
        firstName,
        lastName,
        company,
        jobTitle,
        email,
        phone,
        description,
        lead_source,
        refered_by,
        campaign,
        assigned_to: assigned_to || userId,
        accountsIDs: accountIDs,
        status,
        type,
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
              ? `New lead ${firstName} ${lastName} has been added to the system and assigned to you.`
              : `Nová příležitost ${firstName} ${lastName} byla přidána do systému a přidělena vám.`,
          text:
            notifyRecipient.userLanguage === "en"
              ? `New lead ${firstName} ${lastName} has been added to the system and assigned to you. You can click here for detail: ${process.env.NEXT_PUBLIC_APP_URL}/crm/leads/${lead.id}`
              : `Nová příležitost ${firstName} ${lastName} byla přidána do systému a přidělena vám. Detaily naleznete zde: ${process.env.NEXT_PUBLIC_APP_URL}/crm/leads/${lead.id}`,
        });
      }
    }

    revalidatePath("/[locale]/(routes)/crm/leads", "page");
    return { data: lead };
  } catch (error) {
    console.log("[UPDATE_LEAD]", error);
    return { error: "Failed to update lead" };
  }
};
