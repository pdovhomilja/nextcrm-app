import { inngest } from "@/inngest/client";
import { persistFrankfurterRates } from "@/lib/currency/persist-frankfurter-rates";

/** Daily free FX sync (Frankfurter) for EUR / USD / INR. */
export const frankfurterSyncRates = inngest.createFunction(
  {
    id: "frankfurter-sync-rates",
    name: "Frankfurter Sync Exchange Rates",
    triggers: [{ cron: "0 6 * * *" }],
  },
  async () => {
    const updated = await persistFrankfurterRates();
    return { ok: true, updated };
  }
);
