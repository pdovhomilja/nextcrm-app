"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { pluginRuleErrorMessage } from "@/lib/plugins/action-errors";
import { inngest } from "@/inngest/client";
import { writeAuditLog, diffObjects } from "@/lib/audit-log";
import {
  requireAuthenticated,
  assertCanWriteAccount,
  assertAssignableUser,
  isManagerOrAdmin,
  PARTNER_EDIT,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import { accountFieldsSchema, priceListChoiceError } from "./account-input";

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
  pricelist_id?: string | null;
}) => {
  const { id, ...fields } = data ?? {};
  if (!id) return { error: "id is required" };
  const parsed = accountFieldsSchema.partial().safeParse(fields);
  if (!parsed.success) return { error: "Invalid input" };
  const rest = parsed.data;

  let user;
  try {
    user = await requireAuthenticated({ partner: true });
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }
  try {
    await assertCanWriteAccount(user, id, PARTNER_EDIT);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  const before = await prismadb.crm_Accounts.findUnique({ where: { id, deletedAt: null } });
  // Ids from the input, as in createAccount. The form resends the stored
  // assignee, so it is checked only when it changes; a partner's assigned_to
  // is ignored below.
  try {
    if (rest.assigned_to && user.role !== "partner" && rest.assigned_to !== before?.assigned_to) {
      await assertAssignableUser(user, rest.assigned_to);
    }
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }
  // The form resends the stored price list, so only a change is checked.
  const pricelistChanged =
    rest.pricelist_id !== undefined && (rest.pricelist_id || null) !== (before?.pricelist_id ?? null);
  if (pricelistChanged) {
    if (!isManagerOrAdmin(user)) return { error: "Forbidden" };
    if (rest.pricelist_id) {
      const error = await priceListChoiceError(user, rest.pricelist_id);
      if (error) return { error };
    }
  }

  try {
    const account = await prismadb.crm_Accounts.update({
      where: { id },
      data: {
        ...rest,
        v: 0,
        updatedBy: user.id,
        ...(rest.pricelist_id === "" ? { pricelist_id: null } : {}),
        ...(rest.industry === "" ? { industry: null } : {}),
        // An empty assignee keeps the current one, as in updateContact.
        ...(rest.assigned_to === "" ? { assigned_to: undefined } : {}),
        // The partner is set only through setAccountPartner (admin/manager).
        partnerUserId: undefined,
        // A partner edits ordinary fields only, never the internal owner.
        ...(user.role === "partner" ? { assigned_to: undefined } : {}),
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
    const ruleMessage = await pluginRuleErrorMessage(error);
    if (ruleMessage) return { error: ruleMessage };
    console.log("[UPDATE_ACCOUNT]", error);
    return { error: "Failed to update account" };
  }
};
