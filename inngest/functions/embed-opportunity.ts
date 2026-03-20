import { inngest } from "@/inngest/client";

export const embedOpportunity = inngest.createFunction(
  { id: "embed-opportunity", name: "Embed Opportunity", triggers: [{ event: "crm/opportunity.saved" }] },
  async () => ({ status: "stub" })
);
