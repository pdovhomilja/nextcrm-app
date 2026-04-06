-- AlterTable
ALTER TABLE "crm_Opportunities_Sales_Stages" ALTER COLUMN "probability" SET DATA TYPE INTEGER,
ALTER COLUMN "order" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "crm_Opportunities_Type" ALTER COLUMN "order" SET DATA TYPE INTEGER;

-- DropTable
DROP TABLE "gpt_models";

-- DropTable
DROP TABLE "modulStatus";

-- DropEnum
DROP TYPE "gptStatus";
