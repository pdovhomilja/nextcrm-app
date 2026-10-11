-- Frankfurter FX source + team scheduling
ALTER TYPE "ExchangeRateSource" ADD VALUE IF NOT EXISTS 'FRANKFURTER';

CREATE TABLE "TeamScheduleEntry" (
    "id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "organizerId" UUID NOT NULL,
    "attendeeIds" JSONB NOT NULL DEFAULT '[]',
    "meetRoom" TEXT,
    "chatRoomKey" TEXT,
    "activityId" UUID,
    "leaveStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamScheduleEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TeamScheduleEntry_startAt_idx" ON "TeamScheduleEntry"("startAt");
CREATE INDEX "TeamScheduleEntry_organizerId_idx" ON "TeamScheduleEntry"("organizerId");
CREATE INDEX "TeamScheduleEntry_kind_idx" ON "TeamScheduleEntry"("kind");

ALTER TABLE "TeamScheduleEntry" ADD CONSTRAINT "TeamScheduleEntry_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamScheduleEntry" ADD CONSTRAINT "TeamScheduleEntry_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "crm_Activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
