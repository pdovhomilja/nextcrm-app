-- CreateEnum
CREATE TYPE "crm_Ai_Prompt_Kind" AS ENUM ('EMAIL', 'HOMEPAGE');

-- CreateEnum
CREATE TYPE "crm_Ai_Prompt_Scope" AS ENUM ('ORG', 'USER');

-- CreateEnum
CREATE TYPE "crm_Target_Email_Status" AS ENUM ('DRAFT', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "crm_Homepage_Status" AS ENUM ('PENDING', 'RUNNING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "crm_Ai_Prompt" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "kind" "crm_Ai_Prompt_Kind" NOT NULL,
    "scope" "crm_Ai_Prompt_Scope" NOT NULL,
    "user_id" UUID,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID,
    "created_on" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "crm_Ai_Prompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_Target_Homepage" (
    "id" UUID NOT NULL,
    "targetId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "preview_url" TEXT,
    "screenshot_url" TEXT,
    "status" "crm_Homepage_Status" NOT NULL DEFAULT 'PENDING',
    "base_prompt" TEXT,
    "error" TEXT,
    "created_by" UUID,
    "created_on" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "crm_Target_Homepage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_Target_Email" (
    "id" UUID NOT NULL,
    "targetId" UUID NOT NULL,
    "template_id" UUID,
    "subject" TEXT NOT NULL,
    "body_html" TEXT NOT NULL,
    "prompt_used" TEXT,
    "included_homepage" BOOLEAN NOT NULL DEFAULT false,
    "status" "crm_Target_Email_Status" NOT NULL DEFAULT 'DRAFT',
    "unsubscribe_token" UUID NOT NULL,
    "sent_at" TIMESTAMP(3),
    "resend_message_id" TEXT,
    "error_message" TEXT,
    "created_by" UUID,
    "created_on" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "crm_Target_Email_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crm_Ai_Prompt_kind_scope_idx" ON "crm_Ai_Prompt"("kind", "scope");

-- CreateIndex
CREATE INDEX "crm_Ai_Prompt_user_id_idx" ON "crm_Ai_Prompt"("user_id");

-- CreateIndex
CREATE INDEX "crm_Ai_Prompt_deletedAt_idx" ON "crm_Ai_Prompt"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "crm_Target_Homepage_targetId_key" ON "crm_Target_Homepage"("targetId");

-- CreateIndex
CREATE UNIQUE INDEX "crm_Target_Homepage_slug_key" ON "crm_Target_Homepage"("slug");

-- CreateIndex
CREATE INDEX "crm_Target_Homepage_status_idx" ON "crm_Target_Homepage"("status");

-- CreateIndex
CREATE INDEX "crm_Target_Homepage_deletedAt_idx" ON "crm_Target_Homepage"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "crm_Target_Email_unsubscribe_token_key" ON "crm_Target_Email"("unsubscribe_token");

-- CreateIndex
CREATE INDEX "crm_Target_Email_targetId_idx" ON "crm_Target_Email"("targetId");

-- CreateIndex
CREATE INDEX "crm_Target_Email_status_idx" ON "crm_Target_Email"("status");

-- CreateIndex
CREATE INDEX "crm_Target_Email_deletedAt_idx" ON "crm_Target_Email"("deletedAt");

-- AddForeignKey
ALTER TABLE "crm_Target_Homepage" ADD CONSTRAINT "crm_Target_Homepage_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "crm_Targets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Target_Email" ADD CONSTRAINT "crm_Target_Email_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "crm_Targets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Target_Email" ADD CONSTRAINT "crm_Target_Email_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "crm_campaign_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
