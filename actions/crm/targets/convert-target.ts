"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function convertTarget(
  targetId: string
): Promise<{ accountId: string; contactId: string } | { error: string }> {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  const target = await prismadb.crm_Targets.findUnique({ where: { id: targetId } });
  if (!target) return { error: "Target not found" };

  // Guard: need at least a name for the Account and Contact
  if (!target.company && !target.last_name) {
    return { error: "Target needs a company name or last name to convert" };
  }

  // Idempotency: already converted
  if (target.converted_at && target.converted_account_id && target.converted_contact_id) {
    return {
      accountId: target.converted_account_id,
      contactId: target.converted_contact_id,
    };
  }

  try {
    const [account, contact] = await prismadb.$transaction(async (tx) => {
      const acct = await tx.crm_Accounts.create({
        data: {
          v: 0,
          name: (target.company || target.last_name) as string,
          email: target.company_email ?? undefined,
          office_phone: target.company_phone ?? undefined,
          website: target.company_website ?? undefined,
          billing_city: target.city ?? undefined,
          billing_country: target.country ?? undefined,
          employees: target.employees ?? undefined,
          description: target.description ?? undefined,
          status: "Active",
          createdBy: (session.user as any).id,
        },
      });

      const ctct = await tx.crm_Contacts.create({
        data: {
          v: 0,
          first_name: target.first_name ?? undefined,
          last_name: target.last_name,
          email: target.email ?? undefined,
          personal_email: target.personal_email ?? undefined,
          mobile_phone: target.mobile_phone ?? undefined,
          office_phone: target.office_phone ?? undefined,
          position: target.position ?? undefined,
          social_linkedin: target.social_linkedin ?? undefined,
          social_twitter: target.social_x ?? undefined,
          social_instagram: target.social_instagram ?? undefined,
          social_facebook: target.social_facebook ?? undefined,
          accountsIDs: acct.id,
          created_by: (session.user as any).id,
        },
      });

      await tx.crm_Targets.update({
        where: { id: targetId },
        data: {
          converted_at: new Date(),
          converted_account_id: acct.id,
          converted_contact_id: ctct.id,
          updatedBy: (session.user as any).id,
        },
      });

      return [acct, ctct];
    });

    revalidatePath("/campaigns/targets");
    revalidatePath("/crm/accounts");

    return { accountId: account.id, contactId: contact.id };
  } catch (error) {
    console.error("[convertTarget] Error:", error);
    return { error: "Failed to convert target" };
  }
}
