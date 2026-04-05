"use server";
import { prismadb } from "@/lib/prisma";

export const getCurrencies = async () => {
  try {
    const currencies = await prismadb.currency.findMany({
      where: { isEnabled: true },
      select: { code: true, name: true, symbol: true },
      orderBy: { code: "asc" },
    });
    return { data: currencies };
  } catch (error) {
    return { error: "Failed to fetch currencies" };
  }
};
