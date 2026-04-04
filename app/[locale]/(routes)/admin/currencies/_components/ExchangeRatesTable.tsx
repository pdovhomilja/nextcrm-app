"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { updateExchangeRate } from "../_actions/currencies";
import type { ExchangeRateValue } from "../_actions/currencies";

export function ExchangeRatesTable({
  rates,
  ecbEnabled,
}: {
  rates: ExchangeRateValue[];
  ecbEnabled: boolean;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleSave = async (rate: ExchangeRateValue) => {
    try {
      await updateExchangeRate({
        fromCurrency: rate.fromCurrency,
        toCurrency: rate.toCurrency,
        rate: editValue,
      });
      toast.success("Rate updated");
      setEditing(null);
    } catch {
      toast.error("Failed to update rate");
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>From</TableHead>
          <TableHead>To</TableHead>
          <TableHead>Rate</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Updated</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rates.map((r) => (
          <TableRow key={r.id}>
            <TableCell>{r.fromCurrency}</TableCell>
            <TableCell>{r.toCurrency}</TableCell>
            <TableCell>
              {editing === r.id ? (
                <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-32" autoFocus />
              ) : (
                <code>{r.rate}</code>
              )}
            </TableCell>
            <TableCell>
              <Badge variant={r.source === "ECB" ? "default" : "secondary"}>{r.source}</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {new Date(r.updatedAt).toLocaleDateString()}
            </TableCell>
            <TableCell>
              {editing === r.id ? (
                <div className="flex gap-1">
                  <Button size="sm" onClick={() => handleSave(r)}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setEditing(r.id); setEditValue(r.rate); }}
                  disabled={ecbEnabled && r.source === "ECB"}
                >
                  Edit
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
