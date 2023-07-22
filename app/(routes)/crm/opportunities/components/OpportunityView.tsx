import React from "react";

import { DataTable } from "@/components/ui/data-table";
import RightViewModal from "@/components/modals/right-view-modal";

import { NewOpportunityForm } from "./NewOpportunityForm";

import { getIndustries } from "@/actions/crm/get-industries";
import { getUsers } from "@/actions/get-users";
import { getOpportunitiesFull } from "@/actions/crm/get-opportunities-with-includes";

import { OpportunitiesDataTable } from "../table-components/data-table";
import { columns } from "../table-components/columns";
import { getAccounts } from "@/actions/crm/get-accounts";
import { getContacts } from "@/actions/crm/get-contacts";
import { getSalesType } from "@/actions/crm/get-sales-type";
import { getSaleStages } from "@/actions/crm/get-sales-stage";
import { getCampaigns } from "@/actions/crm/get-campaigns";

type Props = {};

const OpportunityView = async () => {
  const opportunities: any[] = await getOpportunitiesFull();
  const accounts: any[] = await getAccounts();
  const contacts: any[] = await getContacts();
  const users: any[] = await getUsers();
  const salesType: any[] = await getSalesType();
  const saleStages: any[] = await getSaleStages();
  const campaigns: any[] = await getCampaigns();

  return (
    <div className="border rounded-md p-5 mt-5">
      <div className="flex items-center gap-3">
        <div className="flex w-full h-full">
          <RightViewModal
            label={"Add new opportunity"}
            title="Add new opportunity"
            description=""
          >
            <NewOpportunityForm
              users={users}
              accounts={accounts}
              contacts={contacts}
              salesType={salesType}
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
