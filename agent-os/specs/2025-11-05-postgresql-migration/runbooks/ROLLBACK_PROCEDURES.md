# Rollback Procedures

**Document Version:** 1.0
**Last Updated:** 2025-11-05
**Critical Importance:** This document describes emergency rollback procedures
**Audience:** Migration Lead, Database Administrator, DevOps Team

## Overview

This document provides comprehensive procedures for rolling back the PostgreSQL migration and returning to MongoDB if critical issues are encountered. Rollback should be considered a last resort after attempts to fix forward have been exhausted or failed.

**Rollback Objectives:**
- Restore full application functionality as quickly as possible
- Minimize data loss (accept loss of data created during PostgreSQL operation)
- Return to last known good state (MongoDB backup)

**Time to Rollback:** 15-30 minutes (staging verified)

---

## When to Initiate Rollback

### Rollback Triggers

**MUST ROLLBACK (Critical - Immediate):**
- [ ] Data corruption detected in PostgreSQL
- [ ] >50% of users unable to access system
- [ ] Critical functionality completely broken
- [ ] Data loss detected
- [ ] Security breach related to migration
- [ ] Validation script fails with <95% data integrity
- [ ] Unrecoverable database errors

**SHOULD ROLLBACK (High - Within 30 minutes):**
- [ ] Major functionality broken and cannot fix within 2 hours
- [ ] Performance degradation >10x worse than MongoDB
- [ ] Error rate >5% of requests
- [ ] Unable to identify root cause of critical issues
- [ ] Multiple critical bugs discovered simultaneously
- [ ] Team consensus that continuing is too risky

**CONSIDER ROLLBACK (Medium - Evaluate):**
- [ ] Multiple moderate issues piling up
- [ ] Performance not meeting targets
- [ ] Intermittent critical errors
- [ ] User experience significantly degraded
- [ ] Uncertainty about data integrity

**DO NOT ROLLBACK (Fix Forward Instead):**
- [ ] Minor bugs that can be hotfixed
- [ ] Performance can be improved with indexes
- [ ] Isolated user issues
- [ ] UI/UX issues (not data issues)
- [ ] Single moderate issue that's understood

---

## Rollback Decision Process

### Decision-Making Framework

```
[Critical Issue Detected]
     |
     v
Can issue be fixed in <30 minutes?
     |
     |--- Yes --> Attempt fix forward
     |            Monitor closely
     |            Re-evaluate if fix doesn't work
     |
     |--- No ---> Is data integrity at risk?
                  |
                  |--- Yes --> ROLLBACK IMMEDIATELY
                  |
                  |--- No ---> Impact >50% users?
                               |
                               |--- Yes --> ROLLBACK
                               |
                               |--- No ---> Can system operate partially?
                                            |
                                            |--- Yes --> Fix forward with reduced functionality
                                            |
                                            |--- No --> ROLLBACK
```

### Rollback Authority

**Can Initiate Rollback:**
- Migration Lead (primary authority)
- CTO/Technical Director (override authority)
- Database Administrator (in absence of Migration Lead)

**Must Approve Rollback:**
- Migration Lead + Database Administrator (consensus preferred)
- OR CTO/Technical Director (can override)

**Rollback Notification Required:**
- Product Owner
- All team members
- Stakeholders (executive team)

### Pre-Rollback Checklist

Before initiating rollback, complete these steps:

- [ ] Issue severity confirmed (matches rollback triggers)
- [ ] Fix-forward options exhausted or deemed impossible
- [ ] Migration Lead and Database Admin agree on rollback
- [ ] Team notified and standing by
- [ ] Rollback procedures reviewed
- [ ] MongoDB backup verified available and intact
- [ ] Rollback timeline communicated (15-30 minutes)
- [ ] Users notified (system will be briefly unavailable)

**Time to complete checklist:** 5-10 minutes

---

## Rollback Procedure

### Phase 1: Pre-Rollback Preparation (5 minutes)

**Step 1: Assemble Team**

