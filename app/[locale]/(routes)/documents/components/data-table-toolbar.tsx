"use client";

import { useState } from "react";
import { Cross2Icon } from "@radix-ui/react-icons";
import { Table } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTableViewOptions } from "./data-table-view-options";

import { documentSystemTypes, processingStatuses } from "../data/data";
import { DataTableFacetedFilter } from "./data-table-faceted-filter";
import { useTranslations } from "next-intl";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const t = useTranslations("DocumentsPage");
  const [searchMode, setSearchMode] = useState<"name" | "content">("name");

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border">
            <button
              className={`px-2 py-1 text-xs ${searchMode === "name" ? "bg-primary text-primary-foreground" : "text-muted-foreground"} rounded-l-md`}
              onClick={() => { setSearchMode("name"); table.setGlobalFilter(""); }}
            >
              Name
            </button>
            <button
              className={`px-2 py-1 text-xs ${searchMode === "content" ? "bg-primary text-primary-foreground" : "text-muted-foreground"} rounded-r-md`}
              onClick={() => { setSearchMode("content"); table.getColumn("document_name")?.setFilterValue(""); }}
            >
              Content
            </button>
          </div>

          {searchMode === "name" ? (
            <Input
              placeholder={t("dataTable.filterPlaceholder")}
              value={(table.getColumn("document_name")?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn("document_name")?.setFilterValue(event.target.value)
              }
              className="h-8 w-[150px] lg:w-[250px]"
            />
          ) : (
            <Input
              placeholder="Search in names & summaries..."
              value={(table.getState().globalFilter as string) ?? ""}
              onChange={(event) => table.setGlobalFilter(event.target.value)}
              className="h-8 w-[150px] lg:w-[250px]"
            />
          )}
        </div>
        {table.getColumn("document_system_type") && (
          <DataTableFacetedFilter
            column={table.getColumn("document_system_type")}
            title="Type"
            options={documentSystemTypes}
          />
        )}
        {table.getColumn("processing_status") && (
          <DataTableFacetedFilter
            column={table.getColumn("processing_status")}
            title="Status"
            options={processingStatuses}
          />
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            {t("dataTable.reset")}
            <Cross2Icon className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  );
}
