"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { columns } from "../table-components/columns";
import { TargetListsDataTable } from "../table-components/data-table";
import { useRouter } from "next/navigation";
import CreateTargetListModal from "@/components/modals/CreateTargetListModal";

const TargetListsView = ({ data }: any) => {
  const router = useRouter();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between">
          <div>
            <CardTitle
              onClick={() => router.push("/crm/target-lists")}
              className="cursor-pointer"
            >
              Target Lists
            </CardTitle>
            <CardDescription></CardDescription>
          </div>
          <div className="flex space-x-2">
            <CreateTargetListModal />
          </div>
        </div>
        <Separator />
      </CardHeader>

      <CardContent>
        {!data || data.length === 0 ? (
          "No target lists found"
        ) : (
          <TargetListsDataTable data={data} columns={columns} />
        )}
      </CardContent>
    </Card>
  );
};

export default TargetListsView;
