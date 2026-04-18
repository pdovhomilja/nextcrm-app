import Container from "@/app/[locale]/(routes)/components/ui/Container";
import { getTranslations } from "next-intl/server";
import { getInvoices } from "./data/get-invoices";
import { InvoicesTable } from "./components/invoices-table";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function InvoicesPage() {
  const t = await getTranslations("InvoicesPage");
  const invoices = await getInvoices();

  const statusLabels: Record<string, string> = {
    DRAFT: t("status.DRAFT"),
    ISSUED: t("status.ISSUED"),
    SENT: t("status.SENT"),
    PARTIALLY_PAID: t("status.PARTIALLY_PAID"),
    PAID: t("status.PAID"),
    OVERDUE: t("status.OVERDUE"),
    CANCELLED: t("status.CANCELLED"),
    DISPUTED: t("status.DISPUTED"),
    REFUNDED: t("status.REFUNDED"),
    WRITTEN_OFF: t("status.WRITTEN_OFF"),
  };

  const tableLabels = {
    number: t("table.number"),
    account: t("table.account"),
    issueDate: t("table.issueDate"),
    dueDate: t("table.dueDate"),
    total: t("table.total"),
    status: t("table.status"),
    type: t("table.type"),
    currency: t("table.currency"),
  };

  return (
    <Container title={t("title")} description={t("description")}>
      <div className="flex justify-end mb-4">
        <Link href="/invoices/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t("new")}
          </Button>
        </Link>
      </div>
      <InvoicesTable
        invoices={JSON.parse(JSON.stringify(invoices))}
        statusLabels={statusLabels}
        tableLabels={tableLabels}
      />
    </Container>
  );
}
