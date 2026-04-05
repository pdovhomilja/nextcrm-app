"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Loader2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import LineItemsTable from "../../../components/line-items/LineItemsTable";
import AddLineItemForm from "../../../components/line-items/AddLineItemForm";
import EditLineItemForm from "../../../components/line-items/EditLineItemForm";
import type { LineItemData } from "../../../components/line-items/LineItemsTable";

import { addContractLineItem } from "@/actions/crm/contract-line-items/add-line-item";
import { updateContractLineItem } from "@/actions/crm/contract-line-items/update-line-item";
import { removeContractLineItem } from "@/actions/crm/contract-line-items/remove-line-item";
import { copyLineItemsFromOpportunity } from "@/actions/crm/contract-line-items/copy-from-opportunity";

interface LineItemsSectionProps {
  contractId: string;
  lineItems: LineItemData[];
  currency: string;
  products: { id: string; name: string; sku: string | null; unit_price: number }[];
  opportunities: { id: string; name: string }[];
}

const LineItemsSection = ({
  contractId,
  lineItems,
  currency,
  products,
  opportunities,
}: LineItemsSectionProps) => {
  const router = useRouter();
  const [editItem, setEditItem] = useState<LineItemData | null>(null);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState("");
  const [isCopying, setIsCopying] = useState(false);

  const handleCopy = async () => {
    if (!selectedOpportunityId) {
      toast.error("Please select an opportunity");
      return;
    }
    setIsCopying(true);
    try {
      const result = await copyLineItemsFromOpportunity(
        contractId,
        selectedOpportunityId
      );
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(
          `Copied ${result?.data?.copied || 0} line item(s) from opportunity`
        );
        setCopyDialogOpen(false);
        setSelectedOpportunityId("");
        router.refresh();
      }
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between">
            <CardTitle>Line Items</CardTitle>
            <div className="flex space-x-2">
              {opportunities.length > 0 && (
                <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="mb-5">
                      <Copy className="h-4 w-4 mr-1" />
                      Copy from Opportunity
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Copy Line Items from Opportunity</DialogTitle>
                      <DialogDescription>
                        Select an opportunity to copy its line items into this
                        contract. Existing line items will not be removed.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Opportunity
                        </label>
                        <select
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={selectedOpportunityId}
                          onChange={(e) =>
                            setSelectedOpportunityId(e.target.value)
                          }
                        >
                          <option value="">-- Select an opportunity --</option>
                          {opportunities.map((opp) => (
                            <option key={opp.id} value={opp.id}>
                              {opp.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setCopyDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleCopy} disabled={isCopying}>
                        {isCopying ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Copy"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              <AddLineItemForm
                products={products}
                action={addContractLineItem}
                parentId={contractId}
                parentIdField="contractId"
              />
            </div>
          </div>
          <Separator />
        </CardHeader>
        <CardContent>
          <LineItemsTable
            items={lineItems}
            currency={currency}
            onRemove={removeContractLineItem}
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
          action={updateContractLineItem}
        />
      )}
    </>
  );
};

export default LineItemsSection;
