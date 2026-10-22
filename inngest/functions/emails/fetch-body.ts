import { inngest } from "@/inngest/client";
import { fetchAndPersistEmailBody } from "@/lib/email/fetch-email-body";

export const emailFetchBody = inngest.createFunction(
  {
    id: "email-fetch-body",
    name: "Email: Fetch body on demand",
    concurrency: { limit: 4 },
    triggers: [{ event: "email/fetch-body" }],
  },
  async ({ event }) => {
    const { emailId } = event.data as { emailId: string };
    try {
      const saved = await fetchAndPersistEmailBody(emailId);
      return { saved };
    } catch (e) {
      console.warn(`[email/fetch-body] failed for ${emailId}:`, e);
      return { saved: false };
    }
  }
);
