import { prismadb } from "@/lib/prisma";
import { requireAuthenticated } from "@/lib/authz";
import { invoiceReadScopeWhere } from "@/lib/invoices/permissions";

export async function getInvoices() {
  const user = await requireAuthenticated();
  return prismadb.invoices.findMany({
    where: invoiceReadScopeWhere(user),
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      account: { select: { id: true, name: true } },
      series: { select: { id: true, name: true } },
    },
  });
}

export async function getInvoiceById(id: string) {
  const user = await requireAuthenticated();
  return prismadb.invoices.findFirst({
    where: { id, ...invoiceReadScopeWhere(user) },
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
