import React from "react";

import { getLeads } from "@/actions/crm/get-leads";

import Container from "../../components/ui/Container";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "./components/Columns";

type Props = {};

const LeadsPage = async () => {
  const leads: any = await getLeads();
  return (
    <Container
      title="Leads"
      description={"Everything you need to know about sales potential"}
    >
      <div>
        <h1>Leads</h1>
        <DataTable data={leads} search="name" columns={columns} />
      </div>
    </Container>
  );
};

export default LeadsPage;
