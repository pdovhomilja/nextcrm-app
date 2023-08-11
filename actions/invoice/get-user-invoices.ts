import { prismadb } from "@/lib/prisma";

export const getUserInvoices = async (userId: string) => {
  const data = await prismadb.invoices.findMany({
    where: {
      assigned_user_id: userId,
    },

    orderBy: {
      date_created: "desc",
    },
  });

  return data;
};
