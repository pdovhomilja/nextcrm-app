"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { pluginRuleErrorMessage } from "@/lib/plugins/action-errors";
import { inngest } from "@/inngest/client";
import { writeAuditLog } from "@/lib/audit-log";
import {
  requireAuthenticated,
  assertAssignableUser,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

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
  pricelist_id?: string | null;
}) => {
  // Plain create: the row is owned by its creator, so no object-level write
  // assert on the new row; the ids it points at are checked below.
  let user;
  try {
    user = await requireAuthenticated({ partner: true });
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }

  const { name } = data;
  if (!name) return { error: "name is required" };

  // Ids from the input: the assignee must be assignable (a partner's is
  // ignored below), the price list real. member_of is a free-text label.
  try {
    if (data.assigned_to && user.role !== "partner") await assertAssignableUser(user, data.assigned_to);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }
  if (data.pricelist_id) {
    const pricelist = await prismadb.crm_PriceLists.findUnique({ where: { id: data.pricelist_id }, select: { id: true } });
    if (!pricelist) return { error: "Price list not found" };
  }

  try {
    const account = await prismadb.crm_Accounts.create({
      data: {
        v: 0,
        createdBy: user.id,
        updatedBy: user.id,
        ...data,
        // A partner's new account has him as partner and no internal owner
        // yet (spec § Writes): admins/managers find it among unowned accounts.
        assigned_to: user.role === "partner" ? null : data.assigned_to || user.id,
        industry: data.industry || undefined,
        pricelist_id: data.pricelist_id || undefined,
        // The partner is set only through setAccountPartner (admin/manager),
        // except that a partner's own new account names him.
        partnerUserId: user.role === "partner" ? user.id : undefined,
        status: "Active",
      },
    });
    await writeAuditLog({
      entityType: "account",
      entityId: account.id,
      action: "created",
      changes: null,
      userId: user.id,
    });
    void inngest.send({ name: "crm/account.saved", data: { record_id: account.id } });
    revalidatePath("/[locale]/(routes)/crm/accounts", "page");
    return { data: account };
  } catch (error) {
    const ruleMessage = await pluginRuleErrorMessage(error);
    if (ruleMessage) return { error: ruleMessage };
    console.log("[CREATE_ACCOUNT]", error);
    return { error: "Failed to create account" };
  }
};
