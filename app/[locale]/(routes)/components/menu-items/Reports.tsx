"use client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileBarChart,
  FileCheck,
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

const ReportsModuleMenu = ({ open }: Props) => {
  return (
    <div className="flex flex-row items-center mx-auto p-2">
      <Link href={"/reports"} className="flex gap-2 p-2">
        <FileBarChart className="w-6" />
        <span className={open ? "" : "hidden"}>Reports</span>
      </Link>
    </div>
  );
};

export default ReportsModuleMenu;
