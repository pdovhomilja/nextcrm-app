# Phase 5: Staging Environment Migration Runbook

**Document Version:** 1.0
**Last Updated:** 2025-11-05
**Owner:** DevOps/Database Team
**Status:** Ready for Execution

## Overview

This runbook provides step-by-step instructions for executing the complete staging environment migration from MongoDB to PostgreSQL. This is a critical dress rehearsal for production migration.

**Purpose:** Validate migration process, measure timing, identify issues before production.

**Prerequisites:**
- Phase 4 (Integration Testing) successfully completed
- All migration and validation scripts tested with sample data
- Staging environment access credentials available
- Team members assigned and available

**Estimated Duration:** 6-8 hours (depends on data volume)

---

## Task Group 5.1: Staging Environment Setup

### Pre-Setup Checklist

Before beginning setup, verify:

- [ ] Access to production MongoDB (read-only)
- [ ] Access to staging MongoDB instance
- [ ] Staging PostgreSQL 16+ server provisioned
- [ ] Network connectivity between all systems
- [ ] Sufficient disk space on staging systems (3x production data size)
- [ ] Backup storage available
- [ ] All team members available for migration window

**Responsible:** DevOps Lead
**Time Estimate:** 2-3 hours

---

### Step 1: Clone Production MongoDB to Staging

**Objective:** Create exact copy of production data in staging environment.

**Pre-Checks:**
```bash
# 1. Verify production MongoDB connection
mongosh "$PRODUCTION_MONGODB_URL" --eval "db.adminCommand('ping')"

# 2. Check production database size
mongosh "$PRODUCTION_MONGODB_URL" --eval "db.stats(1024*1024)" # Size in MB

# 3. Verify staging MongoDB has sufficient space
df -h /var/lib/mongodb  # On staging MongoDB server
```

**Clone Procedure:**

#### Option A: Using mongodump/mongorestore (Recommended)

```bash
# 1. Dump production database
mongodump \
  --uri="$PRODUCTION_MONGODB_URL" \
  --db=nextcrm \
  --out=/backups/staging-clone-$(date +%Y%m%d-%H%M%S) \
  --gzip

# Verify dump completed
echo "Dump exit code: $?"
ls -lh /backups/staging-clone-*/nextcrm/

# 2. Restore to staging MongoDB
mongorestore \
  --uri="$STAGING_MONGODB_URL" \
  --db=nextcrm \
  --gzip \
  /backups/staging-clone-*/nextcrm/

# Verify restore completed
echo "Restore exit code: $?"
```

#### Option B: Using MongoDB Atlas/Cloud backup restore

```bash
# Follow cloud provider's backup restore procedure
# Verify restore completion via cloud console
```

**Post-Clone Verification:**

```bash
# 1. Connect to staging MongoDB
mongosh "$STAGING_MONGODB_URL"

# 2. Verify database exists
show dbs

# 3. Compare collection counts
db.getCollectionNames().forEach(function(collection) {
  print(collection + ": " + db[collection].count())
})

# 4. Spot-check critical records
db.crm_Accounts.findOne()
db.Users.findOne()
db.crm_Opportunities.findOne()
```

**Expected Results:**
- All collections present
- Record counts match production
- Sample records look correct

**Rollback:** If clone fails, delete staging database and retry from step 1.

**Checklist:**
- [ ] Production MongoDB dumped successfully
- [ ] Staging MongoDB restored successfully
- [ ] Collection counts verified
- [ ] Sample records verified
- [ ] Staging MongoDB connection string saved: `STAGING_MONGODB_URL`

**Duration:** 1-2 hours (depends on data size)

---

### Step 2: PostgreSQL Installation and Configuration

**Objective:** Set up PostgreSQL 16 with optimal configuration for NextCRM.

**Pre-Checks:**
```bash
# Verify PostgreSQL 16+ available
apt-cache policy postgresql  # Debian/Ubuntu
yum list available postgresql*  # RHEL/CentOS

# Check system resources
free -h  # Memory
df -h    # Disk space
nproc    # CPU cores
```

**Installation Procedure:**

#### For Debian/Ubuntu:

```bash
# 1. Install PostgreSQL 16
sudo apt update
sudo apt install -y postgresql-16 postgresql-contrib-16

# 2. Install pgvector extension
sudo apt install -y postgresql-16-pgvector

# 3. Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql
sudo systemctl status postgresql
```

#### For RHEL/CentOS:

```bash
# 1. Add PostgreSQL repository
sudo yum install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-8-x86_64/pgdg-redhat-repo-latest.noarch.rpm

# 2. Install PostgreSQL 16
sudo yum install -y postgresql16-server postgresql16-contrib

# 3. Install pgvector
sudo yum install -y postgresql16-pgvector

# 4. Initialize and start
sudo /usr/pgsql-16/bin/postgresql-16-setup initdb
sudo systemctl start postgresql-16
sudo systemctl enable postgresql-16
sudo systemctl status postgresql-16
```

#### For Docker (Development/Testing):

```bash
# Create docker-compose.yml
cat > /tmp/docker-compose-staging-pg.yml <<'EOF'
version: '3.8'
services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: nextcrm-staging-postgres
    environment:
      POSTGRES_USER: nextcrm
      POSTGRES_PASSWORD: CHANGE_THIS_PASSWORD
      POSTGRES_DB: nextcrm
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    command: postgres -c shared_buffers=256MB -c max_connections=100

volumes:
  postgres_data:
EOF

# Start container
docker-compose -f /tmp/docker-compose-staging-pg.yml up -d

# Verify running
docker ps | grep nextcrm-staging-postgres
```

**PostgreSQL Configuration:**

```bash
# 1. Find postgresql.conf location
sudo -u postgres psql -c "SHOW config_file"

# 2. Edit postgresql.conf (adjust for your server RAM)
sudo nano $(sudo -u postgres psql -t -c "SHOW config_file")
```

**Recommended Settings for 8GB RAM Server:**

```conf
# Memory settings
shared_buffers = 2GB                    # 25% of RAM
effective_cache_size = 6GB              # 75% of RAM
maintenance_work_mem = 512MB            # For CREATE INDEX
work_mem = 32MB                         # Per operation

# Query planner
random_page_cost = 1.1                  # For SSD storage
effective_io_concurrency = 200          # For SSD

# Write ahead log
wal_buffers = 16MB
max_wal_size = 4GB
min_wal_size = 1GB

# Checkpoints
checkpoint_completion_target = 0.9

# Connection pooling
max_connections = 100

# Logging (important for migration monitoring)
log_min_duration_statement = 100        # Log queries > 100ms
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_statement = 'ddl'                   # Log schema changes
log_connections = on
log_disconnections = on
```

**Restart PostgreSQL:**

```bash
sudo systemctl restart postgresql
# OR for Docker
docker restart nextcrm-staging-postgres
```

**Database Creation:**

