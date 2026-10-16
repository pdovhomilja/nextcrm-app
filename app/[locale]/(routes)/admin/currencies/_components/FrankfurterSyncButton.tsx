"use client";

import { useState } from "react";
import { syncExchangeRatesFromFrankfurter } from "@/actions/admin/sync-exchange-rates";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function FrankfurterSyncButton() {
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const res = await syncExchangeRatesFromFrankfurter();
      if (!res.ok) {
        toast.error(res.error ?? "Sync failed");
        return;
      }
      toast.success(
        `Updated ${res.updated} rates from Frankfurter across supported ECB currencies`
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => void run()}>
      {loading ? "Syncing…" : "Sync FX now (free API)"}
    </Button>
  );
}
