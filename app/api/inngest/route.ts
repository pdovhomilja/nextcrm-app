import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { embedAccount } from "@/inngest/functions/embed-account";
import { embedContact } from "@/inngest/functions/embed-contact";
import { embedLead } from "@/inngest/functions/embed-lead";
import { embedOpportunity } from "@/inngest/functions/embed-opportunity";
import { embedBackfill } from "@/inngest/functions/embed-backfill";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    embedAccount,
    embedContact,
    embedLead,
    embedOpportunity,
    embedBackfill,
  ],
});
