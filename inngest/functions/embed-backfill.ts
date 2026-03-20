import { inngest } from "@/inngest/client";

export const embedBackfill = inngest.createFunction(
  { id: "embed-backfill", name: "Embed Backfill", triggers: [{ event: "crm/backfill.requested" }] },
  async () => ({ status: "stub" })
);
