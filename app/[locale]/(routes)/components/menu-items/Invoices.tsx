"use client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileCheck, Lightbulb, ServerIcon, UserIcon } from "lucide-react";
import Link from "next/link";

import { useRouter } from "next/navigation";
import React from "react";

type Props = {
  open: boolean;
};

const InvoicesModuleMenu = ({ open }: Props) => {
  return (
    <div className="flex flex-row items-center mx-auto p-2">
      <Link href={"/invoice"} className="flex gap-2 p-2">
        <FileCheck className="w-6" />
        <span className={open ? "" : "hidden"}>Invoices</span>
      </Link>
    </div>
  );
};

export default InvoicesModuleMenu;
