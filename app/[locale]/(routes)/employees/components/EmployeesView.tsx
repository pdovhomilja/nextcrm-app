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

import { columns } from "../table-components/columns";
import { NewEmployeeForm } from "./NewEmployeeForm";
import { EmployeeDataTable } from "../table-components/data-table";
import { useRouter } from "next/navigation";

const EmployeesView = ({ data, crmData }: any) => {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  const { users } = crmData;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between">
          <div>
            <CardTitle
              onClick={() => router.push("/employees")}
              className="cursor-pointer"
            >
              Employees
            </CardTitle>
            <CardDescription></CardDescription>
          </div>
          <div className="flex space-x-2">
            <RightViewModal label={"+"} title="Create Employee" description="">
              <NewEmployeeForm users={users} />
            </RightViewModal>
          </div>
        </div>
        <Separator />
      </CardHeader>

      <CardContent>
        {!data || data.length === 0 ? (
          "No assigned employees found"
        ) : (
          <EmployeeDataTable data={data} columns={columns} />
        )}
      </CardContent>
    </Card>
  );
};

export default EmployeesView;