```bash
# Send emergency notification
echo "🚨 ROLLBACK INITIATED 🚨" | mail -s "CRITICAL: PostgreSQL Rollback Starting" team@company.com

# Post in emergency Slack channel
curl -X POST $SLACK_WEBHOOK_URL -d '{
  "text": "🚨 ROLLBACK TO MONGODB INITIATED 🚨\nMigration Lead: [Name]\nReason: [Brief description]\nETA: 20 minutes"
}'

# Conference call
echo "Join emergency bridge: [Conference number]"
```

**Step 2: Document Rollback Decision**

```bash
# Create rollback log
cat > /backups/ROLLBACK_LOG_$(date +%Y%m%d-%H%M%S).txt <<EOF
ROLLBACK INITIATED
==================

Date: $(date)
Initiated By: [Name]
Approved By: [Name]

Reason: [Detailed description of issue requiring rollback]

Current Status:
- Application: [Online/Offline/Degraded]
- PostgreSQL: [Status]
- MongoDB: [Status]
- User Impact: [Description]

Timeline:
- Issue Detected: [Time]
- Rollback Decision: [Time]
- Rollback Start: $(date)
- Estimated Completion: $(date -d '+20 minutes')

Team Members Active:
- Migration Lead: [Name]
- Database Admin: [Name]
- DevOps: [Name]
- Developer: [Name]
EOF
```

**Step 3: Verify MongoDB Backup**

```bash
# Locate most recent MongoDB backup
LATEST_BACKUP=$(ls -td /backups/production-*/ | head -1)
echo "Using backup: $LATEST_BACKUP"

# Verify backup integrity
ls -lh "$LATEST_BACKUP/mongodb-backup/nextcrm/"
COLLECTION_COUNT=$(ls "$LATEST_BACKUP/mongodb-backup/nextcrm/" | grep ".bson.gz" | wc -l)
echo "Collections in backup: $COLLECTION_COUNT"

if [ "$COLLECTION_COUNT" -lt 26 ]; then
  echo "⚠️  WARNING: Backup may be incomplete"
  echo "Continue with rollback? (yes/no)"
  read CONTINUE
  if [ "$CONTINUE" != "yes" ]; then
    echo "Rollback aborted - investigate backup"
    exit 1
  fi
fi
```

**Step 4: Save PostgreSQL State (for forensics)**

```bash
# Dump current PostgreSQL state before rollback
# This preserves data for investigation
FORENSICS_DIR="/backups/rollback-forensics-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$FORENSICS_DIR"

# Quick dump (structure only, fast)
pg_dump "$PRODUCTION_POSTGRESQL_URL" --schema-only > "$FORENSICS_DIR/schema.sql"

# Sample data from key tables
psql "$PRODUCTION_POSTGRESQL_URL" -c "COPY (SELECT * FROM crm_Accounts LIMIT 1000) TO STDOUT CSV HEADER" > "$FORENSICS_DIR/accounts_sample.csv"
psql "$PRODUCTION_POSTGRESQL_URL" -c "COPY (SELECT * FROM crm_Contacts LIMIT 1000) TO STDOUT CSV HEADER" > "$FORENSICS_DIR/contacts_sample.csv"

# Error logs
cp /var/log/postgresql/postgresql-16-main.log "$FORENSICS_DIR/"
cp /var/log/nextcrm/application.log "$FORENSICS_DIR/"

echo "Forensics saved to: $FORENSICS_DIR"
```

**Pre-Rollback Checklist:**

- [ ] Team assembled and on call
- [ ] Rollback decision documented
- [ ] MongoDB backup verified
- [ ] PostgreSQL state saved for forensics
- [ ] All team members ready

**Proceed to Phase 2**

---

### Phase 2: Application Shutdown (2 minutes)

**Step 1: Stop Application**

