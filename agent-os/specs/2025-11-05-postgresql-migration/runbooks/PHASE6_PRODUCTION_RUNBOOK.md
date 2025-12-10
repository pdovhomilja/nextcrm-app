# Phase 6: Production Migration and Monitoring Runbook

**Document Version:** 1.0
**Last Updated:** 2025-11-05
**Owner:** Migration Lead + Operations Team
**Status:** Ready for Execution

## Overview

This runbook provides comprehensive step-by-step instructions for executing the production migration from MongoDB to PostgreSQL. This is the final and most critical phase of the database migration project.

**Purpose:** Migrate production data safely with zero data loss and minimal downtime.

**Critical Success Factors:**
- Complete and tested backup before starting
- Validation passes 100%
- Application functions correctly post-migration
- Rollback procedure ready and tested
- Team coordination and communication

**Estimated Duration:** Based on staging results × data size ratio + 50% buffer

**Prerequisites:**
- Phase 5 (Staging Migration) successfully completed
- Production runbook reviewed and approved by all stakeholders
- Team members confirmed and available
- Maintenance window scheduled and communicated
- All sign-offs obtained

---

## Pre-Migration Checklist (T-7 Days)

**Week Before Migration:**

### Stakeholder Approval
- [ ] Executive sponsor approval obtained
- [ ] Technical lead approval
- [ ] Product owner approval
- [ ] Database administrator approval
- [ ] All signatures collected

### Team Readiness
- [ ] Migration lead identified: ________________
- [ ] Database administrator: ________________
- [ ] Backup DBA: ________________
- [ ] Application developer: ________________
- [ ] DevOps engineer: ________________
- [ ] Support team lead: ________________
- [ ] On-call escalation: ________________

### Infrastructure Ready
- [ ] Production PostgreSQL server provisioned
- [ ] PostgreSQL 16+ installed and configured
- [ ] pgvector extension installed
- [ ] Sufficient disk space verified (3x current data size)
- [ ] Network connectivity tested
- [ ] Backup storage allocated (3x current data size)

### Communication Complete
- [ ] User notification sent (T-14 days)
- [ ] Reminder sent (T-7 days)
- [ ] Support team briefed
- [ ] Status page prepared
- [ ] Communication templates ready

### Documentation Ready
- [ ] This runbook printed and available
- [ ] Rollback procedures reviewed
- [ ] Emergency contact list updated
- [ ] Monitoring dashboards prepared
- [ ] Issue tracking sheet ready

---

## Task Group 6.1: Pre-Migration Preparation (T-2 Days)

**Responsible:** Database Administrator + DevOps
**Duration:** 4-6 hours

---

### Step 1: Production Backup

**CRITICAL:** This is the most important step. Do not proceed without verified backups.

**Backup Procedure:**

```bash
# 1. Create backup directory with timestamp
BACKUP_DIR="/backups/production-migration-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# 2. Dump production MongoDB
echo "Starting MongoDB backup at $(date)"
mongodump \
  --uri="$PRODUCTION_MONGODB_URL" \
  --db=nextcrm \
  --out="$BACKUP_DIR/mongodb-backup" \
  --gzip \
  --verbose

# Check exit code
if [ $? -eq 0 ]; then
  echo "✓ MongoDB backup completed successfully"
else
  echo "✗ MongoDB backup FAILED - DO NOT PROCEED"
  exit 1
fi

# 3. Verify backup integrity
echo "Verifying backup integrity..."
ls -lh "$BACKUP_DIR/mongodb-backup/nextcrm/"
COLLECTION_COUNT=$(ls "$BACKUP_DIR/mongodb-backup/nextcrm/" | grep ".bson.gz" | wc -l)
echo "Collections backed up: $COLLECTION_COUNT"

# Expected: 26+ collections
if [ "$COLLECTION_COUNT" -lt 26 ]; then
  echo "⚠️  WARNING: Expected at least 26 collections, found $COLLECTION_COUNT"
  echo "Review backup before proceeding"
fi

# 4. Verify backup size
BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo "Backup size: $BACKUP_SIZE"

# 5. Test backup restore to temporary database (optional but recommended)
echo "Testing backup restore..."
mongorestore \
  --uri="$TEST_MONGODB_URL" \
  --db=nextcrm_backup_test \
  --gzip \
  --drop \
  "$BACKUP_DIR/mongodb-backup/nextcrm" \
  --verbose

if [ $? -eq 0 ]; then
  echo "✓ Backup restore test successful"
  # Clean up test database
  mongosh "$TEST_MONGODB_URL" --eval "db.getSiblingDB('nextcrm_backup_test').dropDatabase()"
else
  echo "✗ Backup restore test FAILED - INVESTIGATE BEFORE PROCEEDING"
fi

# 6. Create backup checksum
cd "$BACKUP_DIR"
find . -type f -exec sha256sum {} \; > backup-checksums.txt
echo "✓ Checksums created: backup-checksums.txt"

# 7. Copy backup to secondary location
echo "Copying backup to secondary storage..."
rsync -av --progress "$BACKUP_DIR/" "/secondary-backup/production-migration-$(date +%Y%m%d-%H%M%S)/"

# 8. Document backup details
cat > "$BACKUP_DIR/backup-manifest.txt" <<EOF
Production MongoDB Backup
Date: $(date)
Backup Directory: $BACKUP_DIR
Backup Size: $BACKUP_SIZE
Collections: $COLLECTION_COUNT
MongoDB URI: $PRODUCTION_MONGODB_URL (credentials redacted)
Backup Method: mongodump --gzip
Verified: Yes
Secondary Copy: /secondary-backup/
EOF

echo "✓ Backup manifest created"
```

**Backup Verification Checklist:**

- [ ] Backup completed successfully (exit code 0)
- [ ] All 26+ collections present in backup
- [ ] Backup size reasonable (similar to database size)
- [ ] Backup restore tested successfully
- [ ] Checksums generated
- [ ] Secondary backup copy created
- [ ] Backup manifest documented
- [ ] Backup location saved: ________________

**Backup Success Criteria:**
- Zero errors during backup
- All collections backed up
- Restore test successful
- Multiple copies stored securely

**If Backup Fails:**
- Do NOT proceed with migration
- Investigate failure cause
- Retry backup
- Only proceed when backup verified successful

**Time Estimate:** 2-3 hours (depends on data size)

---

### Step 2: PostgreSQL Provisioning

**Production PostgreSQL Server Setup:**

**Server Specifications (based on staging + production scale):**

```bash
# Recommended specifications for production
# Adjust based on your actual data volume and load

CPU: 8+ cores
RAM: 32GB+
Disk: 500GB+ SSD (3x current MongoDB size)
Network: 1Gbps+
OS: Ubuntu 22.04 LTS or RHEL 8+
PostgreSQL: Version 16.x
```

**Installation Procedure:**

```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install PostgreSQL 16
sudo apt install -y postgresql-16 postgresql-contrib-16 postgresql-16-pgvector

# 3. Start and enable service
sudo systemctl start postgresql
sudo systemctl enable postgresql
sudo systemctl status postgresql
```

**Production PostgreSQL Configuration:**

Edit `/etc/postgresql/16/main/postgresql.conf`:

```conf
#------------------------------------------------------------------------------
# CONNECTIONS AND AUTHENTICATION
#------------------------------------------------------------------------------

max_connections = 200                   # Increased for production
superuser_reserved_connections = 5

#------------------------------------------------------------------------------
# RESOURCE USAGE (except WAL)
#------------------------------------------------------------------------------

# Memory Settings (for 32GB RAM server)
shared_buffers = 8GB                    # 25% of RAM
effective_cache_size = 24GB             # 75% of RAM
maintenance_work_mem = 2GB              # For large indexes
work_mem = 64MB                         # Per operation

# Checkpoint Settings
checkpoint_completion_target = 0.9
wal_buffers = 16MB
max_wal_size = 8GB
min_wal_size = 2GB

# Planner Settings (for SSD)
random_page_cost = 1.1
effective_io_concurrency = 200
seq_page_cost = 1.0

# Parallel Query
max_worker_processes = 8
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_parallel_maintenance_workers = 4

#------------------------------------------------------------------------------
# WRITE AHEAD LOG
#------------------------------------------------------------------------------

wal_level = replica                     # For potential replication
fsync = on
synchronous_commit = on
full_page_writes = on
wal_compression = on

#------------------------------------------------------------------------------
# QUERY TUNING
#------------------------------------------------------------------------------

default_statistics_target = 100
from_collapse_limit = 12
join_collapse_limit = 12

#------------------------------------------------------------------------------
# LOGGING
#------------------------------------------------------------------------------

logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_file_mode = 0600
log_rotation_age = 1d
log_rotation_size = 1GB

log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_statement = 'ddl'
log_duration = off
log_min_duration_statement = 100        # Log slow queries (>100ms)

log_connections = on
log_disconnections = on
log_hostname = off

log_checkpoints = on
log_lock_waits = on
log_temp_files = 0

#------------------------------------------------------------------------------
# AUTOVACUUM
#------------------------------------------------------------------------------

autovacuum = on
autovacuum_max_workers = 4
autovacuum_naptime = 30s
autovacuum_vacuum_threshold = 50
autovacuum_analyze_threshold = 50

#------------------------------------------------------------------------------
# CLIENT CONNECTION DEFAULTS
#------------------------------------------------------------------------------

timezone = 'UTC'
lc_messages = 'en_US.UTF-8'
lc_monetary = 'en_US.UTF-8'
lc_numeric = 'en_US.UTF-8'
lc_time = 'en_US.UTF-8'
```

