-- CreateTable
CREATE TABLE "public"."user_mail_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "imapHost" TEXT NOT NULL,
    "imapPort" INTEGER NOT NULL,
    "imapUser" TEXT NOT NULL,
    "encryptedPassword" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_mail_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_mail_accounts_email_key" ON "public"."user_mail_accounts"("email");

-- CreateIndex
CREATE INDEX "user_mail_accounts_userId_idx" ON "public"."user_mail_accounts"("userId");

-- AddForeignKey
ALTER TABLE "public"."user_mail_accounts" ADD CONSTRAINT "user_mail_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