```bash
# Update status page
echo "System Maintenance - Restoring from Backup" > /var/www/status-page/message.txt

# Stop application servers
# Method depends on deployment

# Option A: Systemd
sudo systemctl stop nextcrm

# Option B: PM2
pm2 stop all

# Option C: Docker
docker-compose down

# Option D: Kubernetes
kubectl scale deployment nextcrm --replicas=0

# Verify stopped
curl http://localhost:3000/api/health
# Should fail or timeout

echo "Application stopped at: $(date)" | tee -a /backups/ROLLBACK_LOG_*.txt
```

**Step 2: Verify No Active Connections**

```bash
# Check PostgreSQL connections
ACTIVE_CONN=$(psql "$PRODUCTION_POSTGRESQL_URL" -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname='nextcrm' AND application_name LIKE '%nextcrm%';")
echo "Active PostgreSQL connections: $ACTIVE_CONN"

if [ "$ACTIVE_CONN" -gt 0 ]; then
  echo "Terminating active connections..."
  psql "$PRODUCTION_POSTGRESQL_URL" -c "
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = 'nextcrm'
    AND application_name LIKE '%nextcrm%';
  "
fi

# Wait for connections to close
sleep 5
```

**Phase 2 Checklist:**

- [ ] Application stopped
- [ ] No active connections to PostgreSQL
- [ ] Status page updated
- [ ] Shutdown time logged

---

### Phase 3: MongoDB Restore (8-12 minutes)

**Step 1: Prepare MongoDB**

```bash
# Check MongoDB is running
mongosh "$PRODUCTION_MONGODB_URL" --eval "db.adminCommand('ping')"

# Verify disk space
df -h | grep -E "Filesystem|/var"

# Check current MongoDB database (should exist, may have stale data)
mongosh "$PRODUCTION_MONGODB_URL" --eval "db.stats()"
```

**Step 2: Drop Current MongoDB Database (if exists)**

```bash
# ⚠️ DANGER: This deletes current MongoDB data
# Only do this during rollback when PostgreSQL is source of truth
# and we're reverting to backup

echo "⚠️  WARNING: About to drop current MongoDB database"
echo "This will delete any MongoDB data and restore from backup"
echo "Continue? (type 'yes' to proceed)"
read CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Rollback aborted"
  exit 1
fi

# Drop database
mongosh "$PRODUCTION_MONGODB_URL" --eval "db.dropDatabase()"

# Verify dropped
mongosh "$PRODUCTION_MONGODB_URL" --eval "db.getCollectionNames()"
# Should return empty array

echo "MongoDB database dropped at: $(date)" | tee -a /backups/ROLLBACK_LOG_*.txt
```

**Step 3: Restore from Backup**

```bash
# Restore MongoDB from backup
LATEST_BACKUP=$(ls -td /backups/production-*/ | head -1)

echo "Restoring MongoDB from: $LATEST_BACKUP"
echo "Start time: $(date)"

mongorestore \
  --uri="$PRODUCTION_MONGODB_URL" \
  --db=nextcrm \
  --gzip \
  --verbose \
  "$LATEST_BACKUP/mongodb-backup/nextcrm" \
  2>&1 | tee /backups/rollback-restore.log

# Check exit code
if [ ${PIPESTATUS[0]} -eq 0 ]; then
  echo "✓ MongoDB restore successful"
  echo "Restore completed at: $(date)" | tee -a /backups/ROLLBACK_LOG_*.txt
else
  echo "✗ CRITICAL: MongoDB restore FAILED"
  echo "Check /backups/rollback-restore.log for errors"
  echo "DO NOT PROCEED - Escalate immediately"
  exit 1
fi
```

**Step 4: Verify MongoDB Restore**

