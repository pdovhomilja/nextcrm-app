-- CreateEnum
CREATE TYPE "crm_Homepage_Pass_Kind" AS ENUM ('AUTO', 'HUMAN');

-- AlterTable
ALTER TABLE "crm_Target_Homepage" ADD COLUMN     "current_version_id" UUID,
ADD COLUMN     "logo_data_uri" TEXT;

-- CreateTable
CREATE TABLE "crm_Target_Homepage_Version" (
    "id" UUID NOT NULL,
    "homepage_id" UUID NOT NULL,
    "html" TEXT NOT NULL,
    "prompt" TEXT,
    "agent_critique" TEXT,
    "pass_kind" "crm_Homepage_Pass_Kind" NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_Target_Homepage_Version_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crm_Target_Homepage_Version_homepage_id_created_at_idx" ON "crm_Target_Homepage_Version"("homepage_id", "created_at");

-- AddForeignKey
ALTER TABLE "crm_Target_Homepage_Version" ADD CONSTRAINT "crm_Target_Homepage_Version_homepage_id_fkey" FOREIGN KEY ("homepage_id") REFERENCES "crm_Target_Homepage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
