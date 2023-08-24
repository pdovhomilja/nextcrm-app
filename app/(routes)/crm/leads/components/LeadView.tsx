import RightViewModal from "@/components/modals/right-view-modal";

import { getAllCrmData } from "@/actions/crm/get-crm-data";

import { NewLeadForm } from "./NewLeadForm";

import { columns } from "../table-components/columns";
import { LeadDataTable } from "../table-components/data-table";
import { getLeads } from "@/actions/crm/get-leads";

const LeadView = async () => {
  const leads: any[] = await getLeads();

  const crmData = await getAllCrmData();
  const { users, accounts } = crmData;

  return (
    <div className="border rounded-md p-5 mt-5">
      <div className="flex items-center gap-3">
        <div className="flex w-full h-full">
          <RightViewModal
            label={"Create lead"}
            title="Create new lead"
            description=""
          >
            <NewLeadForm users={users} accounts={accounts} />
          </RightViewModal>
        </div>
      </div>
      {/*       <div>
        <pre>
          <code>{JSON.stringify(leads[0], null, 2)}</code>
        </pre>
      </div> */}
      <div>
        <LeadDataTable data={leads} columns={columns} />
      </div>
    </div>
  );
};

export default LeadView;
