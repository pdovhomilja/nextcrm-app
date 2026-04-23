import { prismadb } from "@/lib/prisma";

export async function getInvoicesByAccountId(accountId: string) {
  return prismadb.invoices.findMany({
    where: { accountId },
    orderBy: { createdAt: "desc" },
    include: {
      account: { select: { id: true, name: true } },
      series: { select: { id: true, name: true } },
    },
  });
}
