import { Users } from "lucide-react";
import Link from "next/link";

import React from "react";

type Props = {
  open: boolean;
};

const EmployeesModuleMenu = ({ open }: Props) => {
  return (
    <div className="flex flex-row items-center mx-auto p-2">
      <Link href={"/employees"} className="flex gap-2 p-2">
        <Users className="w-6" />
        <span className={open ? "" : "hidden"}>Employees</span>
      </Link>
    </div>
  );
};

export default EmployeesModuleMenu;
