import React from "react";

import RightViewModal from "@/components/modals/right-view-modal";

import { getOpportunitiesFull } from "@/actions/crm/get-opportunities-with-includes";
import { getAllCrmData } from "@/actions/crm/get-crm-data";

import { NewOpportunityForm } from "./NewOpportunityForm";
import { OpportunitiesDataTable } from "../table-components/data-table";
import { columns } from "../table-components/columns";

const OpportunityView = async () => {
  const opportunities: any[] = await getOpportunitiesFull();

  const crmData = await getAllCrmData();
  const { users, accounts, contacts, saleTypes, saleStages, campaigns } =
    crmData;

  return (
    <div className="border rounded-md p-5 mt-5">
      <div className="flex items-center gap-3">
        <div className="flex w-full h-full">
          <RightViewModal
            label={"Create opportunity"}
            title="Create opportunity"
            description=""
          >
            <NewOpportunityForm
              users={users}
              accounts={accounts}
              contacts={contacts}
              salesType={saleTypes}
              saleStages={saleStages}
              campaigns={campaigns}
            />
          </RightViewModal>
        </div>
      </div>
      {/*       <div>
        <pre>
          <code>{JSON.stringify(opportunities[0], null, 2)}</code>
        </pre>
      </div> */}
      <div>
        <OpportunitiesDataTable data={opportunities} columns={columns} />
      </div>
    </div>
  );
};

export default OpportunityView;