```bash
# 1. Create database and user
sudo -u postgres psql <<'EOF'
CREATE DATABASE nextcrm;
CREATE USER nextcrm WITH ENCRYPTED PASSWORD 'CHANGE_THIS_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE nextcrm TO nextcrm;
\c nextcrm
GRANT ALL ON SCHEMA public TO nextcrm;
EOF

# 2. Enable extensions
sudo -u postgres psql -d nextcrm <<'EOF'
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
\dx
EOF
```

**Verify Setup:**

```bash
# Test connection
psql "postgresql://nextcrm:PASSWORD@localhost:5432/nextcrm" -c "\conninfo"

# Verify extensions
psql "postgresql://nextcrm:PASSWORD@localhost:5432/nextcrm" -c "\dx"
```

**Expected Output:**
```
                          List of installed extensions
   Name    | Version | Schema |               Description
-----------+---------+--------+------------------------------------------
 uuid-ossp | 1.1     | public | generate universally unique identifiers
 vector    | 0.5.1   | public | vector data type and ivfflat access method
```

**Save Connection String:**
```bash
export STAGING_POSTGRESQL_URL="postgresql://nextcrm:PASSWORD@localhost:5432/nextcrm"
echo "STAGING_POSTGRESQL_URL=$STAGING_POSTGRESQL_URL" >> /tmp/staging-migration.env
```

**Checklist:**
- [ ] PostgreSQL 16+ installed
- [ ] pgvector extension installed
- [ ] uuid-ossp extension installed
- [ ] Configuration tuned for server specs
- [ ] Database and user created
- [ ] Connection tested successfully
- [ ] Connection string saved: `STAGING_POSTGRESQL_URL`

**Duration:** 30-60 minutes

---

### Step 3: Prisma Migration Deployment

**Objective:** Deploy PostgreSQL schema using Prisma migrations.

**Pre-Checks:**
```bash
# 1. Verify Prisma schema is for PostgreSQL
cd /path/to/nextcrm-app
grep 'provider.*=.*"postgresql"' prisma/schema.prisma

# 2. Verify DATABASE_URL points to staging PostgreSQL
cat .env | grep DATABASE_URL
# Should be: DATABASE_URL="postgresql://nextcrm:PASSWORD@localhost:5432/nextcrm"

# 3. Verify dependencies installed
pnpm list prisma @prisma/client
```

**Generate Migration Files (if not already done):**

```bash
# Only if migrations don't exist yet
pnpm exec prisma migrate dev --name init-postgresql

# Review generated SQL
ls -la prisma/migrations/
cat prisma/migrations/*/migration.sql | less
```

**Deploy Schema to Staging:**

```bash
# 1. Set DATABASE_URL for staging
export DATABASE_URL="$STAGING_POSTGRESQL_URL"

# 2. Deploy migrations
pnpm exec prisma migrate deploy

# Expected output:
# Prisma schema loaded from prisma/schema.prisma
# Datasource "db": PostgreSQL database "nextcrm"
#
# 1 migration found in prisma/migrations
#
# Applying migration `20251105000000_init_postgresql`
# The following migration(s) have been applied:
#
# migrations/
#   └─ 20251105000000_init_postgresql/
#     └─ migration.sql
```

**Verify Schema Deployment:**

```bash
# 1. Check tables created
psql "$STAGING_POSTGRESQL_URL" -c "\dt"

# 2. Verify table count (should be 26 entity + 10 junction = 36 tables)
psql "$STAGING_POSTGRESQL_URL" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"

# 3. Verify key tables exist
psql "$STAGING_POSTGRESQL_URL" <<'EOF'
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('Users', 'crm_Accounts', 'crm_Contacts', 'crm_Opportunities')
ORDER BY table_name;
EOF

# 4. Check indexes created
psql "$STAGING_POSTGRESQL_URL" -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';"

# 5. Verify foreign key constraints
psql "$STAGING_POSTGRESQL_URL" <<'EOF'
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
LIMIT 10;
EOF
```

**Generate Prisma Client:**

```bash
pnpm exec prisma generate

# Verify generation
ls -la node_modules/.prisma/client/
```

**Open Prisma Studio (Optional - for visual verification):**

```bash
# In separate terminal
pnpm exec prisma studio

# Open browser to http://localhost:5555
# Verify schema structure (all tables should be empty)
```

**Expected Results:**
- 36 tables created (26 entity + 10 junction)
- Indexes created on foreign keys
- Foreign key constraints defined
- Prisma client generated successfully

**Rollback:** If deployment fails:
```bash
# Drop all tables and retry
psql "$STAGING_POSTGRESQL_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
# Then retry deployment
```

**Checklist:**
- [ ] DATABASE_URL updated to staging PostgreSQL
- [ ] Prisma migrations deployed successfully
- [ ] 36 tables created
- [ ] Indexes created
- [ ] Foreign keys defined
- [ ] Prisma client generated
- [ ] Schema verified via Prisma Studio (optional)

**Duration:** 15-30 minutes

---

### Step 4: Pre-Migration Verification

**Objective:** Final checks before starting migration.

**Verification Checklist:**

```bash
# 1. Verify both database connections work
node -e "
const { PrismaClient: MongoPrisma } = require('@prisma/client');
const mongo = new MongoPrisma({ datasources: { db: { url: process.env.STAGING_MONGODB_URL }}});
const { PrismaClient: PgPrisma } = require('@prisma/client');
const pg = new PgPrisma({ datasources: { db: { url: process.env.STAGING_POSTGRESQL_URL }}});

Promise.all([
  mongo.\$connect().then(() => console.log('MongoDB: Connected')),
  pg.\$connect().then(() => console.log('PostgreSQL: Connected'))
]).catch(console.error).finally(() => {
  mongo.\$disconnect();
  pg.\$disconnect();
});
"

# 2. Verify migration script exists and compiles
pnpm migrate:mongo-to-postgres -- --help

# 3. Verify validation script exists
pnpm validate:migration -- --help

# 4. Check disk space
df -h

# 5. Verify no checkpoint file exists (clean start)
ls -la migration-checkpoint.json 2>/dev/null || echo "No checkpoint found (good)"

# 6. Create backup directory
mkdir -p /backups/staging-migration-$(date +%Y%m%d)
```

**Team Coordination:**

- [ ] Migration lead identified and ready
- [ ] Database administrator available
- [ ] Developer for troubleshooting available
- [ ] Communication channel established (Slack/Teams)
- [ ] Incident escalation path defined

**Environment Variables Setup:**

```bash
# Create .env.staging file
cat > .env.staging <<EOF
# MongoDB (source)
STAGING_MONGODB_URL="mongodb://user:pass@staging-mongo:27017/nextcrm"

# PostgreSQL (target)
STAGING_POSTGRESQL_URL="postgresql://nextcrm:PASSWORD@localhost:5432/nextcrm"

# Migration settings (if needed)
NODE_ENV=staging
EOF

# Load environment
export $(cat .env.staging | xargs)
```

**Document Baseline Metrics:**

```bash
# MongoDB collection counts
mongosh "$STAGING_MONGODB_URL" --quiet --eval "
  db.getCollectionNames().forEach(function(col) {
    print(col + ': ' + db[col].countDocuments());
  })
" | tee /backups/staging-migration-baseline.txt

# Save system metrics
echo "=== System Metrics ===" >> /backups/staging-migration-baseline.txt
free -h >> /backups/staging-migration-baseline.txt
df -h >> /backups/staging-migration-baseline.txt
date >> /backups/staging-migration-baseline.txt
```

