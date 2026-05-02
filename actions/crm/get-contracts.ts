"use server";

import { cache } from "react";
import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  contractReadScopeWhere,
  assertCanReadAccount,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const getContractsWithIncludes = cache(async () => {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return [];
    throw e;
  }

  const data = await prismadb.crm_Contracts.findMany({
    where: { ...contractReadScopeWhere(user) },
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
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return [];
    throw e;
  }

  try {
    await assertCanReadAccount(user, accountId);
  } catch (e) {
    if (e instanceof AuthorizationError) return [];
    throw e;
  }

  const data = await prismadb.crm_Contracts.findMany({
    where: {
      account: accountId,
      ...contractReadScopeWhere(user),
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
