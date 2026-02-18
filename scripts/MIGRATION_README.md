# MongoDB to PostgreSQL Migration Scripts

## Overview

This directory contains the migration tooling for migrating NextCRM from MongoDB to PostgreSQL. The migration supports:

- **Progress Tracking**: Real-time console output with progress bars and ETA
- **Pause/Resume**: Graceful interruption handling with checkpoint system
- **Error Logging**: Comprehensive error capture with full context
- **Type Safety**: Strict TypeScript with no 'any' types
- **Transaction Safety**: Batch processing with rollback on errors

## Architecture

### Core Modules

1. **types.ts** - TypeScript interfaces for migration state, errors, and progress
2. **utils.ts** - Utility functions for data transformation and validation
3. **uuid-mapper.ts** - ObjectId to UUID mapping manager
4. **progress-tracker.ts** - Progress tracking and console output
5. **checkpoint-manager.ts** - Checkpoint save/load and resume logic
6. **error-logger.ts** - Error logging and summary generation
7. **table-config.ts** - Table migration order and phase configuration

### Migration Flow

```
1. Initialize
   ├─ Load checkpoint (if exists)
   ├─ Connect to MongoDB and PostgreSQL
   └─ Initialize UUID mapper, progress tracker, error logger

2. Validate
   ├─ Verify PostgreSQL schema exists
   ├─ Verify all expected tables present
   └─ Check foreign key constraints defined

3. Migrate Tables (by phase)
   For each table:
   ├─ Check if already completed (checkpoint)
   ├─ Query total record count
   ├─ Process in batches (1000 records)
   │  ├─ Transform records (ObjectId → UUID)
   │  ├─ Begin transaction
   │  ├─ Insert batch
   │  ├─ Commit transaction
   │  └─ Update checkpoint
   └─ Mark table as completed

4. Populate Junction Tables
   ├─ Extract relationships from MongoDB
   ├─ Transform using UUID mapping
   └─ Insert junction records

5. Finalize
   ├─ Display migration summary
   ├─ Generate error report
   ├─ Delete checkpoint (success)
   └─ Close connections
```

## Migration Phases

### Phase 1: Independent Lookup Tables
- crm_Industry_Type
- Documents_Types
- invoice_States
- system_Modules_Enabled
- modulStatus
- systemServices
- gpt_models

### Phase 2: Core Entity Tables
- Users
- MyAccount
- Employees
- ImageUpload
- TodoList

### Phase 3: CRM Configuration
- crm_campaigns
- crm_Opportunities_Sales_Stages
- crm_Opportunities_Type

### Phase 4: CRM Core Tables
- crm_Accounts
- crm_Contacts
- crm_Leads
- crm_Contracts

### Phase 5: CRM Opportunities
- crm_Opportunities

### Phase 6: Task and Board Tables
- Boards
- Sections
- Tasks
- crm_Accounts_Tasks

### Phase 7: Task Comments
- tasksComments

### Phase 8: Documents and Invoices
- Documents
- Invoices

### Phase 9: Integration Tables
- secondBrain_notions
- openAi_keys

### Phase 10: Junction Tables (Many-to-Many)
- DocumentsToInvoices
- DocumentsToOpportunities
- DocumentsToContacts
- DocumentsToTasks
- DocumentsToCrmAccountsTasks
- DocumentsToLeads
- DocumentsToAccounts
- ContactsToOpportunities
- AccountWatchers
- BoardWatchers

## Usage

### Prerequisites

1. PostgreSQL 16 installed and running
2. PostgreSQL database created
3. Prisma schema migrated to PostgreSQL: `pnpm exec prisma migrate deploy`
4. MongoDB instance accessible with data

### Running the Migration

```bash
# Start migration
pnpm migrate:mongo-to-postgres

# Migration will display progress in console
# Press Ctrl+C to pause (checkpoint will be saved)

# Resume from checkpoint
pnpm migrate:mongo-to-postgres
```

### Checkpoint System

The migration automatically saves checkpoints every 10 batches. Checkpoint includes:

- Current table being processed
- List of completed tables
- ObjectId → UUID mapping (all records)
- Migrated record UUIDs per table
- Total records migrated
- Total errors

**Checkpoint file**: `./migration-checkpoint.json`

### Error Logging

Errors are logged with full context to `./migration-errors.log`:

- Table name
- MongoDB ObjectId
- PostgreSQL UUID (if generated)
- Error message and stack trace
- Original MongoDB document
- Timestamp and batch number

The migration continues processing other records after errors.

### Graceful Shutdown

Press **Ctrl+C** to pause the migration:

1. Current batch completes
2. Checkpoint is saved
3. Connections are closed gracefully
4. Migration can be resumed later

## Post-Migration

### 1. Run Validation Script

```bash
pnpm validate:migration
```

Validates:
- Row counts match (MongoDB vs PostgreSQL)
- Sample records match field-by-field
- Referential integrity (all foreign keys valid)
- Data type conversions correct

### 2. Update DATABASE_URL

```bash
# .env
DATABASE_URL="postgresql://username:password@localhost:5432/nextcrm"
```

### 3. Generate Prisma Client

```bash
pnpm exec prisma generate
```

### 4. Test Application

- Start application
- Verify data loads correctly
- Test CRUD operations
- Check reports and dashboards

## Configuration

### Batch Size

Default: 1000 records per batch

Can be modified in `table-config.ts`:

```typescript
export const DEFAULT_MIGRATION_CONFIG: MigrationConfig = {
  batchSize: 1000,  // Adjust if needed
  // ...
};
```

### Checkpoint Interval

Default: Save every 10 batches

Can be modified in `table-config.ts`:

```typescript
export const DEFAULT_MIGRATION_CONFIG: MigrationConfig = {
  checkpointInterval: 10,  // Adjust if needed
  // ...
};
```

## Troubleshooting

### Migration Fails with Foreign Key Errors

**Cause**: Referenced records not yet migrated
**Solution**: Check table migration order in `table-config.ts`. Ensure dependent tables come after their dependencies.

### Checkpoint File Corrupted

**Cause**: Process killed during checkpoint save
**Solution**: Delete `migration-checkpoint.json` and restart migration from beginning.

### Memory Issues with Large Databases

**Cause**: UUID mapping grows too large
**Solution**: Checkpoint system persists mapping to disk. Pause and resume to free memory.

### PostgreSQL Connection Timeout

**Cause**: Long-running migration
**Solution**: Migration uses batch processing. Connection is maintained. Check PostgreSQL connection limits.

## File Outputs

### migration-checkpoint.json
- Migration state for resume
- ObjectId → UUID mapping
- Progress tracking data

### migration-errors.log
- Detailed error logs
- Failed record information
- Error patterns and summary

### migration-validation-report.json
- Validation results (generated by validation script)
- Row counts comparison
- Sample record validation
- Referential integrity checks

## Development

### TypeScript Compilation

```bash
# Check types
pnpm exec tsc --noEmit

# The migration script is executed via ts-node
```

### Testing

Unit tests are located in `__tests__/migration/` directory:

```bash
# Run migration tests
pnpm test:migration
```

## Support

For issues or questions:
1. Check error log: `migration-errors.log`
2. Check checkpoint state: `migration-checkpoint.json`
3. Review validation report: `migration-validation-report.json`
4. Consult specification: `agent-os/specs/2025-11-05-postgresql-migration/spec.md`
