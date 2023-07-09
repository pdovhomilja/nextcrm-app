"use client";

import { ColumnDef } from "@tanstack/react-table";

import { CellAction } from "./cell-action";

export type NotionColumn = {
  id: string;
  created_on: Date;
  email: string;
  name: string;
  isAdmin: boolean;
  userStatus: string;
  userLanguage: string;
};

export const columns: ColumnDef<NotionColumn>[] = [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "created_on",
    header: "Created At",
  },
  {
    accessorKey: "email",
    header: "E-mail",
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "is_admin",
    header: "Admin",
  },
  {
    accessorKey: "userStatus",
    header: "Status",
  },
  {
    accessorKey: "userLanguage",
    header: "Language",
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />,
  },
];
