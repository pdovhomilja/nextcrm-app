-- CreateEnum
CREATE TYPE "public"."AIBoardRequestStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "public"."ai_generated_board_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "refinedPrompt" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" "public"."AIBoardRequestStatus" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "boardId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_generated_board_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_generated_board_requests_userId_idx" ON "public"."ai_generated_board_requests"("userId");

-- CreateIndex
CREATE INDEX "ai_generated_board_requests_companyId_idx" ON "public"."ai_generated_board_requests"("companyId");

-- CreateIndex
CREATE INDEX "ai_generated_board_requests_status_idx" ON "public"."ai_generated_board_requests"("status");

-- AddForeignKey
ALTER TABLE "public"."ai_generated_board_requests" ADD CONSTRAINT "ai_generated_board_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ai_generated_board_requests" ADD CONSTRAINT "ai_generated_board_requests_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "public"."Board"("id") ON DELETE SET NULL ON UPDATE CASCADE;
