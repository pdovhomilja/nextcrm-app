-- AlterTable
ALTER TABLE "crm_Opportunities" ADD COLUMN     "stage_entered_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "crm_Opportunities_Sales_Stages" ADD COLUMN     "stage_kind" TEXT;

-- AlterTable
ALTER TABLE "crm_Accounts_Tasks" ADD COLUMN     "opportunity_id" UUID;

-- CreateTable
CREATE TABLE "crm_FunnelSettings" (
    "id" UUID NOT NULL,
    "kill_after_days" INTEGER NOT NULL DEFAULT 45,
    "recycle_after_days" INTEGER NOT NULL DEFAULT 90,
    "cadence_touch1_business_days" INTEGER NOT NULL DEFAULT 3,
    "cadence_touch2_offset_days" INTEGER NOT NULL DEFAULT 7,
    "cadence_touch3_offset_days" INTEGER NOT NULL DEFAULT 10,
    "cadence_touch4_offset_days" INTEGER NOT NULL DEFAULT 15,
    "cadence_touch5_offset_days" INTEGER NOT NULL DEFAULT 45,
    "care_checkin_days" INTEGER NOT NULL DEFAULT 30,
    "care_referral_days" INTEGER NOT NULL DEFAULT 90,
    "care_quarter_interval_days" INTEGER NOT NULL DEFAULT 90,
    "care_quarter_count" INTEGER NOT NULL DEFAULT 8,
    "renewal_window_days" INTEGER NOT NULL DEFAULT 30,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" UUID,

    CONSTRAINT "crm_FunnelSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crm_Accounts_Tasks_opportunity_id_idx" ON "crm_Accounts_Tasks"("opportunity_id");

-- AddForeignKey
ALTER TABLE "crm_Accounts_Tasks" ADD CONSTRAINT "crm_Accounts_Tasks_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "crm_Opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