**Security Configuration - pg_hba.conf:**

```conf
# TYPE  DATABASE        USER            ADDRESS                 METHOD

# Local connections
local   all             postgres                                peer
local   all             all                                     peer

# IPv4 local connections
host    all             all             127.0.0.1/32            scram-sha-256

# Production application server(s)
host    nextcrm         nextcrm         10.0.0.0/24             scram-sha-256
# Adjust IP range to match your application servers

# Monitoring/admin tools
host    all             postgres        10.0.1.0/24             scram-sha-256
# Adjust IP range to match your admin network

# Reject all other connections
host    all             all             0.0.0.0/0               reject
host    all             all             ::/0                    reject
```

**Restart PostgreSQL:**

```bash
sudo systemctl restart postgresql

# Verify configuration loaded
sudo -u postgres psql -c "SHOW shared_buffers;"
sudo -u postgres psql -c "SHOW max_connections;"
sudo -u postgres psql -c "SHOW effective_cache_size;"
```

**Create Production Database:**

```bash
# 1. Create database and user
sudo -u postgres psql <<'EOF'
-- Create database
CREATE DATABASE nextcrm
  WITH ENCODING 'UTF8'
       LC_COLLATE = 'en_US.UTF-8'
       LC_CTYPE = 'en_US.UTF-8'
       TEMPLATE template0;

-- Create user with strong password
CREATE USER nextcrm WITH ENCRYPTED PASSWORD 'GENERATE_STRONG_PASSWORD_HERE';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE nextcrm TO nextcrm;

-- Connect to database and grant schema privileges
\c nextcrm
GRANT ALL ON SCHEMA public TO nextcrm;
GRANT ALL ON ALL TABLES IN SCHEMA public TO nextcrm;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO nextcrm;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO nextcrm;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO nextcrm;
EOF

# 2. Enable extensions
sudo -u postgres psql -d nextcrm <<'EOF'
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Verify extensions
\dx
EOF
```

**Test Connection:**

```bash
# Save production PostgreSQL URL
export PRODUCTION_POSTGRESQL_URL="postgresql://nextcrm:PASSWORD@production-pg-host:5432/nextcrm"

# Test connection
psql "$PRODUCTION_POSTGRESQL_URL" -c "\conninfo"
psql "$PRODUCTION_POSTGRESQL_URL" -c "SELECT version();"
```

**Checklist:**
- [ ] PostgreSQL 16+ installed
- [ ] Configuration optimized for production
- [ ] pg_hba.conf configured securely
- [ ] Database and user created
- [ ] Extensions installed (vector, uuid-ossp, pg_stat_statements)
- [ ] Connection tested successfully
- [ ] Production PostgreSQL URL saved securely
- [ ] PostgreSQL credentials stored in secrets management system

**Time Estimate:** 2-3 hours

---

### Step 3: Schema Deployment

**Deploy PostgreSQL Schema Using Prisma:**

```bash
# 1. Navigate to application directory
cd /path/to/nextcrm-app

# 2. Create production .env file (if not exists)
cat > .env.production <<EOF
# Production PostgreSQL (for migration)
DATABASE_URL="$PRODUCTION_POSTGRESQL_URL"

# Other production environment variables
NODE_ENV=production
# ... (other vars)
EOF

# 3. Set DATABASE_URL for deployment
export DATABASE_URL="$PRODUCTION_POSTGRESQL_URL"

# 4. Verify Prisma schema is for PostgreSQL
grep 'provider.*=.*"postgresql"' prisma/schema.prisma

# 5. Deploy migrations to production
echo "Deploying Prisma migrations to production PostgreSQL..."
pnpm exec prisma migrate deploy

# Expected output:
# Prisma schema loaded from prisma/schema.prisma
# Datasource "db": PostgreSQL database "nextcrm", schema "public"
#
# 1 migration found in prisma/migrations
#
# Applying migration `20251105000000_init_postgresql`
#
# The following migration(s) have been applied:
#
# migrations/
#   └─ 20251105000000_init_postgresql/
#     └─ migration.sql
#
# All migrations have been successfully applied.
```

**Verify Schema Deployment:**

```bash
# 1. Verify table count
TABLE_COUNT=$(psql "$PRODUCTION_POSTGRESQL_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo "Tables created: $TABLE_COUNT"
# Expected: 36 (26 entity + 10 junction)

# 2. Verify key tables exist
psql "$PRODUCTION_POSTGRESQL_URL" -c "
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('Users', 'crm_Accounts', 'crm_Contacts', 'crm_Opportunities', 'crm_Contracts')
ORDER BY table_name;
"

# 3. Verify foreign key constraints
FK_COUNT=$(psql "$PRODUCTION_POSTGRESQL_URL" -t -c "
SELECT COUNT(*)
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
AND table_schema = 'public';
")
echo "Foreign key constraints: $FK_COUNT"

# 4. Verify indexes
INDEX_COUNT=$(psql "$PRODUCTION_POSTGRESQL_URL" -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';")
echo "Indexes created: $INDEX_COUNT"

# 5. Generate Prisma client
pnpm exec prisma generate

# 6. Verify schema with Prisma Studio (optional)
# pnpm exec prisma studio
# Open browser, verify structure (all tables empty)
```

**Schema Verification Checklist:**

- [ ] 36 tables created
- [ ] Key entity tables verified
- [ ] Foreign key constraints created
- [ ] Indexes created
- [ ] Extensions enabled
- [ ] Prisma client generated
- [ ] Schema structure verified

**If Schema Deployment Fails:**

```bash
# 1. Review error message
# 2. Check PostgreSQL logs
sudo tail -100 /var/log/postgresql/postgresql-16-main.log

# 3. If safe to retry, drop schema and redeploy
psql "$PRODUCTION_POSTGRESQL_URL" -c "DROP SCHEMA public CASCADE;"
psql "$PRODUCTION_POSTGRESQL_URL" -c "CREATE SCHEMA public;"
pnpm exec prisma migrate deploy

# 4. If errors persist, escalate to database team
```

**Time Estimate:** 30 minutes

---

### Step 4: Pre-Migration Final Checks

**Final Go/No-Go Verification (T-4 Hours):**

```bash
# 1. Verify both database connections
node -e "
const mongo = require('mongodb').MongoClient;
const { Client } = require('pg');

async function verify() {
  // MongoDB
  const mongoClient = await mongo.connect(process.env.PRODUCTION_MONGODB_URL);
  await mongoClient.db().admin().ping();
  console.log('✓ MongoDB connection verified');
  await mongoClient.close();

  // PostgreSQL
  const pgClient = new Client({ connectionString: process.env.PRODUCTION_POSTGRESQL_URL });
  await pgClient.connect();
  await pgClient.query('SELECT 1');
  console.log('✓ PostgreSQL connection verified');
  await pgClient.end();
}

verify().catch(console.error);
"

# 2. Verify disk space
df -h | grep -E "Filesystem|/var"
# Ensure sufficient free space (at least 3x database size)

# 3. Document baseline metrics
echo "=== Production Baseline Metrics ===" > /backups/production-baseline.txt
echo "Date: $(date)" >> /backups/production-baseline.txt
echo "" >> /backups/production-baseline.txt

# MongoDB record counts
mongosh "$PRODUCTION_MONGODB_URL" --quiet --eval "
  print('MongoDB Collection Counts:');
  db.getCollectionNames().forEach(function(col) {
    print(col + ': ' + db[col].countDocuments());
  })
" >> /backups/production-baseline.txt

# System resources
echo "" >> /backups/production-baseline.txt
echo "=== System Resources ===" >> /backups/production-baseline.txt
free -h >> /backups/production-baseline.txt
df -h >> /backups/production-baseline.txt

# 4. Verify migration scripts ready
pnpm migrate:mongo-to-postgres -- --help
pnpm validate:migration -- --help

# 5. Clean environment (no existing checkpoint)
if [ -f "migration-checkpoint.json" ]; then
  echo "⚠️  WARNING: Existing checkpoint file found"
  echo "Archive it before starting fresh migration:"
  mv migration-checkpoint.json "migration-checkpoint-archived-$(date +%Y%m%d-%H%M%S).json"
fi

# 6. Verify team availability
echo "=== Team Availability Check ===" | tee /tmp/team-check.txt
echo "Migration Lead: [Ready/Not Ready]" | tee -a /tmp/team-check.txt
echo "Database Admin: [Ready/Not Ready]" | tee -a /tmp/team-check.txt
echo "Developer: [Ready/Not Ready]" | tee -a /tmp/team-check.txt
echo "DevOps: [Ready/Not Ready]" | tee -a /tmp/team-check.txt
echo "" | tee -a /tmp/team-check.txt
echo "All team members must confirm ready before proceeding"
```

**Pre-Migration Checklist:**

