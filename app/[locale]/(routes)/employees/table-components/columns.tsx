"use client";

import { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

import { Employee } from "../table-data/schema";
import { DataTableColumnHeader } from "./data-table-column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import moment from "moment";

export const columns: ColumnDef<Employee>[] = [
  /*   {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  }, */
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date created" />
    ),
    cell: ({ row }) => (
      <div className="w-[80px]">
        {moment(row.getValue("createdAt")).format("YY-MM-DD")}
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
 
 
  {
    accessorKey: "firstName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="First Name" />
    ),

    cell: ({ row }) => <div className="">{row.getValue("firstName")}</div>,
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
    accessorKey: "phone",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Mobile" />
    ),

    cell: ({ row }) => <div className="">{row.getValue("phone")}</div>,
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "position",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Position" />
    ),

    cell: ({ row }) => <div className="">{row.getValue("position")}</div>,
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "salary",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Salary" />
    ),

    cell: ({ row }) => <div className="">{row.getValue("salary")}</div>,
    enableSorting: true,
    enableHiding: true,
  },
 
  {
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];
