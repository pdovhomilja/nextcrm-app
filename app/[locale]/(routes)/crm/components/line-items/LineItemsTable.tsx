"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface LineItemData {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  quantity: number;
  unit_price: number;
  discount_type: "PERCENTAGE" | "FIXED";
  discount_value: number;
  line_total: number;
  currency: string;
  sort_order: number;
  productId: string | null;
}

interface LineItemsTableProps {
  items: LineItemData[];
  currency: string;
  onRemove: (id: string) => Promise<any>;
  onEdit: (item: LineItemData) => void;
}

function formatPrice(amount: number, currency: string): string {
  const isWhole = amount % 1 === 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: isWhole ? 0 : 2,
  }).format(amount);
}

const LineItemsTable = ({
  items,
  currency,
  onRemove,
  onEdit,
}: LineItemsTableProps) => {
  const router = useRouter();

  const handleRemove = async (id: string) => {
    const result = await onRemove(id);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Line item removed");
      router.refresh();
    }
  };

  if (!items || items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No line items yet. Add one to get started.
      </p>
    );
  }

  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">#</TableHead>
          <TableHead>Product</TableHead>
          <TableHead className="w-16 text-right">Qty</TableHead>
          <TableHead className="w-28 text-right">Unit Price</TableHead>
          <TableHead className="w-28 text-right">Discount</TableHead>
          <TableHead className="w-28 text-right">Line Total</TableHead>
          <TableHead className="w-20"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item, index) => (
          <TableRow key={item.id}>
            <TableCell className="text-muted-foreground">
              {index + 1}
            </TableCell>
            <TableCell>
              <div className="font-medium">{item.name}</div>
              {item.sku && (
                <div className="text-xs text-muted-foreground">{item.sku}</div>
              )}
            </TableCell>
            <TableCell className="text-right">{item.quantity}</TableCell>
            <TableCell className="text-right">
              {formatPrice(item.unit_price, item.currency || currency)}
            </TableCell>
            <TableCell className="text-right">
              {item.discount_type === "PERCENTAGE" && item.discount_value > 0
                ? `${item.discount_value}%`
                : item.discount_type === "FIXED" && item.discount_value > 0
                  ? formatPrice(item.discount_value, item.currency || currency)
                  : "-"}
            </TableCell>
            <TableCell className="text-right font-bold">
              {formatPrice(item.line_total, item.currency || currency)}
            </TableCell>
            <TableCell>
              <div className="flex gap-1 justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onEdit(item)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => handleRemove(item.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={5} className="text-right font-semibold">
            Subtotal
          </TableCell>
          <TableCell className="text-right font-bold">
            {formatPrice(subtotal, currency)}
          </TableCell>
          <TableCell />
        </TableRow>
      </TableFooter>
    </Table>
  );
};

export default LineItemsTable;
