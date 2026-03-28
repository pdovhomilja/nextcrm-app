import Container from "@/app/[locale]/(routes)/components/ui/Container";
import { getContract } from "@/actions/crm/get-contract";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HistoryTab } from "./components/HistoryTab";
import { BasicView } from "./components/BasicView";
import { ActivitiesSection } from "./components/ActivitiesSection";

interface ContractDetailPageProps {
  params: Promise<{ contractId: string }>;
}

const ContractPage = async (props: ContractDetailPageProps) => {
  const params = await props.params;
  const { contractId } = params;
  const contract = await getContract(contractId);

  if (!contract) return <div>Contract not found</div>;

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
