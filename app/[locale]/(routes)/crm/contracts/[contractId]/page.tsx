import Container from "@/app/[locale]/(routes)/components/ui/Container";
import { getContract } from "@/actions/crm/get-contract";
import { getAllCrmData } from "@/actions/crm/get-crm-data";
import { getProductsFull } from "@/actions/crm/products/get-products";
import { serializeDecimalsList } from "@/lib/serialize-decimals";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HistoryTab } from "./components/HistoryTab";
import { BasicView } from "./components/BasicView";
import { ActivitiesSection } from "./components/ActivitiesSection";
import LineItemsSection from "./components/LineItemsSection";

interface ContractDetailPageProps {
  params: Promise<{ contractId: string }>;
}

const ContractPage = async (props: ContractDetailPageProps) => {
  const params = await props.params;
  const { contractId } = params;
  const [contract, allProducts, crmData] = await Promise.all([
    getContract(contractId),
    getProductsFull(),
    getAllCrmData(),
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

  // Get opportunities linked to the same account
  const accountId = (contract as any)?.accountId;
  const opportunities = accountId
    ? crmData.opportunities
        .filter((o: any) => o.accountId === accountId)
        .map((o: any) => ({ id: o.id, name: o.name }))
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
