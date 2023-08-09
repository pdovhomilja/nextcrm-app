import { prismadb } from "@/lib/prisma";

export const getInvoices = async () => {
  const data = await prismadb.invoices.findMany({
    include: {
      users: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      date_created: "desc",
    },
  });

  return data;
};
