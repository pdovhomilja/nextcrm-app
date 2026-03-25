-- CreateEnum (idempotent)
DO $$ BEGIN
  CREATE TYPE "EmailFolder" AS ENUM ('INBOX', 'SENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: EmailAccount
CREATE TABLE IF NOT EXISTS "EmailAccount" (
    "id"                UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId"            UUID NOT NULL,
    "label"             TEXT NOT NULL,
    "imapHost"          TEXT NOT NULL,
    "imapPort"          INTEGER NOT NULL,
    "imapSsl"           BOOLEAN NOT NULL DEFAULT true,
    "smtpHost"          TEXT NOT NULL,
    "smtpPort"          INTEGER NOT NULL,
    "smtpSsl"           BOOLEAN NOT NULL DEFAULT true,
    "username"          TEXT NOT NULL,
    "passwordEncrypted" TEXT NOT NULL,
    "isActive"          BOOLEAN NOT NULL DEFAULT true,
    "sentFolderName"    TEXT NOT NULL DEFAULT 'Sent',
    "lastSyncedAt"      TIMESTAMP(3),
    "inboxLastUid"      INTEGER,
    "sentLastUid"       INTEGER,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Email
CREATE TABLE IF NOT EXISTS "Email" (
    "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
    "emailAccountId" UUID NOT NULL,
    "userId"         UUID NOT NULL,
    "rfcMessageId"   TEXT NOT NULL,
    "imapUid"        INTEGER,
    "folder"         "EmailFolder" NOT NULL,
    "subject"        TEXT,
    "fromName"       TEXT,
    "fromEmail"      TEXT,
    "toRecipients"   JSONB NOT NULL DEFAULT '[]',
    "ccRecipients"   JSONB NOT NULL DEFAULT '[]',
    "bccRecipients"  JSONB NOT NULL DEFAULT '[]',
    "bodyText"       TEXT,
    "bodyHtml"       TEXT,
    "sentAt"         TIMESTAMP(3),
    "isRead"         BOOLEAN NOT NULL DEFAULT false,
    "isDeleted"      BOOLEAN NOT NULL DEFAULT false,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Email_pkey" PRIMARY KEY ("id")
);

-- CreateTable: EmailEmbedding
CREATE TABLE IF NOT EXISTS "EmailEmbedding" (
    "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
    "emailId"     UUID NOT NULL,
    "embedding"   vector(1536) NOT NULL,
    "contentHash" TEXT NOT NULL,
    "embeddedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable: EmailsToContacts
CREATE TABLE IF NOT EXISTS "EmailsToContacts" (
    "emailId"   UUID NOT NULL,
    "contactId" UUID NOT NULL,

    CONSTRAINT "EmailsToContacts_pkey" PRIMARY KEY ("emailId", "contactId")
);

-- CreateTable: EmailsToAccounts
CREATE TABLE IF NOT EXISTS "EmailsToAccounts" (
    "emailId"   UUID NOT NULL,
    "accountId" UUID NOT NULL,

    CONSTRAINT "EmailsToAccounts_pkey" PRIMARY KEY ("emailId", "accountId")
);

-- Unique constraints (idempotent)
DO $$ BEGIN
  ALTER TABLE "Email" ADD CONSTRAINT "Email_emailAccountId_rfcMessageId_key" UNIQUE ("emailAccountId", "rfcMessageId");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EmailEmbedding" ADD CONSTRAINT "EmailEmbedding_emailId_key" UNIQUE ("emailId");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Indexes (idempotent)
CREATE INDEX IF NOT EXISTS "EmailAccount_userId_idx"   ON "EmailAccount"("userId");
CREATE INDEX IF NOT EXISTS "EmailAccount_isActive_idx" ON "EmailAccount"("isActive");

CREATE INDEX IF NOT EXISTS "Email_userId_idx"                       ON "Email"("userId");
CREATE INDEX IF NOT EXISTS "Email_emailAccountId_idx"               ON "Email"("emailAccountId");
CREATE INDEX IF NOT EXISTS "Email_folder_idx"                       ON "Email"("folder");
CREATE INDEX IF NOT EXISTS "Email_isDeleted_idx"                    ON "Email"("isDeleted");
CREATE INDEX IF NOT EXISTS "Email_sentAt_idx"                       ON "Email"("sentAt");
CREATE INDEX IF NOT EXISTS "Email_userId_folder_isDeleted_isRead_idx" ON "Email"("userId", "folder", "isDeleted", "isRead");

CREATE INDEX IF NOT EXISTS "EmailsToContacts_emailId_idx"   ON "EmailsToContacts"("emailId");
CREATE INDEX IF NOT EXISTS "EmailsToContacts_contactId_idx" ON "EmailsToContacts"("contactId");

CREATE INDEX IF NOT EXISTS "EmailsToAccounts_emailId_idx"   ON "EmailsToAccounts"("emailId");
CREATE INDEX IF NOT EXISTS "EmailsToAccounts_accountId_idx" ON "EmailsToAccounts"("accountId");

-- Foreign keys (idempotent)
DO $$ BEGIN
  ALTER TABLE "EmailAccount" ADD CONSTRAINT "EmailAccount_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Email" ADD CONSTRAINT "Email_emailAccountId_fkey"
    FOREIGN KEY ("emailAccountId") REFERENCES "EmailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Email" ADD CONSTRAINT "Email_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EmailEmbedding" ADD CONSTRAINT "EmailEmbedding_emailId_fkey"
    FOREIGN KEY ("emailId") REFERENCES "Email"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EmailsToContacts" ADD CONSTRAINT "EmailsToContacts_emailId_fkey"
    FOREIGN KEY ("emailId") REFERENCES "Email"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EmailsToContacts" ADD CONSTRAINT "EmailsToContacts_contactId_fkey"
    FOREIGN KEY ("contactId") REFERENCES "crm_Contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EmailsToAccounts" ADD CONSTRAINT "EmailsToAccounts_emailId_fkey"
    FOREIGN KEY ("emailId") REFERENCES "Email"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EmailsToAccounts" ADD CONSTRAINT "EmailsToAccounts_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "crm_Accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
