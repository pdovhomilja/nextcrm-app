"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Coins } from "lucide-react";

import { usePathname, useRouter } from "next/navigation";

type Props = {
  open: boolean;
  localizations: any;
};

const CrmModuleMenu = ({ open, localizations }: Props) => {
  const router = useRouter();
  const pathname = usePathname();
  const isPath = pathname.includes("crm");

  return (
    <div
      className={`flex flex-row items-center mx-auto p-2 ${
        isPath ? "text-muted-foreground" : null
      }`}
    >
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
            <span className={open ? "" : "hidden"}>{localizations.title}</span>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[250px] ml-10">
          <DropdownMenuItem onClick={() => router.push("/crm/dashboard")}>
            Dashboard
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/crm/dashboard/user")}>
            My Dashboard
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/crm")}>
            Overview
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/crm/accounts")}>
            {localizations.accounts}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/crm/contacts")}>
            {localizations.contacts}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/crm/leads")}>
            {localizations.leads}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/crm/opportunities")}>
            {localizations.opportunities}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/crm/contracts")}>
            {localizations.contracts}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default CrmModuleMenu;