**Checklist:**
- [ ] Both database connections tested
- [ ] Migration and validation scripts ready
- [ ] Sufficient disk space available
- [ ] No existing checkpoint file
- [ ] Team members identified and available
- [ ] Communication channel established
- [ ] Environment variables configured
- [ ] Baseline metrics documented

**Duration:** 15-30 minutes

---

## Task Group 5.2: Staging Migration Execution

**Responsible:** Migration Lead + Database Administrator
**Time Estimate:** 4-6 hours (depends on data volume)

---

### Step 1: Pre-Execution Checklist

**Final Go/No-Go Checks:**

- [ ] All Task Group 5.1 steps completed successfully
- [ ] Team members ready and available
- [ ] Communication channel active
- [ ] Backup/rollback plan reviewed
- [ ] Sufficient time allocated (no hard deadline approaching)

**Start Time:** ____:____ (Record actual start time)

---

### Step 2: Execute Migration Script

**Launch Migration:**

```bash
# 1. Navigate to project directory
cd /path/to/nextcrm-app

# 2. Ensure environment variables loaded
echo $STAGING_MONGODB_URL
echo $STAGING_POSTGRESQL_URL

# 3. Start migration with output logging
pnpm migrate:mongo-to-postgres 2>&1 | tee /backups/staging-migration-$(date +%Y%m%d-%H%M%S).log

# Migration will display:
# - Current table being migrated
# - Progress percentage
# - Records processed / total
# - Estimated time remaining
# - Any errors encountered
```

**Example Console Output:**

```
🚀 NextCRM MongoDB → PostgreSQL Migration
==========================================

📋 Migration Plan:
   - Total tables: 36 (26 entity tables + 10 junction tables)
   - Batch size: 1000 records

🔄 Phase 1: Independent Lookup Tables
   ✓ crm_Industry_Type (50 records) - 0.2s
   ✓ Documents_Types (10 records) - 0.1s
   ✓ invoice_States (8 records) - 0.1s
   ...

🔄 Phase 2: Core Entity Tables
   🔄 Users
      Progress: [████████████████────] 80% (800/1,000) | ETA: 30s
```

**Monitoring During Migration:**

Open separate terminal windows to monitor:

```bash
# Terminal 2: Monitor PostgreSQL activity
watch -n 5 'psql "$STAGING_POSTGRESQL_URL" -c "
SELECT
  datname,
  numbackends,
  xact_commit,
  xact_rollback,
  blks_read,
  blks_hit
FROM pg_stat_database
WHERE datname = '"'"'nextcrm'"'"';
"'

# Terminal 3: Monitor checkpoint file updates
watch -n 10 'ls -lh migration-checkpoint.json && tail -20 migration-checkpoint.json | jq .currentTable,.totalRecordsMigrated'

# Terminal 4: Monitor error log
tail -f migration-errors.log

# Terminal 5: Monitor system resources
htop
# OR
watch -n 2 'free -h && df -h | grep -E "Filesystem|/var"'
```

**Key Metrics to Track:**

Create monitoring spreadsheet or document:

| Time | Table | Records | Speed (rec/s) | Errors | Memory | Notes |
|------|-------|---------|---------------|--------|--------|-------|
| 10:00 | Users | 1,000/1,000 | 250 | 0 | 2GB | ✓ Complete |
| 10:15 | crm_Accounts | 5,000/10,000 | 220 | 2 | 2.5GB | In progress |
| ... | ... | ... | ... | ... | ... | ... |

**Normal Migration Behavior:**

- Progress bars update regularly
- Speed typically 100-500 records/second
- Memory usage stable or slowly increasing
- Checkpoint file updates every ~10 batches
- Occasional errors acceptable (logged, not fatal)

**Warning Signs:**

- Migration paused for >5 minutes with no progress
- Memory usage climbing rapidly (>80% system RAM)
- Excessive errors (>1% of records)
- Checkpoint file not updating
- PostgreSQL connection errors

**If Issues Occur:**

See "Error Response Procedures" section below.

**Checklist During Execution:**
- [ ] Migration started successfully
- [ ] Progress displayed correctly
- [ ] Monitoring terminals active
- [ ] Metrics being tracked
- [ ] Team monitoring progress

**Duration:** 3-5 hours (varies by data size)

---

### Step 3: Handle Pause/Resume (If Needed)

**Reason to Pause:**
- Scheduled system maintenance
- Resource constraints detected
- Need to investigate errors
- End of work day (resume next day)

**Pause Procedure:**

```bash
# 1. Press Ctrl+C in migration terminal
^C

# Expected output:
# ⏸️  Migration paused
# 💾 Saving checkpoint...
# ✓ Checkpoint saved to ./migration-checkpoint.json
# 📊 Progress: 45% complete (15/36 tables, 125,430 records migrated)
# 🔄 To resume, run: pnpm migrate:mongo-to-postgres

# 2. Verify checkpoint saved
ls -lh migration-checkpoint.json
jq . migration-checkpoint.json | less
```

**Resume Procedure:**

```bash
# 1. Verify checkpoint exists
cat migration-checkpoint.json | jq '.currentTable,.totalRecordsMigrated'

# 2. Resume migration
pnpm migrate:mongo-to-postgres 2>&1 | tee -a /backups/staging-migration-$(date +%Y%m%d-%H%M%S).log

# Expected output:
# 📊 Checkpoint found: Resuming from crm_Opportunities (125,430 records already migrated)
# 🔄 Skipping completed tables: Users, crm_Accounts, crm_Contacts, ...
# 🔄 Continuing: crm_Opportunities
#    Progress: [████────────────────] 20% (2,000/10,000) | ETA: 15m
```

**Verify Resume Correctness:**

```bash
# Check no duplicate records created
psql "$STAGING_POSTGRESQL_URL" -c "
SELECT table_name, COUNT(*)
FROM information_schema.tables t
JOIN LATERAL (SELECT COUNT(*) FROM \""' || t.table_name || '"\") c ON true
WHERE table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;
"
```

**Checklist:**
- [ ] Checkpoint saved before exit
- [ ] Checkpoint file preserved
- [ ] Resume detected checkpoint
- [ ] No duplicate records created
- [ ] Migration continued from correct position

---

### Step 4: Error Handling Procedures

**Error Categories and Responses:**

#### Error Type 1: Connection Failures

**Symptoms:**
```
Error: Connection to database lost
Error: ETIMEDOUT
Error: Connection refused
```

**Response:**

```bash
# 1. Pause migration (Ctrl+C)

# 2. Check database connectivity
mongosh "$STAGING_MONGODB_URL" --eval "db.adminCommand('ping')"
psql "$STAGING_POSTGRESQL_URL" -c "SELECT 1"

# 3. Check network
ping staging-mongo-host
ping staging-postgres-host

# 4. If connection restored, resume migration
pnpm migrate:mongo-to-postgres
```

