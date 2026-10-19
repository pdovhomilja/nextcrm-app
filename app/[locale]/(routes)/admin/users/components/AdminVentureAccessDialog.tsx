"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { VentureAccessFields } from "./VentureAccessFields";
import { setVentureAccess } from "@/actions/admin/users/set-venture-access";
import type { VentureOption } from "@/lib/vensai/venture-catalog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  ventures: VentureOption[];
  initialSlugs: string[];
  initialCrmEnabled: boolean;
};

export function AdminVentureAccessDialog({
  open,
  onOpenChange,
  userId,
  userName,
  ventures,
  initialSlugs,
  initialCrmEnabled,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [ventureSlugs, setVentureSlugs] = useState(initialSlugs);
  const [crmEnabled, setCrmEnabled] = useState(initialCrmEnabled);

  async function save() {
    setLoading(true);
    const result = await setVentureAccess({ userId, ventureSlugs, crmEnabled });
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Venture & CRM access updated");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Venture &amp; CRM access</DialogTitle>
          <DialogDescription>{userName}</DialogDescription>
        </DialogHeader>
        <VentureAccessFields
          ventures={ventures}
          ventureSlugs={ventureSlugs}
          crmEnabled={crmEnabled}
          onVentureSlugsChange={setVentureSlugs}
          onCrmEnabledChange={setCrmEnabled}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={loading}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
