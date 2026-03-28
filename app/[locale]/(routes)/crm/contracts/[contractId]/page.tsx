import { prismadb } from "@/lib/prisma";
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HistoryTab } from "./components/HistoryTab";

interface ContractDetailPageProps {
  params: Promise<{
    contractId: string;
  }>;
}
const ContractPage = async (props: ContractDetailPageProps) => {
  const params = await props.params;
  const { contractId } = params;
  const contract = await prismadb.crm_Contracts.findUnique({
    where: {
      id: contractId,
    },
  });
  return (
    <div>
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <pre>{JSON.stringify(contract, null, 2)}</pre>
        </TabsContent>
        <TabsContent value="history">
          <HistoryTab contractId={contractId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContractPage;
