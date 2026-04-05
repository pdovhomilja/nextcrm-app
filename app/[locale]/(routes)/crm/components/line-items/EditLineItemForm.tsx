"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { useAction } from "@/hooks/use-action";
import { FormInput } from "@/components/form/form-input";
import { FormSubmit } from "@/components/form/form-submit";
import { FormTextarea } from "@/components/form/form-textarea";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import type { LineItemData } from "./LineItemsTable";

interface EditLineItemFormProps {
  item: LineItemData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: any;
}

const EditLineItemForm = ({
  item,
  open,
  onOpenChange,
  action,
}: EditLineItemFormProps) => {
  const router = useRouter();
  const [discountType, setDiscountType] = useState<string>(
    item.discount_value === 0 ? "NONE" : item.discount_type
  );

  const { execute, fieldErrors, isLoading } = useAction(action, {
    onSuccess: () => {
      toast.success("Line item updated");
      onOpenChange(false);
      router.refresh();
    },
    onError: (error: string) => {
      toast.error(error);
    },
  });

  const onAction = async (formData: FormData) => {
    const name = formData.get("name") as string;
    const quantity = parseInt((formData.get("quantity") as string) || "1", 10);
    const unit_price = formData.get("unit_price") as string;
    const description = (formData.get("description") as string) || undefined;
    const discount_value =
      discountType !== "NONE"
        ? (formData.get("discount_value") as string) || "0"
        : "0";

    await execute({
      id: item.id,
      name,
      quantity,
      unit_price,
      discount_type:
        discountType === "NONE" ? "PERCENTAGE" : discountType,
      discount_value,
      description,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Line Item</SheetTitle>
          <SheetDescription>Update the line item details</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <form action={onAction} className="space-y-4">
            <FormInput
              id="name"
              label="Name"
              type="text"
              errors={fieldErrors}
              defaultValue={item.name}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                id="quantity"
                label="Quantity"
                type="number"
                errors={fieldErrors}
                defaultValue={String(item.quantity)}
              />
              <FormInput
                id="unit_price"
                label="Unit Price"
                type="text"
                errors={fieldErrors}
                defaultValue={String(item.unit_price)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-700">
                Discount Type
              </label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
              >
                <option value="NONE">None</option>
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed Amount</option>
              </select>
            </div>

            {discountType !== "NONE" && (
              <FormInput
                id="discount_value"
                label={
                  discountType === "PERCENTAGE"
                    ? "Discount (%)"
                    : "Discount Amount"
                }
                type="text"
                errors={fieldErrors}
                defaultValue={String(item.discount_value)}
              />
            )}

            <FormTextarea
              id="description"
              label="Description"
              errors={fieldErrors}
              defaultValue={item.description || ""}
            />

            <FormSubmit className="w-full">
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                "Save Changes"
              )}
            </FormSubmit>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default EditLineItemForm;
