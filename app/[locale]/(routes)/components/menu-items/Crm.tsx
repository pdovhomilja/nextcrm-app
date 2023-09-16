"use client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Coins, UserIcon } from "lucide-react";

import { useRouter } from "next/navigation";
import React from "react";

type Props = {
  open: boolean;
};

const CrmMenu = ({ open }: Props) => {
  const router = useRouter();
  return (
    <div className="flex flex-row items-center mx-auto p-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          className={
            open
              ? "w-full hover:bg-slate-700 hover:text-gray-200 hover:transition hover:duration-150 rounded-md mx-auto"
              : ""
          }
        >
          <div className="flex gap-2 p-2">
            <Coins />
            <span className={open ? "" : "hidden"}> CRM</span>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[250px] ml-10">
          <DropdownMenuItem onClick={() => router.push("/crm/dashboard")}>
            Dashboard
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/crm")}>
            Overview
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/crm/accounts")}>
            Accounts
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/crm/contacts")}>
            Contacts
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/crm/leads")}>
            Leads
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/crm/opportunities")}>
            Opportunities
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default CrmMenu;