**Escalation:** If connectivity issues persist >15 minutes, contact network team.

---

#### Error Type 2: Foreign Key Violations

**Symptoms:**
```
Error: Foreign key constraint violation
Error: insert or update on table "crm_Contacts" violates foreign key constraint
```

**Response:**

```bash
# 1. Note the error in migration-errors.log
tail -50 migration-errors.log | grep -A 5 "Foreign key"

# 2. Identify problematic records
# (Error log will include MongoDB ObjectId)

# 3. Check if referenced record exists in source
mongosh "$STAGING_MONGODB_URL" --eval "db.crm_Accounts.findOne({_id: ObjectId('PROBLEMATIC_ID')})"

# 4. Migration will continue with other records
# Failed records will be in error log for manual fixing later

# 5. Continue monitoring migration
```

**Post-Migration Fix:**
- Review error log
- Manually fix data integrity issues
- Re-run migration for failed records only (custom script)

---

#### Error Type 3: Resource Exhaustion

**Symptoms:**
- Memory usage >90%
- Swap usage increasing
- Migration extremely slow
- System becoming unresponsive

**Response:**

```bash
# 1. Pause migration immediately (Ctrl+C)

# 2. Check system resources
free -h
df -h
top

# 3. Free up resources
# - Stop non-essential services
# - Clear caches: sync && echo 3 > /proc/sys/vm/drop_caches

# 4. Reduce batch size (if needed)
# Edit scripts/migration/table-config.ts
# Change BATCH_SIZE from 1000 to 500

# 5. Resume migration
pnpm migrate:mongo-to-postgres
```

**Escalation:** If insufficient resources, pause migration and schedule larger maintenance window.

---

#### Error Type 4: Data Transformation Errors

**Symptoms:**
```
Error: Invalid date format
Error: Cannot convert value to UUID
Error: JSONB parse error
```

**Response:**

```bash
# 1. Review error in migration-errors.log
cat migration-errors.log | grep "transformation error" -A 10

# 2. Check original MongoDB document
# (Document is included in error log)

# 3. If systematic issue (affects many records):
   # a. Pause migration
   # b. Fix transformation logic in scripts/migration/transformers/
   # c. Test fix with sample data
   # d. Resume migration (will retry failed records)

# 4. If isolated issue (few records):
   # a. Let migration continue
   # b. Add to post-migration fix list
```

---

#### Error Type 5: PostgreSQL Constraint Violations

**Symptoms:**
```
Error: Unique constraint violation
Error: Check constraint violation
Error: NOT NULL constraint violation
```

**Response:**

```bash
# 1. Log the error details
echo "$(date): Constraint violation" >> /backups/migration-issues.txt
tail -20 migration-errors.log >> /backups/migration-issues.txt

# 2. Continue migration (individual records will fail, logged)

# 3. Review errors post-migration for patterns

# 4. Fix data in MongoDB if needed and re-migrate affected records
```

---

**General Error Response Protocol:**

1. **Assess Severity:**
   - Critical: Migration stopped, cannot continue
   - High: Many records failing (>100 per table)
   - Medium: Some records failing (<100 per table)
   - Low: Isolated failures (<10 records)

2. **Decision Matrix:**
   - Critical → Pause, investigate, fix, resume
   - High → Pause, review patterns, fix if systemic, resume
   - Medium → Continue, monitor, review post-migration
   - Low → Continue, fix post-migration

3. **Documentation:**
   - Record all errors in tracking sheet
   - Save error log snapshots
   - Document decisions made
   - Update runbook with learnings

**Checklist:**
- [ ] Error response procedures reviewed
- [ ] Escalation contacts identified
- [ ] Error tracking sheet prepared
- [ ] Team knows when to escalate

---

### Step 5: Migration Completion

**Migration End:**

```bash
# Expected final output:
🎉 Migration Complete!
   - Total records: 125,430
   - Duration: 4h 23m 15s
   - Speed: 7.95 records/second
   - Errors: 12 records (0.01%)

💾 Checkpoint file deleted (migration successful)
📊 See migration-errors.log for failed records

Next steps:
  1. Run validation: pnpm validate:migration
  2. Review error log if any errors occurred
  3. Test application against PostgreSQL
```

**Post-Migration Immediate Checks:**

```bash
# 1. Verify checkpoint deleted
ls migration-checkpoint.json
# Should not exist (or migration incomplete)

# 2. Check final record counts
psql "$STAGING_POSTGRESQL_URL" -c "
SELECT
  schemaname,
  tablename,
  n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;
" | tee /backups/staging-migration-final-counts.txt

# 3. Compare with baseline MongoDB counts
diff /backups/staging-migration-baseline.txt /backups/staging-migration-final-counts.txt

# 4. Review error summary
cat migration-errors.log | tail -50
wc -l migration-errors.log

# 5. Save migration artifacts
mkdir -p /backups/staging-migration-$(date +%Y%m%d)/artifacts
cp migration-errors.log /backups/staging-migration-$(date +%Y%m%d)/artifacts/
cp migration-checkpoint.json /backups/staging-migration-$(date +%Y%m%d)/artifacts/ 2>/dev/null || true
```

**Document Results:**

Create migration summary document:

```markdown
# Staging Migration Summary
**Date:** 2025-11-05
**Start Time:** 10:00 AM
**End Time:** 2:23 PM
**Duration:** 4h 23m

## Statistics
- Total Records Migrated: 125,430
- Migration Speed: 7.95 rec/sec
- Errors: 12 (0.01%)
- Tables Completed: 36/36

## Issues Encountered
1. [Brief description of any issues]
2. [How they were resolved]

## Resource Usage
- Peak Memory: 3.2GB / 8GB (40%)
- Peak Disk I/O: Moderate
- Network: Stable

## Team Members
- Migration Lead: [Name]
- Database Admin: [Name]
- Developer: [Name]

## Next Steps
1. Run validation script
2. Application testing
3. Performance testing
4. Document learnings for production
```

**Checklist:**
- [ ] Migration completed successfully
- [ ] Final counts documented
- [ ] Errors reviewed and categorized
- [ ] Migration artifacts backed up
- [ ] Summary document created
- [ ] End time recorded: ____:____

**Duration:** 15-30 minutes

---

## Task Group 5.3: Staging Validation and Testing

**Responsible:** Database Admin + QA Lead
**Time Estimate:** 2-3 hours

---

### Step 1: Execute Validation Script

**Run Full Validation:**

```bash
# 1. Run validation script
pnpm validate:migration 2>&1 | tee /backups/staging-validation-$(date +%Y%m%d-%H%M%S).log

# Expected output:
✅ NextCRM Migration Validation Report
=======================================

📊 Row Count Validation: PASS
   - All 36 tables have matching record counts

📋 Sample Record Validation: PASS
   - Validated 3,600 records across all tables
   - 99.97% field-level match

🔗 Referential Integrity Validation: PASS
   - All foreign keys resolve correctly
   - No orphaned records found
   - All junction tables valid

🔢 Data Type Conversion Validation: PASS
   - All DateTime conversions valid
   - All enum values valid
   - All JSONB structures valid

🎉 VALIDATION PASSED
   - Total records: 125,430
   - Match percentage: 99.97%
   - Validation duration: 12m 34s

✅ Safe to proceed with application testing!
```

