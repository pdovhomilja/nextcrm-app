# Phase 9-1: Database Migration for Company Invitations

## Overview
Create the database schema for the new CompanyInvitation system to support invite-first workflow.

## Database Changes Required

### 1. Create InvitationStatus Enum
```sql
-- Create invitation status enum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');
```

### 2. Create CompanyInvitation Table
```sql
-- Create company invitations table
CREATE TABLE "company_invitations" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "invitedEmail" TEXT NOT NULL,
  "invitedByUserId" TEXT NOT NULL,
  "role" "CompanyRole" NOT NULL DEFAULT 'MEMBER',
  "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
  "token" TEXT NOT NULL,
  "tokenExpires" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "acceptedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "company_invitations_pkey" PRIMARY KEY ("id")
);
```

### 3. Add Constraints and Indexes
```sql
-- Add unique constraints
ALTER TABLE "company_invitations" ADD CONSTRAINT "company_invitations_token_key" UNIQUE ("token");
ALTER TABLE "company_invitations" ADD CONSTRAINT "company_invitations_companyId_invitedEmail_key" UNIQUE ("companyId", "invitedEmail");

-- Create performance indexes
CREATE INDEX "company_invitations_token_idx" ON "company_invitations"("token");
CREATE INDEX "company_invitations_invitedEmail_idx" ON "company_invitations"("invitedEmail");
CREATE INDEX "company_invitations_companyId_status_idx" ON "company_invitations"("companyId", "status");
```

### 4. Add Foreign Key Constraints
```sql
-- Add foreign key constraints with proper cascade rules
ALTER TABLE "company_invitations" ADD CONSTRAINT "company_invitations_companyId_fkey" 
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "company_invitations" ADD CONSTRAINT "company_invitations_invitedByUserId_fkey" 
  FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "company_invitations" ADD CONSTRAINT "company_invitations_acceptedByUserId_fkey" 
  FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

## Migration Script

Create `prisma/migrations/xxx_add_company_invitations/migration.sql`:

```sql
-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "company_invitations" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "invitedEmail" TEXT NOT NULL,
    "invitedByUserId" TEXT NOT NULL,
    "role" "CompanyRole" NOT NULL DEFAULT 'MEMBER',
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "tokenExpires" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "acceptedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_invitations_token_key" ON "company_invitations"("token");

-- CreateIndex
CREATE INDEX "company_invitations_token_idx" ON "company_invitations"("token");

-- CreateIndex
CREATE INDEX "company_invitations_invitedEmail_idx" ON "company_invitations"("invitedEmail");

-- CreateIndex
CREATE INDEX "company_invitations_companyId_status_idx" ON "company_invitations"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "company_invitations_companyId_invitedEmail_key" ON "company_invitations"("companyId", "invitedEmail");

-- AddForeignKey
ALTER TABLE "company_invitations" ADD CONSTRAINT "company_invitations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_invitations" ADD CONSTRAINT "company_invitations_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_invitations" ADD CONSTRAINT "company_invitations_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

## Safety Considerations

⚠️ **CRITICAL**: This migration is ADDITIVE ONLY - no existing data is modified or deleted.

### Pre-Migration Checklist
1. ✅ Backup production database
2. ✅ Test migration on development environment
3. ✅ Verify no existing table conflicts
4. ✅ Confirm CompanyRole enum exists
5. ✅ Validate foreign key targets exist

### Post-Migration Validation
```sql
-- Verify table created correctly
\d company_invitations

-- Check constraints
SELECT conname, contype FROM pg_constraint 
WHERE conrelid = 'company_invitations'::regclass;

-- Verify indexes
\di company_invitations*

-- Test basic operations
INSERT INTO company_invitations (id, "companyId", "invitedEmail", "invitedByUserId", token, "tokenExpires")
VALUES ('test123', 'existing_company_id', 'test@example.com', 'existing_user_id', 'test_token', NOW() + INTERVAL '7 days');

DELETE FROM company_invitations WHERE id = 'test123';
```

## Implementation Commands

```bash
# Generate migration
npx prisma migrate dev --name add_company_invitations

# Generate updated Prisma client
npx prisma generate

# Push to production (after testing)
npx prisma migrate deploy
```

## Next Steps
After successful migration:
1. Update Prisma schema (Phase9-2-prisma-schema.md)
2. Implement invitation server actions (Phase9-3-invitation-actions.md)