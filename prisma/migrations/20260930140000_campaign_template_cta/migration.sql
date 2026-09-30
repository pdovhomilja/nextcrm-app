-- Add optional per-template CTA button fields to campaign templates.
-- Rendered by the branded email shell (lib/campaigns/email-shell.ts); the button
-- shows only when both cta_label and cta_url are set.
ALTER TABLE "crm_campaign_templates" ADD COLUMN "cta_label" TEXT;
ALTER TABLE "crm_campaign_templates" ADD COLUMN "cta_url" TEXT;
