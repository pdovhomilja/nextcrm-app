import { inngest } from "@/inngest/client";

export const embedContact = inngest.createFunction(
  { id: "embed-contact", name: "Embed Contact", triggers: [{ event: "crm/contact.saved" }] },
  async () => ({ status: "stub" })
);
