# Migration Validation Script

This document describes the migration validation script that verifies data integrity after migrating from MongoDB to PostgreSQL.

## Overview

The validation script implements a **4-layer validation strategy** to ensure 100% data correctness:

1. **Layer 1: Row Count Validation** - Compares total record counts between MongoDB and PostgreSQL
2. **Layer 2: Sample Record Validation** - Validates field-by-field comparison for sample records
3. **Layer 3: Referential Integrity Validation** - Verifies all foreign keys resolve correctly
4. **Layer 4: Data Type Validation** - Validates data type conversions (dates, enums, JSONB, arrays)

## Prerequisites

Before running the validation script:

1. **Migration must be complete** - The migration script must have finished successfully
2. **Checkpoint file exists** - `migration-checkpoint.json` must be present (contains UUID mapping)
3. **Both databases accessible** - MongoDB and PostgreSQL must be running and accessible
4. **Environment variables set**:
   - `DATABASE_URL_MONGODB` - MongoDB connection string (or use `DATABASE_URL` if still pointing to MongoDB)
   - `DATABASE_URL_POSTGRES` - PostgreSQL connection string (or use `DATABASE_URL` if already switched)

## Usage

### Run Validation

```bash
pnpm validate:migration
```

Or directly with ts-node:

```bash
pnpm exec ts-node scripts/validate-migration.ts
```

### Exit Codes

- **Exit 0**: Validation PASSED - Safe to proceed to production
- **Exit 1**: Validation FAILED - Review validation report before proceeding

## Validation Layers

### Layer 1: Row Count Validation

**What it checks:**
- Compares `COUNT(*)` between MongoDB and PostgreSQL for each table
- Validates all 26 entity tables

**Pass criteria:**
- All tables have matching record counts

**Example output:**
```
Layer 1: Row Count Validation
  Status: PASS
  ✓ All 26 tables have matching record counts
```

### Layer 2: Sample Record Validation

**What it checks:**
- Queries random sample of 100 records per table from MongoDB
- Retrieves corresponding records from PostgreSQL using UUID mapping
- Compares field-by-field:
  - Scalar fields (strings, numbers, booleans)
  - DateTime fields (within 1 second tolerance)
  - Array fields (order-agnostic comparison)
  - JSONB fields (deep equality check)
  - Enum values

**Pass criteria:**
- Match percentage >= 99%

**Example output:**
```
Layer 2: Sample Record Validation
  Status: PASS
  Records Validated: 2,600
  Match Percentage: 100.00%
  ✓ 100% field-level match
```

### Layer 3: Referential Integrity Validation

**What it checks:**
- All foreign keys resolve correctly (no orphaned records)
- Junction table relationships are bidirectional and valid
- All referenced IDs exist in their respective tables

**Pass criteria:**
- Zero orphaned records
- All foreign keys valid

**Example output:**
```
Layer 3: Referential Integrity Validation
  Status: PASS
  ✓ All foreign keys resolve correctly
  ✓ No orphaned records found
```

### Layer 4: Data Type Validation

**What it checks:**
- DateTime fields are valid ISO format with reasonable values
- Enum fields contain values within defined enum constraints
- JSONB fields are valid JSON objects
- Array fields are proper PostgreSQL arrays
- Numeric fields have no truncation
- Boolean fields are true/false

**Pass criteria:**
- Zero type conversion errors

**Example output:**
```
Layer 4: Data Type Validation
  Status: PASS
  ✓ All data type conversions valid
```

## Validation Report

The validation script generates two outputs:

### 1. Console Output

Real-time summary displayed in the terminal with:
- Color-coded PASS/FAIL status
- Summary statistics
- Layer-by-layer results
- Sample of errors (if any)

### 2. JSON Report File

Saved as `migration-validation-report.json` with complete details:

```json
{
  "timestamp": "2025-11-05T12:34:56.789Z",
  "overallStatus": "PASS",
  "summary": {
    "totalTables": 26,
    "tablesValidated": 26,
    "tablesPassed": 26,
    "tablesFailed": 0,
    "totalRecords": 125430,
    "recordsValidated": 2600,
    "matchPercentage": 100.0
  },
  "rowCountValidation": {
    "status": "PASS",
    "discrepancies": []
  },
  "sampleRecordValidation": {
    "status": "PASS",
    "fieldMismatches": [],
    "matchPercentage": 100.0
  },
  "referentialIntegrityValidation": {
    "status": "PASS",
    "orphanedRecords": [],
    "brokenForeignKeys": []
  },
  "dataTypeValidation": {
    "status": "PASS",
    "typeErrors": []
  },
  "detailedResults": [
    {
      "tableName": "crm_Accounts",
      "rowCount": {
        "mongoCount": 5000,
        "postgresql": 5000,
        "match": true
      },
      "sampleValidation": {
        "sampleSize": 100,
        "matched": 100,
        "mismatched": 0,
        "matchPercentage": 100.0
      },
      "foreignKeyValidation": {
        "totalForeignKeys": 4,
        "validForeignKeys": 4,
        "orphanedRecordsCount": 0
      },
      "status": "PASS"
    }
  ]
}
```

## Interpreting Results

### If Validation PASSES

All 4 layers passed validation:
- ✅ Row counts match perfectly
- ✅ Sample records match >= 99%
- ✅ All foreign keys valid
- ✅ All data types correct

