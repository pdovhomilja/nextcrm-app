"use client";

import React, { useEffect, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import RightViewModal from "@/components/modals/right-view-modal";

import { columns } from "../accounts/table-components/columns";
import { NewAccountForm } from "../accounts/components/NewAccountForm";
import { AccountDataTable } from "../accounts/table-components/data-table";
import { useRouter } from "next/navigation";

const AccountsView = ({ data, crmData }: any) => {
  const router = useRouter();

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  const { users, industries } = crmData;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between">
          <div>
            <CardTitle
              onClick={() => router.push("/crm/accounts")}
              className="cursor-pointer"
            >
              Accounts
            </CardTitle>
            <CardDescription></CardDescription>
          </div>
          <div className="flex space-x-2">
            <RightViewModal
              label={"+"}
              title="Create new Account"
              description=""
            >
              <NewAccountForm industries={industries} users={users} />
            </RightViewModal>
          </div>
        </div>
        <Separator />
      </CardHeader>
      {!data ||
        (data.length === 0 ? (
          <CardContent>No assigned accounts found</CardContent>
        ) : (
          <CardContent>
            <AccountDataTable
              data={data}
              columns={columns}
              industries={industries}
              users={users}
            />
          </CardContent>
        ))}
    </Card>
  );
};

export default AccountsView;