- [ ] Production MongoDB backup verified
- [ ] Secondary backup copy exists
- [ ] PostgreSQL server ready and tested
- [ ] Schema deployed successfully
- [ ] Both database connections verified
- [ ] Sufficient disk space available (3x+)
- [ ] Baseline metrics documented
- [ ] Migration scripts tested and ready
- [ ] No existing checkpoint file
- [ ] All team members available and ready
- [ ] Communication sent to users (system offline notice)
- [ ] Rollback procedure reviewed and ready
- [ ] Emergency contacts list current
- [ ] Monitoring dashboards prepared

**GO/NO-GO Decision:**

**GO IF:**
- All checklist items complete
- All team members ready
- Backup verified successful
- No critical production issues

**NO-GO IF:**
- Any backup failures
- Team members unavailable
- Insufficient disk space
- Active production incidents
- Infrastructure concerns

**Decision:** [ ] GO   [ ] NO-GO

**Decided By:** __________________ **Time:** __________

---

## Task Group 6.2: Production Migration Execution

**This is it - the actual production migration.**

**Responsible:** Migration Lead (primary), Database Administrator (support)
**Duration:** Based on staging estimate

---

### Step 1: Application Shutdown

**Shut Down Production Application:**

```bash
# 1. Post "System Offline" message to status page
# (Use your status page tool)

# 2. Enable maintenance mode (if supported)
# Update environment variable or config file
echo "MAINTENANCE_MODE=true" >> .env.production

# 3. Stop application server(s)
# Method depends on your deployment
# Examples:

# Systemd service
sudo systemctl stop nextcrm

# PM2
pm2 stop all

# Docker
docker-compose down

# Kubernetes
kubectl scale deployment nextcrm --replicas=0

# 4. Verify application stopped
curl http://production-url/api/health
# Should fail or return maintenance message

# 5. Wait for active sessions to end
echo "Waiting 2 minutes for active sessions to complete..."
sleep 120

# 6. Verify no active MongoDB connections from app
mongosh "$PRODUCTION_MONGODB_URL" --eval "
  db.currentOp().inprog.forEach(function(op) {
    if (op.appName && op.appName.includes('nextcrm')) {
      print('WARNING: Active connection from app: ' + op.appName);
    }
  })
"

# 7. Document shutdown time
echo "Application shutdown completed at: $(date)" | tee /backups/migration-timeline.txt
```

**Verification:**

- [ ] Application stopped (no HTTP responses)
- [ ] Status page updated (maintenance mode visible)
- [ ] No active application connections to MongoDB
- [ ] Shutdown time documented: ____:____

---

### Step 2: Final Production Backup

**Take Final Backup Before Migration:**

```bash
# This is in addition to pre-migration backup
# Final backup just before migration starts

FINAL_BACKUP_DIR="/backups/production-final-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$FINAL_BACKUP_DIR"

echo "Taking final production backup at $(date)"
mongodump \
  --uri="$PRODUCTION_MONGODB_URL" \
  --db=nextcrm \
  --out="$FINAL_BACKUP_DIR/mongodb-backup" \
  --gzip \
  --verbose

# Verify backup
if [ $? -eq 0 ]; then
  echo "✓ Final backup completed at $(date)" | tee -a /backups/migration-timeline.txt
  echo "Final backup location: $FINAL_BACKUP_DIR" | tee -a /backups/migration-timeline.txt
else
  echo "✗ CRITICAL: Final backup FAILED"
  echo "DO NOT PROCEED - Investigate immediately"
  exit 1
fi
```

**Checklist:**

- [ ] Final backup completed successfully
- [ ] Backup location documented: ________________
- [ ] Backup time recorded: ____:____

---

### Step 3: Execute Production Migration

**Start Migration:**

```bash
# 1. Set environment variables
export PRODUCTION_MONGODB_URL="mongodb://..."
export PRODUCTION_POSTGRESQL_URL="postgresql://..."
export NODE_ENV=production

# 2. Start migration with comprehensive logging
MIGRATION_START_TIME=$(date +%Y%m%d-%H%M%S)
LOG_FILE="/backups/production-migration-$MIGRATION_START_TIME.log"

echo "=== Production Migration Started ===" | tee "$LOG_FILE"
echo "Start Time: $(date)" | tee -a "$LOG_FILE"
echo "MongoDB: $PRODUCTION_MONGODB_URL" | tee -a "$LOG_FILE"
echo "PostgreSQL: [host info only, not password]" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# 3. Run migration with output to both console and log
pnpm migrate:mongo-to-postgres 2>&1 | tee -a "$LOG_FILE"

# Migration will display real-time progress
# DO NOT INTERRUPT unless critical error
```

**Expected Console Output:**

```
🚀 NextCRM MongoDB → PostgreSQL Migration
==========================================

📋 Migration Plan:
   - Total tables: 36 (26 entity tables + 10 junction tables)
   - Batch size: 1000 records
   - Source: MongoDB [production]
   - Target: PostgreSQL [production]

⚠️  PRODUCTION MODE DETECTED
   This is a production migration. Checkpoint/resume enabled.

🔄 Phase 1: Independent Lookup Tables (7 tables)
   ✓ crm_Industry_Type (50 records) - 0.3s - 167 rec/s
   ✓ Documents_Types (10 records) - 0.1s - 100 rec/s
   ✓ invoice_States (8 records) - 0.1s - 80 rec/s
   ✓ system_Modules_Enabled (12 records) - 0.1s - 120 rec/s
   ✓ modulStatus (5 records) - 0.1s - 50 rec/s
   ✓ systemServices (3 records) - 0.1s - 30 rec/s
   ✓ gpt_models (4 records) - 0.1s - 40 rec/s

🔄 Phase 2: Core Entity Tables (5 tables)
   ✓ Users (1,250 records) - 8.5s - 147 rec/s
   ✓ MyAccount (1 record) - 0.1s - 10 rec/s
   ✓ Employees (45 records) - 0.5s - 90 rec/s
   ✓ ImageUpload (233 records) - 2.1s - 111 rec/s
   ✓ TodoList (890 records) - 7.2s - 124 rec/s

🔄 Phase 3: CRM Campaign and Opportunity Config (3 tables)
   ✓ crm_campaigns (15 records) - 0.2s - 75 rec/s
   ✓ crm_Opportunities_Sales_Stages (8 records) - 0.1s - 80 rec/s
   ✓ crm_Opportunities_Type (6 records) - 0.1s - 60 rec/s

🔄 Phase 4: CRM Core Tables (4 tables)
   ✓ crm_Accounts (15,340 records) - 3m 12s - 80 rec/s
   ✓ crm_Contacts (42,180 records) - 8m 45s - 80 rec/s
   ✓ crm_Leads (8,920 records) - 1m 52s - 80 rec/s
   ✓ crm_Contracts (3,210 records) - 45s - 71 rec/s

🔄 Phase 5: CRM Opportunities (1 table)
   🔄 crm_Opportunities
      Progress: [████████░░░░░░░░░░░░] 40% (20,000/50,000) | Speed: 75 rec/s | ETA: 6m 40s
```

**Monitoring During Migration:**

Open separate terminal sessions:

**Terminal 2 - PostgreSQL Activity:**
```bash
watch -n 5 'psql "$PRODUCTION_POSTGRESQL_URL" -c "
SELECT
  state,
  count(*),
  max(query_start) as latest_query
FROM pg_stat_activity
WHERE datname = '"'"'nextcrm'"'"'
GROUP BY state;
"'
```

**Terminal 3 - System Resources:**
```bash
watch -n 2 'echo "=== CPU & Memory ==="; top -bn1 | head -20; echo ""; echo "=== Disk Usage ==="; df -h | grep -E "Filesystem|/var"'
```

**Terminal 4 - Migration Progress Tracking:**
```bash
watch -n 30 'tail -30 "$LOG_FILE" | grep -E "Progress:|records|ETA:"'
```

**Terminal 5 - Error Monitoring:**
```bash
tail -f migration-errors.log
```

**Progress Tracking Spreadsheet:**

| Time | Phase | Table | Records | % Complete | Speed | Errors | Notes |
|------|-------|-------|---------|------------|-------|--------|-------|
| 08:00 | 1 | Lookups | 92/92 | 100% | 80 rec/s | 0 | ✓ |
| 08:05 | 2 | Users | 1250/1250 | 100% | 147 rec/s | 0 | ✓ |
| 08:30 | 4 | Accounts | 15340/15340 | 100% | 80 rec/s | 2 | OK |
| 08:45 | 4 | Contacts | 25000/42180 | 59% | 80 rec/s | 5 | In progress |
| ... | ... | ... | ... | ... | ... | ... | ... |

**Real-Time Issue Response:**

See detailed error handling procedures in "Step 4: Real-Time Monitoring" below.

**Checklist:**
- [ ] Migration started successfully
- [ ] Start time recorded: ____:____
- [ ] All monitoring terminals active
- [ ] Progress tracking sheet being updated
- [ ] Team monitoring channels open
- [ ] No immediate critical errors

---

### Step 4: Real-Time Monitoring and Issue Response

**Monitoring Responsibilities:**

**Migration Lead:**
- Watch main migration console output
- Track overall progress
- Make go/no-go decisions
- Coordinate team

