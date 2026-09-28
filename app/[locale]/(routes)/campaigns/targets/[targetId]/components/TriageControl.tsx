"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { setTargetTriage } from "@/actions/crm/targets/set-target-triage";
import { TriagePassDialog } from "../../components/TriagePassDialog";
import {
  triageStatusLabel,
  triageBadgeVariant,
} from "../../table-data/triage-options";

interface TriageControlProps {
  targetId: string;
  targetLabel: string;
  status?: string | null;
}

export function TriageControl({ targetId, targetLabel, status }: TriageControlProps) {
  const router = useRouter();
  const [passOpen, setPassOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const onApprove = async () => {
    setLoading(true);
    const result = await setTargetTriage({ id: targetId, status: "APPROVED" });
    setLoading(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Target approved for outreach");
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2">
      <Badge variant={triageBadgeVariant(status)}>{triageStatusLabel(status)}</Badge>
      <Button size="sm" variant="outline" onClick={onApprove} disabled={loading || status === "APPROVED"}>
        Approve
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setPassOpen(true)} disabled={loading}>
        Pass…
      </Button>
      <TriagePassDialog
        targetId={targetId}
        targetLabel={targetLabel}
        open={passOpen}
        setOpen={setPassOpen}
        onDone={() => router.refresh()}
      />
    </div>
  );
}
