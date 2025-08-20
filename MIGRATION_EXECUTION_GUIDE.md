# Safe Multi-Tenancy Migration Execution Guide

## Pre-Migration Checklist

### 1. **MANDATORY BACKUP** ⚠️
```bash
# Create full database backup with timestamp
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S)_pre_multitenancy.sql

# Verify backup integrity
pg_restore --list backup_*.sql | head -10
```

### 2. **Test Environment Setup**
```bash
# Test on staging/development first
# Copy production schema to staging
pg_dump $PROD_DATABASE_URL | psql $STAGING_DATABASE_URL
```

## Migration Execution Steps

### Phase 1: Schema Changes (Safe - Additive Only)

```bash
# 1. Apply schema changes
psql $DATABASE_URL < add-multitenancy.sql
```

Expected output:
- `CREATE TYPE`
- `CREATE TABLE` (companies, company_memberships)
- `ALTER TABLE` (add companyId to Board)
- `CREATE INDEX`
- `ALTER TABLE` (add foreign keys)

### Phase 2: Data Migration (Critical - Transactional)

```bash
# 2. Execute data migration (includes verification)
psql $DATABASE_URL < migrate-data-to-multitenancy.sql
```

Expected output:
- Insert confirmation for companies
- Insert confirmation for memberships  
- Update confirmation for boards
- Success notices with counts

### Phase 3: Verification Queries

Run these queries to verify migration success:

```sql
-- 1. Check all users have memberships
SELECT 
    COUNT(*) as total_users,
    COUNT(cm."userId") as users_with_membership,
    COUNT(*) - COUNT(cm."userId") as orphan_users
FROM "public"."users" u
LEFT JOIN "public"."company_memberships" cm ON u.id = cm."userId"
WHERE u.company_id IS NOT NULL;
-- orphan_users should be 0

-- 2. Check all boards have companies
SELECT 
    COUNT(*) as total_boards,
    COUNT("companyId") as boards_with_company,
    COUNT(*) - COUNT("companyId") as orphan_boards
FROM "public"."Board";
-- orphan_boards should be 0

-- 3. Check data consistency
SELECT 
    c.name,
    COUNT(cm."userId") as member_count,
    COUNT(b.id) as board_count
FROM "public"."companies" c
LEFT JOIN "public"."company_memberships" cm ON c.id = cm."companyId"
LEFT JOIN "public"."Board" b ON c.id = b."companyId"
GROUP BY c.id, c.name
ORDER BY member_count DESC;
```

## Rollback Plan (Emergency Only)

If migration fails, execute these steps **IMMEDIATELY**:

```bash
# 1. Stop application
# 2. Restore from backup
dropdb your_database_name
createdb your_database_name  
pg_restore -d your_database_name backup_*.sql

# 3. Verify restoration
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
```

## Post-Migration Updates

After successful migration, update application code:

### 1. Update Prisma Client
```bash
pnpm prisma generate
```

### 2. Test Application Functionality
- User authentication
- Board access
- Task operations
- Data isolation between companies

### 3. Future Cleanup (After validation)
```sql
-- Remove deprecated company_id column from users (future migration)
-- ALTER TABLE "public"."users" DROP COLUMN company_id;
```

## Success Criteria

✅ **Migration is successful when:**
- All verification queries return 0 orphan records
- No errors during schema or data migration
- Application loads without errors
- Users can access their existing data
- Data isolation is working (users only see their company data)

## Monitoring

After migration, monitor for:
- Application error rates
- Database performance impact
- User login/access issues
- Any data inconsistencies

## Emergency Contacts

Have these ready:
- Database administrator
- Application developer
- DevOps/Infrastructure team

## Timeline Estimate

- **Schema migration**: 2-5 minutes
- **Data migration**: 5-15 minutes (depending on data size)
- **Verification**: 2-5 minutes
- **Total downtime**: 10-25 minutes

---

**⚠️ CRITICAL REMINDER: Always test on staging environment first!**