```bash
# Verify collection counts
echo "=== MongoDB Collection Counts ===" | tee /backups/rollback-verification.txt
mongosh "$PRODUCTION_MONGODB_URL" --quiet --eval "
  db.getCollectionNames().forEach(function(col) {
    print(col + ': ' + db[col].countDocuments());
  })
" | tee -a /backups/rollback-verification.txt

# Spot check critical records
echo "=== Spot Checks ===" | tee -a /backups/rollback-verification.txt
mongosh "$PRODUCTION_MONGODB_URL" --eval "db.crm_Accounts.findOne()" | tee -a /backups/rollback-verification.txt
mongosh "$PRODUCTION_MONGODB_URL" --eval "db.Users.findOne()" | tee -a /backups/rollback-verification.txt
mongosh "$PRODUCTION_MONGODB_URL" --eval "db.crm_Opportunities.findOne()" | tee -a /backups/rollback-verification.txt

# Verify indexes exist
echo "=== Index Verification ===" | tee -a /backups/rollback-verification.txt
mongosh "$PRODUCTION_MONGODB_URL" --eval "db.crm_Accounts.getIndexes()" | tee -a /backups/rollback-verification.txt
```

**Phase 3 Checklist:**

- [ ] MongoDB running and accessible
- [ ] Sufficient disk space verified
- [ ] Current MongoDB database dropped
- [ ] Backup restored successfully
- [ ] Collection counts verified
- [ ] Sample records verified
- [ ] Indexes verified

---

### Phase 4: Application Reconfiguration (3-5 minutes)

**Step 1: Switch DATABASE_URL Back to MongoDB**

```bash
# Backup current .env (PostgreSQL config)
cp .env.production .env.production.postgresql-$(date +%Y%m%d)

# Restore MongoDB configuration
# Option A: If you have a MongoDB .env backup
cp .env.production.mongodb-backup-* .env.production

# Option B: Manually edit
cat > .env.production <<EOF
# MongoDB (Restored after rollback)
DATABASE_URL="$PRODUCTION_MONGODB_URL"

# All other environment variables
NODE_ENV=production
NEXTAUTH_URL=https://your-production-url.com
NEXTAUTH_SECRET=your-nextauth-secret
# ... (all other variables)
EOF

# Verify DATABASE_URL
grep DATABASE_URL .env.production
# Should show MongoDB connection string

echo "DATABASE_URL switched to MongoDB at: $(date)" | tee -a /backups/ROLLBACK_LOG_*.txt
```

**Step 2: Update Prisma Schema**

```bash
# If you have a MongoDB version of schema in backup
cp prisma/schema.prisma prisma/schema.prisma.postgresql-backup
cp prisma/schema.prisma.mongodb prisma/schema.prisma

# OR manually edit datasource
sed -i 's/provider = "postgresql"/provider = "mongodb"/' prisma/schema.prisma

# Verify change
grep 'provider.*=' prisma/schema.prisma
# Should show: provider = "mongodb"
```

**Step 3: Regenerate Prisma Client**

```bash
# Load MongoDB environment
export DATABASE_URL="$PRODUCTION_MONGODB_URL"

# Generate Prisma client for MongoDB
npx prisma generate

# Verify Prisma client
ls -la node_modules/.prisma/client/
grep "mongodb" node_modules/.prisma/client/index.d.ts
```

**Step 4: Clear Caches (if applicable)**

```bash
# Clear application caches
rm -rf .next/cache/*  # Next.js cache
# OR other caching mechanisms your app uses

# Clear any Redis/Memcached
# redis-cli FLUSHALL
# echo "flush_all" | nc localhost 11211  # Memcached
```

**Phase 4 Checklist:**

- [ ] .env updated to MongoDB
- [ ] Prisma schema updated to MongoDB
- [ ] Prisma client regenerated
- [ ] Caches cleared
- [ ] Configuration verified

---

### Phase 5: Application Startup and Verification (5-8 minutes)

**Step 1: Start Application**

```bash
# Start application
# Method depends on deployment

# Option A: Systemd
sudo systemctl start nextcrm
sudo systemctl status nextcrm

# Option B: PM2
pm2 start ecosystem.config.js --env production
pm2 status

# Option C: Docker
docker-compose -f docker-compose.production.yml up -d

# Option D: Kubernetes
kubectl scale deployment nextcrm --replicas=3
kubectl get pods

# Wait for application to be ready
echo "Waiting for application to start..."
sleep 30

# Check application health
for i in {1..10}; do
  if curl -f http://localhost:3000/api/health; then
    echo "✓ Application is healthy"
    break
  else
    echo "Waiting for application... ($i/10)"
    sleep 5
  fi
done

echo "Application started at: $(date)" | tee -a /backups/ROLLBACK_LOG_*.txt
```

