"use client";

import { useState } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import LineItemsTable from "../../../components/line-items/LineItemsTable";
import AddLineItemForm from "../../../components/line-items/AddLineItemForm";
import EditLineItemForm from "../../../components/line-items/EditLineItemForm";
import type { LineItemData } from "../../../components/line-items/LineItemsTable";

import { addOpportunityLineItem } from "@/actions/crm/opportunity-line-items/add-line-item";
import { updateOpportunityLineItem } from "@/actions/crm/opportunity-line-items/update-line-item";
import { removeOpportunityLineItem } from "@/actions/crm/opportunity-line-items/remove-line-item";

interface LineItemsSectionProps {
  opportunityId: string;
  lineItems: LineItemData[];
  currency: string;
  products: { id: string; name: string; sku: string | null; unit_price: number }[];
}

const LineItemsSection = ({
  opportunityId,
  lineItems,
  currency,
  products,
}: LineItemsSectionProps) => {
  const [editItem, setEditItem] = useState<LineItemData | null>(null);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between">
            <CardTitle>Line Items</CardTitle>
            <div className="flex space-x-2">
              <AddLineItemForm
                products={products}
                action={addOpportunityLineItem}
                parentId={opportunityId}
                parentIdField="opportunityId"
              />
            </div>
          </div>
          <Separator />
        </CardHeader>
        <CardContent>
          <LineItemsTable
            items={lineItems}
            currency={currency}
            onRemove={removeOpportunityLineItem}
            onEdit={(item) => setEditItem(item)}
          />
        </CardContent>
      </Card>

      {editItem && (
        <EditLineItemForm
          item={editItem}
          open={!!editItem}
          onOpenChange={(open) => {
            if (!open) setEditItem(null);
          }}
          action={updateOpportunityLineItem}
        />
      )}
    </>
  );
};

export default LineItemsSection;
