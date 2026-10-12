CREATE TYPE "PluginStatus" AS ENUM ('ENABLED', 'DISABLED');

CREATE TABLE "InstalledPlugin" (
  "id" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "status" "PluginStatus" NOT NULL DEFAULT 'ENABLED',
  "settings" JSONB NOT NULL DEFAULT '{}',
  "secrets" TEXT,
  "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "installedBy" UUID,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InstalledPlugin_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PluginData" (
  "id" UUID NOT NULL,
  "pluginId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL DEFAULT '',
  "entityId" TEXT NOT NULL DEFAULT '',
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PluginData_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PluginData_pluginId_entityType_entityId_key_key" ON "PluginData"("pluginId", "entityType", "entityId", "key");
CREATE INDEX "PluginData_pluginId_key_idx" ON "PluginData"("pluginId", "key");
CREATE INDEX "PluginData_entityType_entityId_idx" ON "PluginData"("entityType", "entityId");

CREATE TABLE "PluginLog" (
  "id" UUID NOT NULL,
  "pluginId" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "context" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PluginLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PluginLog_pluginId_createdAt_idx" ON "PluginLog"("pluginId", "createdAt");
