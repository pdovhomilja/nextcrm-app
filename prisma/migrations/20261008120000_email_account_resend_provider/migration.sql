-- CreateEnum
CREATE TYPE "EmailSendProvider" AS ENUM ('SMTP', 'RESEND');

-- AlterTable
ALTER TABLE "EmailAccount" ADD COLUMN "sendProvider" "EmailSendProvider" NOT NULL DEFAULT 'SMTP';
ALTER TABLE "EmailAccount" ADD COLUMN "fromName" TEXT;
ALTER TABLE "EmailAccount" ALTER COLUMN "passwordEncrypted" DROP NOT NULL;
