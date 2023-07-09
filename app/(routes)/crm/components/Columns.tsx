"use client";

import { ColumnDef } from "@tanstack/react-table";

import { CellAction } from "./cell-action";

export type AccountsColumn = {
  name: string;
  company_id: number;
  email?: string;
  web?: string;
  phone?: string;
  status: string;
};

export const columns: ColumnDef<AccountsColumn>[] = [
  {
    accessorKey: "name",
    header: "Company Name",
  },
  {
    accessorKey: "company_id",
    header: "Company Id",
  },
  {
    accessorKey: "email",
    header: "E-mail",
  },
  {
    accessorKey: "web",
    header: "Website",
  },
  {
    accessorKey: "phone",
    header: "Phone",
  },
  {
    accessorKey: "status",
    header: "Status",
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />,
  },
];
