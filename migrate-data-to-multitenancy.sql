-- Data Migration Script for Multi-tenancy
-- This script safely migrates existing data to the new multi-tenant structure
-- CRITICAL: This must be run in a transaction to ensure data integrity

BEGIN;

-- Step 1: Create Company records from existing user company_id values
INSERT INTO "public"."companies" (id, name, "createdAt", "updatedAt")
SELECT DISTINCT 
    u.company_id as id,
    COALESCE('Company ' || u.company_id, 'Default Company') as name,
    MIN(u.created_at) as "createdAt",
    NOW() as "updatedAt"
FROM "public"."users" u
WHERE u.company_id IS NOT NULL
GROUP BY u.company_id;

-- Step 2: Create CompanyMembership records for all users
INSERT INTO "public"."company_memberships" ("companyId", "userId", role, "createdAt")
SELECT 
    u.company_id as "companyId",
    u.id as "userId",
    'OWNER'::"public"."CompanyRole" as role,  -- Initial users become owners of their companies
    u.created_at as "createdAt"
FROM "public"."users" u
WHERE u.company_id IS NOT NULL;

-- Step 3: Update Board records with companyId based on the board creator
UPDATE "public"."Board" 
SET "companyId" = u.company_id
FROM "public"."users" u
WHERE "public"."Board"."createdBy" = u.id
AND u.company_id IS NOT NULL;

-- Step 4: Verification queries (these should return 0 if migration was successful)

-- Check that all users with company_id have memberships
DO $$
DECLARE
    orphan_users INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphan_users
    FROM "public"."users" u
    LEFT JOIN "public"."company_memberships" cm ON u.id = cm."userId"
    WHERE u.company_id IS NOT NULL AND cm."userId" IS NULL;
    
    IF orphan_users > 0 THEN
        RAISE EXCEPTION 'Migration failed: % users without company memberships found', orphan_users;
    END IF;
END $$;

-- Check that all boards have been assigned to companies
DO $$
DECLARE
    orphan_boards INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphan_boards
    FROM "public"."Board" b
    WHERE b."companyId" IS NULL;
    
    IF orphan_boards > 0 THEN
        RAISE EXCEPTION 'Migration failed: % boards without company assignment found', orphan_boards;
    END IF;
END $$;

-- Step 5: Log migration results
DO $$
DECLARE
    company_count INTEGER;
    membership_count INTEGER;
    updated_boards INTEGER;
BEGIN
    SELECT COUNT(*) INTO company_count FROM "public"."companies";
    SELECT COUNT(*) INTO membership_count FROM "public"."company_memberships";
    SELECT COUNT(*) INTO updated_boards FROM "public"."Board" WHERE "companyId" IS NOT NULL;
    
    RAISE NOTICE 'Migration completed successfully:';
    RAISE NOTICE '- Companies created: %', company_count;
    RAISE NOTICE '- Memberships created: %', membership_count;
    RAISE NOTICE '- Boards updated: %', updated_boards;
END $$;

COMMIT;

-- Post-migration: The company_id field in users table can be removed in a future migration
-- after confirming the new system works properly