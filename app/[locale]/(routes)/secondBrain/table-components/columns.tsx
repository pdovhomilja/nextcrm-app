"use client";

import { ColumnDef } from "@tanstack/react-table";

import { DataTableColumnHeader } from "./data-table-column-header";
import { DataTableRowActions } from "./data-table-row-actions";

import { SecondBrain } from "../table-data/schema";

export const columns: ColumnDef<SecondBrain>[] = [
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created at" />
    ),

    cell: ({ row }) => <div>{row.getValue("createdAt")}</div>,
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "title",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Title" />
    ),

    cell: ({ row }) => <div>{row.getValue("title")}</div>,
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: "urlShort",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Url" />
    ),

    cell: ({ row }) => <div className="">{row.getValue("urlShort")}</div>,
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];
