"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { decideApproval } from "@/actions/crm/opportunities/approval";
import type { PendingApproval } from "@/actions/crm/opportunities/get-pending-approvals";

const ApprovalsTable = ({ rows }: { rows: PendingApproval[] }) => {
  const router = useRouter();
  const [rejecting, setRejecting] = useState<PendingApproval | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const decide = async (
    id: string,
    decision: "APPROVED" | "REJECTED",
    n?: string,
  ) => {
    setBusy(true);
    try {
      const res = await decideApproval(id, decision, n);
      if (res.error) toast.error(res.error);
      else {
        toast.success(decision === "APPROVED" ? "Quote approved" : "Quote rejected");
        setRejecting(null);
        setNote("");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No deals waiting for approval.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-4 py-3">Deal</th>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Rep</th>
              <th className="px-4 py-3">Budget</th>
              <th className="px-4 py-3">Requested</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <Link
                    className="font-medium hover:underline"
                    href={`/crm/opportunities/${r.id}`}
                  >
                    {r.name ?? r.id}
                  </Link>
                </td>
                <td className="px-4 py-3">{r.accountName ?? "—"}</td>
                <td className="px-4 py-3">{r.repName ?? "—"}</td>
                <td className="px-4 py-3">{r.budget.toLocaleString()}</td>
                <td className="px-4 py-3">
                  {r.approval_requested_at
                    ? new Date(r.approval_requested_at).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => decide(r.id, "APPROVED")}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => setRejecting(r)}
                    >
                      Reject
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>

      <Dialog
        open={!!rejecting}
        onOpenChange={(v) => {
          if (!v) setRejecting(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject quote — {rejecting?.name ?? ""}</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="What needs to change? (sent to the rep)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
          />
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => rejecting && decide(rejecting.id, "REJECTED", note)}
            >
              Reject quote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ApprovalsTable;