**If Validation Fails:**

```bash
# 1. Review validation report JSON
cat migration-validation-report.json | jq .

# 2. Identify failure type
cat migration-validation-report.json | jq '.rowCountValidation.status'
cat migration-validation-report.json | jq '.sampleRecordValidation.status'
cat migration-validation-report.json | jq '.referentialIntegrityValidation.status'
cat migration-validation-report.json | jq '.dataTypeValidation.status'

# 3. Review specific failures
cat migration-validation-report.json | jq '.rowCountValidation.discrepancies'
cat migration-validation-report.json | jq '.sampleRecordValidation.fieldMismatches | .[0:10]'

# 4. Investigate root cause
# - Check migration-errors.log
# - Compare specific records in MongoDB vs PostgreSQL
# - Review transformation logic

# 5. Decision:
#    - Minor issues (<1% records): Document and continue to testing
#    - Major issues (>1% records): Re-run migration after fixes
```

**Validation Success Criteria:**

- [ ] Row count validation: PASS
- [ ] Sample record validation: PASS (>99% match)
- [ ] Referential integrity: PASS (no orphaned records)
- [ ] Data type validation: PASS
- [ ] Overall match percentage: >99%

**Checklist:**
- [ ] Validation script executed
- [ ] Validation report reviewed
- [ ] All validation layers passed (or documented exceptions)
- [ ] Validation report saved

**Duration:** 15-30 minutes

---

### Step 2: Application Testing

**Objective:** Verify NextCRM application works correctly with PostgreSQL.

**Update Application Configuration:**

```bash
# 1. Update .env to point to staging PostgreSQL
cd /path/to/nextcrm-app

cat > .env.staging <<EOF
DATABASE_URL="$STAGING_POSTGRESQL_URL"
# ... other environment variables
EOF

# 2. Regenerate Prisma client
pnpm exec prisma generate

# 3. Start application
npm run dev
# OR for production build
pnpm build && npm start
```

**Functional Testing Checklist:**

**Authentication & Users:**
- [ ] Login with existing user account
- [ ] View user profile
- [ ] Update user settings
- [ ] Create new user (if admin)

**CRM - Accounts:**
- [ ] List all accounts
- [ ] Search accounts by name
- [ ] View account details
- [ ] Create new account
- [ ] Update existing account
- [ ] Delete account (test)

**CRM - Contacts:**
- [ ] List contacts
- [ ] Filter contacts by account
- [ ] View contact details
- [ ] Create new contact
- [ ] Link contact to account
- [ ] Update contact information

**CRM - Opportunities:**
- [ ] List opportunities
- [ ] View opportunity pipeline
- [ ] Filter by sales stage
- [ ] View opportunity details
- [ ] Create new opportunity
- [ ] Update opportunity stage
- [ ] Link documents to opportunity

**CRM - Contracts:**
- [ ] List contracts
- [ ] Filter by status
- [ ] View contract details
- [ ] Create new contract
- [ ] Update contract dates

**Tasks:**
- [ ] View task board
- [ ] Create new task
- [ ] Update task status
- [ ] Assign task to user
- [ ] Add comment to task
- [ ] Link document to task

**Documents:**
- [ ] List documents
- [ ] Search documents
- [ ] Upload new document
- [ ] Download document
- [ ] View document details
- [ ] Link document to multiple entities

**Invoices:**
- [ ] List invoices
- [ ] Filter invoices by status
- [ ] View invoice details
- [ ] Create new invoice
- [ ] Update invoice state

**Reports & Dashboards:**
- [ ] View dashboard widgets
- [ ] Run opportunity report
- [ ] Run account activity report
- [ ] Verify data accuracy

**Performance Testing:**

```bash
# Test query response times
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:3000/api/crm/accounts"

# Create curl-format.txt:
cat > curl-format.txt <<EOF
    time_namelookup:  %{time_namelookup}\n
       time_connect:  %{time_connect}\n
    time_appconnect:  %{time_appconnect}\n
   time_pretransfer:  %{time_pretransfer}\n
      time_redirect:  %{time_redirect}\n
 time_starttransfer:  %{time_starttransfer}\n
                    ----------\n
         time_total:  %{time_total}\n
EOF
```

**Performance Targets:**
- Simple list queries: < 100ms
- Detail page loads: < 200ms
- Search queries: < 300ms
- Complex reports: < 1000ms

**Database Query Monitoring:**

```bash
# Enable query logging (if not already)
psql "$STAGING_POSTGRESQL_URL" -c "ALTER SYSTEM SET log_min_duration_statement = 100;"
psql "$STAGING_POSTGRESQL_URL" -c "SELECT pg_reload_conf();"

# Monitor slow queries
tail -f /var/log/postgresql/postgresql-16-main.log | grep "duration:"

# Check query statistics
psql "$STAGING_POSTGRESQL_URL" -c "
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
"
```

**Issue Tracking:**

Create testing issue log:

| Feature | Issue | Severity | Root Cause | Status |
|---------|-------|----------|------------|--------|
| Accounts List | Slow (500ms) | Medium | Missing index | Fixed |
| Contact Search | Not working | High | FTS config | In Progress |
| ... | ... | ... | ... | ... |

**Checklist:**
- [ ] Application started successfully
- [ ] Authentication works
- [ ] All CRM features tested
- [ ] Task management tested
- [ ] Document management tested
- [ ] Invoice management tested
- [ ] Performance acceptable
- [ ] Issues documented

**Duration:** 1-2 hours

---

### Step 3: User Acceptance Testing (UAT)

**Objective:** Key users validate critical workflows.

**UAT Participants:**
- Sales team representative (CRM workflows)
- Project manager (task management)
- Admin user (user management, configuration)
- Finance user (invoices)

**UAT Test Scenarios:**

**Scenario 1: Complete Sales Cycle**
1. Create new lead
2. Qualify lead and convert to account
3. Create contact for account
4. Create opportunity
5. Move opportunity through sales stages
6. Win opportunity
7. Create contract
8. Generate invoice

**Scenario 2: Project Task Management**
1. Create new project board
2. Add sections
3. Create tasks in each section
4. Assign tasks to team members
5. Add comments to tasks
6. Upload documents to tasks
7. Move tasks between sections
8. Mark tasks complete

**Scenario 3: Document Management**
1. Upload various document types
2. Link documents to accounts
3. Link documents to opportunities
4. Search for documents
5. Download documents
6. Update document metadata

**Scenario 4: Reporting and Analytics**
1. View sales dashboard
2. Run opportunity pipeline report
3. Run account activity report
4. Export report data
5. Verify data accuracy against known values

**UAT Feedback Template:**

