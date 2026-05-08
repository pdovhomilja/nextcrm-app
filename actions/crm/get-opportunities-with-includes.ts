"use server";

import { cache } from "react";
import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  opportunityReadScopeWhere,
  AuthenticationError,
} from "@/lib/authz";

export const getOpportunitiesFull = cache(async () => {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return [];
    throw e;
  }

  const data = await prismadb.crm_Opportunities.findMany({
    where: { ...opportunityReadScopeWhere(user) },
    include: {
      assigned_account: {
        select: {
          name: true,
        },
      },
      assigned_sales_stage: {
        select: {
          name: true,
        },
      },
      assigned_to_user: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      created_on: "desc",
    },
  });

  return data;
});
