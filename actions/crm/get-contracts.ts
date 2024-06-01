"use server";

import { prismadb } from "@/lib/prisma";

export const getContractsWithIncludes = async () => {
  const data = await prismadb.crm_Contracts.findMany({
    include: {
      assigned_to_user: {
        select: {
          name: true,
        },
      },
      assigned_account: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  return data;
};
