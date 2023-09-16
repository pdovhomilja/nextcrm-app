"use client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bot,
  FileBarChart,
  FileCheck,
  FileEdit,
  FileText,
  Lightbulb,
  ServerIcon,
  UserIcon,
} from "lucide-react";
import Link from "next/link";

import { useRouter } from "next/navigation";
import React from "react";

type Props = {
  open: boolean;
};

const DataboxModuleMenu = ({ open }: Props) => {
  return (
    <div className="flex flex-row items-center mx-auto p-2">
      <Link href={"/databox"} className="flex gap-2 p-2">
        <FileEdit className="w-6" />
        <span className={open ? "" : "hidden"}>Databox</span>
      </Link>
    </div>
  );
};

export default DataboxModuleMenu;
