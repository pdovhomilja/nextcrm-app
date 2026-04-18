"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";

interface Product {
  id: string;
  name: string;
}

interface TaxRate {
  id: string;
  name: string;
  rate: string;
}

export interface LineItemRow {
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxRateId: string;
}

interface LineItemsEditorProps {
  items: LineItemRow[];
  onChange: (items: LineItemRow[]) => void;
  products: Product[];
  taxRates: TaxRate[];
  labels?: {
    product?: string;
    description?: string;
    quantity?: string;
    unitPrice?: string;
    discount?: string;
    taxRate?: string;
    total?: string;
    addLine?: string;
  };
}

function computeLineTotal(
  qty: number,
  price: number,
  discount: number,
  taxRate: number
) {
  const gross = qty * price;
  const disc = (gross * discount) / 100;
  const sub = gross - disc;
  const vat = (sub * taxRate) / 100;
  return Math.round((sub + vat) * 100) / 100;
}

export function LineItemsEditor({
  items,
  onChange,
  products,
  taxRates,
  labels,
}: LineItemsEditorProps) {
  const updateItem = (index: number, patch: Partial<LineItemRow>) => {
    const next = items.map((item, i) =>
      i === index ? { ...item, ...patch } : item
    );
    onChange(next);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const addItem = () => {
    onChange([
      ...items,
      {
        productId: "",
        description: "",
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0,
        taxRateId: "",
      },
    ]);
  };

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    updateItem(index, {
      productId,
      description: product?.name ?? items[index].description,
    });
  };

  const getTaxRateValue = (taxRateId: string) => {
    const tr = taxRates.find((t) => t.id === taxRateId);
    return tr ? parseFloat(tr.rate) : 0;
  };

  const l = labels ?? {};

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_2fr_80px_100px_80px_120px_80px_40px] gap-2 text-xs font-medium text-muted-foreground">
        <span>{l.product ?? "Product"}</span>
        <span>{l.description ?? "Description"}</span>
        <span>{l.quantity ?? "Qty"}</span>
        <span>{l.unitPrice ?? "Unit Price"}</span>
        <span>{l.discount ?? "Disc %"}</span>
        <span>{l.taxRate ?? "Tax Rate"}</span>
        <span>{l.total ?? "Total"}</span>
        <span />
      </div>

      {items.map((item, index) => {
        const lineTotal = computeLineTotal(
          item.quantity,
          item.unitPrice,
          item.discountPercent,
          getTaxRateValue(item.taxRateId)
        );

        return (
          <div
            key={index}
            className="grid grid-cols-[1fr_2fr_80px_100px_80px_120px_80px_40px] gap-2 items-center"
          >
            <Select
              value={item.productId || "none"}
              onValueChange={(v) =>
                handleProductSelect(index, v === "none" ? "" : v)
              }
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-</SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              className="h-9 text-sm"
              value={item.description}
              onChange={(e) =>
                updateItem(index, { description: e.target.value })
              }
              placeholder="Description"
            />

            <Input
              className="h-9 text-sm"
              type="number"
              min={0}
              step="0.01"
              value={item.quantity}
              onChange={(e) =>
                updateItem(index, {
                  quantity: parseFloat(e.target.value) || 0,
                })
              }
            />

            <Input
              className="h-9 text-sm"
              type="number"
              min={0}
              step="0.01"
              value={item.unitPrice}
              onChange={(e) =>
                updateItem(index, {
                  unitPrice: parseFloat(e.target.value) || 0,
                })
              }
            />

            <Input
              className="h-9 text-sm"
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={item.discountPercent}
              onChange={(e) =>
                updateItem(index, {
                  discountPercent: parseFloat(e.target.value) || 0,
                })
              }
            />

            <Select
              value={item.taxRateId || "none"}
              onValueChange={(v) =>
                updateItem(index, { taxRateId: v === "none" ? "" : v })
              }
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Tax..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {taxRates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.rate}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-sm font-mono text-right">
              {lineTotal.toFixed(2)}
            </span>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => removeItem(index)}
              disabled={items.length <= 1}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      })}

      <Button type="button" variant="outline" size="sm" onClick={addItem}>
        + {l.addLine ?? "Add Line"}
      </Button>
    </div>
  );
}
