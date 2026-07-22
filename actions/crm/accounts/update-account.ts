"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { inngest } from "@/inngest/client";
import { writeAuditLog, diffObjects } from "@/lib/audit-log";
import {
  requireAuthenticated,
  assertCanWriteAccount,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const updateAccount = async (data: {
  id: string;
  name?: string;
  office_phone?: string | null;
  website?: string | null;
  fax?: string | null;
  company_id?: string;
  vat?: string | null;
  email?: string;
  billing_street?: string;
  billing_postal_code?: string;
  billing_city?: string;
  billing_state?: string | null;
  billing_country?: string;
  shipping_street?: string | null;
  shipping_postal_code?: string | null;
  shipping_city?: string | null;
  shipping_state?: string | null;
  shipping_country?: string | null;
  description?: string | null;
  assigned_to?: string;
  status?: string | null;
  annual_revenue?: string | null;
  member_of?: string | null;
  industry?: string;
}) => {
  const { id, ...rest } = data;
  if (!id) return { error: "id is required" };

  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }
  try {
    await assertCanWriteAccount(user, id);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  try {
    const before = await prismadb.crm_Accounts.findUnique({ where: { id, deletedAt: null } });
    const account = await prismadb.crm_Accounts.update({
      where: { id },
      data: {
        v: 0,
        updatedBy: user.id,
        ...rest,
      },
    });
    const changes = before ? diffObjects(
      before as Record<string, unknown>,
      account as Record<string, unknown>
    ) : null;
    await writeAuditLog({
      entityType: "account",
      entityId: account.id,
      action: "updated",
      changes,
      userId: user.id,
    });
    void inngest.send({ name: "crm/account.saved", data: { record_id: account.id } });
    revalidatePath("/[locale]/(routes)/crm/accounts", "page");
    return { data: account };
  } catch (error) {
    console.log("[UPDATE_ACCOUNT]", error);
    return { error: "Failed to update account" };
  }
};
