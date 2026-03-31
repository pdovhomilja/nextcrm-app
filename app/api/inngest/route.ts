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
import { enrichTarget } from "@/inngest/functions/enrich-target";
import { enrichTargetsBulk } from "@/inngest/functions/enrich-targets-bulk";
import { enrichTargetContact } from "@/inngest/functions/enrich-target-contact";
import { campaignScheduleSend } from "@/inngest/functions/campaigns/schedule-send";
import { campaignSendStep } from "@/inngest/functions/campaigns/send-step";
import { campaignProcessFollowUp } from "@/inngest/functions/campaigns/process-follow-up";
import { campaignSendNow } from "@/inngest/functions/campaigns/send-now";
import { reportSendScheduled } from "@/inngest/functions/reports/send-scheduled";

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
    enrichTarget,
    enrichTargetsBulk,
    enrichTargetContact,
    campaignScheduleSend,
    campaignSendStep,
    campaignProcessFollowUp,
    campaignSendNow,
    reportSendScheduled,
  ],
});
