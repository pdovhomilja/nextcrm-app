"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { columns } from "../contracts/table-components/columns";
import { ContractsDataTable } from "../contracts/table-components/data-table";
import CreateContractForm from "../contracts/_forms/create-contract";

import type { getAllCrmData } from "@/actions/crm/get-crm-data";

type CrmData = Awaited<ReturnType<typeof getAllCrmData>>;

interface ContractsViewProps {
  data: any[];
  crmData: CrmData;
  accountId?: string;
}

const ContractsView = ({ data, crmData, accountId }: ContractsViewProps) => {
  const { accounts } = crmData;
  const t = useTranslations("CrmPage");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between">
          <CardTitle>
            <Link href="/crm/contracts" className="hover:underline">
              {t("contracts.viewTitle")}
            </Link>
          </CardTitle>

          <div className="flex space-x-2">
            <CreateContractForm
              accounts={accounts}
              accountId={accountId ?? ""}
            />
          </div>
        </div>
        <Separator />
      </CardHeader>
      <CardContent>
        {!data ||
          (data.length === 0 ? (
            t("contracts.empty")
          ) : (
            <ContractsDataTable data={data} columns={columns} />
          ))}
      </CardContent>
    </Card>
  );
};

export default ContractsView;
