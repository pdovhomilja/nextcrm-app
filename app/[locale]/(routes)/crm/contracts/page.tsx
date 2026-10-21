import React, { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import Container from "../../components/ui/Container";
import CrmTableSkeleton from "@/components/skeletons/crm-table-skeleton";
import { getAllCrmData } from "@/actions/crm/get-crm-data";
import { getContractsWithIncludes } from "@/actions/crm/get-contracts";
import { getOrders } from "@/actions/crm/orders/queries";
import { getInvoices } from "@/app/[locale]/(routes)/invoices/data/get-invoices";
import ContractsView from "../components/ContractsView";
import { OrdersTable } from "../orders/components/OrdersTable";
import { InvoicesTable } from "@/app/[locale]/(routes)/invoices/components/invoices-table";
import { ContractsSectionNav } from "./components/ContractsSectionNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getTranslations } from "next-intl/server";
import { serializeDecimalsList } from "@/lib/serialize-decimals";

interface ContractsPageProps {
  searchParams?: Promise<{ section?: string }>;
}

async function ContractsContent() {
  const [crmData, rawContracts] = await Promise.all([
    getAllCrmData(),
    getContractsWithIncludes(),
  ]);
  const contracts = serializeDecimalsList(rawContracts);
  return <ContractsView crmData={crmData} data={contracts} />;
}

async function PurchasesContent() {
  const orders = await getOrders();
  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle>Purchases</CardTitle>
          <Link href="/crm/orders">
            <Button variant="outline" size="sm">
              All Orders
            </Button>
          </Link>
        </div>
        <Separator className="mt-3" />
      </CardHeader>
      <CardContent>
        {!orders || orders.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No purchases found
          </p>
        ) : (
          <OrdersTable rows={orders} />
        )}
      </CardContent>
    </Card>
  );
}

async function QuotationsContent() {
  const t = await getTranslations("InvoicesPage");
  const allInvoices = await getInvoices();
  // Filter for quotations (proforma invoices)
  const quotations = allInvoices.filter((inv) => inv.type === "PROFORMA");

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
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle>Quotations</CardTitle>
          <Link href="/invoices/new">
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New Quotation
            </Button>
          </Link>
        </div>
        <Separator className="mt-3" />
      </CardHeader>
      <CardContent>
        {quotations.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No quotations found
          </p>
        ) : (
          <InvoicesTable
            invoices={JSON.parse(JSON.stringify(quotations))}
            statusLabels={statusLabels}
            tableLabels={tableLabels}
          />
        )}
      </CardContent>
    </Card>
  );
}

async function InvoicesContent() {
  const t = await getTranslations("InvoicesPage");
  const allInvoices = await getInvoices();
  // Standard invoices (non-quotation invoices)
  const invoices = allInvoices.filter((inv) => inv.type !== "PROFORMA");

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
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle>Invoices</CardTitle>
          <Link href="/invoices/new">
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
          </Link>
        </div>
        <Separator className="mt-3" />
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No invoices found
          </p>
        ) : (
          <InvoicesTable
            invoices={JSON.parse(JSON.stringify(invoices))}
            statusLabels={statusLabels}
            tableLabels={tableLabels}
          />
        )}
      </CardContent>
    </Card>
  );
}

function SectionContent({ section }: { section?: string }) {
  switch (section) {
    case "purchases":
      return <PurchasesContent />;
    case "quotations":
      return <QuotationsContent />;
    case "invoices":
      return <InvoicesContent />;
    case "contracts":
    default:
      return <ContractsContent />;
  }
}

const ContractsPage = async (props: ContractsPageProps) => {
  const t = await getTranslations("CrmPage");
  const searchParams = await props.searchParams;
  const section = searchParams?.section;

  return (
    <Container
      title={t("contracts.pageTitle")}
      description={t("contracts.pageDescription")}
    >
      <ContractsSectionNav activeSection={section} />
      <Suspense key={section ?? "contracts"} fallback={<CrmTableSkeleton />}>
        <SectionContent section={section} />
      </Suspense>
    </Container>
  );
};

export default ContractsPage;
