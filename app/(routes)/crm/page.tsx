import React from "react";
import Container from "../components/ui/Container";
import { DataTable } from "@/components/ui/data-table";
import { getAccounts } from "@/actions/crm/get-accounts";
import { getLeads } from "@/actions/crm/get-leads";
import { getOpportunities } from "@/actions/crm/get-opportunities";
import { columns } from "./components/Columns";

type Props = {};

const CrmPage = async (props: Props) => {
  const accounts: any[] = await getAccounts();
  const leads: any = await getLeads();
  const opportunities: any = await getOpportunities();

  return (
    <Container
      title="CRM"
      description={"Everything you need to know about sales"}
    >
      <div>
        <h1>Accounts</h1>
        <DataTable data={accounts} search="name" columns={columns} />
        <h1>Leads</h1>
        <DataTable data={leads} search="name" columns={columns} />
        <h1>Opportunity</h1>
        <DataTable data={opportunities} search="name" columns={columns} />
      </div>
    </Container>
  );
};

export default CrmPage;
