"use client";

import moment from "moment";

import { ColumnDef } from "@tanstack/react-table";

import { statuses } from "../table-data/data";
import { AdminUser } from "../table-data/schema";
import { DataTableRowActions } from "./data-table-row-actions";
import { DataTableColumnHeader } from "./data-table-column-header";
import { formatDistanceToNowStrict } from "date-fns";

export const columns: ColumnDef<AdminUser>[] = [
  /*   {
    accessorKey: "id",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="id" />
    ),
    cell: ({ row }) => <div className="">{row.getValue("id")}</div>,
    enableSorting: false,
    enableHiding: false,
  }, */
  {
    accessorKey: "created_on",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date created" />
    ),
    cell: ({ row }) => (
      <div className="w-[130px]">
        {moment(row.getValue("created_on")).format("YYYY/MM/DD-HH:mm")}
      </div>
    ),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "lastLoginAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Last login" />
    ),
    cell: ({ row }) => (
      <div className="min-w-[150px]">
        {/*   {moment(row.getValue("lastLoginAt")).format("YYYY/MM/DD-HH:mm")} */}
        {formatDistanceToNowStrict(
          new Date(row.original.lastLoginAt || new Date()),
          {
            addSuffix: true,
          }
        )}
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

    cell: ({ row }) => <div className="">{row.getValue("name")}</div>,
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="E-mail" />
    ),

    cell: ({ row }) => <div className="">{row.getValue("email")}</div>,
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "is_admin",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Admin" />
    ),

    cell: ({ row }) => (
      <div className="">{row.original.is_admin ? "Enable" : "Disable"}</div>
    ),
    enableSorting: true,
    enableHiding: true,
  },

  {
    accessorKey: "userStatus",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = statuses.find(
        (status) => status.value === row.getValue("userStatus")
      );

      if (!status) {
        return null;
      }

      return (
        <div className="flex items-center">
          {status.icon && (
            <status.icon className="mr-2 h-4 w-4 text-muted-foreground" />
          )}
          <span>{status.label}</span>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "userLanguage",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Language" />
    ),

    cell: ({ row }) => <div className="">{row.getValue("userLanguage")}</div>,
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];
