-- AlterTable
ALTER TABLE "public"."user_mail_accounts" ADD COLUMN     "smtpHost" TEXT NOT NULL DEFAULT '';
ALTER TABLE "public"."user_mail_accounts" ADD COLUMN     "smtpPort" INTEGER NOT NULL DEFAULT 587;
ALTER TABLE "public"."user_mail_accounts" ADD COLUMN     "smtpSecure" BOOLEAN NOT NULL DEFAULT false;