```markdown
# UAT Session - [Date] - [User Name]

## Scenario Tested: [Scenario Name]

### Steps Completed:
- [x] Step 1
- [x] Step 2
- [ ] Step 3 (failed - see issue below)

### Issues Encountered:
1. **Issue:** [Description]
   **Severity:** Critical/High/Medium/Low
   **Expected:** [What should happen]
   **Actual:** [What happened]
   **Screenshot:** [If applicable]

### Data Accuracy:
- Accounts data: ✓ Accurate / ✗ Issues found
- Opportunities data: ✓ Accurate / ✗ Issues found
- Documents: ✓ Accurate / ✗ Issues found

### Performance:
- Overall speed: Fast / Acceptable / Slow
- Specific slow operations: [List]

### Overall Assessment:
- Ready for production: Yes / No (with fixes) / No
- Confidence level: High / Medium / Low
- Additional comments: [Free text]
```

**UAT Success Criteria:**

- [ ] All critical workflows completed successfully
- [ ] No data accuracy issues found
- [ ] Performance acceptable for daily use
- [ ] Users confident in system reliability
- [ ] All blockers documented and resolved

**Checklist:**
- [ ] UAT participants identified
- [ ] Test scenarios executed
- [ ] Feedback collected from all participants
- [ ] Issues documented and prioritized
- [ ] Critical issues resolved
- [ ] UAT sign-off received

**Duration:** 2-3 hours (total across all participants)

---

### Step 4: Performance Testing

**Objective:** Validate PostgreSQL performance meets requirements.

**Performance Test Plan:**

#### Test 1: Simple Query Performance

```bash
# Run performance test script
cat > /tmp/perf-test-simple-queries.js <<'EOF'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function measureQuery(name, queryFn) {
  const start = Date.now();
  await queryFn();
  const duration = Date.now() - start;
  console.log(`${name}: ${duration}ms`);
  return duration;
}

async function runTests() {
  console.log("Simple Query Performance Tests\n");

  await measureQuery("List 50 accounts", () =>
    prisma.crm_Accounts.findMany({ take: 50 }));

  await measureQuery("List 50 contacts", () =>
    prisma.crm_Contacts.findMany({ take: 50 }));

  await measureQuery("List 50 opportunities", () =>
    prisma.crm_Opportunities.findMany({ take: 50 }));

  await measureQuery("Get single account by ID", () =>
    prisma.crm_Accounts.findFirst());

  await measureQuery("Count all accounts", () =>
    prisma.crm_Accounts.count());

  await prisma.$disconnect();
}

runTests();
EOF

node /tmp/perf-test-simple-queries.js
```

**Expected Results:**
- All queries < 100ms
- Count queries < 50ms
- Single record queries < 20ms

#### Test 2: Complex Query Performance

```sql
-- Test complex join query
EXPLAIN ANALYZE
SELECT
  a.name as account_name,
  COUNT(DISTINCT c.id) as contact_count,
  COUNT(DISTINCT o.id) as opportunity_count,
  SUM(o.value) as total_opportunity_value
FROM crm_Accounts a
LEFT JOIN crm_Contacts c ON c.accountsIDs = a.id
LEFT JOIN crm_Opportunities o ON o.account = a.id
WHERE a.status = 'ACTIVE'
GROUP BY a.id, a.name
ORDER BY total_opportunity_value DESC
LIMIT 50;
```

**Check Index Usage:**
- Verify "Index Scan" (not "Seq Scan") in EXPLAIN output
- Verify foreign key indexes used
- Verify filter indexes used (status)

#### Test 3: Full-Text Search Performance

```sql
-- Test full-text search
EXPLAIN ANALYZE
SELECT * FROM crm_Accounts
WHERE to_tsvector('english', name) @@ to_tsquery('english', 'search_term');

-- If slow, verify GIN index exists:
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'crm_Accounts' AND indexdef LIKE '%GIN%';
```

#### Test 4: Concurrent Load Test

```bash
# Use Apache Bench or similar tool
ab -n 1000 -c 10 http://localhost:3000/api/crm/accounts

# Expected:
# - All requests successful (200 OK)
# - Average response time < 200ms
# - No timeout errors
```

**Performance Metrics Tracking:**

| Query Type | Target | Actual | Status | Notes |
|------------|--------|--------|--------|-------|
| Simple list (50 records) | <100ms | 45ms | ✓ Pass | |
| Single record fetch | <20ms | 12ms | ✓ Pass | |
| Count query | <50ms | 18ms | ✓ Pass | |
| Complex join | <300ms | 250ms | ✓ Pass | |
| Full-text search | <200ms | 180ms | ✓ Pass | Index used |
| Concurrent (10 users) | <200ms avg | 150ms | ✓ Pass | |

**If Performance Issues Found:**

```bash
# 1. Identify slow queries
psql "$STAGING_POSTGRESQL_URL" -c "
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC;
"

# 2. Analyze specific slow query
psql "$STAGING_POSTGRESQL_URL" <<'EOF'
EXPLAIN (ANALYZE, BUFFERS)
[SLOW_QUERY_HERE];
EOF

# 3. Check missing indexes
# Look for "Seq Scan" in EXPLAIN output
# Add indexes as needed

# 4. Run ANALYZE to update statistics
psql "$STAGING_POSTGRESQL_URL" -c "ANALYZE;"

# 5. Re-test after optimizations
```

**Checklist:**
- [ ] Simple query tests completed
- [ ] Complex query tests completed
- [ ] Full-text search tested
- [ ] Concurrent load tested
- [ ] All performance targets met
- [ ] Indexes verified in use
- [ ] Slow queries identified and optimized

**Duration:** 1-2 hours

---

## Task Group 5.4: Staging Learnings and Production Planning

**Responsible:** Migration Lead + Team
**Time Estimate:** 2-3 hours

---

### Step 1: Document Migration Results

**Create Detailed Migration Report:**

