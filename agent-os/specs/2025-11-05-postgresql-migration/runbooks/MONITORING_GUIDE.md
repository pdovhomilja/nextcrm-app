# Monitoring and Performance Tracking Guide

**Document Version:** 1.0
**Last Updated:** 2025-11-05
**Audience:** DevOps Team, Database Administrators, Operations Team

## Overview

This guide provides comprehensive monitoring strategies, tools, queries, and dashboards for tracking the health and performance of PostgreSQL post-migration. Effective monitoring is critical for catching issues early and ensuring the migration's long-term success.

---

## Monitoring Phases

### Phase 1: Migration Monitoring (During Migration)
**Duration:** Active migration period (hours to days)
**Focus:** Migration progress, errors, resource usage
**Frequency:** Continuous real-time monitoring

### Phase 2: Critical Monitoring (First 48 Hours Post-Go-Live)
**Duration:** 48 hours after production deployment
**Focus:** Application stability, data integrity, performance
**Frequency:** Every 5-15 minutes

### Phase 3: Intensive Monitoring (Days 3-14)
**Duration:** 2 weeks after go-live
**Focus:** Performance trends, optimization opportunities
**Frequency:** Hourly checks, daily reports

### Phase 4: Normal Operations (After 2 Weeks)
**Duration:** Ongoing
**Focus:** Long-term performance, capacity planning
**Frequency:** Standard operational monitoring

---

## Key Performance Indicators (KPIs)

### Application-Level KPIs

| Metric | Target | Warning | Critical | Check Frequency |
|--------|--------|---------|----------|-----------------|
| API Response Time (p50) | <100ms | >200ms | >500ms | Every 5 min |
| API Response Time (p95) | <200ms | >500ms | >1000ms | Every 5 min |
| API Response Time (p99) | <500ms | >1000ms | >2000ms | Every 5 min |
| Error Rate | <0.1% | >1% | >5% | Every 5 min |
| Uptime | >99.9% | <99.9% | <99% | Continuous |
| Active Users | Baseline | -50% | -80% | Every 15 min |

### Database-Level KPIs

| Metric | Target | Warning | Critical | Check Frequency |
|--------|--------|---------|----------|-----------------|
| Query Response Time (avg) | <50ms | >100ms | >500ms | Every 5 min |
| Query Response Time (p95) | <200ms | >500ms | >1000ms | Every 5 min |
| Active Connections | <50 | >150 | >180 | Every 5 min |
| Connection Pool Usage | <50% | >80% | >95% | Every 5 min |
| Cache Hit Ratio | >99% | <95% | <90% | Every 15 min |
| Deadlocks | 0 | >1/hr | >10/hr | Every 15 min |
| Replication Lag | N/A (single) | >5s | >30s | Every 5 min |

### System-Level KPIs

| Metric | Target | Warning | Critical | Check Frequency |
|--------|--------|---------|----------|-----------------|
| CPU Usage | <70% | >80% | >95% | Every 5 min |
| Memory Usage | <80% | >90% | >95% | Every 5 min |
| Disk Usage | <70% | >80% | >90% | Every 15 min |
| Disk I/O Wait | <10% | >30% | >50% | Every 5 min |
| Network Usage | <50% | >80% | >95% | Every 5 min |

---

## Monitoring Tools Setup

### PostgreSQL Built-in Monitoring

**1. Enable pg_stat_statements**

```sql
-- Add to postgresql.conf
shared_preload_libraries = 'pg_stat_statements'
pg_stat_statements.track = all
pg_stat_statements.max = 10000

-- Restart PostgreSQL
sudo systemctl restart postgresql

-- Create extension in database
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Verify enabled
SELECT * FROM pg_stat_statements LIMIT 1;
```

**2. Enable Query Logging**

```conf
# Add to postgresql.conf
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_statement = 'ddl'
log_min_duration_statement = 100  # Log queries >100ms
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_connections = on
log_disconnections = on
log_checkpoints = on
log_lock_waits = on
```

**3. Configure Auto-Vacuum Logging**

```conf
log_autovacuum_min_duration = 0  # Log all autovacuum activities
```

### External Monitoring Tools

**Option 1: Prometheus + Grafana (Recommended)**

