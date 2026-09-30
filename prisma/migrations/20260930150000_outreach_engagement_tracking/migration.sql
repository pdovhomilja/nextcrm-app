-- Engagement tracking for one-off outreach emails (Resend open/click webhook).
ALTER TABLE "crm_Target_Email" ADD COLUMN "opened_at" TIMESTAMP(3);
ALTER TABLE "crm_Target_Email" ADD COLUMN "clicked_at" TIMESTAMP(3);

-- Public homepage (/p/<slug>) view tracking (basic UA-filtered counter).
ALTER TABLE "crm_Target_Homepage" ADD COLUMN "view_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "crm_Target_Homepage" ADD COLUMN "last_viewed_at" TIMESTAMP(3);