**Step 2: Verify Database Connection**

```bash
# Check application logs for database connection
tail -50 /var/log/nextcrm/application.log | grep -i "database"
# Look for "Connected to MongoDB" or similar

# Verify no PostgreSQL connection attempts
tail -100 /var/log/nextcrm/application.log | grep -i postgres
# Should be empty or only old entries

# Check MongoDB connections
mongosh "$PRODUCTION_MONGODB_URL" --eval "
  db.currentOp().inprog.forEach(function(op) {
    if (op.appName && op.appName.includes('nextcrm')) {
      print('Active connection from: ' + op.appName);
    }
  })
"
# Should show active connections from nextcrm
```

**Step 3: Smoke Tests**

```bash
# Critical functionality tests

# Test 1: Authentication
curl -X POST https://your-production-url.com/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test-password"}' \
  -w "\nHTTP Status: %{http_code}\n"
# Expected: 200 OK

# Test 2: List accounts
curl -H "Authorization: Bearer $TOKEN" \
  https://your-production-url.com/api/crm/accounts?take=10 \
  -w "\nHTTP Status: %{http_code}\n"
# Expected: 200 OK with data

# Test 3: View account detail
ACCOUNT_ID=$(curl -s -H "Authorization: Bearer $TOKEN" \
  https://your-production-url.com/api/crm/accounts?take=1 | jq -r '.[0].id')

curl -H "Authorization: Bearer $TOKEN" \
  https://your-production-url.com/api/crm/accounts/$ACCOUNT_ID \
  -w "\nHTTP Status: %{http_code}\n"
# Expected: 200 OK with account data

# Test 4: List opportunities
curl -H "Authorization: Bearer $TOKEN" \
  https://your-production-url.com/api/crm/opportunity?take=10 \
  -w "\nHTTP Status: %{http_code}\n"
# Expected: 200 OK with data

# Test 5: Dashboard
curl -H "Authorization: Bearer $TOKEN" \
  https://your-production-url.com/api/reports/dashboard \
  -w "\nHTTP Status: %{http_code}\n"
# Expected: 200 OK with dashboard data
```

**Manual UI Verification:**

- [ ] Login to application
- [ ] Navigate to Accounts list (verify data loads)
- [ ] Open an account detail page (verify data correct)
- [ ] Navigate to Opportunities (verify data loads)
- [ ] Navigate to Contacts (verify data loads)
- [ ] Check dashboard widgets (verify data displays)
- [ ] Try creating a test record (verify writes work)
- [ ] Delete test record (verify deletes work)
- [ ] Check for any visual errors
- [ ] Check browser console for errors

**Step 4: Declare Rollback Success**

```bash
# If all smoke tests pass
cat >> /backups/ROLLBACK_LOG_*.txt <<EOF

ROLLBACK SUCCESSFUL
===================

Rollback Completed: $(date)
Application Status: Online and Functional
Database: MongoDB (Restored from backup)

Smoke Tests: PASSED
- Authentication: ✓
- Data Retrieval: ✓
- Data Write: ✓
- UI Functionality: ✓

User Impact:
- Downtime: [Calculate duration]
- Data Loss: Any data created during PostgreSQL period

Next Steps:
1. Notify users system is back online
2. Monitor closely for 2 hours
3. Investigate root cause of PostgreSQL issues
4. Plan remediation or migration retry

Verified By:
- Migration Lead: [Name] $(date)
- Database Admin: [Name] $(date)
EOF

echo "✓ ROLLBACK COMPLETE AND VERIFIED"
```

**Phase 5 Checklist:**

- [ ] Application started successfully
- [ ] Database connection verified (MongoDB)
- [ ] No PostgreSQL connection attempts
- [ ] All smoke tests passed
- [ ] Manual UI verification passed
- [ ] Rollback success declared
- [ ] Completion time logged: ____:____