**Action:** Safe to update `DATABASE_URL` to PostgreSQL and deploy to production.

### If Validation FAILS

Review the validation report to identify issues:

#### Row Count Discrepancies

**Symptom:**
```
Row Count Validation: FAIL
  Discrepancies: 2
    - crm_Accounts: MongoDB=5000, PostgreSQL=4998 (diff: -2)
```

**Causes:**
- Records failed to migrate (check migration error logs)
- Migration was interrupted
- Records were added to MongoDB after migration started

**Resolution:**
1. Review `migration-errors.log` for failed records
2. Fix data issues in MongoDB
3. Re-run migration or manually migrate missing records

#### Field Mismatches

**Symptom:**
```
Sample Record Validation: FAIL
  Match Percentage: 97.5%
  Field Mismatches: 65
    - crm_Accounts.name (Record: 507f1f77bcf86cd799439011)
```

**Causes:**
- Data transformation errors
- Date format conversion issues
- JSONB structure changes
- Array normalization problems

**Resolution:**
1. Review specific field mismatches in JSON report
2. Identify pattern in errors
3. Fix transformation logic in migration script
4. Re-run migration

#### Orphaned Records

**Symptom:**
```
Referential Integrity Validation: FAIL
  Orphaned Records: 12
    - crm_Opportunities.account -> crm_Accounts (Record: uuid-123)
```

**Causes:**
- Foreign key references broken during migration
- UUID mapping incomplete
- Records migrated out of dependency order

**Resolution:**
1. Check UUID mapping in checkpoint file
2. Verify migration order respected dependencies
3. Fix foreign key transformation logic
4. Re-run migration

#### Type Conversion Errors

**Symptom:**
```
Data Type Validation: FAIL
  Type Errors: 5
    - crm_Accounts.createdAt: Invalid DateTime format
```

**Causes:**
- Date format conversion failed
- Enum values outside defined constraints
- JSONB structure corrupted
- Array not properly converted

**Resolution:**
1. Review specific type errors in JSON report
2. Fix data type conversion logic
3. Re-run migration

## Troubleshooting

### Checkpoint File Not Found

**Error:**
```
✗ Failed to load checkpoint file. Migration may not be complete.
```

**Solution:**
- Ensure `migration-checkpoint.json` exists in project root
- If missing, migration was not completed successfully
- Re-run migration script

### Database Connection Errors

**Error:**
```
✗ Failed to connect to databases: ...
```

**Solutions:**
- Verify `DATABASE_URL_MONGODB` is set correctly
- Verify `DATABASE_URL_POSTGRES` is set correctly
- Check database servers are running
- Verify network connectivity

### Memory Issues

**Error:**
```
JavaScript heap out of memory
```

**Solution:**
- Validation samples 100 records per table (2600 total)
- If database is extremely large, increase Node.js memory:
```bash
NODE_OPTIONS="--max-old-space-size=4096" pnpm validate:migration
```

## Next Steps After Validation

### If Validation PASSES

1. **Update DATABASE_URL** to PostgreSQL:
   ```bash
   # In .env or environment configuration
   DATABASE_URL="postgresql://user:password@localhost:5432/nextcrm"
   ```

2. **Generate Prisma Client** for PostgreSQL:
   ```bash
   pnpm exec prisma generate
   ```

3. **Restart Application**:
   ```bash
   pnpm build
   pnpm start
   ```

4. **Smoke Test Application**:
   - Login as admin
   - View accounts, contacts, opportunities
   - Create test record
   - Search functionality
   - Run reports

5. **Monitor for 48 Hours**:
   - Watch application logs for errors
   - Monitor PostgreSQL query performance
   - Collect user feedback

6. **Keep MongoDB as Backup** (30 days):
   - Do not delete MongoDB data immediately
   - Maintain for rollback capability

### If Validation FAILS

1. **Review Validation Report**:
   - Check `migration-validation-report.json`
   - Identify patterns in errors

2. **Fix Migration Issues**:
   - Update migration transformation logic
   - Fix data issues in MongoDB
   - Correct UUID mapping bugs

3. **Clean PostgreSQL Database**:
   ```sql
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   ```

4. **Re-run Migration**:
   ```bash
   pnpm migrate:mongo-to-postgres
   ```

5. **Re-run Validation**:
   ```bash
   pnpm validate:migration
   ```

6. **Repeat Until PASS**

## Performance

Validation typically takes:
- **Small database** (< 10,000 records): 2-5 minutes
- **Medium database** (10,000 - 100,000 records): 5-15 minutes
- **Large database** (> 100,000 records): 15-45 minutes

Sample size of 100 records per table (2600 total) balances thoroughness with performance.

## Files Generated

- `migration-validation-report.json` - Complete validation report (keep for records)

## Integration with CI/CD

The validation script returns proper exit codes and can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Migration
  run: pnpm migrate:mongo-to-postgres

- name: Validate Migration
  run: pnpm validate:migration

- name: Deploy to Production
  if: success()
  run: pnpm deploy
```

## Support

If validation consistently fails or you need assistance:
1. Review this README thoroughly
2. Check migration error logs
3. Review validation report JSON file
4. Consult migration specification document
5. Reach out to development team with:
   - Validation report JSON
   - Migration error log
   - Database sizes and record counts
   - Specific error patterns