```markdown
# Staging Migration Complete Report
**Date:** 2025-11-05
**Environment:** Staging
**Migration Lead:** [Name]
**Team:** [Names]

## Executive Summary
The staging environment migration from MongoDB to PostgreSQL completed successfully with [X]% data integrity. Application testing confirmed all critical features functional. System is ready for production migration planning.

## Migration Statistics

### Timing
- Setup Duration: 2.5 hours
- Migration Duration: 4 hours 23 minutes
- Validation Duration: 15 minutes
- Testing Duration: 3 hours
- **Total Elapsed:** 10 hours 8 minutes

### Data Volume
- Total Records Migrated: 125,430
- Total Tables: 36 (26 entity + 10 junction)
- Migration Speed: 7.95 records/second
- Database Size: MongoDB 2.3GB → PostgreSQL 2.1GB

### Data Quality
- Validation Result: PASS
- Row Count Match: 100%
- Sample Record Match: 99.97%
- Referential Integrity: 100%
- Migration Errors: 12 records (0.01%)

## Issues Encountered

### Issue 1: [Title]
- **When:** [Time during migration]
- **What:** [Description]
- **Impact:** [Severity and effect]
- **Resolution:** [How resolved]
- **Prevention for Production:** [Action items]

### Issue 2: [Title]
...

## Performance Results

### Query Performance
- Simple queries: 20-60ms (Target: <100ms) ✓
- Complex joins: 180-250ms (Target: <300ms) ✓
- Full-text search: 150-200ms (Target: <200ms) ✓
- Count queries: 15-30ms (Target: <50ms) ✓

### Index Usage
- All foreign key indexes utilized: ✓
- Filter indexes utilized: ✓
- Full-text indexes utilized: ✓

### Resource Usage
- Peak CPU: 65%
- Peak Memory: 3.2GB / 8GB (40%)
- Peak Disk I/O: Moderate
- Network: Stable throughout

## Application Testing Results

### Functional Testing
- Authentication: ✓ Pass
- CRM Features: ✓ Pass
- Task Management: ✓ Pass
- Document Management: ✓ Pass
- Invoice Management: ✓ Pass
- Reports: ✓ Pass

### User Acceptance Testing
- Sales workflow: ✓ Approved
- Project management: ✓ Approved
- Document workflow: ✓ Approved
- Reporting: ✓ Approved

### Known Issues
1. [Issue description] - Severity: [Low/Medium/High] - Status: [Open/Resolved]
2. ...

## Lessons Learned

### What Went Well
1. Checkpoint/resume system worked flawlessly
2. Progress tracking provided good visibility
3. Error logging helped identify data quality issues
4. Team communication was effective

### What Could Be Improved
1. [Improvement area]
2. [Improvement area]

### Surprises
1. [Unexpected finding]
2. [Unexpected finding]

## Production Migration Recommendations

### Timing Estimate
Based on staging performance:
- Production data volume: [X] times larger than staging
- Estimated migration duration: [Y] hours
- Recommended maintenance window: [Z] hours (includes buffer)

### Resource Requirements
- PostgreSQL server: [Specifications]
- Disk space: [Amount needed]
- Team size: [Number of people]
- Roles needed: [List roles]

### Risk Mitigation
1. [Risk] → [Mitigation strategy]
2. [Risk] → [Mitigation strategy]

### Critical Success Factors
1. [Factor]
2. [Factor]

## Appendices

### A. Error Log Summary
[Attach or summarize migration-errors.log]

### B. Validation Report
[Attach migration-validation-report.json]

### C. Performance Test Results
[Attach performance metrics]

### D. UAT Feedback
[Attach UAT forms]

---
**Report Prepared By:** [Name]
**Date:** [Date]
**Next Review:** [Date for production planning]
```

**Checklist:**
- [ ] Migration report completed
- [ ] All statistics documented
- [ ] Issues analyzed and lessons learned captured
- [ ] Production recommendations documented
- [ ] Report shared with stakeholders

---

### Step 2: Estimate Production Duration

**Duration Estimation Formula:**

```
Production Duration = (Staging Duration) × (Production Data Size / Staging Data Size) × (Safety Factor)

Where:
- Staging Duration: [Measured time]
- Production/Staging Ratio: [Calculate below]
- Safety Factor: 1.5 (for production caution)
```

**Calculate Data Size Ratio:**

```bash
# Get production database size
mongosh "$PRODUCTION_MONGODB_URL" --eval "db.stats(1024*1024).dataSize" --quiet

# Get staging database size
mongosh "$STAGING_MONGODB_URL" --eval "db.stats(1024*1024).dataSize" --quiet

# Calculate ratio
# Example: Production 23GB / Staging 2.3GB = 10x
```

**Example Calculation:**

```
Staging Data: 2.3GB, 125,430 records, 4h 23m migration
Production Data: 23GB, ~1,250,000 records (10x staging)

Estimated Production Duration:
= 4h 23m × 10 × 1.5 (safety factor)
= 65.75 hours × 1.5
= 98.6 hours (~4.1 days)

PROBLEM: Too long!

Alternative approach:
- Scale PostgreSQL server (more CPU/RAM)
- Optimize batch size
- Run during low-traffic period
- Consider parallel processing

Revised Estimate with optimizations:
= 4h 23m × 10 × 1.2 (with optimizations)
= 52.6 hours (~2.2 days)

Still too long - need different approach or maintenance window strategy.
```

**Create Production Timeline:**

```markdown
# Production Migration Timeline

## Maintenance Window Options

### Option 1: Weekend Migration
- **Window:** Saturday 8 AM - Monday 6 AM (46 hours)
- **Pros:** Minimal user impact, long window
- **Cons:** Weekend team availability, stress
- **Estimated Completion:** Sunday 10 PM
- **Rollback Deadline:** Sunday 11 PM

### Option 2: Phased Approach (if feasible)
- **Phase 1:** Migrate 50% of data (24 hours)
- **Phase 2:** Migrate remaining 50% (24 hours)
- **Pros:** Smaller batches, easier to manage
- **Cons:** More complex, may not be feasible
- **Not recommended for full migration**

### Option 3: Extended Maintenance Window
- **Window:** Friday 6 PM - Monday 6 AM (60 hours)
- **Pros:** Maximum time, allows for issues
- **Cons:** Longer downtime, user frustration

## Recommended: Option 1 (Weekend Migration)
- Start: Saturday 8:00 AM
- Estimated Completion: Sunday 10:00 PM
- Rollback Deadline: Sunday 11:00 PM
- Full Testing: Monday 12:00 AM - 6:00 AM
- Go-Live: Monday 6:00 AM
```

**Checklist:**
- [ ] Production data size measured
- [ ] Duration estimate calculated
- [ ] Maintenance window options identified
- [ ] Recommended approach selected
- [ ] Timeline documented

---

### Step 3: Create Production Runbook

**Production Runbook Contents:**

Based on this staging runbook, create production-specific version:

```markdown
# Production Migration Runbook
(See: PHASE6_PRODUCTION_RUNBOOK.md)

Key differences from staging:
1. Production data volume (10x larger)
2. Stricter go/no-go criteria
3. More frequent checkpoints
4. Enhanced monitoring
5. Communication plan to users
6. Stricter rollback triggers

Sections:
- Pre-Migration Preparation
- Migration Execution
- Validation
- Deployment
- Post-Migration Monitoring
- Rollback Procedures
```

**Checklist:**
- [ ] Production runbook created (separate document)
- [ ] Staging runbook differences noted
- [ ] Production-specific requirements added
- [ ] Rollback procedures expanded
- [ ] Communication plans added

---

### Step 4: Risk Assessment and Mitigation

**Production Migration Risks:**

| Risk | Likelihood | Impact | Mitigation | Owner |
|------|------------|--------|------------|-------|
| Migration exceeds time window | Medium | Critical | Buffer time, optimized batch size, ready team | Ops Lead |
| Data corruption during migration | Low | Critical | Backups, validation, checkpoints | DB Admin |
| PostgreSQL performance issues | Low | High | Performance testing, indexes verified | DB Admin |
| Application bugs post-migration | Medium | High | Staging UAT, rollback plan ready | Dev Lead |
| Team member unavailable | Medium | Medium | Backup personnel identified | Proj Manager |
| Network issues during migration | Low | High | Local migration, redundant connectivity | Ops Lead |
| Disk space exhaustion | Low | High | Monitor closely, 3x buffer allocated | Ops Lead |

