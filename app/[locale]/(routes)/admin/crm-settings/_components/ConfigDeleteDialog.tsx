"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deleteConfigValue, type CrmConfigType, type ConfigValue } from "../_actions/crm-settings";
import { toast } from "sonner";

interface Props {
  configType: CrmConfigType;
  item: ConfigValue;
  allValues: ConfigValue[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ConfigDeleteDialog({ configType, item, allValues, open, onOpenChange }: Props) {
  const others = allValues.filter((v) => v.id !== item.id);
  const [replacementId, setReplacementId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (item.usageCount > 0 && !replacementId) {
      toast.error("Select a replacement before deleting");
      return;
    }
    setLoading(true);
    try {
      await deleteConfigValue(configType, item.id, item.usageCount > 0 ? replacementId : undefined);
      toast.success("Deleted");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete &quot;{item.name}&quot;</DialogTitle>
          {item.usageCount > 0 && (
            <DialogDescription>
              {item.usageCount} record{item.usageCount !== 1 ? "s" : ""} use this value. Choose a replacement before deleting.
            </DialogDescription>
          )}
        </DialogHeader>
        {item.usageCount > 0 && (
          <div className="py-2">
            <Select onValueChange={setReplacementId}>
              <SelectTrigger><SelectValue placeholder="Select replacement…" /></SelectTrigger>
              <SelectContent>
                {others.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading || (item.usageCount > 0 && !replacementId)}
          >
            {loading ? "Deleting…" : item.usageCount > 0 ? "Reassign & Delete" : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