```bash
# Install postgres_exporter
wget https://github.com/prometheus-community/postgres_exporter/releases/download/v0.15.0/postgres_exporter-0.15.0.linux-amd64.tar.gz
tar xvfz postgres_exporter-0.15.0.linux-amd64.tar.gz
cd postgres_exporter-0.15.0.linux-amd64

# Create connection string
export DATA_SOURCE_NAME="postgresql://nextcrm:password@localhost:5432/nextcrm?sslmode=disable"

# Run exporter
./postgres_exporter &

# Verify metrics available
curl http://localhost:9187/metrics

# Configure Prometheus to scrape
cat >> /etc/prometheus/prometheus.yml <<EOF
  - job_name: 'postgresql'
    static_configs:
      - targets: ['localhost:9187']
EOF

# Import Grafana dashboard
# Dashboard ID: 9628 (PostgreSQL Database)
```

**Option 2: pgAdmin 4**

```bash
# Install pgAdmin 4
sudo apt install pgadmin4

# Or Docker
docker run -p 80:80 \
  -e 'PGADMIN_DEFAULT_EMAIL=admin@example.com' \
  -e 'PGADMIN_DEFAULT_PASSWORD=admin' \
  -d dpage/pgadmin4

# Access: http://localhost:80
# Add PostgreSQL server connection
```

**Option 3: pgBadger (Log Analysis)**

```bash
# Install pgBadger
sudo apt install pgbadger

# Generate report from logs
pgbadger /var/log/postgresql/postgresql-16-main.log -o report.html

# Open report in browser
firefox report.html

# Automate daily reports
cat > /etc/cron.daily/pgbadger-report <<'EOF'
#!/bin/bash
LOG_FILE="/var/log/postgresql/postgresql-$(date -d yesterday +%Y-%m-%d)*.log"
REPORT="/var/www/html/pgbadger-reports/report-$(date -d yesterday +%Y-%m-%d).html"
pgbadger $LOG_FILE -o $REPORT
EOF
chmod +x /etc/cron.daily/pgbadger-report
```

---

## Essential Monitoring Queries

### 1. Database Health Check

```sql
-- Overall database health
SELECT
  version() as postgresql_version,
  current_database() as database_name,
  pg_database_size(current_database()) as database_size_bytes,
  pg_size_pretty(pg_database_size(current_database())) as database_size,
  (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) as active_connections,
  (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections;
```

### 2. Active Queries

```sql
-- See currently running queries
SELECT
  pid,
  now() - query_start AS duration,
  state,
  application_name,
  client_addr,
  query
FROM pg_stat_activity
WHERE state != 'idle'
  AND datname = 'nextcrm'
ORDER BY duration DESC;
```

### 3. Slow Queries

```sql
-- Top 20 slowest queries (requires pg_stat_statements)
SELECT
  substring(query, 1, 100) AS short_query,
  round(mean_exec_time::numeric, 2) AS avg_ms,
  round(max_exec_time::numeric, 2) AS max_ms,
  calls,
  round((100 * mean_exec_time / sum(mean_exec_time) OVER ())::numeric, 2) AS percentage
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = 'nextcrm')
ORDER BY mean_exec_time DESC
LIMIT 20;
```

### 4. Query Performance by Table

```sql
-- Query performance breakdown by table
SELECT
  schemaname,
  tablename,
  seq_scan as sequential_scans,
  idx_scan as index_scans,
  seq_tup_read as seq_tuples_read,
  idx_tup_fetch as idx_tuples_fetched,
  n_tup_ins as tuples_inserted,
  n_tup_upd as tuples_updated,
  n_tup_del as tuples_deleted,
  n_live_tup as live_tuples,
  n_dead_tup as dead_tuples,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY seq_scan + idx_scan DESC
LIMIT 20;
```

### 5. Index Usage

```sql
-- Index usage statistics
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### 6. Unused Indexes

```sql
-- Identify unused indexes (candidates for removal)
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
  pg_size_pretty(pg_relation_size(tablename::regclass)) AS table_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### 7. Cache Hit Ratio

```sql
-- Buffer cache hit ratio (should be >99%)
SELECT
  sum(heap_blks_read) as heap_read,
  sum(heap_blks_hit) as heap_hit,
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) AS cache_hit_ratio
FROM pg_statio_user_tables
WHERE schemaname = 'public';
```

### 8. Table Bloat

```sql
-- Estimate table bloat
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  n_live_tup AS live_tuples,
  n_dead_tup AS dead_tuples,
  round((n_dead_tup::float / NULLIF(n_live_tup + n_dead_tup, 0)) * 100, 2) AS dead_tuple_percentage
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_dead_tup > 0
ORDER BY n_dead_tup DESC
LIMIT 20;
```

### 9. Connection Statistics

```sql
-- Connection statistics by state
SELECT
  state,
  count(*) as connections,
  max(now() - state_change) as max_duration
FROM pg_stat_activity
WHERE datname = 'nextcrm'
GROUP BY state
ORDER BY count(*) DESC;
```

