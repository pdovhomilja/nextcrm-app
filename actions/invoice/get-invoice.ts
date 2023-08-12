import { prismadb } from "@/lib/prisma";

export const getInvoice = async (invoiceId: string) => {
  const data = await prismadb.invoices.findUniqueOrThrow({
    where: {
      id: invoiceId,
    },
    include: {
      users: {
        select: {
          name: true,
        },
      },
    },
  });

  return data;
};
