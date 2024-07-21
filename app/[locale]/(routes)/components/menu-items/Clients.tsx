import { Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import React from "react";

type Props = {
  open: boolean;
};

const ClientsModuleMenu = ({ open }: Props) => {
  const pathname = usePathname();
  const isPath = pathname.includes("clients");
  return (
    <div className="flex flex-row items-center mx-auto p-2">
      <Link
        href={"/clients"}
        className={`flex gap-2 p-2 ${isPath ? "text-muted-foreground" : null}`}
      >
        <Users className="w-6" />
        <span className={open ? "" : "hidden"}>Clients</span>
      </Link>
    </div>
  );
};

export default ClientsModuleMenu;
