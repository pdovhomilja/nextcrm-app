"use client";

import { Cross2Icon } from "@radix-ui/react-icons";
import { Table } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTableViewOptions } from "./data-table-view-options";
import { DataTableFacetedFilter } from "./data-table-faceted-filter";
import { TARGET_TYPE_OPTIONS } from "@/lib/crm/target-type";
import { TRIAGE_STATUS_OPTIONS } from "../table-data/triage-options";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  // Industry is free-text, so the faceted filter's options are the distinct
  // industry values actually present in the loaded targets.
  const industryColumn = table.getColumn("industry");
  const industryOptions = industryColumn
    ? Array.from(industryColumn.getFacetedUniqueValues().keys())
        .filter((v): v is string => typeof v === "string" && v.length > 0)
        .sort((a, b) => a.localeCompare(b))
        .map((v) => ({ label: v, value: v }))
    : [];

  // The "lists" column accessor returns each target's ACTIVE list names, so the
  // faceted options here are exactly the active lists present in the data.
  const listsColumn = table.getColumn("lists");
  const listOptions = listsColumn
    ? Array.from(listsColumn.getFacetedUniqueValues().keys())
        .filter((v): v is string => typeof v === "string" && v.length > 0)
        .sort((a, b) => a.localeCompare(b))
        .map((v) => ({ label: v, value: v }))
    : [];

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Filter by name, company, industry ..."
          value={
            (table.getColumn("name")?.getFilterValue() as string) ?? ""
          }
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {table.getColumn("triage_status") && (
          <DataTableFacetedFilter
            column={table.getColumn("triage_status")}
            title="Triage"
            options={TRIAGE_STATUS_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
          />
        )}
        {table.getColumn("type") && (
          <DataTableFacetedFilter
            column={table.getColumn("type")}
            title="Type"
            options={TARGET_TYPE_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
          />
        )}
        {industryColumn && industryOptions.length > 0 && (
          <DataTableFacetedFilter
            column={industryColumn}
            title="Industry"
            options={industryOptions}
          />
        )}
        {listsColumn && listOptions.length > 0 && (
          <DataTableFacetedFilter
            column={listsColumn}
            title="List"
            options={listOptions}
          />
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <Cross2Icon className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  );
}