### 10. Lock Monitoring

```sql
-- Active locks
SELECT
  locktype,
  relation::regclass,
  mode,
  transactionid AS tid,
  virtualtransaction AS vtid,
  pid,
  granted
FROM pg_catalog.pg_locks
WHERE database = (SELECT oid FROM pg_database WHERE datname = 'nextcrm')
  AND NOT granted
ORDER BY pid;
```

### 11. Replication Status (if using replication)

```sql
-- Check replication lag
SELECT
  client_addr,
  state,
  sent_lsn,
  write_lsn,
  flush_lsn,
  replay_lsn,
  sync_state,
  pg_wal_lsn_diff(sent_lsn, replay_lsn) AS replication_lag_bytes,
  pg_size_pretty(pg_wal_lsn_diff(sent_lsn, replay_lsn)) AS replication_lag
FROM pg_stat_replication;
```

### 12. Checkpoint Statistics

```sql
-- Checkpoint statistics
SELECT
  checkpoints_timed,
  checkpoints_req,
  checkpoint_write_time,
  checkpoint_sync_time,
  buffers_checkpoint,
  buffers_clean,
  maxwritten_clean,
  buffers_backend,
  buffers_backend_fsync,
  buffers_alloc
FROM pg_stat_bgwriter;
```

---

## Automated Monitoring Scripts

### Daily Health Check Script

```bash
#!/bin/bash
# File: /opt/monitoring/postgresql-daily-health.sh

DATE=$(date +%Y-%m-%d)
REPORT_DIR="/var/log/postgresql-monitoring"
REPORT_FILE="$REPORT_DIR/health-report-$DATE.txt"

mkdir -p $REPORT_DIR

cat > $REPORT_FILE <<EOF
PostgreSQL Health Report - $DATE
================================

1. Database Size
================
EOF

psql "$DATABASE_URL" -c "
SELECT
  datname,
  pg_size_pretty(pg_database_size(datname)) as size
FROM pg_database
WHERE datname = 'nextcrm';
" >> $REPORT_FILE

cat >> $REPORT_FILE <<EOF

2. Table Sizes (Top 10)
=======================
EOF

psql "$DATABASE_URL" -c "
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  n_live_tup as live_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
" >> $REPORT_FILE

cat >> $REPORT_FILE <<EOF

3. Slow Queries (Top 10)
========================
EOF

psql "$DATABASE_URL" -c "
SELECT
  substring(query, 1, 80) as query,
  round(mean_exec_time::numeric, 2) as avg_ms,
  calls
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = 'nextcrm')
ORDER BY mean_exec_time DESC
LIMIT 10;
" >> $REPORT_FILE

cat >> $REPORT_FILE <<EOF

4. Cache Hit Ratio
==================
EOF

psql "$DATABASE_URL" -c "
SELECT
  round((sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)))::numeric * 100, 2) as cache_hit_percentage
FROM pg_statio_user_tables
WHERE schemaname = 'public';
" >> $REPORT_FILE

cat >> $REPORT_FILE <<EOF

5. Connection Count
===================
EOF

psql "$DATABASE_URL" -c "
SELECT count(*) as active_connections
FROM pg_stat_activity
WHERE datname = 'nextcrm';
" >> $REPORT_FILE

cat >> $REPORT_FILE <<EOF

6. Dead Tuples (Bloat Check)
=============================
EOF

psql "$DATABASE_URL" -c "
SELECT
  tablename,
  n_dead_tup as dead_tuples,
  last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_dead_tup > 1000
ORDER BY n_dead_tup DESC
LIMIT 10;
" >> $REPORT_FILE

echo "Report generated: $REPORT_FILE"

# Email report (optional)
# mail -s "PostgreSQL Health Report - $DATE" admin@example.com < $REPORT_FILE
```

Make executable:
```bash
chmod +x /opt/monitoring/postgresql-daily-health.sh
```

Add to cron:
```bash
# Run daily at 8 AM
0 8 * * * /opt/monitoring/postgresql-daily-health.sh
```

### Real-Time Monitoring Script

