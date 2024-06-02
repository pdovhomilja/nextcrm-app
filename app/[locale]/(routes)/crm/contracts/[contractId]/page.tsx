import { prismadb } from "@/lib/prisma";
import React from "react";

interface ContractDetailPageProps {
  params: {
    contractId: string;
  };
}
const ContractPage = async ({ params }: ContractDetailPageProps) => {
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
