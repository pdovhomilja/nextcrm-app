# Validation Script Quick Start Guide

## Quick Run

```bash
npm run validate:migration
```

## Prerequisites Checklist

- [ ] Migration script completed successfully
- [ ] `migration-checkpoint.json` exists in project root
- [ ] MongoDB is running and accessible
- [ ] PostgreSQL is running and accessible
- [ ] Environment variables are set

## Environment Variables

Set one of these configurations:

**Option 1: Separate URLs**
```bash
DATABASE_URL_MONGODB="mongodb://user:pass@localhost:27017/nextcrm"
DATABASE_URL_POSTGRES="postgresql://user:pass@localhost:5432/nextcrm"
```

**Option 2: Single URL** (if already switched to PostgreSQL)
```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/nextcrm"
# Keep old MongoDB URL accessible for validation
```

## What Gets Validated

### Layer 1: Row Counts
- Compares total records in all 26 tables
- Must match exactly

### Layer 2: Sample Records
- Validates 100 records per table (2,600 total)
- Field-by-field comparison
- Must match >= 99%

### Layer 3: Referential Integrity
- All foreign keys must resolve
- No orphaned records allowed
- All 10 junction tables validated

### Layer 4: Data Types
- DateTime formats valid
- Enums within constraints
- JSONB structures correct
- Arrays properly formatted

## Expected Output

### If PASS
```
================================================================
         NextCRM Migration Validation Report
================================================================

Overall Status: PASS

🎉 VALIDATION PASSED 🎉

✓ Safe to update DATABASE_URL and deploy to production!
================================================================
```

**Exit Code:** 0

### If FAIL
```
================================================================
         NextCRM Migration Validation Report
================================================================

Overall Status: FAIL

❌ VALIDATION FAILED ❌

⚠ Review validation report before proceeding to production.
  See migration-validation-report.json for detailed information.
================================================================
```

**Exit Code:** 1

## Output Files

- `migration-validation-report.json` - Detailed validation results

## Validation Time

- **Small DB** (< 10,000 records): 2-5 minutes
- **Medium DB** (10K-100K records): 5-15 minutes
- **Large DB** (> 100K records): 15-45 minutes

## If Validation Fails

1. **Review the JSON report:**
   ```bash
   cat migration-validation-report.json | jq '.'
   ```

2. **Check common issues:**
   - Row count mismatches → Records failed to migrate
   - Field mismatches → Data transformation errors
   - Orphaned records → Foreign key mapping issues
   - Type errors → Data type conversion problems

3. **Fix and retry:**
   ```bash
   # Fix issues in migration script
   # Clean PostgreSQL database
   # Re-run migration
   npm run migrate:mongo-to-postgres

   # Re-run validation
   npm run validate:migration
   ```

## If Validation Passes

1. **Update DATABASE_URL:**
   ```bash
   # In .env
   DATABASE_URL="postgresql://user:pass@localhost:5432/nextcrm"
   ```

2. **Regenerate Prisma Client:**
   ```bash
   npx prisma generate
   ```

3. **Restart application:**
   ```bash
   npm run build
   npm start
   ```

4. **Monitor for 48 hours**

5. **Keep MongoDB backup for 30 days**

## Troubleshooting

### Checkpoint File Not Found
```
✗ Failed to load checkpoint file
```
**Solution:** Ensure migration script completed and created `migration-checkpoint.json`

### Database Connection Failed
```
✗ Failed to connect to databases
```
**Solution:** Check DATABASE_URL variables and database servers are running

### Out of Memory
```
JavaScript heap out of memory
```
**Solution:**
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run validate:migration
```

## Full Documentation

See `VALIDATION_README.md` for complete documentation including:
- Detailed explanation of each validation layer
- Validation report structure
- Complete troubleshooting guide
- Integration with CI/CD
- Next steps after validation

## Support

If validation fails and you need help:
1. Save the JSON report
2. Check migration error logs
3. Review spec document
4. Contact development team with:
   - Validation report JSON
   - Migration error log
   - Database record counts
   - Error patterns
