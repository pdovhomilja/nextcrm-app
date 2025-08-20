-- Add Multi-tenancy Schema Changes
-- This migration adds Company, CompanyMembership models and Board.companyId

-- CreateEnum
CREATE TYPE "public"."CompanyRole" AS ENUM ('MEMBER', 'ADMIN', 'OWNER');

-- CreateTable
CREATE TABLE "public"."companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."company_memberships" (
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."CompanyRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_memberships_pkey" PRIMARY KEY ("companyId","userId")
);

-- AddColumn
ALTER TABLE "public"."Board" ADD COLUMN "companyId" TEXT;

-- CreateIndex
CREATE INDEX "Board_companyId_idx" ON "public"."Board"("companyId");

-- AddForeignKey
ALTER TABLE "public"."Board" ADD CONSTRAINT "Board_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."company_memberships" ADD CONSTRAINT "company_memberships_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."company_memberships" ADD CONSTRAINT "company_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;