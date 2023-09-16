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
} from "lucide-react";
import Link from "next/link";

import { useRouter } from "next/navigation";
import React from "react";

type Props = {
  open: boolean;
};

const ChatGPTModuleMenu = ({ open }: Props) => {
  return (
    <div className="flex flex-row items-center mx-auto p-2">
      <Link href={"/openAi"} className="flex gap-2 p-2">
        <Bot className="w-6" />
        <span className={open ? "" : "hidden"}>ChatGPT</span>
      </Link>
    </div>
  );
};

export default ChatGPTModuleMenu;
