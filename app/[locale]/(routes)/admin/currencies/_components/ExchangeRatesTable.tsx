"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
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
import { updateExchangeRate } from "../_actions/currencies";
import type { ExchangeRateValue } from "../_actions/currencies";
import { Search } from "lucide-react";

export function ExchangeRatesTable({
  rates,
  ecbEnabled,
}: {
  rates: ExchangeRateValue[];
  ecbEnabled: boolean;
}) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const filteredRates = useMemo(() => {
    const q = search.trim().toUpperCase();
    if (!q) return rates;
    return rates.filter(
      (r) => r.fromCurrency.includes(q) || r.toCurrency.includes(q)
    );
  }, [rates, search]);

  const handleSave = async (rate: ExchangeRateValue) => {
    try {
      await updateExchangeRate({
        fromCurrency: rate.fromCurrency,
        toCurrency: rate.toCurrency,
        rate: editValue,
      });
      toast.success("Rate updated successfully");
      setEditing(null);
    } catch {
      toast.error("Failed to update rate");
    }
  };

  return (
    <div className="space-y-3">
      {rates.length > 5 && (
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter pair (e.g. USD, EUR)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-xs h-8"
          />
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-24">From</TableHead>
              <TableHead className="w-24">To</TableHead>
              <TableHead>Exchange Rate</TableHead>
              <TableHead className="w-32">Source</TableHead>
              <TableHead className="w-32">Updated</TableHead>
              <TableHead className="w-24 text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground text-xs">
                  No exchange rates found. Click &quot;Sync FX Rates&quot; to fetch live rates from CurrencyAPI.
                </TableCell>
              </TableRow>
            ) : (
              filteredRates.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono font-semibold">{r.fromCurrency}</TableCell>
                  <TableCell className="font-mono font-semibold">{r.toCurrency}</TableCell>
                  <TableCell>
                    {editing === r.id ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-32 h-8 text-xs font-mono"
                        autoFocus
                      />
                    ) : (
                      <code className="font-mono text-sm">{r.rate}</code>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        r.source === "ECB" || r.source === "FRANKFURTER"
                          ? "default"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {r.source === "FRANKFURTER" ? "CurrencyAPI / FX" : r.source}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {new Date(r.updatedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {editing === r.id ? (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" className="h-7 text-xs px-2" onClick={() => handleSave(r)}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs px-2"
                          onClick={() => setEditing(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs px-2"
                        onClick={() => {
                          setEditing(r.id);
                          setEditValue(r.rate);
                        }}
                        disabled={ecbEnabled && r.source === "ECB"}
                      >
                        Edit
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
