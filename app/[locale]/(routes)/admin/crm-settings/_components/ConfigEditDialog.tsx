"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateConfigValue, type CrmConfigType } from "../_actions/crm-settings";
import { toast } from "sonner";

interface Props {
  configType: CrmConfigType;
  id: string;
  currentName: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ConfigEditDialog({ configType, id, currentName, open, onOpenChange }: Props) {
  const [name, setName] = useState(currentName);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await updateConfigValue(configType, id, name);
      toast.success("Updated");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit Value</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label htmlFor="edit-name">Name</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Saving…" : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
