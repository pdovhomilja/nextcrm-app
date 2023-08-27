"use client";

import { useEffect, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import RightViewModal from "@/components/modals/right-view-modal";

import { columns } from "../leads/table-components/columns";
import { NewLeadForm } from "../leads/components/NewLeadForm";
import { LeadDataTable } from "../leads/table-components/data-table";
import { useRouter } from "next/navigation";

const LeadsView = ({ data, crmData }: any) => {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  const { users, accounts } = crmData;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between">
          <div>
            <CardTitle
              onClick={() => router.push("/crm/leads")}
              className="cursor-pointer"
            >
              Leads
            </CardTitle>
            <CardDescription></CardDescription>
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
