-- CreateTable (IF NOT EXISTS): crm_Targets — may already exist on upgraded DBs
CREATE TABLE IF NOT EXISTS "crm_Targets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "first_name" TEXT,
    "last_name" TEXT NOT NULL,
    "email" TEXT,
    "mobile_phone" TEXT,
    "office_phone" TEXT,
    "company" TEXT,
    "company_website" TEXT,
    "personal_website" TEXT,
    "position" TEXT,
    "social_x" TEXT,
    "social_linkedin" TEXT,
    "social_instagram" TEXT,
    "social_facebook" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "tags" TEXT[],
    "notes" TEXT[],
    "created_by" UUID,
    "created_on" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" UUID,

    CONSTRAINT "crm_Targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable (IF NOT EXISTS): crm_TargetLists — may already exist on upgraded DBs
CREATE TABLE IF NOT EXISTS "crm_TargetLists" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "created_on" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "crm_TargetLists_pkey" PRIMARY KEY ("id")
);

-- CreateTable (IF NOT EXISTS): TargetsToTargetLists — may already exist on upgraded DBs
CREATE TABLE IF NOT EXISTS "TargetsToTargetLists" (
    "target_id" UUID NOT NULL,
    "target_list_id" UUID NOT NULL,

    CONSTRAINT "TargetsToTargetLists_pkey" PRIMARY KEY ("target_id","target_list_id")
);

-- CreateTable (IF NOT EXISTS): crm_Target_Enrichment — may already exist on upgraded DBs
CREATE TABLE IF NOT EXISTS "crm_Target_Enrichment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "targetId" UUID NOT NULL,
    "status" "crm_Enrichment_Status" NOT NULL DEFAULT 'PENDING',
    "fields" TEXT[],
    "result" JSONB,
    "error" TEXT,
    "triggeredBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_Target_Enrichment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (IF NOT EXISTS) for crm_Targets
CREATE INDEX IF NOT EXISTS "crm_Targets_created_by_idx" ON "crm_Targets"("created_by");
CREATE INDEX IF NOT EXISTS "crm_Targets_status_idx" ON "crm_Targets"("status");
CREATE INDEX IF NOT EXISTS "crm_Targets_created_on_idx" ON "crm_Targets"("created_on");

-- CreateIndex (IF NOT EXISTS) for crm_TargetLists
CREATE INDEX IF NOT EXISTS "crm_TargetLists_created_by_idx" ON "crm_TargetLists"("created_by");
CREATE INDEX IF NOT EXISTS "crm_TargetLists_status_idx" ON "crm_TargetLists"("status");

-- CreateIndex (IF NOT EXISTS) for TargetsToTargetLists
CREATE INDEX IF NOT EXISTS "TargetsToTargetLists_target_id_idx" ON "TargetsToTargetLists"("target_id");
CREATE INDEX IF NOT EXISTS "TargetsToTargetLists_target_list_id_idx" ON "TargetsToTargetLists"("target_list_id");

-- CreateIndex (IF NOT EXISTS) for crm_Target_Enrichment
CREATE INDEX IF NOT EXISTS "crm_Target_Enrichment_targetId_idx" ON "crm_Target_Enrichment"("targetId");
CREATE INDEX IF NOT EXISTS "crm_Target_Enrichment_status_idx" ON "crm_Target_Enrichment"("status");
CREATE INDEX IF NOT EXISTS "crm_Target_Enrichment_createdAt_idx" ON "crm_Target_Enrichment"("createdAt");
CREATE INDEX IF NOT EXISTS "crm_Target_Enrichment_triggeredBy_idx" ON "crm_Target_Enrichment"("triggeredBy");

-- AddForeignKey (idempotent) for Targets → Users
DO $$ BEGIN
  ALTER TABLE "crm_Targets" ADD CONSTRAINT "crm_Targets_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey (idempotent) for TargetLists → Users
DO $$ BEGIN
  ALTER TABLE "crm_TargetLists" ADD CONSTRAINT "crm_TargetLists_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey (idempotent) for TargetsToTargetLists → crm_Targets
DO $$ BEGIN
  ALTER TABLE "TargetsToTargetLists" ADD CONSTRAINT "TargetsToTargetLists_target_id_fkey"
    FOREIGN KEY ("target_id") REFERENCES "crm_Targets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey (idempotent) for TargetsToTargetLists → crm_TargetLists
DO $$ BEGIN
  ALTER TABLE "TargetsToTargetLists" ADD CONSTRAINT "TargetsToTargetLists_target_list_id_fkey"
    FOREIGN KEY ("target_list_id") REFERENCES "crm_TargetLists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey (idempotent) for crm_Target_Enrichment → crm_Targets
DO $$ BEGIN
  ALTER TABLE "crm_Target_Enrichment" ADD CONSTRAINT "crm_Target_Enrichment_targetId_fkey"
    FOREIGN KEY ("targetId") REFERENCES "crm_Targets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey (idempotent) for crm_Target_Enrichment → Users
