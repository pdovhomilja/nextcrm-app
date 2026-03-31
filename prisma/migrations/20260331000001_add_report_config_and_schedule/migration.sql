-- CreateTable
CREATE TABLE "crm_Report_Config" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_Report_Config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_Report_Schedule" (
    "id" TEXT NOT NULL,
    "reportConfigId" TEXT NOT NULL,
    "cronExpression" TEXT NOT NULL,
    "recipients" JSONB NOT NULL,
    "format" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSentAt" TIMESTAMP(3),
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_Report_Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crm_Report_Config_createdBy_idx" ON "crm_Report_Config"("createdBy");

-- CreateIndex
CREATE INDEX "crm_Report_Config_category_idx" ON "crm_Report_Config"("category");

-- CreateIndex
CREATE INDEX "crm_Report_Config_isShared_idx" ON "crm_Report_Config"("isShared");

-- CreateIndex
CREATE INDEX "crm_Report_Schedule_reportConfigId_idx" ON "crm_Report_Schedule"("reportConfigId");

-- CreateIndex
CREATE INDEX "crm_Report_Schedule_createdBy_idx" ON "crm_Report_Schedule"("createdBy");

-- CreateIndex
CREATE INDEX "crm_Report_Schedule_isActive_idx" ON "crm_Report_Schedule"("isActive");

-- CreateIndex
CREATE INDEX "crm_Report_Schedule_lastSentAt_idx" ON "crm_Report_Schedule"("lastSentAt");

-- AddForeignKey
ALTER TABLE "crm_Report_Config" ADD CONSTRAINT "crm_Report_Config_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Report_Schedule" ADD CONSTRAINT "crm_Report_Schedule_reportConfigId_fkey" FOREIGN KEY ("reportConfigId") REFERENCES "crm_Report_Config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Report_Schedule" ADD CONSTRAINT "crm_Report_Schedule_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

