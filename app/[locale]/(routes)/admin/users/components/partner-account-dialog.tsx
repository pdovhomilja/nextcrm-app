"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AccountSearchCombobox } from "@/components/ui/account-search-combobox";
import { setPartnerAccount } from "@/actions/admin/users/set-partner-account";

interface Props {
  userId: string;
  partnerAccountId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Admin picks the partner's own company account (read-only for him later). */
export function PartnerAccountDialog({ userId, partnerAccountId, open, onOpenChange }: Props) {
  const router = useRouter();
  const [accountId, setAccountId] = useState(partnerAccountId ?? "");
  const [loading, setLoading] = useState(false);

  const save = async (value: string | null) => {
    setLoading(true);
    try {
      const result = await setPartnerAccount(userId, value);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(value ? "Partner account saved." : "Partner account cleared.");
      onOpenChange(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Partner account</DialogTitle>
          <DialogDescription>The partner&apos;s own company. He will see it read-only.</DialogDescription>
        </DialogHeader>
        <AccountSearchCombobox value={accountId} onChange={setAccountId} disabled={loading} />
        <DialogFooter>
          <Button variant="outline" disabled={loading || !partnerAccountId} onClick={() => save(null)}>
            Clear
          </Button>
          <Button disabled={loading || !accountId} onClick={() => save(accountId)}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
