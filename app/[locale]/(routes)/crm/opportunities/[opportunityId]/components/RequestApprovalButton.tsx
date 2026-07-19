"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FileCheck2, Loader2 } from "lucide-react";
import { requestApproval } from "@/actions/crm/opportunities/approval";

const RequestApprovalButton = ({ opportunityId }: { opportunityId: string }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const res = await requestApproval(opportunityId);
      if (res.error) toast.error(res.error);
      else {
        toast.success("Approval requested — approvers were notified.");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={submit} disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <FileCheck2 className="h-4 w-4 mr-2" />
      )}
      Request approval
    </Button>
  );
};

export default RequestApprovalButton;
