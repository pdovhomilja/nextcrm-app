import { prismadb } from "@/lib/prisma";
import { requireAuthenticated, AuthenticationError } from "@/lib/authz";
import { campaignReadScopeWhere } from "@/lib/authz/scopes/crm";

// Scoped to what the caller can read (no global totals for user/partner).
export const getCampaignsCount = async () => {
  try {
    const user = await requireAuthenticated({ partner: true });
    return await prismadb.crm_campaigns.count({ where: campaignReadScopeWhere(user) });
  } catch (e) {
    if (e instanceof AuthenticationError) return 0;
    throw e;
  }
};