**Database Administrator:**
- Monitor PostgreSQL performance
- Watch for resource issues
- Review any database errors
- Optimize if needed

**DevOps Engineer:**
- Monitor system resources
- Watch for infrastructure issues
- Manage backups and checkpoints

**Issue Response Decision Tree:**

```
[Issue Detected]
    |
    v
Is migration stopped/hung?
    |
    |-- Yes --> Severity: CRITICAL
    |           Action: Pause (Ctrl+C)
    |           Investigate immediately
    |           See "Critical Issues" section
    |
    |-- No --> Is error rate >1%?
               |
               |-- Yes --> Severity: HIGH
               |           Action: Continue monitoring closely
               |           Review error log every 5 minutes
               |           Prepare to pause if >5%
               |
               |-- No --> Is system resource >90%?
                          |
                          |-- Yes --> Severity: MEDIUM
                          |           Action: Reduce load if possible
                          |           Prepare to pause if >95%
                          |
                          |-- No --> Severity: LOW
                                     Action: Continue monitoring
                                     Document in notes
```

**Critical Issues - Immediate Action Required:**

#### Issue: Migration Stopped/Hung

**Symptoms:**
- No progress for >10 minutes
- Progress bar frozen
- No checkpoint updates

**Action:**
```bash
# 1. Check if process is alive
ps aux | grep migrate-mongo-to-postgres

# 2. Check system resources
top
free -h
df -h

# 3. Check database connections
psql "$PRODUCTION_POSTGRESQL_URL" -c "SELECT count(*) FROM pg_stat_activity;"
mongosh "$PRODUCTION_MONGODB_URL" --eval "db.serverStatus().connections"

# 4. If resources exhausted:
   # Option A: Free resources and let migration continue
   # Option B: Pause migration (Ctrl+C), address resources, resume

# 5. If database connection lost:
   # Wait for connection to restore
   # Migration should auto-retry
   # If doesn't resume in 5 minutes, pause and investigate

# 6. If unknown cause:
   # Pause migration (Ctrl+C)
   # Review logs
   # Consult with team
   # Resume when cause identified and resolved
```

#### Issue: Error Rate >5%

**Symptoms:**
- Migration continuing but many errors
- Error log growing rapidly
- Specific tables failing consistently

**Action:**
```bash
# 1. Review error patterns
tail -100 migration-errors.log | grep "Error:" | sort | uniq -c

# 2. Identify if systematic issue
#    - Same error type repeatedly = systematic
#    - Random errors = data quality issue

# 3. If systematic (e.g., all foreign key errors):
   # Pause migration (Ctrl+C)
   # Investigate root cause
   # Fix transformer logic if needed
   # Resume migration

# 4. If data quality issues:
   # Continue migration (errors will be logged)
   # Plan to fix post-migration
   # Monitor that error rate doesn't increase
```

#### Issue: Disk Space <10%

**Symptoms:**
```
df -h shows >90% usage
Warning: disk space low
```

**Action:**
```bash
# 1. URGENT - Pause migration immediately (Ctrl+C)

# 2. Free up space
# - Delete old log files
# - Remove temporary files
# - Archive old backups
# - Clear system caches

# 3. Verify enough space available
df -h

# 4. If sufficient space freed, resume
pnpm migrate:mongo-to-postgres

# 5. If cannot free enough space:
   # ESCALATE immediately
   # May need to:
   #   - Expand disk volume
   #   - Move to larger instance
   #   - Roll back and reschedule
```

#### Issue: Memory Exhaustion

**Symptoms:**
```
free -h shows swap usage increasing
System becoming slow/unresponsive
OOM killer messages in dmesg
```

**Action:**
```bash
# 1. Pause migration immediately (Ctrl+C)

# 2. Check memory usage
free -h
ps aux --sort=-%mem | head -20

# 3. Kill non-essential processes

# 4. Consider reducing batch size
# Edit scripts/migration/table-config.ts
# Reduce BATCH_SIZE from 1000 to 500

# 5. Resume migration
pnpm migrate:mongo-to-postgres
```

**Non-Critical Issues - Monitor and Document:**

- Individual record errors (will be logged)
- Temporary network blips (migration will retry)
- Minor performance fluctuations
- Warning messages (not errors)

**Checklist:**
- [ ] Monitoring procedures followed
- [ ] All issues documented in tracking sheet
- [ ] Critical issues resolved before proceeding
- [ ] Team kept informed of status

---

### Step 5: Migration Completion

**When Migration Finishes:**

```bash
# Expected final output:
🎉 Migration Complete!
   - Total records: 1,254,390
   - Duration: 26h 15m 42s
   - Speed: 13.27 records/second
   - Errors: 156 records (0.012%)

💾 Checkpoint file deleted (migration successful)
📊 Error details: migration-errors.log

Next steps:
  1. Run validation: pnpm validate:migration
  2. Review errors (if any)
  3. Test application
  4. Update DATABASE_URL
  5. Deploy application

=== Migration Timeline ===
Start: 2025-11-06 08:00:00
End:   2025-11-07 10:15:42
Duration: 26h 15m 42s

# Record completion time
echo "Migration completed at: $(date)" | tee -a /backups/migration-timeline.txt
```

**Immediate Post-Migration Actions:**

```bash
# 1. Verify checkpoint deleted (success indicator)
ls migration-checkpoint.json
# Should not exist

# 2. Archive migration log
mv "$LOG_FILE" "/backups/production-migration-completed-$(date +%Y%m%d).log"

# 3. Review error summary
tail -100 migration-errors.log
ERROR_COUNT=$(wc -l < migration-errors.log)
echo "Total error records: $ERROR_COUNT"

# 4. Quick sanity check on PostgreSQL
psql "$PRODUCTION_POSTGRESQL_URL" -c "
SELECT
  tablename,
  n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;
" | tee /backups/production-postgresql-counts.txt

# 5. Compare with baseline MongoDB counts
echo "=== Row Count Comparison ===" | tee /backups/count-comparison.txt
diff /backups/production-baseline.txt /backups/production-postgresql-counts.txt | tee -a /backups/count-comparison.txt
```

**Migration Completion Checklist:**

- [ ] Migration script completed successfully
- [ ] Checkpoint file deleted (indicates success)
- [ ] Migration logs archived
- [ ] End time recorded: ____:____
- [ ] Error count acceptable (<1% of records)
- [ ] Quick sanity check on record counts reasonable
- [ ] Team notified of completion

**Proceed to Task Group 6.3: Production Validation**

---

## Task Group 6.3: Production Validation

**CRITICAL:** Do not proceed to deployment without validation passing.

**Responsible:** Database Administrator + Migration Lead
**Duration:** 30-60 minutes

---

### Step 1: Execute Validation Script

```bash
# 1. Run comprehensive validation
VALIDATION_START=$(date +%Y%m%d-%H%M%S)
pnpm validate:migration 2>&1 | tee /backups/production-validation-$VALIDATION_START.log

# Validation will take 15-45 minutes depending on data size
```

**Expected Output:**

```
✅ NextCRM Migration Validation Report
=======================================

📊 Row Count Validation: PASS
   - All 36 tables have matching record counts
   - MongoDB total: 1,254,390 records
   - PostgreSQL total: 1,254,234 records (156 expected errors)

📋 Sample Record Validation: PASS
   - Validated 3,600 records across all tables
   - 99.98% field-level match
   - Minor discrepancies: 8 fields (documented below)

🔗 Referential Integrity Validation: PASS
   - All foreign keys resolve correctly
   - No orphaned records found
   - All junction tables valid

🔢 Data Type Conversion Validation: PASS
   - All DateTime conversions valid
   - All enum values valid
   - All JSONB structures valid

🎉 VALIDATION PASSED
   - Total records: 1,254,390
   - Match percentage: 99.98%
   - Validation duration: 34m 18s

✅ Safe to proceed with deployment!
```

**If Validation PASSES (>99% match):**

- [ ] Validation report saved: migration-validation-report.json
- [ ] Overall status: PASS
- [ ] Match percentage: ______% (must be >99%)
- [ ] All four validation layers passed
- [ ] Minor discrepancies documented (if any)
- [ ] **Decision: PROCEED to deployment**

**If Validation FAILS (<99% match or critical issues):**

```bash
# 1. Review validation report
cat migration-validation-report.json | jq .

# 2. Identify failure reasons
cat migration-validation-report.json | jq '.summary, .rowCountValidation, .referentialIntegrityValidation'

# 3. Assess severity
#    - Row count mismatch: CRITICAL
#    - Referential integrity broken: CRITICAL
#    - Sample record mismatch <99%: HIGH
#    - Data type issues: MEDIUM
```

**Critical Decision Point - Go/No-Go:**

**GO if:**
- Validation PASS overall
- Match percentage >99%
- All referential integrity checks pass
- Row counts match (accounting for known errors)
- Issues are documented and acceptable

**NO-GO if:**
- Validation FAIL overall
- Match percentage <99%
- Row count discrepancies unexplained
- Referential integrity broken
- Critical data corruption detected

**If NO-GO Decision:**

```bash
# INITIATE ROLLBACK PROCEDURE
# See: ROLLBACK_PROCEDURES.md

# DO NOT proceed to deployment
# Investigation and fixes required
```

**Validation Checklist:**

