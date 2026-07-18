"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createConfigValue, type CrmConfigType } from "../_actions/crm-settings";
import { STAGE_KINDS, type StageKind } from "@/lib/crm/stage-kinds";
import { toast } from "sonner";

const KIND_NONE = "__none__";

interface Props {
  configType: CrmConfigType;
  label: string;
}

export function ConfigAddDialog({ configType, label }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [stageKind, setStageKind] = useState<string>(KIND_NONE);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await createConfigValue(
        configType,
        name,
        configType === "salesStage"
          ? (stageKind === KIND_NONE ? null : (stageKind as StageKind))
          : undefined
      );
      toast.success(`${label} added`);
      setName("");
      setStageKind(KIND_NONE);
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" /> Add {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add {label}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
          </div>
          {configType === "salesStage" && (
            <div className="space-y-1">
              <Label>Automation trigger</Label>
              <Select value={stageKind} onValueChange={setStageKind}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={KIND_NONE}>None</SelectItem>
                  {STAGE_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>{k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Adding…" : "Add"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
