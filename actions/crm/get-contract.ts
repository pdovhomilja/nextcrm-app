"use server";
import { prismadb } from "@/lib/prisma";

export const getContract = async (contractId: string) => {
  return prismadb.crm_Contracts.findUnique({
    where: { id: contractId, deletedAt: null },
    include: {
      assigned_account: { select: { id: true, name: true } },
      assigned_to_user: { select: { id: true, name: true } },
      lineItems: {
        include: {
          product: {
            select: { id: true, name: true, status: true },
          },
        },
        orderBy: { sort_order: "asc" },
      },
    },
  });
};