- [ ] Validation script executed successfully
- [ ] Validation report reviewed by team
- [ ] Row count validation: [PASS/FAIL]
- [ ] Sample record validation: [PASS/FAIL] - ____%
- [ ] Referential integrity: [PASS/FAIL]
- [ ] Data type validation: [PASS/FAIL]
- [ ] Overall decision: [GO / NO-GO]
- [ ] Decision maker: ______________ Time: ____:____

**If GO:**

- [ ] Validation report archived
- [ ] Proceed to Task Group 6.4 (Deployment)

**If NO-GO:**

- [ ] Rollback procedure initiated
- [ ] Investigation team assembled
- [ ] Root cause analysis begun
- [ ] Stakeholders notified

---

## Task Group 6.4: Production Deployment

**Prerequisite:** Validation PASSED with GO decision

**Responsible:** DevOps + Application Developer
**Duration:** 1-2 hours

---

### Step 1: Update Environment Variables

**Switch Application to PostgreSQL:**

```bash
# 1. Backup current .env
cp .env.production .env.production.mongodb-backup-$(date +%Y%m%d)

# 2. Update DATABASE_URL to PostgreSQL
cat > .env.production <<EOF
# PostgreSQL (migrated from MongoDB)
DATABASE_URL="$PRODUCTION_POSTGRESQL_URL"

# All other environment variables remain the same
NODE_ENV=production
NEXTAUTH_URL=https://your-production-url.com
NEXTAUTH_SECRET=your-nextauth-secret
# ... (other variables)
EOF

# 3. Verify environment file
grep DATABASE_URL .env.production
# Should show PostgreSQL connection string

# 4. Load environment
export $(cat .env.production | xargs)

# 5. Regenerate Prisma client for production
pnpm exec prisma generate

# 6. Verify Prisma client generated
ls -la node_modules/.prisma/client/
```

**Checklist:**

- [ ] Original .env backed up
- [ ] DATABASE_URL updated to PostgreSQL
- [ ] All other env variables preserved
- [ ] Environment file verified
- [ ] Prisma client regenerated

---

### Step 2: Application Startup

**Start Application with PostgreSQL:**

```bash
# 1. Start application (method depends on deployment)

# Option A: Systemd service
sudo systemctl start nextcrm
sudo systemctl status nextcrm

# Option B: PM2
pm2 start ecosystem.config.js --env production
pm2 logs nextcrm --lines 100

# Option C: Docker
docker-compose -f docker-compose.production.yml up -d
docker-compose logs -f --tail=100

# Option D: Kubernetes
kubectl scale deployment nextcrm --replicas=3
kubectl get pods -w

# 2. Wait for application to be healthy
echo "Waiting for application to start..."
sleep 30

# 3. Check application health
curl http://localhost:3000/api/health
# OR
curl https://your-production-url.com/api/health

# Expected: 200 OK with health check response
```

**Verify Application Started:**

```bash
# 1. Check process is running
ps aux | grep node

# 2. Check logs for errors
# (Method depends on your logging setup)
tail -100 /var/log/nextcrm/application.log
# OR
pm2 logs nextcrm --lines 100
# OR
kubectl logs -f deployment/nextcrm

# 3. Look for successful database connection
grep "Database connected" /var/log/nextcrm/application.log
# OR
grep "Prisma" /var/log/nextcrm/application.log

# 4. Verify no critical errors
grep -i "error" /var/log/nextcrm/application.log | grep -v "404" | tail -20
```

**Checklist:**

- [ ] Application started successfully
- [ ] Process running and healthy
- [ ] No critical errors in logs
- [ ] Database connection established
- [ ] Health check endpoint responding

---

### Step 3: Smoke Testing

**Critical Functionality Tests:**

```bash
# These tests can be automated or manual
# Adjust based on your testing setup
```

**Test 1: Authentication**

```bash
# Test user login
curl -X POST https://your-production-url.com/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test-password"}'

# Expected: 200 OK with auth token
```

**Test 2: Read Data**

```bash
# Test fetching accounts
curl -H "Authorization: Bearer $TOKEN" \
  https://your-production-url.com/api/crm/accounts?take=10

# Expected: 200 OK with account data

# Test fetching contacts
curl -H "Authorization: Bearer $TOKEN" \
  https://your-production-url.com/api/crm/contacts?take=10

# Expected: 200 OK with contact data

# Test fetching opportunities
curl -H "Authorization: Bearer $TOKEN" \
  https://your-production-url.com/api/crm/opportunity?take=10

# Expected: 200 OK with opportunity data
```

**Test 3: Write Data**

```bash
# Test creating new account
curl -X POST https://your-production-url.com/api/crm/accounts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Smoke Test Account",
    "status": "ACTIVE",
    "type": "Customer"
  }'

# Expected: 201 Created with new account data
# IMPORTANT: Note the account ID for cleanup later

# Test updating account
curl -X PUT https://your-production-url.com/api/crm/accounts/[ID] \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Smoke Test Account"}'

# Expected: 200 OK with updated data

# Clean up test account
curl -X DELETE https://your-production-url.com/api/crm/accounts/[ID] \
  -H "Authorization: Bearer $TOKEN"

# Expected: 204 No Content
```

**Test 4: Complex Operations**

```bash
# Test search functionality
curl -H "Authorization: Bearer $TOKEN" \
  "https://your-production-url.com/api/crm/accounts/search?q=test"

# Expected: 200 OK with search results

# Test relationships
curl -H "Authorization: Bearer $TOKEN" \
  "https://your-production-url.com/api/crm/accounts/[ID]/contacts"

# Expected: 200 OK with related contacts

# Test dashboard/reports
curl -H "Authorization: Bearer $TOKEN" \
  https://your-production-url.com/api/reports/dashboard

# Expected: 200 OK with dashboard data
```

**Manual UI Testing (if possible):**

- [ ] Login to application
- [ ] Navigate to Accounts list
- [ ] View an account detail page
- [ ] Navigate to Contacts list
- [ ] View a contact detail page
- [ ] Navigate to Opportunities
- [ ] View opportunity pipeline
- [ ] Check dashboard widgets
- [ ] Verify no visual errors
- [ ] Check browser console for errors

**Smoke Test Checklist:**

- [ ] Authentication working
- [ ] Read operations (list/view) working
- [ ] Write operations (create/update) working
- [ ] Delete operations working
- [ ] Search functionality working
- [ ] Relationships loading correctly
- [ ] Dashboard/reports working
- [ ] No critical errors in logs
- [ ] No critical errors in browser console

**If Smoke Tests FAIL:**

```bash
# 1. Review application logs immediately
tail -200 /var/log/nextcrm/application.log

# 2. Review PostgreSQL logs
sudo tail -200 /var/log/postgresql/postgresql-16-main.log

# 3. Check for common issues:
#    - Database connection errors
#    - Missing indexes causing slow queries
#    - Prisma client version mismatch
#    - Environment variable issues

# 4. If critical failure (cannot fix quickly):
   # INITIATE ROLLBACK
   # See: ROLLBACK_PROCEDURES.md

# 5. If minor issues:
   # Document issues
   # Apply fixes
   # Re-run smoke tests
   # Proceed when passing
```

**If Smoke Tests PASS:**

- [ ] All smoke tests passed
- [ ] Application fully functional
- [ ] Proceed to monitoring phase

---

### Step 4: Enable Production Traffic

**Gradually Enable User Access:**

```bash
# 1. Update status page
# - Change status from "Maintenance" to "Operational"
# - Post update: "Migration complete, system back online"

# 2. Remove maintenance mode
sed -i 's/MAINTENANCE_MODE=true/MAINTENANCE_MODE=false/' .env.production

# 3. Reload application (if needed)
# (Method depends on deployment)
sudo systemctl reload nextcrm
# OR
pm2 reload nextcrm
# OR just config reload, no restart needed

# 4. Verify application accessible
curl https://your-production-url.com
# Expected: Normal application response (not maintenance page)

# 5. Send notification to users
# See: COMMUNICATION_TEMPLATES.md - "System Back Online"
# - Email to all users
# - In-app notification (if supported)
# - Social media update (if applicable)

# 6. Monitor initial user activity
# Watch for:
# - Increased traffic
# - User reports of issues
# - Error rates
# - Performance metrics
```

**Checklist:**

- [ ] Status page updated
- [ ] Maintenance mode disabled
- [ ] Application accessible to users
- [ ] User notification sent
- [ ] Initial user activity monitored
- [ ] Go-live time recorded: ____:____

---

## Task Group 6.5: Post-Migration Monitoring (48 Hours)

**Critical Period:** First 48 hours after go-live

**Responsible:** Entire team on rotating shifts
**Duration:** Continuous for 48 hours

---

### Monitoring Plan

**Monitoring Shifts:**

| Shift | Time | Primary | Backup | Responsibilities |
|-------|------|---------|--------|------------------|
| Shift 1 | 06:00-14:00 | [Name] | [Name] | Monitor metrics, respond to issues |
| Shift 2 | 14:00-22:00 | [Name] | [Name] | Monitor metrics, respond to issues |
| Shift 3 | 22:00-06:00 | [Name] | [Name] | Monitor metrics, respond to issues (on-call) |

---

### Key Metrics to Track

