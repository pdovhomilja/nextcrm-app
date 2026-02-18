# MongoDB to PostgreSQL Migration - Quick Start Guide

## ✅ Prerequisites Complete

Your environment is ready to run the migration:

- ✅ PostgreSQL database deployed (docker.softbase.cz:5433)
- ✅ Prisma schema baselined
- ✅ MongoDB connection configured
- ✅ Migration scripts ready
- ✅ Validation scripts ready

## 🚀 Run the Migration

### Step 1: Test Connection (Optional)

```bash
# Test if both databases are accessible
pnpm migrate:mongo-to-postgres --help
```

You should see:
- ✅ MongoDB connected
- ✅ PostgreSQL connected

### Step 2: Run the Migration

```bash
# Start the migration
pnpm migrate:mongo-to-postgres
```

**What happens:**
- Connects to MongoDB (source) and PostgreSQL (target)
- Migrates 26 entity tables in 10 dependency-aware phases
- Populates 10 junction tables
- Shows real-time progress bars with ETA
- Saves checkpoints every 10 batches
- Logs errors but continues processing

**Duration Estimates:**
- Small dataset (< 10K records): 2-5 minutes
- Medium dataset (< 100K records): 20-50 minutes
- Large dataset (< 1M records): 3-8 hours

### Step 3: Handle Interruptions (If Needed)

If you need to stop the migration:

```bash
# Press Ctrl+C to pause
# The checkpoint is saved automatically

# Resume later from where you left off
pnpm migrate:mongo-to-postgres --resume
```

### Step 4: Validate the Migration

After migration completes:

```bash
# Run 4-layer validation
pnpm validate:migration
```

**Validation checks:**
1. Row count comparison (MongoDB vs PostgreSQL)
2. Sample record validation (100 records per table)
3. Referential integrity (all foreign keys)
4. Data type validation (DateTime, enums, JSONB, arrays)

**Success criteria:**
- ✅ All row counts match (100%)
- ✅ Sample records match (>99%)
- ✅ No orphaned foreign keys (100%)
- ✅ No data type errors (100%)

### Step 5: Review Results

**Files generated:**
- `migration-checkpoint.json` - Resume state (if interrupted)
- `migration-errors.log` - Detailed errors (if any)
- `migration-validation-report.json` - Validation results

```bash
# View validation report
cat migration-validation-report.json | jq '.'

# Check for errors
cat migration-errors.log
```

## 📊 Migration Progress Example

```
═══════════════════════════════════════════════════════════
   NextCRM MongoDB → PostgreSQL Migration
═══════════════════════════════════════════════════════════

🔌 Connecting to databases...
   ✅ MongoDB connected
   ✅ PostgreSQL connected

🚀 Starting MongoDB → PostgreSQL Migration

--- Phase 1: Independent lookup tables ---

🔄 Migrating: crm_Industry_Type
   Total records: 15
   ███████████████████████████████████ 100% | 15/15 records | 1.2s
✅ Completed: crm_Industry_Type (15/15 records, 1.2s)

🔄 Migrating: Users
   Total records: 42
   ███████████████████████████████████ 100% | 42/42 records | 3.5s
✅ Completed: Users (42/42 records, 3.5s)

...

📊 Migration Summary
   Total Records Migrated: 12,543
   Total Errors: 0
   Duration: 2m 34s
   Records/sec: 82.3
   ✅ SUCCESS
```

## ⚠️ Common Issues and Solutions

### Issue 1: "Cannot connect to MongoDB"
**Solution:** Check `DATABASE_URL_MONGO` in `.env` file

### Issue 2: "Cannot connect to PostgreSQL"
**Solution:** Check `DATABASE_URL_POSTGRES` in `.env` file

### Issue 3: "Invalid ObjectId format"
**Solution:** This usually means a foreign key reference is null or invalid in MongoDB. The error is logged and migration continues.

### Issue 4: Migration is slow
**Solution:** This is expected for large datasets. Use Ctrl+C to pause and resume later. Checkpoints are saved every 10 batches.

### Issue 5: Validation fails
**Solution:**
1. Check `migration-validation-report.json` for details
2. Review `migration-errors.log` for transformation errors
3. Fix data issues in MongoDB if needed
4. Re-run migration for failed records

## 🔄 Clean Start (If Needed)

If you want to start over:

```bash
# Delete checkpoint and start fresh
pnpm migrate:mongo-to-postgres --clean

# Or manually delete checkpoint
rm migration-checkpoint.json
rm migration-errors.log
```

⚠️ **Warning:** This will re-migrate all data. You may get duplicate key errors if data already exists in PostgreSQL.

## 📚 Detailed Documentation

For more details, see:

- **Migration Guide:** `scripts/MIGRATION_README.md` (350+ lines)
- **Validation Guide:** `scripts/VALIDATION_README.md` (300+ lines)
- **Complete Implementation:** `agent-os/specs/2025-11-05-postgresql-migration/IMPLEMENTATION_COMPLETE.md`
- **Staging Runbook:** `agent-os/specs/2025-11-05-postgresql-migration/runbooks/PHASE5_STAGING_RUNBOOK.md`
- **Production Runbook:** `agent-os/specs/2025-11-05-postgresql-migration/runbooks/PHASE6_PRODUCTION_RUNBOOK.md`

## 🎯 Next Steps After Migration

1. ✅ Migration complete and validated
2. ⏳ Update application code for new schema
   - Update junction table queries
   - Update UUID type references
   - Test all CRUD operations
3. ⏳ Run integration tests
4. ⏳ Deploy to staging
5. ⏳ UAT testing
6. ⏳ Production deployment

## 🆘 Need Help?

1. Check error logs: `migration-errors.log`
2. Check validation report: `migration-validation-report.json`
3. Review documentation in `scripts/` and `agent-os/specs/` directories
4. Check TypeScript types: `scripts/migration/types.ts`

---

**You're ready to migrate! 🚀**

Run: `pnpm migrate:mongo-to-postgres`
