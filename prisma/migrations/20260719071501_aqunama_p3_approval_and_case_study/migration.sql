-- CreateEnum
CREATE TYPE "crm_Approval_Status" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "crm_Accounts" ADD COLUMN     "case_study_approved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "case_study_candidate" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "crm_Opportunities" ADD COLUMN     "approval_note" TEXT,
ADD COLUMN     "approval_requested_at" TIMESTAMP(3),
ADD COLUMN     "approval_status" "crm_Approval_Status" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by" UUID;