**1. Application Health:**

```bash
# Monitor continuously
watch -n 30 'curl -s https://your-production-url.com/api/health | jq .'

# Key indicators:
# - HTTP status: Should be 200
# - Response time: < 500ms
# - Database status: Connected
# - Error count: < 5 per minute
```

**2. Database Performance:**

```bash
# Monitor PostgreSQL performance
watch -n 60 'psql "$PRODUCTION_POSTGRESQL_URL" -c "
SELECT
  count(*) as active_queries,
  max(now() - query_start) as longest_query,
  sum(CASE WHEN wait_event_type IS NOT NULL THEN 1 ELSE 0 END) as waiting_queries
FROM pg_stat_activity
WHERE datname = '"'"'nextcrm'"'"' AND state = '"'"'active'"'"';
"'

# Key indicators:
# - Active queries: < 50 (adjust based on load)
# - Longest query: < 10 seconds
# - Waiting queries: < 10
```

**3. Query Performance:**

```bash
# Check slow queries every hour
psql "$PRODUCTION_POSTGRESQL_URL" -c "
SELECT
  substring(query, 1, 100) as query_start,
  calls,
  mean_exec_time,
  max_exec_time,
  total_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;
" > /tmp/slow-queries-$(date +%Y%m%d-%H%M).txt

# Review for queries >1000ms mean time
```

**4. System Resources:**

```bash
# Monitor system resources
watch -n 30 '
echo "=== CPU & Memory ===";
top -bn1 | head -10;
echo "";
echo "=== Disk Usage ===";
df -h | grep -E "Filesystem|/var";
echo "";
echo "=== PostgreSQL Stats ===";
ps aux | grep postgres | head -5
'

# Key indicators:
# - CPU: < 80% average
# - Memory: < 85% used
# - Disk: < 80% used
# - PostgreSQL processes healthy
```

**5. Error Rates:**

```bash
# Monitor application error logs
watch -n 60 'tail -100 /var/log/nextcrm/application.log | grep -i error | tail -10'

# Monitor PostgreSQL error logs
watch -n 60 'sudo tail -100 /var/log/postgresql/postgresql-16-main.log | grep -i error | tail -10'

# Key indicators:
# - Application errors: < 10 per minute
# - Database errors: < 5 per minute
# - No repeated error patterns
```

**6. User Experience:**

```bash
# Monitor response times for key endpoints
while true; do
  echo "=== Response Time Tests ===" >> /tmp/response-times.log
  echo "Date: $(date)" >> /tmp/response-times.log

  # Test accounts list
  time curl -w "\nTime: %{time_total}s\n" -s https://your-production-url.com/api/crm/accounts \
    >> /tmp/response-times.log 2>&1

  # Test opportunities
  time curl -w "\nTime: %{time_total}s\n" -s https://your-production-url.com/api/crm/opportunity \
    >> /tmp/response-times.log 2>&1

  sleep 300  # Test every 5 minutes
done &

# Key indicators:
# - List endpoints: < 200ms
# - Detail endpoints: < 100ms
# - Search endpoints: < 500ms
```

---

### Issue Response Procedures

**Issue Severity Classification:**

**P1 - Critical (Immediate Response):**
- Application down/inaccessible
- Data corruption detected
- Major functionality broken
- Database connection failures
- >50% of users affected

**P2 - High (Response within 15 minutes):**
- Significant performance degradation
- Important feature not working
- Repeated errors affecting users
- 10-50% of users affected

**P3 - Medium (Response within 1 hour):**
- Minor performance issues
- Non-critical feature issues
- Sporadic errors
- <10% of users affected

**P4 - Low (Document and address next business day):**
- Minor UI issues
- Isolated errors
- Enhancement requests from users

---

**Response Playbook:**

### P1 Issue Response

```bash
# 1. IMMEDIATE: Alert entire team
# - Post in emergency Slack channel
# - Call primary and backup on-call

# 2. Assess situation (within 5 minutes)
# - What is broken?
# - How many users affected?
# - Is data at risk?

# 3. Decision: Fix forward or rollback?
#
# Fix Forward If:
# - Issue is well-understood
# - Fix can be applied quickly (<30 minutes)
# - No data corruption
# - Rollback would cause more disruption
#
# Rollback If:
# - Issue is complex/unknown cause
# - Data corruption suspected
# - Cannot fix within 30 minutes
# - User impact is severe

# 4. If Rollback Decision:
   # See: ROLLBACK_PROCEDURES.md
   # Execute immediately

# 5. If Fix Forward:
   # a. Identify root cause
   # b. Apply fix
   # c. Verify fix resolves issue
   # d. Monitor for recurrence

# 6. Post-incident:
   # - Document incident
   # - Root cause analysis
   # - Update runbooks
```

### Common Post-Migration Issues

**Issue: Slow Queries**

**Detection:**
```sql
-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC;
```

**Resolution:**
```sql
-- 1. Analyze specific slow query
EXPLAIN (ANALYZE, BUFFERS) [SLOW_QUERY_HERE];

-- 2. Check if indexes are being used
-- Look for "Seq Scan" (bad) vs "Index Scan" (good)

-- 3. Add missing index if needed
CREATE INDEX CONCURRENTLY idx_name ON table_name (column_name);

-- 4. Update table statistics
ANALYZE table_name;

-- 5. Verify improvement
-- Re-run EXPLAIN ANALYZE
```

**Issue: Connection Pool Exhaustion**

**Detection:**
```sql
SELECT count(*) FROM pg_stat_activity WHERE datname = 'nextcrm';
-- If near max_connections limit
```

**Resolution:**
```bash
# 1. Identify connection source
psql "$PRODUCTION_POSTGRESQL_URL" -c "
SELECT application_name, count(*)
FROM pg_stat_activity
WHERE datname = 'nextcrm'
GROUP BY application_name;
"

# 2. Kill idle connections
psql "$PRODUCTION_POSTGRESQL_URL" -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
AND state_change < now() - interval '10 minutes';
"

# 3. If application is holding too many connections:
   # Restart application to reset pool
   # Or adjust Prisma connection pool settings

# 4. Increase max_connections if needed (requires restart)
```

**Issue: Data Inconsistency Reported**

**Detection:**
- User reports data missing or incorrect
- Record counts don't match expected

**Resolution:**
```bash
# 1. Verify specific data
# Compare PostgreSQL to MongoDB backup

# Example: Check specific account
mongosh "mongodb://..." --eval "db.crm_Accounts.findOne({_id: ObjectId('ACCOUNT_ID')})"
psql "$PRODUCTION_POSTGRESQL_URL" -c "SELECT * FROM crm_Accounts WHERE id = 'UUID';"

# 2. If data is actually missing:
   # a. Check migration-errors.log for that record
   # b. If record failed migration, fix data and re-migrate record
   # c. If record was migrated, investigate why missing now

# 3. If data is incorrect:
   # a. Check transformation logic
   # b. Correct data in PostgreSQL
   # c. Document issue for post-migration review

# 4. If widespread issue:
   # Consider rollback (see ROLLBACK_PROCEDURES.md)
```

---

### Monitoring Checklist (Per Shift)

**Every Hour:**
- [ ] Check application health endpoint
- [ ] Review slow query log
- [ ] Check error logs (app and database)
- [ ] Verify response times acceptable
- [ ] Review user-reported issues
- [ ] Update monitoring dashboard

**Every 4 Hours:**
- [ ] Generate performance report
- [ ] Review system resource trends
- [ ] Check for any degradation patterns
- [ ] Brief next shift on any issues
- [ ] Update status document

**Every 12 Hours:**
- [ ] Comprehensive health check
- [ ] Review all metrics against baselines
- [ ] Team sync meeting
- [ ] Update stakeholders on status

**48-Hour Milestone:**
- [ ] Complete post-migration health report
- [ ] Declare migration success (if stable)
- [ ] Reduce monitoring intensity to normal
- [ ] Plan MongoDB archival

---

### Success Criteria (48 Hours)

**Migration considered successful if:**

- [ ] Application uptime >99.9% (< 1 hour total downtime)
- [ ] No P1 incidents
- [ ] <3 P2 incidents (all resolved)
- [ ] Query performance meets targets (<100ms simple queries)
- [ ] No data corruption issues
- [ ] User-reported issues <10 (and all addressed)
- [ ] System resources stable (<80% CPU, <85% memory)
- [ ] No error rate spikes (< 1 error per 1000 requests)

**If Success Criteria Met:**

- [ ] Migration declared successful
- [ ] Proceed to Task Group 6.6 (Completion and Cleanup)
- [ ] Reduce monitoring to normal operations level

**If Success Criteria NOT Met:**

- [ ] Extend intensive monitoring period
- [ ] Address outstanding issues
- [ ] Re-assess daily until criteria met
- [ ] If unresolvable issues, consider rollback

---

## Task Group 6.6: Migration Completion and Cleanup

**Prerequisite:** 48-hour monitoring period completed successfully

**Responsible:** Migration Lead + Database Administrator
**Duration:** 2-3 hours

---

### Step 1: Document Final Results

**Create Comprehensive Migration Report:**

