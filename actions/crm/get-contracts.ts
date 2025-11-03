"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";

export const getContractsWithIncludes = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized: No organization context");
  }

  const data = await prismadb.crm_Contracts.findMany({
    where: {
      organizationId: session.user.organizationId,
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
    orderBy: {
      createdAt: "desc",
    },
  });
  return data;
};

export const getContractsByAccountId = async (accountId: string) => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized: No organization context");
  }

  const data = await prismadb.crm_Contracts.findMany({
    where: {
      account: accountId,
      organizationId: session.user.organizationId,
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
