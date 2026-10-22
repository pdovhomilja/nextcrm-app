import { prismadb } from "@/lib/prisma";
import { getExchangeRates, convertAmount } from "@/lib/currency";
import { Decimal } from "@prisma/client/runtime/client";

export const getExpectedRevenue = async (displayCurrency: string) => {
  const [groups, rates] = await Promise.all([
    prismadb.crm_Opportunities.groupBy({
      by: ["currency"],
      where: {
        status: "ACTIVE",
        deletedAt: null,
      },
      _sum: { budget: true },
    }),
    getExchangeRates(),
  ]);

  let total = new Decimal(0);
  for (const group of groups) {
    const budget = new Decimal(group._sum.budget?.toString() ?? "0");
    const from = group.currency || displayCurrency;
    const converted = convertAmount(budget, from, displayCurrency, rates);
    total = total.add(converted ?? budget);
  }

  return total.toNumber();
};
