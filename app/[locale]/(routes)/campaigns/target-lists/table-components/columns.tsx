"use client";

import { ColumnDef } from "@tanstack/react-table";

import { TargetList } from "../table-data/schema";
import { DataTableColumnHeader } from "./data-table-column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import moment from "moment";

export const columns: ColumnDef<TargetList>[] = [
  {
    accessorKey: "created_on",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date created" />
    ),
    cell: ({ row }) => (
      <div className="w-[80px]">
        {moment(row.getValue("created_on")).format("YY-MM-DD")}
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Description" />
    ),
    cell: ({ row }) => (
      <div className="max-w-[300px] truncate">{row.getValue("description")}</div>
    ),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "_count",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Targets" />
    ),
    cell: ({ row }) => (
      <div className="">
        {(row.getValue("_count") as any)?.targets ?? 0}
      </div>
    ),
    enableSorting: false,
    enableHiding: true,
  },
  {
    // Creator name comes from the `crate_by_user` relation included by
    // getTargetLists(); not on the (minimal) TargetList zod type, so read it
    // off the raw row — matching the `_count` column's `as any` idiom.
    id: "created_by",
    accessorFn: (row) =>
      (row as unknown as { crate_by_user?: { name?: string | null } })
        .crate_by_user?.name ?? "",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created by" />
    ),
    cell: ({ row }) => (
      <div className="">{(row.getValue("created_by") as string) || "—"}</div>
    ),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => (
      <div className="">{row.original.status ? "Active" : "Inactive"}</div>
    ),
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];
