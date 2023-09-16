"use client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ServerIcon, UserIcon } from "lucide-react";
import Link from "next/link";

import { useRouter } from "next/navigation";
import React from "react";

type Props = {
  open: boolean;
};

const ProjectModuleMenu = ({ open }: Props) => {
  return (
    <div className="flex flex-row items-center mx-auto p-2">
      <Link href={"/projects"} className="flex gap-2 p-2">
        <ServerIcon className="w-6" />
        <span className={open ? "" : "hidden"}> Projects</span>
      </Link>
    </div>
  );
};

export default ProjectModuleMenu;
