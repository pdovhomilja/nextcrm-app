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

import { columns } from "../opportunities/table-components/columns";
import { NewOpportunityForm } from "../opportunities/components/NewOpportunityForm";
import { OpportunitiesDataTable } from "../opportunities/table-components/data-table";
import { useRouter } from "next/navigation";

const OpportunitiesView = ({ data, crmData }: any) => {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  const { users, accounts, contacts, saleTypes, saleStages, campaigns } =
    crmData;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between">
          <div>
            <CardTitle
              onClick={() => router.push("/crm/opportunities")}
              className="cursor-pointer"
            >
              Opportunities
            </CardTitle>
            <CardDescription></CardDescription>
          </div>
          <div className="flex space-x-2">
            <RightViewModal
              label={"+"}
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
        <Separator />
      </CardHeader>
      <CardContent>
        {!data ||
          (data.length === 0 ? (
            "No assigned opportunities found"
          ) : (
            <OpportunitiesDataTable data={data} columns={columns} />
          ))}
      </CardContent>
    </Card>
  );
};

export default OpportunitiesView;