**Mitigation Action Items:**

- [ ] Complete comprehensive backup before migration
- [ ] Verify rollback procedure tested in staging
- [ ] Optimize batch size based on staging learnings
- [ ] Scale PostgreSQL server resources
- [ ] Schedule backup team members
- [ ] Create communication templates for users
- [ ] Define go/no-go decision criteria
- [ ] Test rollback procedure end-to-end

**Checklist:**
- [ ] Risk assessment completed
- [ ] Mitigation strategies defined
- [ ] Action items assigned with owners
- [ ] Escalation paths defined

---

### Step 5: Stakeholder Communication

**Create Communication Plan:**

```markdown
# Production Migration Communication Plan

## Stakeholders
1. **Executive Team** - Need: High-level status, risk summary
2. **End Users** - Need: Downtime notice, timeline, impact
3. **Support Team** - Need: Known issues, troubleshooting guide
4. **Development Team** - Need: Technical details, potential impacts
5. **Sales Team** - Need: Customer communication templates

## Communication Timeline

### T-14 days (2 weeks before)
- **To:** All users
- **Message:** Advance notice of planned maintenance
- **Channel:** Email, in-app notification
- **Template:** See COMMUNICATION_TEMPLATES.md

### T-7 days (1 week before)
- **To:** All users
- **Message:** Reminder of maintenance window
- **Channel:** Email
- **Include:** FAQ about migration impact

### T-3 days
- **To:** Power users, admins
- **Message:** Detailed preparation steps
- **Channel:** Email, direct meeting

### T-1 day (Friday before weekend migration)
- **To:** All users
- **Message:** Final reminder, exact downtime
- **Channel:** Email, in-app banner

### T-0 (Migration start)
- **To:** All users
- **Message:** System offline for maintenance
- **Channel:** Status page, login screen message

### During Migration
- **To:** Stakeholders (every 4 hours)
- **Message:** Progress update
- **Channel:** Slack, email to key stakeholders

### T+0 (Migration complete)
- **To:** All users
- **Message:** System back online
- **Channel:** Email, status page

### T+1 day (Monday after)
- **To:** All users
- **Message:** Migration successful, report issues
- **Channel:** Email

### T+7 days (1 week after)
- **To:** All stakeholders
- **Message:** Post-migration summary
- **Channel:** Email, presentation
```

**Checklist:**
- [ ] Stakeholders identified
- [ ] Communication timeline created
- [ ] Message templates drafted (see COMMUNICATION_TEMPLATES.md)
- [ ] Communication channels confirmed
- [ ] Support team briefed on handling user questions

---

## Staging Migration Sign-Off

**Pre-Production Approval:**

### Migration Lead Sign-Off

- [ ] Staging migration completed successfully
- [ ] All validation tests passed
- [ ] Application testing confirms functionality
- [ ] UAT approved by key users
- [ ] Performance meets requirements
- [ ] Issues documented and resolved
- [ ] Production runbook prepared
- [ ] Team ready for production migration

**Signature:** __________________ **Date:** __________

---

### Database Administrator Sign-Off

- [ ] Data integrity verified
- [ ] PostgreSQL configuration validated
- [ ] Indexes performing as expected
- [ ] Backup/restore procedures tested
- [ ] Monitoring in place

**Signature:** __________________ **Date:** __________

---

### Development Lead Sign-Off

- [ ] Application fully functional
- [ ] No critical bugs identified
- [ ] Performance acceptable
- [ ] Rollback procedure tested

**Signature:** __________________ **Date:** __________

---

### Product Owner Sign-Off

- [ ] User acceptance testing approved
- [ ] Business requirements met
- [ ] Risk assessment acceptable
- [ ] Ready to proceed to production

**Signature:** __________________ **Date:** __________

---

## Next Steps

1. **Schedule Production Migration:**
   - [ ] Select maintenance window
   - [ ] Book team members
   - [ ] Reserve infrastructure resources
   - [ ] Create calendar invites

2. **Finalize Production Runbook:**
   - [ ] Review PHASE6_PRODUCTION_RUNBOOK.md
   - [ ] Customize based on staging learnings
   - [ ] Add production-specific details
   - [ ] Review with team

3. **User Communication:**
   - [ ] Send advance notice (T-14 days)
   - [ ] Prepare FAQ document
   - [ ] Brief support team
   - [ ] Draft all communication templates

4. **Final Preparations:**
   - [ ] Production PostgreSQL server ready
   - [ ] Backup storage allocated
   - [ ] Team training completed
   - [ ] Emergency contacts list ready

---

## Appendix A: Troubleshooting Guide

### Issue: Migration Script Won't Start

**Symptoms:**
```
Error: Cannot find module '@prisma/client'
Error: DATABASE_URL not set
```

**Resolution:**
```bash
# Install dependencies
pnpm install

# Set environment variables
export STAGING_MONGODB_URL="..."
export STAGING_POSTGRESQL_URL="..."

# Regenerate Prisma client
pnpm exec prisma generate

# Retry
pnpm migrate:mongo-to-postgres
```

---

### Issue: Checkpoint File Corrupted

**Symptoms:**
```
Error: Invalid checkpoint file
Error: Cannot parse checkpoint JSON
```

**Resolution:**
```bash
# Backup corrupted file
mv migration-checkpoint.json migration-checkpoint.json.corrupted

# Restart migration from beginning
pnpm migrate:mongo-to-postgres
# OR
# Manually reconstruct checkpoint from logs (advanced)
```

---

### Issue: PostgreSQL Out of Connections

**Symptoms:**
```
Error: remaining connection slots reserved
Error: too many clients already
```

**Resolution:**
```bash
# Check current connections
psql "$STAGING_POSTGRESQL_URL" -c "SELECT count(*) FROM pg_stat_activity;"

# Kill idle connections
psql "$STAGING_POSTGRESQL_URL" -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
AND query_start < NOW() - INTERVAL '10 minutes';
"

# Increase max_connections (if needed)
psql "$STAGING_POSTGRESQL_URL" -c "ALTER SYSTEM SET max_connections = 200;"
psql "$STAGING_POSTGRESQL_URL" -c "SELECT pg_reload_conf();"

# Retry migration
```

---

### Issue: Disk Space Exhausted

**Symptoms:**
```
Error: No space left on device
```

**Resolution:**
```bash
# Check disk usage
df -h

# Free up space
# - Delete old logs
# - Remove temporary files
# - Clear package caches

# If PostgreSQL data directory full:
# Move to larger volume or expand volume

# Retry migration
```

---

## Appendix B: Monitoring Queries

```sql
-- Active connections
SELECT
  count(*),
  state
FROM pg_stat_activity
GROUP BY state;

-- Database size
SELECT
  pg_size_pretty(pg_database_size('nextcrm')) as size;

-- Table sizes
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;

-- Index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Slowest queries (requires pg_stat_statements)
SELECT
  substring(query, 1, 100) as query_start,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

---

**End of Phase 5 Staging Runbook**

This document is a living guide. Update based on actual staging migration experience before using for production migration.
