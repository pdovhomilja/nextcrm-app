"use client";

import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";

import { productTypes, productStatuses } from "../table-data/data";
import { Product } from "../table-data/schema";
import { DataTableColumnHeader } from "./data-table-column-header";
import { DataTableRowActions } from "./data-table-row-actions";

function formatPrice(value: number, currency: string): string {
  const isWhole = value % 1 === 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: isWhole ? 0 : 2,
  }).format(value);
}

const typeColorMap: Record<string, string> = {
  PRODUCT: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  SERVICE:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
};

const statusColorMap: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  ACTIVE:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  ARCHIVED:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
};

export const columns: ColumnDef<Product>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <Link
        href={`/crm/products/${row.original.id}`}
        className="font-medium hover:underline"
      >
        {row.getValue("name")}
      </Link>
    ),
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "sku",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="SKU" />
    ),
    cell: ({ row }) => (
      <div className="w-[100px] text-muted-foreground">
        {row.getValue("sku") ?? "-"}
      </div>
    ),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" />
    ),
    cell: ({ row }) => {
      const type = productTypes.find((t) => t.value === row.getValue("type"));
      if (!type) return null;
      return (
        <Badge variant="outline" className={typeColorMap[type.value] ?? ""}>
          {type.icon && <type.icon className="mr-1 h-3 w-3" />}
          {type.label}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = productStatuses.find(
        (s) => s.value === row.getValue("status")
      );
      if (!status) return null;
      return (
        <Badge variant="outline" className={statusColorMap[status.value] ?? ""}>
          {status.icon && <status.icon className="mr-1 h-3 w-3" />}
          {status.label}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "unit_price",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Price" />
    ),
    cell: ({ row }) => (
      <div className="text-right font-mono">
        {formatPrice(row.original.unit_price, row.original.currency)}
      </div>
    ),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "category",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Category" />
    ),
    cell: ({ row }) => (
      <div>{row.original.category?.name ?? "-"}</div>
    ),
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: "_count",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Accounts" />
    ),
    cell: ({ row }) => (
      <div className="text-center">
        {row.original._count.accountProducts}
      </div>
    ),
    enableSorting: false,
    enableHiding: true,
  },
  {
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];
