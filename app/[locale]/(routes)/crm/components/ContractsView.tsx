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

import { columns } from "../contracts/table-components/columns";

import { useRouter } from "next/navigation";
import { ContractsDataTable } from "../contracts/table-components/data-table";

import CreateContractForm from "../contracts/_forms/create-contract";

const ContractsView = ({ data, crmData, accountId }: any) => {
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
          <CardTitle
            onClick={() => router.push("/crm/contracts")}
            className="cursor-pointer"
          >
            Contracts
          </CardTitle>

          <div className="flex space-x-2">
            <CreateContractForm
              users={users}
              accounts={accounts}
              accountId={accountId}
            />
          </div>
        </div>
        <Separator />
      </CardHeader>
      <CardContent>
        {/*         <pre>
          {JSON.stringify(
            {
              data,
            },
            null,
            2
          )}
        </pre> */}
        {!data ||
          (data.length === 0 ? (
            "No assigned contracts found"
          ) : (
            <ContractsDataTable data={data} columns={columns} />
          ))}
      </CardContent>
    </Card>
  );
};

export default ContractsView;
