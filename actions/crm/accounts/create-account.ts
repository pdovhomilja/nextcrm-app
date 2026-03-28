"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { inngest } from "@/inngest/client";
import { writeAuditLog } from "@/lib/audit-log";

export const createAccount = async (data: {
  name: string;
  office_phone?: string;
  website?: string;
  fax?: string;
  company_id?: string;
  vat?: string;
  email?: string;
  billing_street?: string;
  billing_postal_code?: string;
  billing_city?: string;
  billing_state?: string;
  billing_country?: string;
  shipping_street?: string;
  shipping_postal_code?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_country?: string;
  description?: string;
  assigned_to?: string;
  status?: string;
  annual_revenue?: string;
  member_of?: string;
  industry?: string;
}) => {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  const { name } = data;
  if (!name) return { error: "name is required" };

  try {
    const account = await prismadb.crm_Accounts.create({
      data: {
        v: 0,
        createdBy: session.user.id,
        updatedBy: session.user.id,
        ...data,
        status: "Active",
      },
    });
    await writeAuditLog({
      entityType: "account",
      entityId: account.id,
      action: "created",
      changes: null,
      userId: session.user.id,
    });
    void inngest.send({ name: "crm/account.saved", data: { record_id: account.id } });
    revalidatePath("/[locale]/(routes)/crm/accounts", "page");
    return { data: account };
  } catch (error) {
    console.log("[CREATE_ACCOUNT]", error);
    return { error: "Failed to create account" };
  }
};