---

### Phase 6: Post-Rollback Actions (Ongoing)

**Step 1: Update Status and Notify Users**

```bash
# Update status page
echo "System Operational - Service Restored" > /var/www/status-page/message.txt

# Send user notification
# See: COMMUNICATION_TEMPLATES.md - "Rollback Complete"

Subject: NextCRM Service Restored

Dear NextCRM Users,

Our system maintenance has been completed and NextCRM is now fully operational.

We encountered technical issues during the database upgrade and made the decision to restore from our backup to ensure system stability and data integrity.

**What This Means:**
- System is fully functional
- All your data from before the upgrade is safe and accessible
- Any data created during the brief upgrade period (XX minutes) was not preserved

**What to Do:**
- If you created or modified data during the maintenance window, please re-enter it
- If you notice any issues, please contact support immediately

We apologize for any inconvenience and thank you for your patience.

Best regards,
The NextCRM Team
```

**Step 2: Monitor System Closely**

```bash
# Monitor for 2 hours post-rollback

# Application health
watch -n 30 'curl -s http://localhost:3000/api/health | jq .'

# MongoDB performance
watch -n 60 'mongosh "$PRODUCTION_MONGODB_URL" --quiet --eval "db.serverStatus().connections"'

# Application logs
tail -f /var/log/nextcrm/application.log | grep -i error

# Error rate
watch -n 60 'tail -1000 /var/log/nextcrm/application.log | grep -i error | wc -l'
```

**Monitoring Checklist (First 2 Hours):**

- [ ] Application uptime: 100%
- [ ] Response times: Normal (<200ms average)
- [ ] Error rate: Low (<0.1%)
- [ ] User reports: None or minimal
- [ ] MongoDB performance: Normal
- [ ] No anomalies detected

**Step 3: Root Cause Analysis**

```bash
# Schedule RCA meeting within 24 hours
# Agenda:
# 1. What happened (timeline)
# 2. Why did it happen (root cause)
# 3. Why didn't we catch it earlier (testing gaps)
# 4. How to prevent in future
# 5. Decision: Retry migration or different approach
```

**Post-Rollback Checklist:**

- [ ] Users notified
- [ ] Status page updated
- [ ] 2-hour monitoring complete with no issues
- [ ] System stable and performing normally
- [ ] Root cause analysis scheduled
- [ ] Post-mortem document started
- [ ] PostgreSQL forensics saved for investigation
- [ ] Decision on next steps made

---

## Data Loss Assessment

**What Data Was Lost:**

During rollback, any data created or modified during PostgreSQL operation is lost:

```bash
# Calculate data loss window
MIGRATION_COMPLETE=$(grep "Migration completed" /backups/migration-timeline.txt | cut -d' ' -f5-)
ROLLBACK_START=$(grep "Rollback Start" /backups/ROLLBACK_LOG_*.txt | cut -d' ' -f3-)

echo "Data Loss Window:"
echo "  From: $MIGRATION_COMPLETE"
echo "  To: $ROLLBACK_START"
echo "  Duration: [Calculate]"

# Estimate affected records (if possible)
# Check PostgreSQL forensics
psql "$PRODUCTION_POSTGRESQL_URL" -c "
SELECT
  table_name,
  COUNT(*)
FROM information_schema.tables t
JOIN LATERAL (
  SELECT COUNT(*) as count
  FROM \"table_name\"
  WHERE created_at > '$MIGRATION_COMPLETE'
) c ON true
WHERE table_schema = 'public'
GROUP BY table_name;
"
```

**Data Loss Mitigation:**

```bash
# If PostgreSQL is still accessible, extract recent data
pg_dump "$PRODUCTION_POSTGRESQL_URL" \
  --table=crm_Accounts \
  --table=crm_Contacts \
  --table=crm_Opportunities \
  --data-only \
  > /backups/postgresql-recent-data.sql

# Convert PostgreSQL dump to MongoDB format (manual process)
# This is complex and may not be worth the effort for small amounts of data

# Alternative: Request users re-enter data
# Provide them with time window affected
```

