-- Add delivery_deadline to crm_Opportunities
ALTER TABLE "crm_Opportunities" ADD COLUMN "delivery_deadline" TIMESTAMP(3);

-- Add do_not_email and do_not_email_at to crm_Targets
ALTER TABLE "crm_Targets" ADD COLUMN "do_not_email" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "crm_Targets" ADD COLUMN "do_not_email_at" TIMESTAMP(3);

-- Add index on do_not_email for crm_Targets
CREATE INDEX "crm_Targets_do_not_email_idx" ON "crm_Targets"("do_not_email");
