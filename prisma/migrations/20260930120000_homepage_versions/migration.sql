-- CreateEnum
CREATE TYPE "crm_Homepage_Pass_Kind" AS ENUM ('AUTO', 'HUMAN');

-- AlterTable
ALTER TABLE "crm_Target_Homepage" ADD COLUMN     "current_version_id" UUID,
ADD COLUMN     "source_url" TEXT;

-- CreateTable
CREATE TABLE "crm_Target_Homepage_Version" (
    "id" UUID NOT NULL,
    "homepage_id" UUID NOT NULL,
    "html" TEXT NOT NULL,
    "screenshot_key" TEXT,
    "prompt" TEXT,
    "agent_critique" TEXT,
    "pass_kind" "crm_Homepage_Pass_Kind" NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_Target_Homepage_Version_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crm_Target_Homepage_Version_homepage_id_idx" ON "crm_Target_Homepage_Version"("homepage_id");

-- AddForeignKey
ALTER TABLE "crm_Target_Homepage_Version" ADD CONSTRAINT "crm_Target_Homepage_Version_homepage_id_fkey" FOREIGN KEY ("homepage_id") REFERENCES "crm_Target_Homepage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
