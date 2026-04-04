import { prismadb } from "@/lib/prisma";
import { getExchangeRates, convertAmount } from "@/lib/currency";
import { Decimal } from "@prisma/client/runtime/client";

export const getExpectedRevenue = async (displayCurrency: string) => {
  const activeOpportunities = await prismadb.crm_Opportunities.findMany({
    where: {
      status: "ACTIVE",
      deletedAt: null,
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