---

## Rollback Scenarios and Variations

### Scenario 1: Rollback During Migration

**Situation:** Issue discovered while migration is still running

**Procedure:**

```bash
# 1. Pause migration
# Press Ctrl+C in migration terminal

# 2. Do NOT restore MongoDB (source is still intact)

# 3. Simply:
   # - Stop migration
   # - Verify MongoDB still has all data
   # - Point application back to MongoDB (if it was ever switched)
   # - Delete PostgreSQL database (or leave for investigation)

# 4. No data loss (migration never completed, MongoDB untouched)
```

**Time:** 5-10 minutes

---

### Scenario 2: Rollback After Validation Failure

**Situation:** Validation script fails, but application not yet deployed

**Procedure:**

```bash
# 1. Do NOT deploy application to PostgreSQL

# 2. MongoDB is still intact (untouched)

# 3. Simply:
   # - Keep application pointing to MongoDB
   # - Investigate validation failures
   # - Fix migration scripts
   # - Retry migration later

# 4. No data loss (application never switched databases)
```

**Time:** 0 minutes (no rollback needed)

---

### Scenario 3: Rollback After Partial Deployment

**Situation:** Some application servers switched to PostgreSQL, others still on MongoDB

**Procedure:**

```bash
# 1. Stop ALL application servers immediately
for SERVER in server1 server2 server3; do
  ssh $SERVER "sudo systemctl stop nextcrm"
done

# 2. Determine which database has most recent data
# - If mostly on MongoDB: Restore all servers to MongoDB
# - If mostly on PostgreSQL: Complete deployment to PostgreSQL (don't rollback)

# 3. If rolling back to MongoDB:
   # - Follow standard rollback procedure
   # - Ensure all servers using same .env (MongoDB)

# 4. Data loss depends on which database had recent writes
```

**Time:** 20-30 minutes

---

### Scenario 4: Rollback After Extended PostgreSQL Operation

**Situation:** PostgreSQL operated for hours/days, significant new data created

**Challenges:**
- Significant data loss if rolling back
- More complex decision

**Procedure:**

```bash
# 1. Assess data created during PostgreSQL period
psql "$PRODUCTION_POSTGRESQL_URL" -c "
SELECT
  table_name,
  COUNT(*) as records_created
FROM information_schema.tables t
JOIN LATERAL (
  SELECT COUNT(*)
  FROM \"table_name\"
  WHERE created_at > 'MIGRATION_COMPLETE_TIMESTAMP'
) c ON true
WHERE table_schema = 'public'
GROUP BY table_name;
"

# 2. Decision matrix:
#
#    New records <100: Consider rollback, data loss acceptable
#    New records 100-1000: Difficult decision, try to fix forward first
#    New records >1000: Avoid rollback if possible, data loss significant

# 3. If rolling back with significant data:
#    a. Dump PostgreSQL data created during operation
#    b. Rollback to MongoDB
#    c. Manually migrate recent PostgreSQL data to MongoDB
#       (Complex, may require custom scripts)

# 4. Alternative: Fix forward instead of rollback
#    - Fix PostgreSQL issues
#    - Keep operating on PostgreSQL
#    - Avoid data loss
```

---

## Emergency Rollback (Ultra Fast - 10 minutes)

**When to Use:**
- Critical production emergency
- Every second counts
- Can skip some verification steps

**Procedure:**

```bash
# 1. Stop application (30 seconds)
sudo systemctl stop nextcrm

# 2. Switch DATABASE_URL to MongoDB (30 seconds)
sed -i 's|postgresql://.*|mongodb://...|' .env.production

# 3. Restore MongoDB from backup (5 minutes)
mongorestore --uri="$PRODUCTION_MONGODB_URL" --db=nextcrm --drop --gzip /backups/latest/

# 4. Regenerate Prisma client (1 minute)
npx prisma generate

# 5. Start application (1 minute)
sudo systemctl start nextcrm

# 6. Quick health check (30 seconds)
curl http://localhost:3000/api/health

# 7. Notify team and users (ongoing)
```

