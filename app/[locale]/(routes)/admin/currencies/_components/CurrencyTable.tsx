"use client";

import { useState, useMemo, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  toggleCurrency,
  setDefaultCurrency,
  createCurrency,
  bulkToggleCurrencies,
} from "../_actions/currencies";
import type { CurrencyValue } from "../_actions/currencies";
import { Search, Plus, CheckCircle2, XCircle, Globe, Check, AlertCircle } from "lucide-react";

type FilterStatus = "all" | "enabled" | "disabled";

export function CurrencyTable({ currencies }: { currencies: CurrencyValue[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isPending, startTransition] = useTransition();

  const [adding, setAdding] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newSymbol, setNewSymbol] = useState("");

  const counts = useMemo(() => {
    const total = currencies.length;
    const enabled = currencies.filter((c) => c.isEnabled).length;
    const disabled = total - enabled;
    return { total, enabled, disabled };
  }, [currencies]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return currencies.filter((c) => {
      // Status filter
      if (filter === "enabled" && !c.isEnabled) return false;
      if (filter === "disabled" && c.isEnabled) return false;

      // Query filter
      if (!q) return true;
      return (
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q)
      );
    });
  }, [currencies, search, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const handleToggle = (code: string, enabled: boolean) => {
    startTransition(async () => {
      try {
        await toggleCurrency(code, enabled);
        toast.success(`Currency ${code} ${enabled ? "enabled" : "disabled"}`);
      } catch (err: any) {
        toast.error(err?.message || "Failed to update currency");
      }
    });
  };

  const handleSetDefault = (code: string) => {
    startTransition(async () => {
      try {
        await setDefaultCurrency(code);
        toast.success(`${code} set as default CRM currency`);
      } catch (err: any) {
        toast.error(err?.message || "Failed to set default currency");
      }
    });
  };

  const handleBulkToggle = (enableAll: boolean) => {
    startTransition(async () => {
      try {
        await bulkToggleCurrencies(enableAll);
        toast.success(
          enableAll
            ? "All currencies enabled"
            : "All non-default currencies disabled"
        );
      } catch (err: any) {
        toast.error(err?.message || "Bulk update failed");
      }
    });
  };

  const handleCreate = () => {
    startTransition(async () => {
      try {
        await createCurrency({ code: newCode, name: newName, symbol: newSymbol });
        toast.success(`Currency ${newCode} added successfully`);
        setAdding(false);
        setNewCode("");
        setNewName("");
        setNewSymbol("");
      } catch (e: any) {
        toast.error(e.message || "Failed to add currency");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative w-64 md:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search code or name (e.g. USD, Yen)..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-8 text-sm h-9"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center rounded-lg border bg-muted/40 p-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setFilter("all");
                setPage(1);
              }}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                filter === "all"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({counts.total})
            </button>
            <button
              type="button"
              onClick={() => {
                setFilter("enabled");
                setPage(1);
              }}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                filter === "enabled"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Enabled ({counts.enabled})
            </button>
            <button
              type="button"
              onClick={() => {
                setFilter("disabled");
                setPage(1);
              }}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                filter === "disabled"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Disabled ({counts.disabled})
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => handleBulkToggle(true)}
            className="text-xs h-8"
          >
            Enable All
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => handleBulkToggle(false)}
            className="text-xs h-8"
          >
            Disable Non-Default
          </Button>

          <Dialog open={adding} onOpenChange={setAdding}>
            <DialogTrigger asChild>
              <Button size="sm" className="text-xs h-8 gap-1">
                <Plus className="h-3.5 w-3.5" />
                Add Currency
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Custom Currency</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    ISO Code (3 letters)
                  </label>
                  <Input
                    placeholder="e.g. GBP"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    maxLength={3}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Currency Name
                  </label>
                  <Input
                    placeholder="e.g. British Pound"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Symbol (max 5 chars)
                  </label>
                  <Input
                    placeholder="e.g. £"
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value)}
                    maxLength={5}
                  />
                </div>
                <Button
                  onClick={handleCreate}
                  disabled={isPending || !newCode || !newName || !newSymbol}
                  className="w-full mt-2"
                >
                  Create Currency
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-24">Code</TableHead>
              <TableHead>Currency Name</TableHead>
              <TableHead className="w-24">Symbol</TableHead>
              <TableHead className="w-28 text-center">Enabled</TableHead>
              <TableHead className="w-28 text-center">Default</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-1">
                    <AlertCircle className="h-6 w-6 text-muted-foreground/60" />
                    <span>No currencies found matching &quot;{search}&quot;</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((c) => (
                <TableRow
                  key={c.code}
                  className={`transition-colors ${
                    !c.isEnabled ? "opacity-50 hover:opacity-80" : ""
                  }`}
                >
                  <TableCell className="font-mono font-semibold">
                    <span className="inline-flex items-center gap-1.5">
                      <Badge
                        variant={c.isDefault ? "default" : c.isEnabled ? "secondary" : "outline"}
                        className="font-mono text-xs"
                      >
                        {c.code}
                      </Badge>
                    </span>
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    {c.name}
                  </TableCell>
                  <TableCell className="font-mono text-base font-bold text-muted-foreground">
                    {c.symbol}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <Switch
                        checked={c.isEnabled}
                        onCheckedChange={(checked) => handleToggle(c.code, checked)}
                        disabled={c.isDefault || isPending}
                        aria-label={`Toggle ${c.code}`}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <input
                        type="radio"
                        name="defaultCurrency"
                        checked={c.isDefault}
                        onChange={() => handleSetDefault(c.code)}
                        disabled={isPending}
                        className="h-4 w-4 cursor-pointer accent-primary"
                        aria-label={`Set ${c.code} as default`}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground px-1">
        <div>
          Showing {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
          {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} currencies
          {filtered.length < currencies.length && ` (filtered from ${currencies.length})`}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="rounded border bg-background px-2 py-1 text-xs text-foreground"
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>All (171)</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 px-2 text-xs"
            >
              Previous
            </Button>
            <span className="px-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 px-2 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
