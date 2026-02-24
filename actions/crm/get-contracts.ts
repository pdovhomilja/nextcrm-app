"use server";

import { cache } from "react";
import { prismadb } from "@/lib/prisma";

export const getContractsWithIncludes = cache(async () => {
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
});

export const getContractsByAccountId = async (accountId: string) => {
  const data = await prismadb.crm_Contracts.findMany({
    where: {
      account: accountId,
    },
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
  });
  return data;
};
