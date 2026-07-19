"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  setCaseStudyCandidate,
  setCaseStudyApproved,
} from "@/actions/crm/accounts/case-study";

type Props = {
  accountId: string;
  candidate: boolean;
  approved: boolean;
  canApprove: boolean; // manager/admin — computed server-side by the page
};

const CaseStudyCard = ({ accountId, candidate, approved, canApprove }: Props) => {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<{ error?: string }>) => {
    setBusy(true);
    try {
      const res = await fn();
      if (res.error) toast.error(res.error);
      else router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          Case study
          {approved ? (
            <Badge>Approved</Badge>
          ) : candidate ? (
            <Badge variant="secondary">Candidate</Badge>
          ) : null}
        </CardTitle>
        <div className="flex gap-2">
          {candidate ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => run(() => setCaseStudyCandidate(accountId, false))}
            >
              Withdraw candidacy
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => run(() => setCaseStudyCandidate(accountId, true))}
            >
              Flag as candidate
            </Button>
          )}
          {canApprove && candidate && !approved && (
            <Button
              size="sm"
              disabled={busy}
              onClick={() => run(() => setCaseStudyApproved(accountId, true))}
            >
              Approve case study
            </Button>
          )}
          {canApprove && approved && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => run(() => setCaseStudyApproved(accountId, false))}
            >
              Revoke approval
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Clients with strong measurable results are flagged here; a manager
        approves before marketing may reference them.
      </CardContent>
    </Card>
  );
};

export default CaseStudyCard;
