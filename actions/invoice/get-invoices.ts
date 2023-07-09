import { prismadb } from "@/lib/prisma";

export const getInvoices = async () => {
  const data = await prismadb.invoices.findMany({
    include: {
      assigned_user: {
        select: {
          name: true,
        },
      },
    },
  });
  return data;
};
