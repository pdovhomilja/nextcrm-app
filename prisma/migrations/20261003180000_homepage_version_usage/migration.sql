-- AlterTable
ALTER TABLE "crm_Target_Homepage_Version" ADD COLUMN     "model" TEXT,
ADD COLUMN     "input_tokens" INTEGER,
ADD COLUMN     "output_tokens" INTEGER,
ADD COLUMN     "cache_read_tokens" INTEGER,
ADD COLUMN     "cache_creation_tokens" INTEGER;
