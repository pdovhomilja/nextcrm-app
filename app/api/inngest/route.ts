import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { embedAccount } from "@/inngest/functions/embed-account";
import { embedContact } from "@/inngest/functions/embed-contact";
import { embedLead } from "@/inngest/functions/embed-lead";
import { embedOpportunity } from "@/inngest/functions/embed-opportunity";
import { embedBackfill } from "@/inngest/functions/embed-backfill";
import { emailSyncAll } from "@/inngest/functions/emails/sync-all";
import { emailSyncAccount } from "@/inngest/functions/emails/sync-account";
import { embedEmail } from "@/inngest/functions/emails/embed-email";
import { emailLinkCrm } from "@/inngest/functions/emails/link-crm";
import { enrichContact } from "@/inngest/functions/enrich-contact";
import { enrichContactsBulk } from "@/inngest/functions/enrich-contacts-bulk";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    embedAccount,
    embedContact,
    embedLead,
    embedOpportunity,
    embedBackfill,
    emailSyncAll,
    emailSyncAccount,
    embedEmail,
    emailLinkCrm,
    enrichContact,
    enrichContactsBulk,
  ],
});
