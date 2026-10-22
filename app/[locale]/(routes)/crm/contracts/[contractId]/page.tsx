import Container from "@/app/[locale]/(routes)/components/ui/Container";
import { getContract } from "@/actions/crm/get-contract";
import { prismadb } from "@/lib/prisma";
import { getProductsFull } from "@/actions/crm/products/get-products";
import { serializeDecimalsList } from "@/lib/serialize-decimals";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HistoryTab } from "./components/HistoryTab";
import { BasicView } from "./components/BasicView";
import { ActivitiesSection } from "./components/ActivitiesSection";
import LineItemsSection from "./components/LineItemsSection";
import { DocumentPdfPreview } from "@/components/pdf/DocumentPdfPreview";
import Link from "next/link";

interface ContractDetailPageProps {
  params: Promise<{ contractId: string }>;
}

const ContractPage = async (props: ContractDetailPageProps) => {
  const params = await props.params;
  const { contractId } = params;
  const [contract, allProducts] = await Promise.all([
    getContract(contractId),
    getProductsFull(),
  ]);

  if (!contract) return <div>Contract not found</div>;

  const activeProducts = allProducts
    .filter((p: any) => p.status === "ACTIVE")
    .map((p: any) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      unit_price: Number(p.unit_price),
    }));

  const serializedLineItems = (contract as any)?.lineItems
    ? serializeDecimalsList((contract as any).lineItems as any[])
    : [];

  const accountId = (contract as any)?.accountId ?? (contract as any)?.account;
  const opportunities = accountId
    ? (
        await prismadb.crm_Opportunities.findMany({
          where: { account: accountId, deletedAt: null },
          select: { id: true, name: true },
        })
      ).map((row) => ({ id: row.id, name: row.name ?? "" }))
    : [];

  return (
    <Container
      title={`Contract: ${contract.title}`}
      description={`Status: ${contract.status}`}
    >
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <div className="space-y-5">
            <DocumentPdfPreview
              title="Proposal / quotation PDF"
              description="Letterhead PDFs are generated from Invoices (Proforma = quote). Link this contract to an account, then create a proforma."
              pdfUrl={null}
              emptyHint={
                <>
                  Create a{" "}
                  <Link href="/invoices/new" className="font-medium text-primary underline-offset-2 hover:underline">
                    proforma invoice (quotation)
                  </Link>{" "}
                  for the same customer to preview letterhead PDF. Full proposal builder is on the roadmap.
                </>
              }
            />
            <BasicView data={contract} />
            <LineItemsSection
              contractId={contractId}
              lineItems={serializedLineItems}
              currency={(contract as any)?.currency || "EUR"}
              products={activeProducts}
              opportunities={opportunities}
            />
            <ActivitiesSection contractId={contractId} />
          </div>
        </TabsContent>
        <TabsContent value="history">
          <HistoryTab contractId={contractId} />
        </TabsContent>
      </Tabs>
    </Container>
  );
};

export default ContractPage;
