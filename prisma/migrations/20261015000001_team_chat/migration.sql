-- CreateTable
CREATE TABLE IF NOT EXISTS "TeamChatMessage" (
    "id" UUID NOT NULL,
    "roomKey" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "htmlBody" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TeamChatMessage_roomKey_createdAt_idx" ON "TeamChatMessage"("roomKey", "createdAt");
CREATE INDEX IF NOT EXISTS "TeamChatMessage_userId_idx" ON "TeamChatMessage"("userId");

DO $$ BEGIN
 ALTER TABLE "TeamChatMessage" ADD CONSTRAINT "TeamChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