```bash
#!/bin/bash
# File: /opt/monitoring/postgresql-realtime-monitor.sh

# Monitor PostgreSQL in real-time
# Run in terminal during critical periods

while true; do
  clear
  echo "=== PostgreSQL Real-Time Monitor ==="
  echo "=== $(date) ==="
  echo ""

  echo "--- Active Connections ---"
  psql "$DATABASE_URL" -c "
  SELECT state, count(*) as connections
  FROM pg_stat_activity
  WHERE datname = 'nextcrm'
  GROUP BY state;
  "

  echo ""
  echo "--- Longest Running Query ---"
  psql "$DATABASE_URL" -c "
  SELECT
    now() - query_start as duration,
    substring(query, 1, 60) as query
  FROM pg_stat_activity
  WHERE state = 'active'
    AND datname = 'nextcrm'
  ORDER BY duration DESC
  LIMIT 1;
  "

  echo ""
  echo "--- Cache Hit Ratio ---"
  psql "$DATABASE_URL" -c "
  SELECT
    round((sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0))::numeric * 100, 2) as cache_hit_pct
  FROM pg_statio_user_tables
  WHERE schemaname = 'public';
  "

  echo ""
  echo "--- Transactions Per Second (approx) ---"
  psql "$DATABASE_URL" -c "
  SELECT
    xact_commit + xact_rollback as total_transactions
  FROM pg_stat_database
  WHERE datname = 'nextcrm';
  "

  sleep 5
done
```

Make executable:
```bash
chmod +x /opt/monitoring/postgresql-realtime-monitor.sh
```

Run:
```bash
/opt/monitoring/postgresql-realtime-monitor.sh
```

---

## Alert Configuration

### Critical Alerts (Immediate Notification)

**1. Database Down**
```bash
# Check script
psql "$DATABASE_URL" -c "SELECT 1" || echo "CRITICAL: Database is down"

# Nagios/Icinga check
define service {
  service_description PostgreSQL Database
  check_command check_pgsql!nextcrm
}
```

**2. High Error Rate**
```bash
# Check application error rate
ERROR_COUNT=$(tail -1000 /var/log/nextcrm/app.log | grep -c ERROR)
if [ $ERROR_COUNT -gt 50 ]; then
  echo "CRITICAL: High error rate ($ERROR_COUNT errors in last 1000 lines)"
fi
```

**3. Connection Pool Exhaustion**
```sql
-- Alert if >90% connections used
DO $$
DECLARE
  active_conn INT;
  max_conn INT;
BEGIN
  SELECT count(*) INTO active_conn FROM pg_stat_activity WHERE datname = 'nextcrm';
  SELECT setting::int INTO max_conn FROM pg_settings WHERE name = 'max_connections';

  IF active_conn::float / max_conn > 0.9 THEN
    RAISE EXCEPTION 'CRITICAL: Connection pool exhaustion (% of %)', active_conn, max_conn;
  END IF;
END $$;
```

**4. Replication Lag (if using replication)**
```sql
-- Alert if lag >30 seconds
SELECT
  client_addr,
  pg_wal_lsn_diff(sent_lsn, replay_lsn) / 1024 / 1024 as lag_mb
FROM pg_stat_replication
WHERE pg_wal_lsn_diff(sent_lsn, replay_lsn) > 1024 * 1024 * 100; -- >100MB lag
```

### Warning Alerts (Check Within 15 Minutes)

**1. Slow Queries**
```sql
-- Alert on queries >5 seconds
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active'
  AND now() - query_start > interval '5 seconds'
  AND datname = 'nextcrm';
```

**2. Cache Hit Ratio Drop**
```sql
-- Alert if cache hit ratio <95%
SELECT
  CASE
    WHEN cache_hit_ratio < 0.95 THEN 'WARNING: Cache hit ratio below 95%'
    ELSE 'OK'
  END as status
FROM (
  SELECT
    sum(heap_blks_hit)::float / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0) as cache_hit_ratio
  FROM pg_statio_user_tables
) AS cache_stats;
```

**3. Table Bloat**
```sql
-- Alert on tables with >20% dead tuples
SELECT
  tablename,
  n_dead_tup,
  round((n_dead_tup::float / NULLIF(n_live_tup + n_dead_tup, 0)) * 100, 2) as dead_pct
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_dead_tup::float / NULLIF(n_live_tup + n_dead_tup, 0) > 0.2
ORDER BY dead_pct DESC;
```

---

## Performance Optimization Workflow

### 1. Identify Slow Query

```sql
-- Find slowest query
SELECT
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = 'nextcrm')
ORDER BY mean_exec_time DESC
LIMIT 1;
```

### 2. Analyze Query Execution Plan

```sql
-- Get execution plan for specific query
EXPLAIN (ANALYZE, BUFFERS) [YOUR_SLOW_QUERY_HERE];
```

### 3. Identify Optimization Opportunities

Look for:
- **Seq Scan** (sequential scan - bad for large tables)
  - Solution: Add index
