"use client";

import { ColumnDef } from "@tanstack/react-table";

import { statuses } from "../data/data";
import { Task } from "../data/schema";
import { DataTableColumnHeader } from "./data-table-column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import moment from "moment";

export const columns: ColumnDef<Task>[] = [
  /*   {
    accessorKey: "date_created",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date Created" />
    ),
    cell: ({ row }) => (
      <div className="w-[120px]">
        {moment(row.getValue("date_created")).format("YY-MM-DD-HH:mm")}
      </div>
    ),
    enableSorting: true,
    enableHiding: true,
  }, */
  {
    accessorKey: "date_due",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date due" />
    ),
    cell: ({ row }) => (
      <div className="w-[120px]">
        {moment(row.getValue("date_due")).format("YY-MM-DD-HH:mm")}
      </div>
    ),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "variable_symbol",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Number" />
    ),
    cell: ({ row }) => (
      <div className="w-[120px]">{row.getValue("variable_symbol")}</div>
    ),
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: "invoice_amount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title=" Amount" />
    ),
    cell: ({ row }) => (
      <div className="w-[120px]">{row.getValue("invoice_amount")}</div>
    ),
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "invoice_currency",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Currency" />
    ),
    cell: ({ row }) => (
      <div className="w-[120px]">{row.getValue("invoice_currency")}</div>
    ),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "partner",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Partner" />
    ),
    cell: ({ row }) => (
      <div className="w-[120px]">{row.getValue("partner")}</div>
    ),
    enableSorting: false,
    enableHiding: true,
  },
  /*  {
    accessorKey: "users",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Assigned to" />
    ),

    cell: ({ row }) => (
      <div className="w-[150px]">
        {
          //@ts-ignore
          //TODO: fix this
          row.getValue("users")?.name ?? "Unassigned"
        }
      </div>
    ),
    enableSorting: false,
    enableHiding: true,
  }, */
  /*   {
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Description" />
    ),
    cell: ({ row }) => (
      <div className="w-[150px]">{row.getValue("description")}</div>
    ),
    enableSorting: false,
    enableHiding: true,
  }, */
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = statuses.find(
        (status) => status.value === row.getValue("status")
      );

      if (!status) {
        return null;
      }

      return (
        <div className="flex w-[100px] items-center">
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
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];
