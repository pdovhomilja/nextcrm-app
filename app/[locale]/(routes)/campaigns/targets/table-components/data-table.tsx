"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
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
import { usePersistedTableState } from "./use-persisted-table-state";
import { PanelTopClose, PanelTopOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BulkEnrichTargetsModal } from "../components/BulkEnrichTargetsModal";
import ExportTargetsButton from "@/components/campaigns/ExportTargetsButton";

// Persisted per environment: localStorage is per-origin, so qa.crm… and the
// production domain each remember their own view (columns, filters, sorting and
// rows-per-page). See `usePersistedTableState`.
const STORAGE_KEYS = {
  columnVisibility: "targets:columnVisibility:v1",
  columnFilters: "targets:columnFilters:v1",
  sorting: "targets:sorting:v1",
  pagination: "targets:pagination:v1",
} as const;

const DEFAULT_PAGE_SIZE = 10;

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
  // `lists` is a filter-only column (drives the "List" faceted filter); keep it
  // hidden by default.
  lists: false,
};

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function TargetsDataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  // Row selection is intentionally ephemeral — it should not survive navigation.
  const [rowSelection, setRowSelection] = React.useState({});

  // Column visibility, filters, sorting and rows-per-page are persisted so the
  // viewer's view survives leaving the list (e.g. to open a target) and
  // returning — the Server Component page unmounts this table in between.
  const [columnVisibility, setColumnVisibility] =
    usePersistedTableState<VisibilityState>(
      STORAGE_KEYS.columnVisibility,
      DEFAULT_COLUMN_VISIBILITY,
      {
        // Default newer filter-only columns to hidden even for viewers whose
        // saved prefs predate the column (a missing key would otherwise show it).
        merge: (saved) => ({ lists: false, ...saved }),
      }
    );
  const [columnFilters, setColumnFilters] =
    usePersistedTableState<ColumnFiltersState>(STORAGE_KEYS.columnFilters, []);
  const [sorting, setSorting] = usePersistedTableState<SortingState>(
    STORAGE_KEYS.sorting,
    []
  );
  // Remember the page size, but always return to the first page: a saved
  // pageIndex can point past the end once filters or the underlying data change.
  const [pagination, setPagination] = usePersistedTableState<PaginationState>(
    STORAGE_KEYS.pagination,
    { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE },
    {
      merge: (saved) => ({
        pageIndex: 0,
        pageSize: saved.pageSize ?? DEFAULT_PAGE_SIZE,
      }),
    }
  );

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
      pagination,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
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
