"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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

interface InvoiceCurrency {
  code: string;
  name: string;
  symbol: string | null;
  active: boolean;
}

interface Props {
  currencies: InvoiceCurrency[];
}

export function InvoiceCurrenciesTable({ currencies }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");

  const handleToggle = async (currCode: string, active: boolean) => {
    try {
      const res = await fetch(`/api/admin/invoices/currencies/${currCode}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(`Currency ${currCode} ${active ? "enabled" : "disabled"}`);
      router.refresh();
    } catch {
      toast.error("Failed to update currency");
    }
  };

  const handleCreate = async () => {
    try {
      const res = await fetch("/api/admin/invoices/currencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name, symbol }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(`Currency ${code} added`);
      setOpen(false);
      setCode("");
      setName("");
      setSymbol("");
      router.refresh();
    } catch {
      toast.error("Failed to add currency");
    }
  };

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Symbol</TableHead>
            <TableHead>Active</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currencies.map((c) => (
            <TableRow key={c.code} className={!c.active ? "opacity-50" : ""}>
              <TableCell className="font-semibold">{c.code}</TableCell>
              <TableCell>{c.name}</TableCell>
              <TableCell>{c.symbol}</TableCell>
              <TableCell>
                <Switch
                  checked={c.active}
                  onCheckedChange={(checked) => handleToggle(c.code, checked)}
                />
              </TableCell>
            </TableRow>
          ))}
          {currencies.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={4}
                className="text-center text-muted-foreground"
              >
                No currencies configured
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="mt-4">
            + Add Currency
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Invoice Currency</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Code (e.g. GBP)"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={3}
            />
            <Input
              placeholder="Name (e.g. British Pound)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              placeholder="Symbol (e.g. £)"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              maxLength={5}
            />
            <Button
              onClick={handleCreate}
              disabled={!code || !name}
            >
              Add
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
