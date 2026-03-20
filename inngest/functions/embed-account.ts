import { inngest } from "@/inngest/client";

export const embedAccount = inngest.createFunction(
  { id: "embed-account", name: "Embed Account", triggers: [{ event: "crm/account.saved" }] },
  async () => ({ status: "stub" })
);
