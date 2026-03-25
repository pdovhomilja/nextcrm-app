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
