"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setTargetTriage } from "@/actions/crm/targets/set-target-triage";
import {
  PASS_REASON_OPTIONS,
  type PassReason,
} from "../table-data/triage-options";

interface TriagePassDialogProps {
  targetId: string;
  targetLabel: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  onDone?: () => void;
}

export function TriagePassDialog({
  targetId,
  targetLabel,
  open,
  setOpen,
  onDone,
}: TriagePassDialogProps) {
  const [reason, setReason] = useState<PassReason | "">("");
  const [note, setNote] = useState("");
  const [revisit, setRevisit] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!reason) {
      toast.error("Choose a reason for passing");
      return;
    }
    setLoading(true);
    const result = await setTargetTriage({
      id: targetId,
      status: "PASSED",
      pass_reason: reason,
      pass_note: note.trim() || null,
      revisit_at: revisit ? new Date(revisit) : null,
    });
    setLoading(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Target passed");
    setOpen(false);
    setReason("");
    setNote("");
    setRevisit("");
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pass on {targetLabel}</DialogTitle>
          <DialogDescription>
            Record why you&apos;re passing now. Set a revisit date to resurface
            this target later.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="pass-reason">Reason</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as PassReason)}>
              <SelectTrigger id="pass-reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {PASS_REASON_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pass-note">Note (optional)</Label>
            <Textarea
              id="pass-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. 40+ pages to rebuild — revisit when they scope a phase 1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pass-revisit">Revisit on (optional)</Label>
            <Input
              id="pass-revisit"
              type="date"
              value={revisit}
              onChange={(e) => setRevisit(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={loading || !reason}>
            {loading ? "Saving…" : "Pass target"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
