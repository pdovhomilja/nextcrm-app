"use server";
import { prismadb } from "@/lib/prisma";

export const getAccounts = async () => {
  try {
    const accounts = await prismadb.crm_Accounts.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return { data: accounts };
  } catch (error) {
    return { error: "Failed to fetch accounts" };
  }
};
