-- CreateEnum
CREATE TYPE "VentureAppKind" AS ENUM ('rofyt', 'custom');

-- CreateTable
CREATE TABLE "VentureApp" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "VentureAppKind" NOT NULL DEFAULT 'custom',
    "adminEmail" TEXT,
    "adminPasswordHash" TEXT,
    "envEncrypted" TEXT,
    "externalUrl" TEXT,
    "notes" TEXT,
    "statsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,

    CONSTRAINT "VentureApp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VentureApp_slug_key" ON "VentureApp"("slug");

-- CreateIndex
CREATE INDEX "VentureApp_kind_idx" ON "VentureApp"("kind");