- **High cost** (relative to table size)
  - Solution: Rewrite query or add index
- **Many rows processed vs returned**
  - Solution: Filter earlier or improve WHERE clause
- **Nested Loops** with large datasets
  - Solution: Consider Hash Join or Merge Join
- **Sort** operations on large datasets
  - Solution: Add index on sort column

### 4. Apply Optimization

```sql
-- Example: Add missing index
CREATE INDEX CONCURRENTLY idx_opportunities_sales_stage
ON crm_Opportunities (sales_stage)
WHERE status = 'ACTIVE';

-- Update statistics
ANALYZE crm_Opportunities;
```

### 5. Verify Improvement

```sql
-- Re-run EXPLAIN ANALYZE
EXPLAIN (ANALYZE, BUFFERS) [YOUR_SLOW_QUERY_HERE];

-- Check execution time improvement
SELECT
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
WHERE query LIKE '%YOUR_QUERY_PATTERN%'
ORDER BY queryid DESC
LIMIT 5;
```

### 6. Monitor Impact

```bash
# Monitor for 1 hour
# Check if other queries affected
# Verify no performance regressions elsewhere
```

---

## Capacity Planning

### Current Capacity Assessment

```sql
-- Database growth rate (check weekly)
SELECT
  date_trunc('week', current_timestamp) as week,
  pg_size_pretty(pg_database_size('nextcrm')) as size;
```

### Growth Projections

```bash
# Calculate growth rate
# Example: If database grows from 10GB to 12GB in 1 month
# Growth rate: 2GB/month = 24GB/year

# Project when disk will be full
CURRENT_SIZE=12GB
DISK_SIZE=100GB
GROWTH_RATE=2GB/month

MONTHS_UNTIL_FULL = (100GB - 12GB) / 2GB/month = 44 months
```

### Scaling Triggers

| Metric | Current | Scale Up Trigger | Action |
|--------|---------|------------------|--------|
| Disk Usage | 60% | >75% | Add disk or archive old data |
| CPU Usage | 40% | >70% sustained | Add CPU cores |
| Memory Usage | 50% | >80% sustained | Add RAM |
| Connections | 30 | >150 | Increase max_connections |
| Query Duration | 50ms avg | >200ms avg | Optimize queries or scale |

---

## Troubleshooting Common Issues

### Issue: High CPU Usage

**Diagnosis:**
```sql
-- Find CPU-intensive queries
SELECT
  pid,
  now() - query_start AS duration,
  query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC;
```

**Solutions:**
1. Kill long-running query: `SELECT pg_terminate_backend(PID);`
2. Optimize query with indexes
3. Add more CPU cores
4. Enable query timeout: `SET statement_timeout = '30s';`

---

### Issue: High Memory Usage

**Diagnosis:**
```sql
-- Check shared_buffers and work_mem settings
SELECT name, setting, unit
FROM pg_settings
WHERE name IN ('shared_buffers', 'work_mem', 'maintenance_work_mem');
```

**Solutions:**
1. Reduce work_mem if too high
2. Optimize queries to reduce memory usage
3. Add more RAM
4. Adjust shared_buffers (25% of RAM)

---

### Issue: Slow Queries

**Diagnosis:**
```sql
-- Find slow queries
SELECT * FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC;
```

**Solutions:**
1. Add indexes
2. Optimize query
3. Update table statistics: `ANALYZE table_name;`
4. Increase shared_buffers

---

### Issue: Connection Limit Reached

**Diagnosis:**
```sql
-- Check connection usage
SELECT count(*), state
FROM pg_stat_activity
GROUP BY state;
```

**Solutions:**
1. Kill idle connections
2. Increase max_connections
3. Implement connection pooling (PgBouncer)
4. Fix application connection leaks

---

## Appendix: Quick Reference

### Essential Commands

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# View logs
sudo tail -100 /var/log/postgresql/postgresql-16-main.log

# Connect to database
psql postgresql://user:pass@localhost:5432/nextcrm

# Reload configuration without restart
sudo systemctl reload postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Essential Queries

```sql
-- Database size
SELECT pg_size_pretty(pg_database_size('nextcrm'));

-- Active queries
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- Kill query
SELECT pg_terminate_backend(PID);

-- Update statistics
ANALYZE;

-- Manual vacuum
VACUUM ANALYZE table_name;

-- Check bloat
SELECT * FROM pg_stat_user_tables WHERE n_dead_tup > 1000;
```

---

**End of Monitoring and Performance Tracking Guide**

This guide should be used in conjunction with the migration runbooks and updated based on operational experience.
