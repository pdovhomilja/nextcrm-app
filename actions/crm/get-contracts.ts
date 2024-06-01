"use server";

import { prismadb } from "@/lib/prisma";

export const getContracts = async () => {
  const data = await prismadb.crm_Contracts.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
  return data;
};
