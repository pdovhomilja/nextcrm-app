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
  FileText,
  Lightbulb,
  ServerIcon,
  UserIcon,
  Users,
} from "lucide-react";
import Link from "next/link";

import { useRouter } from "next/navigation";
import React from "react";

type Props = {
  open: boolean;
};

const EmployeesModuleMenu = ({ open }: Props) => {
  return (
    <div className="flex flex-row items-center mx-auto p-2">
      <Link href={"/employee"} className="flex gap-2 p-2">
        <Users className="w-6" />
        <span className={open ? "" : "hidden"}>Employees</span>
      </Link>
    </div>
  );
};

export default EmployeesModuleMenu;
