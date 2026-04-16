import { prismadb } from "@/lib/prisma";

export async function getInvoices() {
  return prismadb.invoices.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      account: { select: { id: true, name: true } },
      series: { select: { id: true, name: true } },
    },
  });
}

export async function getInvoiceById(id: string) {
  return prismadb.invoices.findUnique({
    where: { id },
    include: {
      lineItems: {
        include: { product: true, taxRate: true },
        orderBy: { position: "asc" },
      },
      payments: { orderBy: { paidAt: "desc" } },
      activity: { orderBy: { createdAt: "desc" } },
      attachments: true,
      account: true,
      series: true,
    },
  });
}
