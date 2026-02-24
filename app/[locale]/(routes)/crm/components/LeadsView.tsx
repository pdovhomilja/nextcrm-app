"use client";

import Link from "next/link";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import RightViewModal from "@/components/modals/right-view-modal";

import { columns } from "../leads/table-components/columns";
import { NewLeadForm } from "../leads/components/NewLeadForm";
import { LeadDataTable } from "../leads/table-components/data-table";

import type { getAllCrmData } from "@/actions/crm/get-crm-data";

type CrmData = Awaited<ReturnType<typeof getAllCrmData>>;

interface LeadsViewProps {
  data: any[];
  crmData: CrmData;
}

const LeadsView = ({ data, crmData }: LeadsViewProps) => {
  const { users, accounts } = crmData;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between">
          <div>
            <CardTitle>
              <Link href="/crm/leads" className="hover:underline">
                Leads
              </Link>
            </CardTitle>
          </div>
          <div className="flex space-x-2">
            <RightViewModal label={"+"} title="Create new lead" description="">
              <NewLeadForm users={users} accounts={accounts} />
            </RightViewModal>
          </div>
        </div>
        <Separator />
      </CardHeader>
      <CardContent>
        {!data ||
          (data.length === 0 ? (
            "No assigned leads found"
          ) : (
            <LeadDataTable data={data} columns={columns} />
          ))}
      </CardContent>
    </Card>
  );
};

export default LeadsView;
