-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "crm_Ai_Prompt_Kind" ADD VALUE 'HOMEPAGE_INDUSTRY';
ALTER TYPE "crm_Ai_Prompt_Kind" ADD VALUE 'HOMEPAGE_STYLE';
ALTER TYPE "crm_Ai_Prompt_Kind" ADD VALUE 'HOMEPAGE_AVOID';

-- AlterTable
ALTER TABLE "crm_Targets" ADD COLUMN     "homepage_industry_prompt_id" UUID;