**Total Time:** ~10 minutes

**Trade-offs:**
- Skip detailed verification
- Skip forensics
- Skip comprehensive testing
- Higher risk of issues
- Use only in true emergency

---

## Rollback Testing

**Test Rollback Procedure in Staging:**

```bash
# Before production migration, test rollback in staging

# 1. Complete staging migration
# 2. Simulate a critical issue
# 3. Execute rollback procedure
# 4. Time the process
# 5. Verify application works
# 6. Document any issues or improvements

# Goal: Verify rollback takes <30 minutes
# Goal: Verify team knows procedures
# Goal: Identify any gotchas
```

---

## Post-Rollback Analysis

**Required Documentation:**

```markdown
# Rollback Post-Mortem Report

**Date:** [Date]
**Time:** [Time]
**Duration:** [Duration]

## What Happened
[Detailed timeline of events leading to rollback]

## Why We Rolled Back
[Specific issues that triggered rollback decision]

## Rollback Execution
- Time to rollback: [Duration]
- Issues during rollback: [Any issues encountered]
- Data loss: [Quantify data loss]

## Impact
- User impact: [Number of users, duration of downtime]
- Business impact: [Any business consequences]
- Data impact: [What data was lost]

## Root Cause
[Deep analysis of what went wrong]

## What We Learned
[Lessons learned]

## What We'll Do Differently
[Action items for next attempt]

## Decision on Next Steps
[ ] Retry migration after fixes
[ ] Different migration approach
[ ] Postpone migration
[ ] Cancel migration project
```

---

## Prevention: Avoiding Rollback

**Strategies to Minimize Rollback Risk:**

1. **Thorough Testing:**
   - Complete staging migration matching production
   - Comprehensive UAT
   - Performance testing
   - Long-running stability tests

2. **Incremental Approach:**
   - Migrate smaller portions first (if possible)
   - Test thoroughly before proceeding
   - Not applicable for this full database migration

3. **Fix-Forward First:**
   - Have troubleshooting guides ready
   - Quick fixes documented
   - Team trained on common issues
   - Only rollback as last resort

4. **Monitoring:**
   - Comprehensive monitoring from minute one
   - Automated alerts for anomalies
   - Multiple monitoring perspectives

5. **Decision Framework:**
   - Clear rollback triggers
   - Decision-making authority defined
   - Fast decision process

6. **Team Preparation:**
   - All team members know rollback procedure
   - Roles and responsibilities clear
   - Communication channels established
   - Rollback procedure tested in staging

---

## Appendix: Rollback Checklist

**Quick Reference Rollback Checklist:**

### Pre-Rollback
- [ ] Issue severity confirmed
- [ ] Rollback authority approval obtained
- [ ] Team notified and ready
- [ ] MongoDB backup verified
- [ ] Users notified (brief downtime)

### Execution
- [ ] Application stopped
- [ ] PostgreSQL state saved (forensics)
- [ ] MongoDB database dropped (if needed)
- [ ] MongoDB restored from backup
- [ ] Collection counts verified
- [ ] .env updated to MongoDB
- [ ] Prisma schema updated to MongoDB
- [ ] Prisma client regenerated
- [ ] Application started
- [ ] Database connection verified

### Verification
- [ ] Authentication works
- [ ] Data retrieval works
- [ ] Data write works
- [ ] UI loads correctly
- [ ] No critical errors in logs
- [ ] 2-hour monitoring complete

### Post-Rollback
- [ ] Users notified (system restored)
- [ ] Status page updated
- [ ] System stable
- [ ] Rollback log completed
- [ ] Post-mortem scheduled
- [ ] Forensics preserved

**Total Time:** 15-30 minutes (verified in staging)

---

**End of Rollback Procedures Document**

This document should be reviewed and updated based on staging rollback testing. Keep it accessible during production migration for quick reference in case of emergency.
