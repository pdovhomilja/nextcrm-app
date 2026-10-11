-- Team chat read receipts + optional file attachments
CREATE TABLE "TeamChatRead" (
    "userId" UUID NOT NULL,
    "roomKey" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamChatRead_pkey" PRIMARY KEY ("userId","roomKey")
);

ALTER TABLE "TeamChatRead" ADD CONSTRAINT "TeamChatRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "TeamChatRead_userId_idx" ON "TeamChatRead"("userId");

ALTER TABLE "TeamChatMessage" ADD COLUMN IF NOT EXISTS "attachmentUrl" TEXT;
ALTER TABLE "TeamChatMessage" ADD COLUMN IF NOT EXISTS "attachmentName" TEXT;
ALTER TABLE "TeamChatMessage" ADD COLUMN IF NOT EXISTS "attachmentMime" TEXT;
