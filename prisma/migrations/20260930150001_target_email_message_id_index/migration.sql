-- The Resend webhook looks up one-off outreach emails by message id (open/click),
-- mirroring the crm_campaign_sends index. Without this it seq-scans per event.
CREATE INDEX "crm_Target_Email_resend_message_id_idx" ON "crm_Target_Email"("resend_message_id");
