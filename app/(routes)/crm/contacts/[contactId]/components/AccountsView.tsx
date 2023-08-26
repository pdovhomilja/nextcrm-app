"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import axios from "axios";
import { Link, PlusIcon, User } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

import RightViewModal from "@/components/modals/right-view-modal";
import { NewOpportunityForm } from "../../../opportunities/components/NewOpportunityForm";
import { AccountDataTable } from "../../../accounts/table-components/data-table";
import { columns } from "../../../accounts/table-components/columns";
import { NewAccountForm } from "../../../accounts/components/NewAccountForm";

const AccountsView = ({ data, opportunityId, crmData }: any) => {
  const router = useRouter();

  const { toast } = useToast();

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  const {
    users,
    industries,
    accounts,
    contacts,
    saleTypes,
    saleStages,
    campaigns,
  } = crmData;

  const onAddNew = () => {
    alert("Actions - not yet implemented");
  };

  const onView = (id: string) => {
    router.push(`/crm/opportunities/${id}`);
  };

  const onUnlink = async (id: string) => {
    try {
      await axios.put(`/api/crm/contacts/unlink-opportunity/${id}`, {
        opportunityId,
      });
      toast({
        variant: "default",
        description: "Contact unlinked",
      });
      router.refresh();
    } catch (error) {
      console.log(error);
      toast({
        variant: "destructive",
        description: "Failed to unlink contact",
      });
    }
  };

  if (!data || data.length === 0)
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between">
            <div>
              <CardTitle>Accounts</CardTitle>
              <CardDescription></CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button onClick={onAddNew}>
                <Link className="h-3 w-3" />
              </Button>
              <RightViewModal
                label={"+"}
                title="Create new Account"
                description=""
              >
                <NewAccountForm industries={industries} users={users} />
              </RightViewModal>
            </div>
          </div>
        </CardHeader>
        <CardContent>No assigned opportunities found</CardContent>
      </Card>
    );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between">
          <div>
            <CardTitle>Accounts</CardTitle>
            <CardDescription></CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button onClick={onAddNew}>
              <Link className="h-3 w-3" />
            </Button>
            <RightViewModal
              label={"+"}
              title="Create new Account"
              description=""
            >
              <NewAccountForm industries={industries} users={users} />
            </RightViewModal>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <AccountDataTable data={data} columns={columns} />
      </CardContent>
    </Card>
  );
};

export default AccountsView;
