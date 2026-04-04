"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { setEcbAutoUpdate } from "../_actions/currencies";

export function ECBToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);

  const handleToggle = async (checked: boolean) => {
    try {
      await setEcbAutoUpdate(checked);
      setEnabled(checked);
      toast.success(`ECB auto-update ${checked ? "enabled" : "disabled"}`);
    } catch {
      toast.error("Failed to update ECB setting");
    }
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">ECB Auto-Update</span>
      <Switch checked={enabled} onCheckedChange={handleToggle} />
    </div>
  );
}
