"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";

export const getSalesType = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }

  // Sales types are shared reference data across all organizations
  const data = await prismadb.crm_Opportunities_Type.findMany();
  return data;
};
