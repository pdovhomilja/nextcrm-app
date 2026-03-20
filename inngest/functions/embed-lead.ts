import { inngest } from "@/inngest/client";

export const embedLead = inngest.createFunction(
  { id: "embed-lead", name: "Embed Lead", triggers: [{ event: "crm/lead.saved" }] },
  async () => ({ status: "stub" })
);
