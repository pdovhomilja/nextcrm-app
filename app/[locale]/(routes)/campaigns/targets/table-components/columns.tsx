"use client";

import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Target } from "../table-data/schema";
import { DataTableColumnHeader } from "./data-table-column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import {
  triageStatusLabel,
  triageBadgeVariant,
} from "../table-data/triage-options";
import {
  targetTypeLabel,
  targetTypeBadgeVariant,
  resolveTargetTitle,
} from "@/lib/crm/target-type";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import moment from "moment";

// A clickable cell that links to the target detail page (same /crm/targets/:id
// route the row actions use — next.config redirects it to /campaigns/targets)
// and, when the target has a description, shows it in a hover tooltip.
function TargetLinkCell({
  id,
  text,
  description,
}: {
  id: string;
  text: string;
  description?: string | null;
}) {
  if (!text) return null;
  const link = (
    <Link
      href={`/crm/targets/${id}`}
      onClick={(e) => e.stopPropagation()}
      className="font-medium hover:underline"
    >
      {text}
    </Link>
  );
  if (!description) return link;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent className="max-w-sm whitespace-pre-wrap text-sm">
          {description}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Column order = display order. An adaptive Name column (company name for
// companies, full name for individuals) leads after the select box, followed by
// Type / Company / Industry / Website / Status / Triage. The person-centric
// fields (first/last name, email, phone, position) and the created date are
// hidden by default (still toggleable via the View menu, and the choice is
// persisted per environment — see data-table.tsx).
export const columns: ColumnDef<Target>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        onClick={(e) => e.stopPropagation()}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "name",
    accessorFn: (row) => resolveTargetTitle(row),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <TargetLinkCell
        id={row.original.id}
        text={resolveTargetTitle(row.original)}
        description={row.original.description}
      />
    ),
    // Search matches the resolved title plus company / first / last name and
    // industry, so both companies and individuals are findable from one input.
    filterFn: (row, _id, value) => {
      const q = String(value).toLowerCase();
      const r = row.original;
      return [
        resolveTargetTitle(r),
        r.company,
        r.first_name,
        r.last_name,
        r.industry,
      ].some((s) => (s ?? "").toLowerCase().includes(q));
    },
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" />
    ),
    cell: ({ row }) => {
      const v = (row.getValue("type") as string) ?? "COMPANY";
      return (
        <Badge variant={targetTypeBadgeVariant(v)}>{targetTypeLabel(v)}</Badge>
      );
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "company",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Company" />
    ),
    cell: ({ row }) => (
      <TargetLinkCell
        id={row.original.id}
        text={(row.getValue("company") as string | null) ?? ""}
        description={row.original.description}
      />
    ),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "industry",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Industry" />
    ),
    cell: ({ row }) => <div className="">{row.getValue("industry")}</div>,
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "company_website",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Website" />
    ),
    cell: ({ row }) => {
      const url = row.getValue("company_website") as string | null;
      if (!url) return null;
      const label = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
      // Only linkify http(s). A stored value like `javascript:…` would otherwise
      // be a click-to-XSS vector for admins/managers who see others' targets.
      if (!/^https?:\/\//i.test(url)) {
        return (
          <span className="block max-w-[220px] truncate text-muted-foreground">
            {label}
          </span>
        );
      }
      return (
        <Link
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="block max-w-[220px] truncate text-muted-foreground underline"
        >
          {label}
        </Link>
      );
    },
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
    accessorKey: "triage_status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Triage" />
    ),
    cell: ({ row }) => {
      const value = (row.getValue("triage_status") as string) ?? "NEW";
      return (
        <Badge variant={triageBadgeVariant(value)}>
          {triageStatusLabel(value)}
        </Badge>
      );
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
    enableSorting: true,
    enableHiding: true,
  },
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
    enableHiding: true,
  },
  {
    accessorKey: "first_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="First name" />
    ),
    cell: ({ row }) => <div className="">{row.getValue("first_name")}</div>,
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "last_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Last name" />
    ),
    cell: ({ row }) => <div className="">{row.getValue("last_name")}</div>,
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
    accessorKey: "mobile_phone",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Mobile" />
    ),
    cell: ({ row }) => <div className="">{row.getValue("mobile_phone")}</div>,
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
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];
