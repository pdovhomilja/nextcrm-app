"use client";

import { ColumnDef } from "@tanstack/react-table";

import { CellAction } from "./cell-action";

export type NotionColumn = {
  id: string;
  createdAt: string;
  title: string;
  urlShort: string;
  url: string;
};

export const columns: ColumnDef<NotionColumn>[] = [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
  },
  {
    accessorKey: "title",
    header: "Title",
  },
  {
    accessorKey: "urlShort",
    header: "Url",
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />,
  },
];
