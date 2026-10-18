import { prismadb } from "@/lib/prisma";
import { getExchangeRates, convertAmount } from "@/lib/currency";
import { Decimal } from "@prisma/client/runtime/client";
import {
  requireAuthenticated,
  opportunityReadScopeWhere,
  AuthenticationError,
} from "@/lib/authz";

// Sum over the opportunities the caller can read.
export const getExpectedRevenue = async (displayCurrency: string) => {
  let user;
  try {
    user = await requireAuthenticated({ partner: true });
  } catch (e) {
    if (e instanceof AuthenticationError) return 0;
    throw e;
  }
  const activeOpportunities = await prismadb.crm_Opportunities.findMany({
    where: {
      status: "ACTIVE",
      ...opportunityReadScopeWhere(user),
    },
    select: {
      budget: true,
      currency: true,
    },
  });

  const rates = await getExchangeRates();

  let total = new Decimal(0);
  for (const opp of activeOpportunities) {
    const budget = new Decimal(opp.budget?.toString() ?? "0");
    const from = opp.currency || displayCurrency;
    const converted = convertAmount(budget, from, displayCurrency, rates);
    total = total.add(converted ?? budget);
  }

  return total.toNumber();
};
