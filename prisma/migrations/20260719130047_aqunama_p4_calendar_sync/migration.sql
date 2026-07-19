-- CreateEnum
CREATE TYPE "CalendarProvider" AS ENUM ('google');

-- CreateTable
CREATE TABLE "CalendarConnection" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" "CalendarProvider" NOT NULL,
    "accountEmail" TEXT NOT NULL,
    "accessTokenEncrypted" TEXT,
    "refreshTokenEncrypted" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3),
    "syncToken" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_CalendarEvents" (
    "id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "iCalUID" TEXT,
    "connectionId" UUID,
    "activityId" UUID NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "attendeeEmails" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_CalendarEvents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalendarConnection_userId_idx" ON "CalendarConnection"("userId");

-- CreateIndex
CREATE INDEX "CalendarConnection_isActive_idx" ON "CalendarConnection"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarConnection_userId_provider_accountEmail_key" ON "CalendarConnection"("userId", "provider", "accountEmail");

-- CreateIndex
CREATE INDEX "crm_CalendarEvents_iCalUID_idx" ON "crm_CalendarEvents"("iCalUID");

-- CreateIndex
CREATE INDEX "crm_CalendarEvents_activityId_idx" ON "crm_CalendarEvents"("activityId");

-- CreateIndex
CREATE INDEX "crm_CalendarEvents_startAt_idx" ON "crm_CalendarEvents"("startAt");

-- CreateIndex
CREATE UNIQUE INDEX "crm_CalendarEvents_source_externalId_key" ON "crm_CalendarEvents"("source", "externalId");

-- AddForeignKey
ALTER TABLE "CalendarConnection" ADD CONSTRAINT "CalendarConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_CalendarEvents" ADD CONSTRAINT "crm_CalendarEvents_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "CalendarConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_CalendarEvents" ADD CONSTRAINT "crm_CalendarEvents_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "crm_Activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