```markdown
# Production Migration Final Report

**Migration Date:** 2025-11-06 to 2025-11-07
**Go-Live Date:** 2025-11-07 10:15 AM
**Report Date:** 2025-11-09
**Status:** ✅ SUCCESS

## Executive Summary

The production migration from MongoDB to PostgreSQL completed successfully with 99.98% data integrity. The application has been stable for 48 hours post-migration with no critical incidents. All performance targets met or exceeded.

## Migration Statistics

### Timeline
- Preparation: 6 hours
- Application Shutdown: 10:00 AM, Nov 6
- Migration Execution: 26 hours 15 minutes
- Validation: 34 minutes
- Deployment: 1 hour 30 minutes
- Go-Live: 10:15 AM, Nov 7
- **Total Elapsed:** 34 hours 15 minutes

### Data Migration
- Total Records Migrated: 1,254,390
- Total Tables: 36 (26 entity + 10 junction)
- Migration Speed: 13.27 records/second
- Database Size: MongoDB 12.3GB → PostgreSQL 11.8GB
- Data Integrity: 99.98%
- Migration Errors: 156 records (0.012%)

### Validation Results
- Row Count Match: 100% (accounting for known errors)
- Sample Record Match: 99.98%
- Referential Integrity: 100% PASS
- Data Type Conversion: 100% PASS
- Overall Validation: ✅ PASS

## Performance Results

### Query Performance (48-hour average)
- Simple list queries: 35-75ms (Target: <100ms) ✅
- Single record fetch: 8-15ms (Target: <20ms) ✅
- Complex joins: 150-280ms (Target: <300ms) ✅
- Full-text search: 120-200ms (Target: <200ms) ✅
- Dashboard loads: 250-400ms (Target: <500ms) ✅

### System Stability
- Application Uptime: 99.95% (12 minutes planned restart)
- Average Response Time: 145ms
- Error Rate: 0.008% (8 errors per 100,000 requests)
- Database Connection Pool: Stable (avg 25/200 connections)

### Resource Utilization
- PostgreSQL CPU: Average 35%, Peak 68%
- PostgreSQL Memory: Average 12GB/32GB (38%), Stable
- Disk I/O: Normal, no bottlenecks
- Network: Stable throughout

## Issues and Resolutions

### Migration Phase Issues

#### Issue 1: Slow Migration of crm_Contacts Table
- **Severity:** Medium
- **When:** Hour 18 of migration
- **Cause:** Large table (42,000+ records) with JSONB transformation
- **Impact:** Added 2 hours to migration time
- **Resolution:** None needed, completed successfully
- **Prevention:** Expected based on staging, accounted for in timeline

#### Issue 2: 156 Records Failed Migration
- **Severity:** Low
- **When:** Throughout migration
- **Cause:** Data quality issues (null foreign keys, invalid enums)
- **Impact:** 0.012% of records
- **Resolution:** Documented in migration-errors.log, fixed post-migration
- **Prevention:** Enhanced data quality checks in application

### Post-Migration Issues

#### Issue 1: Slow Dashboard Load (First 6 Hours)
- **Severity:** P2
- **When:** Hours 1-6 post-launch
- **Cause:** Missing index on crm_Opportunities.sales_stage
- **Impact:** Dashboard loads 2-3 seconds (vs target <500ms)
- **Resolution:** Added index, immediate improvement
- **Prevention:** Enhanced index strategy validation

#### Issue 2: User Report of Missing Contact
- **Severity:** P3
- **When:** 24 hours post-launch
- **Cause:** User error (looking in wrong account)
- **Impact:** None, data was correct
- **Resolution:** User training, no system issue
- **Prevention:** None needed

### Summary
- Total Issues: 4 (2 during migration, 2 post-migration)
- P1 (Critical): 0
- P2 (High): 1 (resolved in 30 minutes)
- P3 (Medium): 3 (all resolved)

## Lessons Learned

### What Went Well
1. ✅ Checkpoint/resume system critical for long migration
2. ✅ Staging migration accurately predicted production timeline
3. ✅ Team coordination and communication excellent
4. ✅ Validation script caught all data integrity issues
5. ✅ Monitoring dashboards provided great visibility
6. ✅ Rollback plan gave confidence (though not needed)

### What Could Be Improved
1. 🔸 Add more comprehensive index strategy in initial deployment
2. 🔸 Enhance progress estimation for JSONB transformations
3. 🔸 Include more detailed user communication about expected changes
4. 🔸 Add automated smoke tests to runbook
5. 🔸 Create more granular monitoring alerts

### Surprises
1. PostgreSQL slightly smaller than MongoDB (better compression)
2. Query performance exceeded expectations (20-30% faster than staging)
3. User adoption faster than expected (no resistance to change)
4. Zero connection pool issues despite higher concurrency

## Benefits Realized

### Immediate Benefits
- ✅ Improved query performance (30% faster on average)
- ✅ Better data integrity (foreign key constraints enforced)
- ✅ Enhanced monitoring capabilities
- ✅ Reduced database storage (11.8GB vs 12.3GB)

### Expected Benefits (Next 30 Days)
- Advanced reporting capabilities
- Complex query optimization
- Full-text search improvements
- pgvector integration for AI features

## Future Recommendations

### Short-Term (Next 30 Days)
1. Monitor query performance, add indexes as needed
2. Review and fix 156 failed record migrations
3. Optimize slow queries identified in first week
4. Enhanced data quality validation in application
5. User training on any UI/UX changes

### Medium-Term (Next 90 Days)
1. Implement advanced PostgreSQL features (materialized views)
2. Archive MongoDB data after 60-day retention period
3. Decommission MongoDB servers
4. Integrate pgvector for AI/RAG features (Phase 2)
5. Comprehensive performance tuning

### Long-Term (Next 6 Months)
1. Evaluate PostgreSQL replication for HA
2. Implement advanced monitoring with pg_stat_statements
3. Optimize for larger data volumes as system grows
4. Consider read replicas if needed

## Stakeholder Feedback

### Users
- 92% reported no issues
- 5% reported minor confusion (expected with any change)
- 3% reported issues (all resolved, mostly user error)
- Overall satisfaction: Positive

### Development Team
- Prisma abstraction worked perfectly
- Minimal application code changes needed
- Better development experience with relational model

### Operations Team
- PostgreSQL monitoring tools superior to MongoDB
- Query optimization clearer with EXPLAIN ANALYZE
- Incident response easier with better logging

## Financial Impact

### Costs
- Migration effort: ~200 hours (team time)
- Infrastructure: $500/month PostgreSQL server
- Downtime: 34 hours (off-peak, minimal user impact)

### Savings (Projected Annual)
- Reduced database hosting: $2,400/year
- Improved performance = higher user satisfaction
- Better scalability for future growth

### ROI
- Payback period: ~6 months
- Long-term: Significant (enables Phase 2 AI features)

## Conclusion

The production migration from MongoDB to PostgreSQL was a complete success. All goals achieved, all success criteria met, and the system is now running on a more robust, performant, and feature-rich database platform.

The migration establishes a solid foundation for NextCRM's evolution into an enterprise-grade, AI-powered CRM platform.

**Approved By:**

Migration Lead: __________________ Date: __________
Database Administrator: __________________ Date: __________
Technical Lead: __________________ Date: __________
Product Owner: __________________ Date: __________

---

## Appendices

### A. Detailed Metrics
[Attach detailed performance metrics, query logs, monitoring data]

### B. Error Log Analysis
[Attach analysis of migration-errors.log]

### C. User Feedback
[Attach user survey results, support ticket summary]

### D. Technical Artifacts
[Attach migration logs, validation reports, configuration files]
```

**Report Checklist:**

- [ ] Migration report completed
- [ ] All statistics documented
- [ ] Issues analyzed thoroughly
- [ ] Lessons learned captured
- [ ] Recommendations documented
- [ ] Stakeholder feedback collected
- [ ] Financial impact assessed
- [ ] Sign-offs obtained

---

### Step 2: MongoDB Archival

**Retain MongoDB for 60 Days:**

```bash
# 1. Document MongoDB retention period
cat > /backups/mongodb-retention-policy.txt <<EOF
MongoDB Archival Policy
=======================

Migration Date: $(date)
Retention Period: 60 days (until $(date -d '+60 days'))
Reason: Safety net in case issues discovered

Actions:
1. Keep MongoDB server running (read-only)
2. Daily backups for retention period
3. After 60 days: Archive and decommission

MongoDB Server: [hostname]
Connection: [connection string]
EOF

# 2. Make MongoDB read-only (optional but recommended)
# Prevents accidental writes
mongosh "$PRODUCTION_MONGODB_URL" --eval "
  db.adminCommand({
    setParameter: 1,
    notablescan: 1  // Prevents full table scans
  })
"

# Or more restrictive: revoke write permissions
mongosh "$PRODUCTION_MONGODB_URL" --eval "
  db.revokeRolesFromUser('nextcrm', [{role: 'readWrite', db: 'nextcrm'}]);
  db.grantRolesToUser('nextcrm', [{role: 'read', db: 'nextcrm'}]);
"

# 3. Set up daily MongoDB backups (safety net)
cat > /etc/cron.daily/mongodb-backup-retention <<'EOF'
#!/bin/bash
BACKUP_DIR="/backups/mongodb-retention-$(date +%Y%m%d)"
mongodump --uri="$PRODUCTION_MONGODB_URL" --db=nextcrm --out="$BACKUP_DIR" --gzip
# Keep last 10 backups
ls -t /backups/mongodb-retention-* | tail -n +11 | xargs rm -rf
EOF
chmod +x /etc/cron.daily/mongodb-backup-retention

# 4. Schedule MongoDB decommissioning
cat > /tmp/mongodb-decommission-reminder.txt <<EOF
REMINDER: MongoDB Decommissioning

Date to Decommission: $(date -d '+60 days')

Steps to take on that date:
1. Verify PostgreSQL stable for 60 days ✓
2. Verify no rollback needed ✓
3. Create final MongoDB archive
4. Stop MongoDB service
5. Archive MongoDB data to long-term storage
6. Decommission MongoDB server
7. Update documentation

Set calendar reminder for $(date -d '+60 days')
EOF

# Send reminder email or calendar invite
```

