"use client";
import { FileEdit } from "lucide-react";
import Link from "next/link";

import { usePathname } from "next/navigation";
import React from "react";

type Props = {
  open: boolean;
};

const DataboxModuleMenu = ({ open }: Props) => {
  const pathname = usePathname();
  const isPath = pathname.includes("databox");
  return (
    <div className="flex flex-row items-center mx-auto p-2">
      <Link
        href={"/databox"}
        className={`flex gap-2 p-2 ${isPath ? "text-muted-foreground" : null}`}
      >
        <FileEdit className="w-6" />
        <span className={open ? "" : "hidden"}>Databox</span>
      </Link>
    </div>
  );
};

export default DataboxModuleMenu;