DO $$ BEGIN
  ALTER TABLE "crm_Target_Enrichment" ADD CONSTRAINT "crm_Target_Enrichment_triggeredBy_fkey"
    FOREIGN KEY ("triggeredBy") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- CAMPAIGNS MODULE TABLES
-- ============================================================

-- CreateTable: crm_campaign_templates
CREATE TABLE "crm_campaign_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subject_default" TEXT,
    "content_html" TEXT NOT NULL,
    "content_json" JSONB NOT NULL,
    "created_by" UUID,
    "created_on" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "crm_campaign_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable: crm_campaign_steps
CREATE TABLE "crm_campaign_steps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaign_id" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "template_id" UUID NOT NULL,
    "subject" TEXT NOT NULL,
    "delay_days" INTEGER NOT NULL DEFAULT 0,
    "send_to" TEXT NOT NULL DEFAULT 'all',
    "scheduled_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),

    CONSTRAINT "crm_campaign_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CampaignToTargetLists
CREATE TABLE "CampaignToTargetLists" (
    "campaign_id" UUID NOT NULL,
    "target_list_id" UUID NOT NULL,

    CONSTRAINT "CampaignToTargetLists_pkey" PRIMARY KEY ("campaign_id","target_list_id")
);

-- CreateTable: crm_campaign_sends
CREATE TABLE "crm_campaign_sends" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaign_id" UUID NOT NULL,
    "step_id" UUID NOT NULL,
    "target_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "resend_message_id" TEXT,
    "unsubscribe_token" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "opened_at" TIMESTAMP(3),
    "clicked_at" TIMESTAMP(3),
    "unsubscribed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "sent_at" TIMESTAMP(3),

    CONSTRAINT "crm_campaign_sends_pkey" PRIMARY KEY ("id")
);

-- AlterTable: crm_campaigns — add new columns
ALTER TABLE "crm_campaigns"
    ADD COLUMN "template_id" UUID,
    ADD COLUMN "from_name" TEXT,
    ADD COLUMN "reply_to" TEXT,
    ADD COLUMN "scheduled_at" TIMESTAMP(3),
    ADD COLUMN "sent_at" TIMESTAMP(3),
    ADD COLUMN "created_by" UUID,
    ADD COLUMN "created_on" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "updatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "crm_campaign_templates_created_by_idx" ON "crm_campaign_templates"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "crm_campaign_steps_campaign_id_order_key" ON "crm_campaign_steps"("campaign_id", "order");

-- CreateIndex
CREATE INDEX "crm_campaign_steps_campaign_id_idx" ON "crm_campaign_steps"("campaign_id");

-- CreateIndex
CREATE INDEX "crm_campaign_steps_scheduled_at_idx" ON "crm_campaign_steps"("scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "crm_campaign_sends_unsubscribe_token_key" ON "crm_campaign_sends"("unsubscribe_token");

-- CreateIndex
CREATE UNIQUE INDEX "crm_campaign_sends_step_id_target_id_key" ON "crm_campaign_sends"("step_id", "target_id");

-- CreateIndex
CREATE INDEX "crm_campaign_sends_campaign_id_idx" ON "crm_campaign_sends"("campaign_id");

-- CreateIndex
CREATE INDEX "crm_campaign_sends_step_id_target_id_idx" ON "crm_campaign_sends"("step_id", "target_id");

-- CreateIndex
CREATE INDEX "crm_campaign_sends_resend_message_id_idx" ON "crm_campaign_sends"("resend_message_id");

-- CreateIndex
CREATE INDEX "crm_campaign_sends_status_idx" ON "crm_campaign_sends"("status");

-- CreateIndex
CREATE INDEX "crm_campaign_sends_unsubscribe_token_idx" ON "crm_campaign_sends"("unsubscribe_token");

-- AddForeignKey
ALTER TABLE "crm_campaigns" ADD CONSTRAINT "crm_campaigns_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "crm_campaign_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_campaigns" ADD CONSTRAINT "crm_campaigns_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_campaign_templates" ADD CONSTRAINT "crm_campaign_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_campaign_steps" ADD CONSTRAINT "crm_campaign_steps_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "crm_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_campaign_steps" ADD CONSTRAINT "crm_campaign_steps_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "crm_campaign_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignToTargetLists" ADD CONSTRAINT "CampaignToTargetLists_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "crm_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignToTargetLists" ADD CONSTRAINT "CampaignToTargetLists_target_list_id_fkey" FOREIGN KEY ("target_list_id") REFERENCES "crm_TargetLists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_campaign_sends" ADD CONSTRAINT "crm_campaign_sends_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "crm_campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_campaign_sends" ADD CONSTRAINT "crm_campaign_sends_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "crm_campaign_steps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_campaign_sends" ADD CONSTRAINT "crm_campaign_sends_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "crm_Targets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