**MongoDB Retention Checklist:**

- [ ] MongoDB retention policy documented
- [ ] MongoDB set to read-only (optional)
- [ ] Daily backup script set up
- [ ] Decommissioning date scheduled (60 days)
- [ ] Team aware of retention policy

---

### Step 3: Documentation Updates

**Update Technical Documentation:**

```bash
# 1. Update README.md
cat >> README.md <<'EOF'

## Database

NextCRM uses PostgreSQL 16 for data persistence.

**Connection:**
```bash
DATABASE_URL="postgresql://user:password@host:5432/nextcrm"
```

**Schema Management:**
- Managed by Prisma ORM
- Run migrations: `pnpm exec prisma migrate deploy`
- View schema: `pnpm exec prisma studio`

**Note:** Previously used MongoDB. Migrated to PostgreSQL on 2025-11-07.
EOF

# 2. Update .env.example
sed -i 's#DATABASE_URL="mongodb://.*"#DATABASE_URL="postgresql://username:password@localhost:5432/nextcrm"#' .env.example

# 3. Update INSTALL.md or DEPLOYMENT.md
# Add PostgreSQL requirements

# 4. Update docker-compose.yml (if used)
# Replace MongoDB service with PostgreSQL

# 5. Update CI/CD configuration
# Update test database from MongoDB to PostgreSQL

# 6. Update API documentation (if needed)
# No changes needed if using Prisma (abstraction layer)

# 7. Archive migration documentation
mkdir -p docs/migrations/2025-11-postgresql
cp agent-os/specs/2025-11-05-postgresql-migration/runbooks/* docs/migrations/2025-11-postgresql/
```

**Documentation Update Checklist:**

- [ ] README.md updated
- [ ] .env.example updated
- [ ] Installation guide updated
- [ ] Deployment guide updated
- [ ] Docker configuration updated (if applicable)
- [ ] CI/CD configuration updated
- [ ] API documentation reviewed
- [ ] Migration documentation archived

---

### Step 4: Team Knowledge Transfer

**Conduct Post-Migration Knowledge Sharing:**

```markdown
# Post-Migration Knowledge Transfer Session

**Date:** [Schedule within 1 week of migration completion]
**Duration:** 2 hours
**Attendees:** All team members + stakeholders

## Agenda

### Part 1: Migration Review (30 minutes)
- What was migrated (MongoDB → PostgreSQL)
- Timeline and key milestones
- Issues encountered and how resolved
- Final results and metrics

### Part 2: PostgreSQL for Developers (45 minutes)
- PostgreSQL vs MongoDB differences
- How Prisma abstracts database differences
- Query performance best practices
- Using EXPLAIN ANALYZE for optimization
- New capabilities (foreign keys, transactions, views)

### Part 3: Operations and Monitoring (30 minutes)
- PostgreSQL monitoring tools
- Log locations and how to read them
- Common issues and troubleshooting
- Backup and restore procedures
- Performance tuning basics

### Part 4: Q&A and Future Plans (15 minutes)
- Questions from team
- Upcoming Phase 2 (AI/RAG features)
- How to contribute to database optimization

## Training Materials
- [ ] Slide deck created
- [ ] Demo environment prepared
- [ ] Hands-on exercises
- [ ] Reference cheat sheet
- [ ] Recording for future reference
```

**Knowledge Transfer Checklist:**

- [ ] Training session scheduled
- [ ] All team members invited
- [ ] Training materials prepared
- [ ] Demo environment set up
- [ ] Session recorded for future team members
- [ ] Follow-up Q&A channel created

---

### Step 5: Stakeholder Communication

**Send Migration Completion Announcement:**

See: `COMMUNICATION_TEMPLATES.md` - "Migration Complete"

```markdown
Subject: ✅ NextCRM Database Migration Successfully Completed

Dear NextCRM Users,

We're pleased to announce that our database migration to PostgreSQL has been successfully completed. The system has been stable and performing excellently for the past 48 hours.

**What Changed:**
- Backend database migrated from MongoDB to PostgreSQL
- Improved performance and reliability
- Foundation for upcoming AI features

**What Stayed the Same:**
- All your data (zero data loss)
- The user interface you know
- All features and workflows

**What You Might Notice:**
- Faster page loads and searches
- More responsive application overall
- Improved stability

**Benefits You'll See:**
- Better performance (30% faster on average)
- Enhanced reliability
- New features coming soon (powered by PostgreSQL)

**Thank You:**
Thank you for your patience during the maintenance window. If you notice any issues or have questions, please contact support.

**Next Steps:**
Over the coming weeks, we'll be rolling out new features enabled by this migration, including enhanced reporting and AI-powered insights.

Best regards,
The NextCRM Team

---
Questions? Email support@nextcrm.com
```

**Communication Checklist:**

- [ ] Completion announcement drafted
- [ ] Announcement sent to all users
- [ ] Posted to status page
- [ ] Social media update (if applicable)
- [ ] Blog post published (optional)
- [ ] Press release (if applicable for major clients)

---

## Migration Officially Complete

**Final Sign-Off:**

- [ ] All data migrated successfully (99.98% integrity)
- [ ] Validation passed
- [ ] Application stable for 48+ hours
- [ ] All issues resolved
- [ ] Documentation updated
- [ ] Team trained
- [ ] Stakeholders informed
- [ ] MongoDB archived with retention policy
- [ ] Post-migration report completed and approved

**Migration Status:** ✅ **COMPLETE**

**Completion Date:** __________
**Signed:** __________________ (Migration Lead)
**Signed:** __________________ (Technical Lead)
**Signed:** __________________ (Product Owner)

---

**Congratulations! The PostgreSQL migration is complete. NextCRM now has a solid foundation for future growth and AI-powered features.**

**Next Phase:** Phase 2 - AI/RAG Features with pgvector (Q2 2025)

---

## Appendix A: Emergency Contacts

| Role | Name | Phone | Email | Hours |
|------|------|-------|-------|-------|
| Migration Lead | [Name] | [Phone] | [Email] | 24/7 during migration |
| Database Admin | [Name] | [Phone] | [Email] | 24/7 during migration |
| Backup DBA | [Name] | [Phone] | [Email] | On-call |
| DevOps Lead | [Name] | [Phone] | [Email] | 24/7 during migration |
| CTO/Technical Director | [Name] | [Phone] | [Email] | Escalation only |
| Product Owner | [Name] | [Phone] | [Email] | Business escalation |

**Escalation Path:**
1. On-duty engineer → Migration Lead
2. Migration Lead → Database Admin + DevOps
3. If unresolved in 30 min → CTO/Technical Director
4. For business decisions → Product Owner

---

## Appendix B: Quick Reference Commands

```bash
# Check application status
curl https://your-production-url.com/api/health

# Check PostgreSQL connections
psql "$PRODUCTION_POSTGRESQL_URL" -c "SELECT count(*) FROM pg_stat_activity WHERE datname='nextcrm';"

# Check slow queries
psql "$PRODUCTION_POSTGRESQL_URL" -c "SELECT query, mean_exec_time FROM pg_stat_statements WHERE mean_exec_time > 100 ORDER BY mean_exec_time DESC LIMIT 10;"

# Check database size
psql "$PRODUCTION_POSTGRESQL_URL" -c "SELECT pg_size_pretty(pg_database_size('nextcrm'));"

# Check table sizes
psql "$PRODUCTION_POSTGRESQL_URL" -c "SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables WHERE schemaname='public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 10;"

# Kill idle connections
psql "$PRODUCTION_POSTGRESQL_URL" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state='idle' AND state_change < now() - interval '10 minutes';"

# Check index usage
psql "$PRODUCTION_POSTGRESQL_URL" -c "SELECT schemaname, tablename, indexname, idx_scan FROM pg_stat_user_indexes WHERE schemaname='public' ORDER BY idx_scan DESC LIMIT 20;"

# Check replication lag (if using replication)
psql "$PRODUCTION_POSTGRESQL_URL" -c "SELECT * FROM pg_stat_replication;"

# Vacuum analyze (if needed)
psql "$PRODUCTION_POSTGRESQL_URL" -c "VACUUM ANALYZE;"
```

---

**End of Phase 6 Production Runbook**

This document represents the culmination of the PostgreSQL migration project. Keep this runbook updated based on your actual production migration experience for future reference and similar projects.
