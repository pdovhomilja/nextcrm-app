-- AlterTable
ALTER TABLE "Users" ADD COLUMN "workEmail" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Users_workEmail_key" ON "Users"("workEmail");
