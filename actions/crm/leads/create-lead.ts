"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import sendEmail from "@/lib/sendmail";

export const createLead = async (data: {
  first_name?: string;
  last_name: string;
  company?: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  description?: string;
  lead_source?: string;
  refered_by?: string;
  campaign?: string;
  assigned_to?: string;
  accountIDs?: string;
}) => {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  const userId = session.user.id;
  const {
    first_name,
    last_name,
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
  } = data;

  try {
    const lead = await prismadb.crm_Leads.create({
      data: {
        v: 1,
        createdBy: userId,
        updatedBy: userId,
        firstName: first_name,
        lastName: last_name,
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
        status: "NEW",
        type: "DEMO",
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
              ? `New lead ${first_name} ${last_name} has been added to the system and assigned to you.`
              : `Nová příležitost ${first_name} ${last_name} byla přidána do systému a přidělena vám.`,
          text:
            notifyRecipient.userLanguage === "en"
              ? `New lead ${first_name} ${last_name} has been added to the system and assigned to you. You can click here for detail: ${process.env.NEXT_PUBLIC_APP_URL}/crm/leads/${lead.id}`
              : `Nová příležitost ${first_name} ${last_name} byla přidána do systému a přidělena vám. Detaily naleznete zde: ${process.env.NEXT_PUBLIC_APP_URL}/crm/leads/${lead.id}`,
        });
      }
    }

    revalidatePath("/[locale]/(routes)/crm/leads", "page");
    return { data: lead };
  } catch (error) {
    console.log("[CREATE_LEAD]", error);
    return { error: "Failed to create lead" };
  }
};
