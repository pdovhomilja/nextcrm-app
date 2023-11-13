import { prismadb } from "@/lib/prisma";

export const getInvoicesCount = async () => {
  const data = await prismadb.invoices.count();
  return data;
};
