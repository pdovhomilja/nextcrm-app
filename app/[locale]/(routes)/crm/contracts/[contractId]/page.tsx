import { prismadb } from "@/lib/prisma";
import React from "react";

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
      <pre>{JSON.stringify(contract, null, 2)}</pre>
    </div>
  );
};

export default ContractPage;
