"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { DataTablePagination } from "./data-table-pagination";
import { DataTableToolbar } from "./data-table-toolbar";
import { PanelTopClose, PanelTopOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BulkEnrichTargetsModal } from "../components/BulkEnrichTargetsModal";
import ExportTargetsButton from "@/components/campaigns/ExportTargetsButton";

// Persisted per environment: localStorage is per-origin, so qa.crm… and the
// production domain each remember their own column choices.
const COLUMN_VISIBILITY_KEY = "targets:columnVisibility:v1";

// Lead with Company / Industry / Website / Status / Triage; hide the
// person-centric and date fields by default. All stay toggleable via the View
// menu, and the viewer's choice is persisted (see effects below).
const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
  created_on: false,
  first_name: false,
  last_name: false,
  email: false,
  mobile_phone: false,
  position: false,
};

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function TargetsDataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(DEFAULT_COLUMN_VISIBILITY);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);

  // Restore the viewer's saved column choices after mount (deferred to avoid an
  // SSR/CSR hydration mismatch); keep defaults if localStorage is unavailable.
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(COLUMN_VISIBILITY_KEY);
      if (raw) setColumnVisibility(JSON.parse(raw) as VisibilityState);
    } catch {
      /* localStorage blocked/unavailable — keep defaults */
    }
  }, []);

  // Persist on every change so the layout survives leaving and returning.
  React.useEffect(() => {
    try {
      window.localStorage.setItem(
        COLUMN_VISIBILITY_KEY,
        JSON.stringify(columnVisibility)
      );
    } catch {
      /* ignore persistence failures */
    }
  }, [columnVisibility]);

  const [hide, setHide] = React.useState(false);
  const [bulkEnrichOpen, setBulkEnrichOpen] = React.useState(false);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start gap-3">
        <div></div>
        <div className="flex justify-end items-center space-x-2">
          <ExportTargetsButton
            getTargets={() => {
              const selected = table.getSelectedRowModel().rows;
              const rows =
                selected.length > 0
                  ? selected
                  : table.getFilteredRowModel().rows;
              return rows.map(
                (row) => row.original as Record<string, unknown>
              );
            }}
            filenameBase={`targets-${new Date().toISOString().slice(0, 10)}`}
          />
          {hide ? (
            <PanelTopOpen
              onClick={() => setHide(!hide)}
              className="text-muted-foreground"
            />
          ) : (
            <PanelTopClose
              onClick={() => setHide(!hide)}
              className="text-muted-foreground"
            />
          )}
        </div>
      </div>

      {hide ? (
        <div className="flex gap-2">
          This content is hidden now. Click on <PanelTopOpen /> to show content
        </div>
      ) : (
        <>
          <DataTableToolbar table={table} />
          {table.getSelectedRowModel().rows.length > 0 && (
            <>
              <div className="flex items-center gap-2 py-2 px-1 bg-muted/50 rounded-md border">
                <span className="text-sm text-muted-foreground">
                  {table.getSelectedRowModel().rows.length} selected
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBulkEnrichOpen(true)}
                >
                  <Sparkles className="h-4 w-4 mr-1 text-orange-500" />
                  Enrich {table.getSelectedRowModel().rows.length} targets
                </Button>
              </div>
              <BulkEnrichTargetsModal
                targetIds={table.getSelectedRowModel().rows.map((row) => (row.original as { id: string }).id)}
                open={bulkEnrichOpen}
                onOpenChange={setBulkEnrichOpen}
              />
            </>
          )}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DataTablePagination table={table} />
        </>
      )}
    </div>
  );
}
