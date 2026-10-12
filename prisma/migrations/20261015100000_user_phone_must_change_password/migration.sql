-- AlterTable
ALTER TABLE "Users" ADD COLUMN "phone" TEXT;
ALTER TABLE "Users" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
