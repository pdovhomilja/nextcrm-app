import React from "react";
import Container from "../../components/ui/Container";
import { getSaleStages } from "@/actions/crm/get-sales-stage";
import CRMKanban from "./_components/CRMKanban";
import { getOpportunities } from "@/actions/crm/get-opportunities";
import { getCrmPickerData } from "@/actions/crm/get-crm-data";
import { serializeDecimalsList } from "@/lib/serialize-decimals";

const CrmDashboardPage = async () => {
  const [salesStages, opportunities, crmData] = await Promise.all([
    getSaleStages(),
    getOpportunities().then((rows) => serializeDecimalsList(rows)),
    getCrmPickerData(),
  ]);

  return (
    <Container
      title="Your revenue workspace"
      description="A focused view of relationships, opportunities, and the next best action for your team."
    >
      <div className="w-full h-full  overflow-hidden">
        <CRMKanban
          salesStages={salesStages}
          opportunities={opportunities}
          crmData={crmData}
        />
      </div>

      {/*     <CRMKanbanServer
        salesStages={salesStages}
        opportunities={opportunities}
      /> */}
    </Container>
  );
};

export default CrmDashboardPage;
