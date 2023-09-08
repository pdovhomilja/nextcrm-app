"use client";

import { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";

import { visibility } from "../data/data";
import { Task } from "../data/schema";
import { DataTableColumnHeader } from "./data-table-column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import moment from "moment";
import Link from "next/link";

export const columns: ColumnDef<Task>[] = [
  {
    accessorKey: "date_created",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date Created" />
    ),
    cell: ({ row }) => (
      <div className="w-[80px]">
        {moment(row.getValue("date_created")).format("YY-MM-DD")}
      </div>
    ),
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "assigned_user",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Assigned to" />
    ),

    cell: ({ row }) => (
      <div className="w-[150px]">
        {row.original.assigned_user.name ?? "Unassigned"}
      </div>
    ),
    enableSorting: true,
    enableHiding: true,
  },

  {
    accessorKey: "title",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <Link href={`/projects/boards/${row.original.id}`}>
        <div className="w-[300px]">{row.getValue("title")}</div>
      </Link>
    ),
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Description" />
    ),
    cell: ({ row }) => (
      <div className="w-[300px]">{row.getValue("description")}</div>
    ),
  },
  {
    accessorKey: "visibility",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Visibility" />
    ),
    cell: ({ row }) => {
      const status = visibility.find(
        (status) => status.value === row.getValue("visibility")
      );

      if (!status) {
        return null;
      }

      return (
        <div className="flex w-[100px] items-center">
          {status.label && <Badge variant="outline">{status.label}</Badge>}
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },

  {
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];
