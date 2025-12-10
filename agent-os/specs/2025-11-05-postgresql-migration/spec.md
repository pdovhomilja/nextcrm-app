# Specification: PostgreSQL Migration

## Executive Summary

This specification defines the complete migration of NextCRM's database layer from MongoDB to PostgreSQL 16. This migration is the TOP PRIORITY for Phase 1 (Q1-Q2 2025) to establish an enterprise-grade foundation that enables advanced AI/RAG features, improves relational data modeling, and delivers better performance for complex queries.

The migration involves redesigning the schema for 26 models, building robust migration tooling with pause/resume capabilities, implementing comprehensive data validation, and establishing a strategic indexing approach. Zero data loss is mandatory.

## Background and Motivation

### Current State

NextCRM currently uses MongoDB 7 with Prisma ORM for data persistence. The application manages:
- 26 distinct models across CRM, task management, documents, invoices, and system configuration
- Relational data patterns (accounts → contacts → opportunities → contracts) modeled in MongoDB
- Array-based many-to-many relationships using ObjectId references
- MongoDB ObjectIds as primary keys throughout the system

### Why PostgreSQL?

**1. Better Relational Modeling**
CRM data is inherently relational. PostgreSQL's native relational capabilities, foreign key constraints, and join optimizations provide a more natural fit than MongoDB's document model.

**2. AI/RAG Enablement**
Phase 2's AI-first features require pgvector extension for vector similarity search, embedding storage, and semantic retrieval - capabilities critical for RAG architecture.

**3. Performance at Scale**
PostgreSQL's query optimizer, advanced indexing (B-tree, GIN, GiST), and materialized views deliver superior performance for complex aggregations and multi-table joins common in CRM applications.

**4. Ecosystem Compatibility**
Broader tool support, monitoring solutions (pg_stat_statements, pgAdmin), enterprise integrations, and a mature extension ecosystem.

**5. Enterprise Adoption**
Mid-market companies (target users) prefer PostgreSQL for self-hosted deployments due to maturity, reliability, and operational tooling.

## Goals and Non-Goals

### Goals

1. **Complete Schema Migration**: Convert all 26 MongoDB models to PostgreSQL-optimized relational schema
2. **Zero Data Loss**: Migrate all existing data with comprehensive validation proving correctness
3. **Preserve Relationships**: Maintain all foreign key relationships and data integrity
4. **Performance Improvement**: Achieve < 100ms response time for simple queries through strategic indexing
5. **Robust Tooling**: Build production-grade migration script with progress tracking, pause/resume, and error logging
6. **Future-Ready**: Enable pgvector for Phase 2 AI/RAG features
7. **Type Safety**: Maintain strict TypeScript typing throughout migration tooling

### Non-Goals

1. **Application Code Refactoring**: Prisma abstracts database differences; minimal application changes expected
2. **Performance Benchmarking**: Focus on correctness; performance validation is separate effort
3. **Automatic Rollback**: Manual rollback via MongoDB backup restore if needed
4. **Migration UI**: CLI-based migration only; no web interface
5. **Zero Downtime**: Self-hosted deployment allows maintenance windows
6. **pgvector Implementation**: Extension enabled but RAG features are Phase 2

## Detailed Technical Specification

### Architecture Overview

```
[MongoDB Database] → [Migration Script] → [PostgreSQL Database]
                            ↓
                    [Checkpoint System]
                    [Error Logging]
                    [Progress Tracking]
                            ↓
                    [Validation Script]
                    [4-Layer Verification]
```

### Key Architectural Decisions

**1. Normalization Strategy**
- Junction tables for many-to-many relationships (9 new tables)
- PostgreSQL arrays for simple lists (tags, notes)
- JSONB for complex nested structures (invoice_items, flexible tags)

**2. Primary Key Migration**
- Replace MongoDB ObjectId with PostgreSQL UUID
- Generate new UUIDs during migration
- Maintain ObjectId → UUID mapping for referential integrity

**3. Transaction Safety**
- Batch processing with transactions per batch
- Rollback individual batches on failure
- Continue processing remaining records

## PostgreSQL Schema Design

### Model Overview

**26 Models Organized by Domain:**

**CRM Core (8 models):**
- `crm_Accounts` - Company/account management
- `crm_Contacts` - Contact person records
- `crm_Leads` - Lead tracking
- `crm_Opportunities` - Sales pipeline
- `crm_Contracts` - Contract management
- `crm_campaigns` - Marketing campaigns
- `crm_Opportunities_Sales_Stages` - Pipeline stages
- `crm_Opportunities_Type` - Opportunity classifications

**Task & Project Management (5 models):**
- `Tasks` - General tasks with kanban
- `crm_Accounts_Tasks` - CRM-specific tasks
- `tasksComments` - Task comments
- `Sections` - Kanban sections
- `Boards` - Project boards

**Documents & Invoices (4 models):**
- `Documents` - File storage
- `Documents_Types` - Document classifications
- `Invoices` - Invoice records
- `invoice_States` - Invoice statuses

**System & Configuration (5 models):**
- `Users` - User accounts
- `system_Modules_Enabled` - Module configuration
- `modulStatus` - Module status
- `systemServices` - External services
- `MyAccount` - Organization settings

**Lookup & Other (4 models):**
- `crm_Industry_Type` - Industry classifications
- `secondBrain_notions` - Notion integration
- `openAi_keys` - OpenAI keys
- `Employees` - Employee records
- `ImageUpload` - Image tracking
- `TodoList` - Todo lists
- `gpt_models` - GPT configurations

### Junction Tables for Many-to-Many Relationships

**New Junction Tables (9):**

1. **_DocumentsToInvoices**
   - `document_id` UUID (FK → Documents.id)
   - `invoice_id` UUID (FK → Invoices.id)
   - Composite primary key (document_id, invoice_id)
   - Indexes on both columns

2. **_DocumentsToOpportunities**
   - `document_id` UUID (FK → Documents.id)
   - `opportunity_id` UUID (FK → crm_Opportunities.id)
   - Composite primary key (document_id, opportunity_id)
   - Indexes on both columns

3. **_DocumentsToContacts**
   - `document_id` UUID (FK → Documents.id)
   - `contact_id` UUID (FK → crm_Contacts.id)
   - Composite primary key (document_id, contact_id)
   - Indexes on both columns

4. **_DocumentsToTasks**
   - `document_id` UUID (FK → Documents.id)
   - `task_id` UUID (FK → Tasks.id)
   - Composite primary key (document_id, task_id)
   - Indexes on both columns

5. **_DocumentsToCrmAccountsTasks**
   - `document_id` UUID (FK → Documents.id)
   - `crm_accounts_task_id` UUID (FK → crm_Accounts_Tasks.id)
   - Composite primary key (document_id, crm_accounts_task_id)
   - Indexes on both columns

6. **_DocumentsToLeads**
   - `document_id` UUID (FK → Documents.id)
   - `lead_id` UUID (FK → crm_Leads.id)
   - Composite primary key (document_id, lead_id)
   - Indexes on both columns

7. **_DocumentsToAccounts**
   - `document_id` UUID (FK → Documents.id)
   - `account_id` UUID (FK → crm_Accounts.id)
   - Composite primary key (document_id, account_id)
   - Indexes on both columns

8. **_AccountWatchers**
   - `account_id` UUID (FK → crm_Accounts.id)
   - `user_id` UUID (FK → Users.id)
   - Composite primary key (account_id, user_id)
   - Indexes on both columns

9. **_BoardWatchers**
   - `board_id` UUID (FK → Boards.id)
   - `user_id` UUID (FK → Users.id)
   - Composite primary key (board_id, user_id)
   - Indexes on both columns

### Fields Kept as PostgreSQL Arrays

**Simple String/ID Arrays:**
- `crm_Contacts.tags` - String array for tagging
- `crm_Contacts.notes` - Text array for notes
- `Boards.sharedWith` - UUID array for board sharing

**Rationale:** Simple arrays that don't require complex queries or referential integrity benefit from PostgreSQL's native array support.

### Fields Kept as JSONB

**Complex Nested Structures:**
- `Invoices.invoice_items` - Complex line items with nested properties
- `Documents.tags` - Flexible tag objects with metadata
- `Tasks.tags` - Flexible task tags
- `crm_Accounts_Tasks.tags` - Flexible task tags

**Rationale:** These fields have flexible schemas, complex nesting, and are queried as complete objects rather than individual properties. JSONB provides flexibility while maintaining PostgreSQL query capabilities.

### ObjectId to UUID Migration

**Transformation Rules:**
- All `@db.ObjectId` → `@db.Uuid`
- All `@default(auto())` → `@default(uuid())`
- All foreign key references updated to UUID type
- Migration script maintains ObjectId → UUID mapping in memory during migration

### Enums Preserved

All 9 existing enums remain unchanged:
- `crm_Lead_Status` (NEW, CONTACTED, QUALIFIED, LOST)
- `crm_Lead_Type` (DEMO)
- `crm_Opportunity_Status` (ACTIVE, INACTIVE, PENDING, CLOSED)
- `crm_Contact_Type` (Customer, Partner, Vendor, Prospect)
- `crm_Contracts_Status` (NOTSTARTED, INPROGRESS, SIGNED)
- `DocumentSystemType` (INVOICE, RECEIPT, CONTRACT, OFFER, OTHER)
- `taskStatus` (ACTIVE, PENDING, COMPLETE)
- `ActiveStatus` (ACTIVE, INACTIVE, PENDING)
- `Language` (cz, en, de, uk)
- `gptStatus` (ACTIVE, INACTIVE)

## Migration Script Architecture

### Core Requirements

**1. Progress Tracking**
- Display overall percentage completion
- Show per-table progress (processed / total records)
- Display current table being migrated
- Estimate time remaining based on average processing speed
- Real-time console output with progress bars

**2. Pause/Resume Capability**
- Graceful SIGINT (Ctrl+C) handling
- Save checkpoint file with migration state:
  - Current table being processed
  - Records successfully migrated (by UUID)
  - ObjectId → UUID mapping
  - Timestamp of checkpoint
- Resume from checkpoint on restart:
  - Read checkpoint file
  - Skip already-migrated records
  - Continue from last position
- Checkpoint file location: `./migration-checkpoint.json`

**3. Detailed Error Logging**
- Log specific record IDs (MongoDB ObjectId) that fail
- Include full error message and stack trace
- Log original MongoDB document that failed (for debugging)
- Create separate error log file: `./migration-errors.log`
- Continue processing other records after failure
- Generate error summary at end:
  - Total errors
  - Errors by table
  - Failed record IDs list

**4. Batch Processing**
- Fixed batch size: 1000 records per batch
- Transaction per batch for atomicity
- Rollback batch on any error within batch
- Log batch progress to console

### Migration Script Flow

**Phase 1: Initialization**
1. Check for checkpoint file; load if exists
2. Connect to both MongoDB and PostgreSQL databases
3. Validate database connections
4. Initialize ObjectId → UUID mapping (empty or from checkpoint)
5. Initialize error logging system

**Phase 2: Schema Validation**
1. Verify PostgreSQL schema exists (Prisma migrate already run)
2. Validate all tables present
3. Check foreign key constraints defined

**Phase 3: Data Migration (Sequential by Table)**

**Order of Migration (respects dependencies):**
1. Independent lookup tables first (no foreign key dependencies):
   - `crm_Industry_Type`
   - `Documents_Types`
   - `invoice_States`
   - `system_Modules_Enabled`
   - `modulStatus`
   - `systemServices`
   - `gpt_models`

2. Core entity tables:
   - `Users` (independent)
   - `MyAccount` (independent)
   - `Employees` (independent)
   - `ImageUpload` (independent)
   - `TodoList` (independent)

3. CRM core tables (in dependency order):
   - `crm_Accounts` (depends on Users, crm_Industry_Type)
   - `crm_campaigns` (independent)
   - `crm_Opportunities_Sales_Stages` (independent)
   - `crm_Opportunities_Type` (independent)
   - `crm_Contacts` (depends on Users, crm_Accounts)
   - `crm_Leads` (depends on Users, crm_Accounts)
   - `crm_Opportunities` (depends on Users, crm_Accounts, crm_campaigns, crm_Contacts, crm_Opportunities_Sales_Stages, crm_Opportunities_Type)
   - `crm_Contracts` (depends on Users, crm_Accounts)

4. Task and board tables:
   - `Boards` (depends on Users)
   - `Sections` (depends on Boards)
   - `Tasks` (depends on Users, Sections)
   - `crm_Accounts_Tasks` (depends on Users, crm_Accounts)
   - `tasksComments` (depends on Users, Tasks, crm_Accounts_Tasks)

5. Document and invoice tables:
   - `Documents` (depends on Users, Documents_Types)
   - `Invoices` (depends on Users, crm_Accounts, invoice_States)

6. Integration tables:
   - `secondBrain_notions` (depends on Users)
   - `openAi_keys` (depends on Users)

7. Junction tables (after all entity tables):
   - `_DocumentsToInvoices`
   - `_DocumentsToOpportunities`
   - `_DocumentsToContacts`
   - `_DocumentsToTasks`
   - `_DocumentsToCrmAccountsTasks`
   - `_DocumentsToLeads`
   - `_DocumentsToAccounts`
   - `_AccountWatchers`
   - `_BoardWatchers`

**Per-Table Migration Logic:**
```typescript
for each table in migrationOrder:
  1. Query total record count from MongoDB
  2. Check checkpoint for already-migrated records (skip if done)
  3. Query records in batches (1000 records)
  4. For each batch:
     a. Begin PostgreSQL transaction
     b. Transform each record:
        - Generate new UUID (or retrieve from mapping if exists)
        - Store ObjectId → UUID mapping
        - Transform foreign key references using mapping
        - Convert dates to ISO format
        - Handle array field normalization
        - Handle JSONB conversion
     c. Insert batch into PostgreSQL
     d. Commit transaction
     e. Update checkpoint file
     f. Update progress display
  5. Handle errors:
     - Log failed record ID and error
     - Rollback batch transaction
     - Continue with next batch
```

**Phase 4: Junction Table Population**
1. Query MongoDB for array-based relationships
2. Use ObjectId → UUID mapping to populate junction tables
3. Batch insert junction records (1000 per batch)
4. Update checkpoint after each batch

**Phase 5: Finalization**
1. Display migration summary:
   - Total records migrated
   - Total errors
   - Migration duration
   - Records per second
2. Generate error report (if errors occurred)
3. Delete checkpoint file (successful completion)
4. Close database connections

### Migration Script Technical Implementation

**Technology Stack:**
- TypeScript with strict mode enabled
- Prisma Client for both MongoDB and PostgreSQL connections
- Node.js native libraries for file I/O (checkpoint, logs)
- `cli-progress` library for progress bars
- `chalk` library for colored console output

**File Structure:**
```
/scripts/
  migrate-mongo-to-postgres.ts    # Main migration script
  migration-types.ts              # TypeScript interfaces
  migration-utils.ts              # Helper functions
  checkpoint-manager.ts           # Checkpoint save/load logic
  error-logger.ts                 # Error logging utilities
  progress-tracker.ts             # Progress tracking
```

**Key Functions:**

```typescript
// Main migration orchestrator
async function runMigration(): Promise<void>

// ObjectId → UUID mapping management
function generateAndMapUuid(mongoId: string): string
function getUuidForMongoId(mongoId: string): string | undefined

// Checkpoint management
async function saveCheckpoint(state: MigrationState): Promise<void>
async function loadCheckpoint(): Promise<MigrationState | null>

// Batch processing
async function migrateBatch<T>(
  records: T[],
  transformFn: (record: T) => any,
  tableName: string
): Promise<void>

// Error handling
function logError(
  tableName: string,
  recordId: string,
  error: Error,
  document: any
): void

// Progress tracking
function updateProgress(
  tableName: string,
  processed: number,
  total: number
): void
```

**Checkpoint File Format:**
```json
{
  "version": "1.0",
  "timestamp": "2025-11-05T10:30:45.123Z",
  "currentTable": "crm_Opportunities",
  "completedTables": ["Users", "crm_Accounts", "crm_Contacts"],
  "objectIdToUuidMap": {
    "507f1f77bcf86cd799439011": "550e8400-e29b-41d4-a716-446655440000",
    "...": "..."
  },
  "migratedRecords": {
    "Users": ["uuid1", "uuid2", "..."],
    "crm_Accounts": ["uuid3", "uuid4", "..."]
  },
  "totalRecordsMigrated": 12543,
  "totalErrors": 3
}
```

**Error Log Format:**
```
[2025-11-05T10:30:45.123Z] ERROR in table "crm_Opportunities"
MongoDB ObjectId: 507f1f77bcf86cd799439011
Error: Foreign key constraint violation: account_id does not exist
Stack: Error: Foreign key constraint violation...
    at Object.migrateBatch (...)
Original Document:
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Big Deal",
  "account": "507f1f77bcf86cd799439012",
  ...
}
---
```

### Migration Script Execution

**Command:**
```bash
npm run migrate:mongo-to-postgres
```

**Package.json script:**
```json
{
  "scripts": {
    "migrate:mongo-to-postgres": "ts-node scripts/migrate-mongo-to-postgres.ts"
  }
}
```

**Console Output Example:**
```
🚀 NextCRM MongoDB → PostgreSQL Migration
==========================================

📊 Checkpoint found: Resuming from crm_Opportunities (12,543 records already migrated)

📋 Migration Plan:
   - Total tables: 35 (26 entity tables + 9 junction tables)
   - Completed: 5 tables
   - Remaining: 30 tables

🔄 Migrating: crm_Opportunities
   Progress: [████████████████────] 75% (7,500/10,000) | ETA: 2m 30s

✅ Completed: crm_Opportunities (10,000 records in 3m 45s)

⚠️  Errors: 3 records failed (see migration-errors.log)

🎉 Migration Complete!
   - Total records: 125,430
   - Duration: 45m 23s
   - Speed: 46.1 records/second
   - Errors: 12 records (0.01%)
```

## Data Validation Script

### Four-Layer Validation Strategy

**Layer 1: Row Count Validation**
- Compare total record counts for each table
- Report discrepancies with exact counts
- Fail validation if any counts mismatch

**Layer 2: Sample Record Validation**
- Select random sample (100 records per table, or all if fewer)
- Compare field-by-field between MongoDB and PostgreSQL
- Validate data transformations:
  - ObjectId → UUID mapping
  - DateTime conversions
  - Array normalizations
  - JSONB conversions
- Report field-level mismatches

**Layer 3: Referential Integrity Validation**
- Verify all foreign keys resolve correctly
- Check for orphaned records
- Validate junction table relationships are bidirectional
- Ensure UUID mappings maintain original relationships

**Layer 4: Data Type Conversion Validation**
- Verify DateTime fields within acceptable delta (1 second)
- Check array fields preserved correctly
- Validate JSONB structure matches original JSON
- Confirm enum values within defined constraints
- Check boolean conversions

### Validation Script Flow

**Phase 1: Initialization**
1. Connect to both MongoDB and PostgreSQL
2. Load ObjectId → UUID mapping from checkpoint file
3. Initialize validation report structure

**Phase 2: Row Count Validation**
```typescript
for each table:
  1. Query MongoDB count
  2. Query PostgreSQL count
  3. Compare counts
  4. Log discrepancy if mismatch
  5. Mark validation failed if counts don't match
```

**Phase 3: Sample Record Validation**
```typescript
for each table:
  1. Query random sample from MongoDB (100 records)
  2. Get corresponding PostgreSQL records using UUID mapping
  3. For each record:
     a. Compare scalar fields (strings, numbers, booleans)
     b. Compare dates (within 1 second tolerance)
     c. Compare arrays (order-agnostic if appropriate)
     d. Compare JSONB (deep equality)
     e. Log any field mismatches
  4. Calculate match percentage
  5. Mark validation failed if match < 99%
```

**Phase 4: Referential Integrity Validation**
```typescript
for each table with foreign keys:
  1. Query all foreign key values from PostgreSQL
  2. Verify each foreign key exists in referenced table
  3. Log orphaned records
  4. Mark validation failed if orphaned records exist

for each junction table:
  1. Verify all IDs exist in both referenced tables
  2. Check bidirectional consistency
  3. Log integrity violations
```

**Phase 5: Data Type Validation**
```typescript
for each table:
  1. Validate DateTime fields (ISO format, reasonable values)
  2. Validate enum fields (within defined values)
  3. Validate JSONB structure (valid JSON, expected schema)
  4. Validate arrays (proper PostgreSQL array format)
  5. Validate numeric fields (proper types, no truncation)
  6. Log type conversion errors
```

**Phase 6: Report Generation**
1. Compile all validation results
2. Generate summary:
   - Total tables validated
   - Pass/fail status
   - Total discrepancies found
   - Detailed error list
3. Save report to `./migration-validation-report.json`
4. Print summary to console
5. Exit with code 0 (pass) or 1 (fail)

### Validation Script Execution

**Command:**
```bash
npm run validate:migration
```

**Package.json script:**
```json
{
  "scripts": {
    "validate:migration": "ts-node scripts/validate-migration.ts"
  }
}
```

**Validation Report Format:**
```json
{
  "timestamp": "2025-11-05T11:15:30.456Z",
  "overallStatus": "PASS",
  "summary": {
    "totalTables": 35,
    "tablesValidated": 35,
    "tablesPassed": 35,
    "tablesFailed": 0,
    "totalRecords": 125430,
    "recordsValidated": 3500,
    "recordsMatched": 3500,
    "recordsMismatched": 0,
    "matchPercentage": 100.0
  },
  "rowCountValidation": {
    "status": "PASS",
    "discrepancies": []
  },
  "sampleRecordValidation": {
    "status": "PASS",
    "fieldMismatches": []
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
      "table": "crm_Opportunities",
      "rowCount": {
        "mongodb": 10000,
        "postgresql": 10000,
        "match": true
      },
      "sampleValidation": {
        "sampleSize": 100,
        "matched": 100,
        "mismatched": 0,
        "matchPercentage": 100.0
      },
      "foreignKeyValidation": {
        "totalForeignKeys": 7,
        "validForeignKeys": 7,
        "orphanedRecords": []
      }
    }
  ]
}
```

**Console Output Example:**
```
✅ NextCRM Migration Validation Report
=======================================

📊 Row Count Validation: PASS
   - All 35 tables have matching record counts

📋 Sample Record Validation: PASS
   - Validated 3,500 records across all tables
   - 100% field-level match

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
   - Match percentage: 100%
   - Validation duration: 12m 34s

✅ Safe to update DATABASE_URL and deploy!
```

## Indexing Strategy by Table

### Three-Tier Indexing Approach

**Tier 1: Foreign Key Indexes (Automatic)**
All foreign key columns automatically receive B-tree indexes for fast joins.

**Tier 2: Common Filter Fields**
Columns frequently used in WHERE clauses receive B-tree indexes.

**Tier 3: Full-Text Search**
Text columns requiring semantic search receive GIN indexes using `to_tsvector`.

### Indexes by Table

**crm_Accounts**
```sql
-- Primary key (automatic)
CREATE UNIQUE INDEX crm_accounts_pkey ON crm_accounts (id);

-- Foreign keys (automatic)
CREATE INDEX crm_accounts_assigned_to_idx ON crm_accounts (assigned_to);
CREATE INDEX crm_accounts_industry_idx ON crm_accounts (industry);
CREATE INDEX crm_accounts_created_by_idx ON crm_accounts (createdBy);
CREATE INDEX crm_accounts_updated_by_idx ON crm_accounts (updatedBy);

-- Filter fields
CREATE INDEX crm_accounts_status_idx ON crm_accounts (status);
CREATE INDEX crm_accounts_type_idx ON crm_accounts (type);
CREATE INDEX crm_accounts_created_at_idx ON crm_accounts (createdAt);

-- Full-text search
CREATE INDEX crm_accounts_name_fts_idx ON crm_accounts USING GIN (to_tsvector('english', name));
```

**crm_Contacts**
```sql
-- Primary key (automatic)
CREATE UNIQUE INDEX crm_contacts_pkey ON crm_contacts (id);

-- Foreign keys (automatic)
CREATE INDEX crm_contacts_assigned_to_idx ON crm_contacts (assigned_to);
CREATE INDEX crm_contacts_created_by_idx ON crm_contacts (created_by);
CREATE INDEX crm_contacts_accounts_idx ON crm_contacts (accountsIDs);

-- Filter fields
CREATE INDEX crm_contacts_status_idx ON crm_contacts (status);
CREATE INDEX crm_contacts_type_idx ON crm_contacts (type);
CREATE INDEX crm_contacts_created_at_idx ON crm_contacts (cratedAt);
CREATE INDEX crm_contacts_last_activity_idx ON crm_contacts (last_activity);

-- Full-text search (combined index)
CREATE INDEX crm_contacts_name_fts_idx ON crm_contacts USING GIN (
  to_tsvector('english', COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
);

-- Array field (if kept as array)
CREATE INDEX crm_contacts_notes_gin_idx ON crm_contacts USING GIN (notes);
```

**crm_Leads**
```sql
-- Primary key (automatic)
CREATE UNIQUE INDEX crm_leads_pkey ON crm_leads (id);

-- Foreign keys (automatic)
CREATE INDEX crm_leads_assigned_to_idx ON crm_leads (assigned_to);
CREATE INDEX crm_leads_accounts_idx ON crm_leads (accountsIDs);

-- Filter fields
CREATE INDEX crm_leads_status_idx ON crm_leads (status);
CREATE INDEX crm_leads_type_idx ON crm_leads (type);
CREATE INDEX crm_leads_created_at_idx ON crm_leads (createdAt);

-- Full-text search
CREATE INDEX crm_leads_name_fts_idx ON crm_leads USING GIN (
  to_tsvector('english', COALESCE(firstName, '') || ' ' || COALESCE(lastName, '') || ' ' || COALESCE(company, ''))
);
```

**crm_Opportunities**
```sql
-- Primary key (automatic)
CREATE UNIQUE INDEX crm_opportunities_pkey ON crm_opportunities (id);

-- Foreign keys (automatic)
CREATE INDEX crm_opportunities_account_idx ON crm_opportunities (account);
CREATE INDEX crm_opportunities_assigned_to_idx ON crm_opportunities (assigned_to);
CREATE INDEX crm_opportunities_campaign_idx ON crm_opportunities (campaign);
CREATE INDEX crm_opportunities_contact_idx ON crm_opportunities (contact);
CREATE INDEX crm_opportunities_created_by_idx ON crm_opportunities (created_by);
CREATE INDEX crm_opportunities_sales_stage_idx ON crm_opportunities (sales_stage);
CREATE INDEX crm_opportunities_type_idx ON crm_opportunities (type);

-- Filter fields
CREATE INDEX crm_opportunities_status_idx ON crm_opportunities (status);
CREATE INDEX crm_opportunities_created_at_idx ON crm_opportunities (createdAt);
CREATE INDEX crm_opportunities_close_date_idx ON crm_opportunities (close_date);

-- Composite index for common query pattern
CREATE INDEX crm_opportunities_status_sales_stage_idx ON crm_opportunities (status, sales_stage);

-- Full-text search
CREATE INDEX crm_opportunities_name_fts_idx ON crm_opportunities USING GIN (
  to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, ''))
);
```

**crm_Contracts**
```sql
-- Primary key (automatic)
CREATE UNIQUE INDEX crm_contracts_pkey ON crm_contracts (id);

-- Foreign keys (automatic)
CREATE INDEX crm_contracts_account_idx ON crm_contracts (account);
CREATE INDEX crm_contracts_assigned_to_idx ON crm_contracts (assigned_to);

-- Filter fields
CREATE INDEX crm_contracts_status_idx ON crm_contracts (status);
CREATE INDEX crm_contracts_start_date_idx ON crm_contracts (startDate);
CREATE INDEX crm_contracts_end_date_idx ON crm_contracts (endDate);
CREATE INDEX crm_contracts_created_at_idx ON crm_contracts (createdAt);

-- Date range query optimization
CREATE INDEX crm_contracts_date_range_idx ON crm_contracts (startDate, endDate);
```

**Tasks**
```sql
-- Primary key (automatic)
CREATE UNIQUE INDEX tasks_pkey ON tasks (id);

-- Foreign keys (automatic)
CREATE INDEX tasks_user_idx ON tasks (user);
CREATE INDEX tasks_section_idx ON tasks (section);

-- Filter fields
CREATE INDEX tasks_priority_idx ON tasks (priority);
CREATE INDEX tasks_status_idx ON tasks (taskStatus);
CREATE INDEX tasks_due_date_idx ON tasks (dueDateAt);
CREATE INDEX tasks_created_at_idx ON tasks (createdAt);

-- Composite index for common query
CREATE INDEX tasks_user_status_idx ON tasks (user, taskStatus);

-- Full-text search
CREATE INDEX tasks_title_fts_idx ON tasks USING GIN (
  to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content, ''))
);

-- JSONB index for tags
CREATE INDEX tasks_tags_gin_idx ON tasks USING GIN (tags);
```

**crm_Accounts_Tasks**
```sql
-- Primary key (automatic)
CREATE UNIQUE INDEX crm_accounts_tasks_pkey ON crm_accounts_tasks (id);

-- Foreign keys (automatic)
CREATE INDEX crm_accounts_tasks_user_idx ON crm_accounts_tasks (user);
CREATE INDEX crm_accounts_tasks_account_idx ON crm_accounts_tasks (account);

-- Filter fields
CREATE INDEX crm_accounts_tasks_priority_idx ON crm_accounts_tasks (priority);
CREATE INDEX crm_accounts_tasks_status_idx ON crm_accounts_tasks (taskStatus);
CREATE INDEX crm_accounts_tasks_due_date_idx ON crm_accounts_tasks (dueDateAt);
CREATE INDEX crm_accounts_tasks_created_at_idx ON crm_accounts_tasks (createdAt);

-- Composite index
CREATE INDEX crm_accounts_tasks_account_status_idx ON crm_accounts_tasks (account, taskStatus);

-- Full-text search
CREATE INDEX crm_accounts_tasks_title_fts_idx ON crm_accounts_tasks USING GIN (
  to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content, ''))
);

-- JSONB index
CREATE INDEX crm_accounts_tasks_tags_gin_idx ON crm_accounts_tasks USING GIN (tags);
```

**Boards**
```sql
-- Primary key (automatic)
CREATE UNIQUE INDEX boards_pkey ON boards (id);

-- Foreign keys (automatic)
CREATE INDEX boards_user_idx ON boards (user);

-- Filter fields
CREATE INDEX boards_favourite_idx ON boards (favourite);
CREATE INDEX boards_visibility_idx ON boards (visibility);
CREATE INDEX boards_created_at_idx ON boards (createdAt);

-- Composite index for user's boards
CREATE INDEX boards_user_favourite_idx ON boards (user, favourite);
```

**Documents**
```sql
-- Primary key (automatic)
CREATE UNIQUE INDEX documents_pkey ON documents (id);

-- Foreign keys (automatic)
CREATE INDEX documents_created_by_user_idx ON documents (created_by_user);
CREATE INDEX documents_assigned_user_idx ON documents (assigned_user);
CREATE INDEX documents_document_type_idx ON documents (document_type);

-- Filter fields
CREATE INDEX documents_status_idx ON documents (status);
CREATE INDEX documents_visibility_idx ON documents (visibility);
CREATE INDEX documents_favourite_idx ON documents (favourite);
CREATE INDEX documents_created_at_idx ON documents (createdAt);
CREATE INDEX documents_system_type_idx ON documents (document_system_type);

-- Full-text search
CREATE INDEX documents_name_fts_idx ON documents USING GIN (
  to_tsvector('english', COALESCE(document_name, '') || ' ' || COALESCE(description, ''))
);

-- JSONB index
CREATE INDEX documents_tags_gin_idx ON documents USING GIN (tags);
```

**Invoices**
```sql
-- Primary key (automatic)
CREATE UNIQUE INDEX invoices_pkey ON invoices (id);

-- Foreign keys (automatic)
CREATE INDEX invoices_state_idx ON invoices (invoice_state_id);
CREATE INDEX invoices_assigned_user_idx ON invoices (assigned_user_id);
CREATE INDEX invoices_assigned_account_idx ON invoices (assigned_account_id);

-- Filter fields
CREATE INDEX invoices_status_idx ON invoices (status);
CREATE INDEX invoices_type_idx ON invoices (invoice_type);
CREATE INDEX invoices_date_created_idx ON invoices (date_created);
CREATE INDEX invoices_date_due_idx ON invoices (date_due);
CREATE INDEX invoices_favourite_idx ON invoices (favorite);

-- Composite index for common query
CREATE INDEX invoices_status_date_idx ON invoices (status, date_created);

-- Full-text search
CREATE INDEX invoices_number_fts_idx ON invoices USING GIN (
  to_tsvector('english',
    COALESCE(invoice_number, '') || ' ' ||
    COALESCE(partner, '') || ' ' ||
    COALESCE(description, '')
  )
);

-- JSONB index
CREATE INDEX invoices_items_gin_idx ON invoices USING GIN (invoice_items);
```

**Users**
```sql
-- Primary key (automatic)
CREATE UNIQUE INDEX users_pkey ON users (id);

-- Unique constraint
CREATE UNIQUE INDEX users_email_key ON users (email);

-- Filter fields
CREATE INDEX users_status_idx ON users (userStatus);
CREATE INDEX users_language_idx ON users (userLanguage);
CREATE INDEX users_is_admin_idx ON users (is_admin);
CREATE INDEX users_is_account_admin_idx ON users (is_account_admin);
CREATE INDEX users_created_on_idx ON users (created_on);
CREATE INDEX users_last_login_idx ON users (lastLoginAt);

-- Partial index for active users (common filter)
CREATE INDEX users_active_idx ON users (userStatus) WHERE userStatus = 'ACTIVE';
```

**Junction Tables (All follow same pattern)**
```sql
-- Example: _DocumentsToInvoices
CREATE UNIQUE INDEX _documents_to_invoices_pkey ON _documents_to_invoices (document_id, invoice_id);
CREATE INDEX _documents_to_invoices_document_idx ON _documents_to_invoices (document_id);
CREATE INDEX _documents_to_invoices_invoice_idx ON _documents_to_invoices (invoice_id);
```

### Index Maintenance

**Automatic Maintenance:**
- PostgreSQL VACUUM automatically maintains indexes
- Autovacuum daemon runs by default

**Manual Optimization (Post-Migration):**
```sql
-- Analyze all tables for query planner statistics
ANALYZE;

-- Reindex if needed (rare)
REINDEX DATABASE nextcrm;
```

**Monitoring Index Usage:**
```sql
-- Check index usage statistics
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Find unused indexes (candidates for removal)
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public'
  AND indexname NOT LIKE '%_pkey';
```

## Environment Configuration

### Database Connection

**Single Environment Variable:**
```bash
# Before migration (MongoDB)
DATABASE_URL="mongodb://username:password@localhost:27017/nextcrm"

# After migration (PostgreSQL)
DATABASE_URL="postgresql://username:password@localhost:5432/nextcrm"
```

**No Additional Variables Required:**
- No separate `DATABASE_URL_POSTGRES` needed
- No migration-specific configuration variables
- No fallback/rollback flags

### Prisma Configuration

**Update prisma/schema.prisma:**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"  // Changed from "mongodb"
  url      = env("DATABASE_URL")
}

// Connection pooling configuration (optional optimization)
// Default settings are sufficient for most deployments
```

**Prisma Migrate Setup:**
```bash
# Generate initial migration from schema
npx prisma migrate dev --name init

# For production deployment
npx prisma migrate deploy
```

**Prisma Studio (Debugging):**
```bash
# Launch Prisma Studio to inspect data
npx prisma studio
```

### PostgreSQL Configuration

**Required PostgreSQL Version:**
- PostgreSQL 16+ (for pgvector support in Phase 2)

**Required Extensions:**
```sql
-- Enable pgvector for Phase 2 AI features
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable UUID generation (if not using Prisma default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

**Connection Pooling:**
- Use Prisma's built-in connection pooling
- Default pool size: 10 connections
- Can be adjusted in Prisma schema if needed

**Docker Compose Example:**
```yaml
version: '3.8'
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: nextcrm
      POSTGRES_PASSWORD: your_secure_password
      POSTGRES_DB: nextcrm
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Testing Strategy

### Unit Testing

**Migration Script Tests:**
- ObjectId → UUID mapping functions
- Checkpoint save/load functions
- Error logging functions
- Progress tracking functions
- Data transformation functions

**Test Framework:** Jest or Vitest

**Sample Test Cases:**
```typescript
describe('ObjectId to UUID Mapping', () => {
  test('generates consistent UUIDs for same ObjectId', () => {
    const objectId = '507f1f77bcf86cd799439011';
    const uuid1 = generateAndMapUuid(objectId);
    const uuid2 = getUuidForMongoId(objectId);
    expect(uuid1).toBe(uuid2);
  });

  test('generates different UUIDs for different ObjectIds', () => {
    const uuid1 = generateAndMapUuid('507f1f77bcf86cd799439011');
    const uuid2 = generateAndMapUuid('507f1f77bcf86cd799439012');
    expect(uuid1).not.toBe(uuid2);
  });
});

describe('Checkpoint Management', () => {
  test('saves and loads checkpoint correctly', async () => {
    const state: MigrationState = {
      currentTable: 'crm_Contacts',
      completedTables: ['Users'],
      objectIdToUuidMap: { 'abc123': 'uuid-123' },
      migratedRecords: { Users: ['uuid-1', 'uuid-2'] },
      totalRecordsMigrated: 2,
      totalErrors: 0
    };

    await saveCheckpoint(state);
    const loaded = await loadCheckpoint();

    expect(loaded).toEqual(state);
  });
});
```

### Integration Testing

**Test with Sample Dataset:**
1. Create small MongoDB database with sample data (100 records per table)
2. Run migration script against sample database
3. Run validation script
4. Verify all data migrated correctly
5. Test pause/resume functionality
6. Test error handling with intentionally bad data

**Test Environment:**
- Docker containers for MongoDB and PostgreSQL
- Separate test database (not production)
- Automated via CI/CD

### End-to-End Testing

**Production-Sized Dataset Testing:**
1. Clone production MongoDB to staging environment
2. Run full migration (may take hours)
3. Run validation script
4. Verify 100% success
5. Test application against PostgreSQL database
6. Run manual smoke tests of key features:
   - Create/read/update/delete operations
   - Complex queries (opportunities by stage)
   - Reports and aggregations
   - Search functionality

**Performance Testing:**
- Measure query response times
- Verify < 100ms for simple queries
- Compare against MongoDB baseline
- Identify slow queries with EXPLAIN ANALYZE

### Rollback Testing

**Test Rollback Procedure:**
1. Run migration on staging
2. Update DATABASE_URL to PostgreSQL
3. Deploy application
4. Simulate failure scenario
5. Rollback DATABASE_URL to MongoDB
6. Verify application works with MongoDB
7. Document rollback duration and steps

## Deployment Approach

### Pre-Migration Preparation

**1. Backup MongoDB Database**
```bash
# Full MongoDB backup
mongodump --uri="mongodb://username:password@localhost:27017/nextcrm" --out=/backups/mongodb-backup-2025-11-05

# Verify backup size and integrity
ls -lh /backups/mongodb-backup-2025-11-05
```

**2. Setup PostgreSQL Database**
```bash
# Create PostgreSQL database
createdb -U postgres nextcrm

# Enable extensions
psql -U postgres nextcrm -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

**3. Run Prisma Migrations**
```bash
# Generate and apply PostgreSQL schema
npx prisma migrate deploy
```

**4. Test Migration on Staging**
- Complete full migration on staging environment
- Run validation script
- Verify 100% success
- Test application functionality
- Measure migration duration

### Migration Execution

**Schedule Maintenance Window:**
- Duration: Estimate based on staging test (add 50% buffer)
- Off-peak hours recommended
- Notify users in advance

**Migration Steps:**
1. **Stop Application** (prevent writes to MongoDB)
   ```bash
   # Stop application server
   systemctl stop nextcrm
   ```

2. **Final MongoDB Backup**
   ```bash
   mongodump --uri="$DATABASE_URL" --out=/backups/mongodb-final-backup
   ```

3. **Run Migration Script**
   ```bash
   npm run migrate:mongo-to-postgres
   ```

4. **Monitor Progress**
   - Watch console output
   - Monitor checkpoint file updates
   - Check error log in real-time

5. **Run Validation Script**
   ```bash
   npm run validate:migration
   ```

6. **Verify Validation Pass**
   - Review validation report
   - Confirm 100% match
   - Check error counts acceptable

7. **Update Environment Variable**
   ```bash
   # Update .env or environment configuration
   DATABASE_URL="postgresql://username:password@localhost:5432/nextcrm"
   ```

8. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

9. **Start Application**
   ```bash
   systemctl start nextcrm
   ```

10. **Smoke Test Application**
    - Login as admin user
    - View accounts list
    - Create test contact
    - View opportunities
    - Search functionality
    - Test reports

11. **Monitor Application Logs**
    - Check for database errors
    - Monitor query performance
    - Watch for connection issues

### Post-Migration Verification

**1. Query Performance Check**
```sql
-- Enable query logging
ALTER SYSTEM SET log_min_duration_statement = 100;  -- Log queries > 100ms
SELECT pg_reload_conf();

-- Check slow queries after 24 hours
SELECT
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

**2. Data Integrity Spot Checks**
- Manually verify critical records
- Check relationship integrity
- Verify calculated fields

**3. User Acceptance Testing**
- Key users test critical workflows
- Report any data discrepancies
- Verify reports show correct data

### Rollback Procedure (If Needed)

**Conditions for Rollback:**
- Validation script fails
- Critical application errors
- Data integrity issues discovered
- Performance significantly worse than MongoDB

**Rollback Steps:**
1. Stop application
2. Revert DATABASE_URL to MongoDB connection string
3. Generate Prisma Client for MongoDB
4. Start application
5. Verify application works with MongoDB
6. Investigate migration issues
7. Fix issues and retry migration

**Rollback Duration:** < 15 minutes

### MongoDB Retention

**After Successful Migration:**
- Keep MongoDB database for 30 days as backup
- Maintain daily backups during transition period
- After 30 days of stable PostgreSQL operation:
  - Archive MongoDB data
  - Decommission MongoDB server

## Success Criteria

### Technical Success Criteria

**1. Schema Completeness**
- ✅ All 26 entity models migrated to PostgreSQL
- ✅ All 9 junction tables created
- ✅ All foreign key constraints defined
- ✅ All indexes created as specified
- ✅ All enums preserved

**2. Data Integrity**
- ✅ Zero data loss (validation confirms 100% row count match)
- ✅ All relationships preserved (referential integrity validated)
- ✅ All foreign keys resolve correctly
- ✅ Data type conversions accurate (dates, arrays, JSONB validated)
- ✅ Sample records match field-by-field (99%+ match rate)

**3. Performance**
- ✅ Simple queries respond in < 100ms
- ✅ No performance regression vs. MongoDB baseline
- ✅ Index usage verified via EXPLAIN ANALYZE
- ✅ Connection pooling configured correctly

**4. Migration Tooling**
- ✅ Migration script completes successfully
- ✅ Progress tracking displays accurate information
- ✅ Pause/resume works correctly
- ✅ Error logging captures failures with context
- ✅ Checkpoint system enables recovery

**5. Validation**
- ✅ Validation script passes all 4 layers
- ✅ Row counts match across all tables
- ✅ Sample records validate 99%+ match
- ✅ Referential integrity 100% valid
- ✅ Data type conversions correct

### Operational Success Criteria

**1. Migration Execution**
- ✅ Migration completes within estimated time window
- ✅ No data loss during migration
- ✅ Rollback procedure tested and documented
- ✅ Downtime within acceptable limits

**2. Application Stability**
- ✅ No database-related errors in application logs
- ✅ All features function correctly post-migration
- ✅ User acceptance testing passes
- ✅ No critical bugs reported in first 48 hours

**3. Documentation**
- ✅ Migration procedure documented
- ✅ Validation results saved
- ✅ Rollback procedure documented
- ✅ Known issues documented (if any)

### Product Success Criteria

**1. Foundation for Phase 2**
- ✅ PostgreSQL 16 with pgvector extension enabled
- ✅ Schema supports future AI/RAG features
- ✅ Full-text search indexes ready for semantic search
- ✅ JSONB columns support flexible metadata storage

**2. Enterprise-Grade Quality**
- ✅ Type-safe Prisma schema
- ✅ Foreign key constraints enforce data integrity
- ✅ Comprehensive testing completed
- ✅ Migration tooling production-ready

**3. Self-Hosting Friendly**
- ✅ Simple configuration (single DATABASE_URL)
- ✅ Docker Compose example provided
- ✅ Clear migration instructions
- ✅ No external dependencies (no PgBouncer required)

## Timeline and Phases

### Phase 1: Schema Design and Implementation (Week 1-2)

**Tasks:**
- Design PostgreSQL schema in Prisma
- Define all junction tables
- Specify indexes and constraints
- Review and validate schema design
- Create Prisma migration files
- Test schema in development environment

**Deliverables:**
- Updated `prisma/schema.prisma` for PostgreSQL
- Prisma migration files
- Schema design review document

### Phase 2: Migration Script Development (Week 3-4)

**Tasks:**
- Build migration script core logic
- Implement ObjectId → UUID mapping
- Add progress tracking system
- Implement checkpoint save/resume
- Add error logging
- Write unit tests
- Test with small sample dataset

**Deliverables:**
- Migration script (`scripts/migrate-mongo-to-postgres.ts`)
- Supporting utilities
- Unit tests
- Sample dataset migration success

### Phase 3: Validation Script Development (Week 4-5)

**Tasks:**
- Build 4-layer validation script
- Implement row count validation
- Implement sample record validation
- Implement referential integrity checks
- Implement data type validation
- Generate validation report
- Test against migrated sample data

**Deliverables:**
- Validation script (`scripts/validate-migration.ts`)
- Validation report generator
- Unit tests

### Phase 4: Integration Testing (Week 5-6)

**Tasks:**
- Test migration with larger datasets (1,000+ records per table)
- Test pause/resume functionality
- Test error handling with bad data
- Test validation script accuracy
- Performance test PostgreSQL queries
- Test application against PostgreSQL

**Deliverables:**
- Integration test results
- Performance benchmarks
- Bug fixes and refinements

### Phase 5: Staging Migration (Week 7)

**Tasks:**
- Clone production MongoDB to staging
- Run full migration on staging
- Run validation script
- Verify 100% success
- Test application end-to-end
- Conduct user acceptance testing
- Measure migration duration

**Deliverables:**
- Staging migration complete
- Validation report (100% pass)
- UAT results
- Migration duration estimate

### Phase 6: Production Migration (Week 8)

**Tasks:**
- Schedule maintenance window
- Backup production MongoDB
- Execute production migration
- Run validation script
- Update DATABASE_URL
- Deploy application
- Smoke test production
- Monitor for 48 hours

**Deliverables:**
- Production PostgreSQL database
- Migration validation report
- Post-migration monitoring data
- Success confirmation

### Total Timeline: 8 Weeks

**Critical Path:**
1. Schema design → Migration script → Validation script → Testing → Production
2. Each phase depends on previous phase completion
3. Buffer time included for bug fixes and refinements

## Risks and Mitigations

### Risk 1: Data Loss During Migration

**Severity:** CRITICAL
**Likelihood:** LOW (with mitigations)

**Mitigations:**
- Comprehensive 4-layer validation script
- Transaction safety per batch (rollback on error)
- Full MongoDB backup before migration
- Test migration on staging with production data
- Checkpoint system prevents partial migration loss
- Error logging captures failures with context
- Keep MongoDB as rollback option for 30 days

**Contingency:**
- Rollback to MongoDB if validation fails
- Investigate specific failures via error logs
- Fix migration script and retry

---

### Risk 2: Long Migration Duration

**Severity:** MEDIUM
**Likelihood:** MEDIUM

**Impact:** Extended maintenance window, user disruption

**Mitigations:**
- Test on staging to estimate duration
- Batch processing for efficiency (1000 records/batch)
- Pause/resume capability for operational flexibility
- Schedule during off-peak hours
- Add 50% buffer to estimated duration
- Communicate expected downtime clearly

**Contingency:**
- Pause migration if exceeding time budget
- Reschedule for larger maintenance window
- Optimize batch size based on staging results

---

### Risk 3: Application Errors Post-Migration

**Severity:** HIGH
**Likelihood:** LOW

**Impact:** Application downtime, user unable to work

**Mitigations:**
- Prisma abstracts database (minimal code changes)
- Comprehensive testing in staging environment
- End-to-end UAT before production
- Smoke tests immediately after migration
- Rollback procedure tested and documented
- Monitor logs for first 48 hours

**Contingency:**
- Rollback to MongoDB within 15 minutes
- Fix application bugs
- Retry migration after fixes

---

### Risk 4: Performance Degradation

**Severity:** MEDIUM
**Likelihood:** LOW

**Impact:** Slower queries, poor user experience

**Mitigations:**
- Strategic 3-tier indexing approach
- Performance target defined (< 100ms simple queries)
- Test queries on staging with EXPLAIN ANALYZE
- Monitor query performance post-migration
- Can add more indexes post-migration
- PostgreSQL query optimization tools available

**Contingency:**
- Identify slow queries via pg_stat_statements
- Add targeted indexes
- Optimize problematic queries
- Consider PostgreSQL-specific optimizations

---

### Risk 5: Referential Integrity Violations

**Severity:** HIGH
**Likelihood:** LOW

**Impact:** Broken relationships, data inaccessible

**Mitigations:**
- ObjectId → UUID mapping maintained in memory
- Foreign keys validated before insert
- Referential integrity layer in validation script
- Junction tables populated after entity tables
- Test with production-like data

**Contingency:**
- Validation script identifies broken relationships
- Fix migration script mapping logic
- Retry migration on staging
- Manual data fixes if isolated issues

---

### Risk 6: Checkpoint File Corruption

**Severity:** MEDIUM
**Likelihood:** VERY LOW

**Impact:** Cannot resume migration, must restart

**Mitigations:**
- Atomic checkpoint file writes
- JSON validation on checkpoint load
- Checkpoint saved after each successful batch
- Checkpoint includes timestamp and integrity check

**Contingency:**
- Restart migration from beginning (if early failure)
- Manual checkpoint repair (if near completion)
- Migration script handles missing checkpoint gracefully

---

### Risk 7: UUID Mapping Memory Exhaustion

**Severity:** MEDIUM
**Likelihood:** LOW (with very large databases)

**Impact:** Migration script crashes

**Mitigations:**
- Checkpoint includes UUID mapping (persisted to disk)
- Load mapping from checkpoint on resume
- Monitor memory usage during staging test
- Can implement streaming mapping if needed

**Contingency:**
- Pause migration to save checkpoint
- Restart migration to reload from checkpoint
- Implement disk-based mapping if necessary

---

### Risk 8: MongoDB Connection Timeout

**Severity:** MEDIUM
**Likelihood:** LOW

**Impact:** Migration hangs or fails

**Mitigations:**
- Connection retry logic in migration script
- Batch processing limits connection duration
- Monitor connection health during migration
- Test with staging database

**Contingency:**
- Pause migration on connection error
- Resume after connection restored
- Increase connection timeout if needed

---

## Appendix A: Prisma Schema Changes

### Key Schema Modifications

**Datasource Change:**
```prisma
// Before
datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

// After
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**Primary Key Change:**
```prisma
// Before (MongoDB)
model crm_Accounts {
  id String @id @default(auto()) @map("_id") @db.ObjectId
  // ...
}

// After (PostgreSQL)
model crm_Accounts {
  id String @id @default(uuid()) @db.Uuid
  // ...
}
```

**Foreign Key Change:**
```prisma
// Before (MongoDB)
assigned_to String? @db.ObjectId
assigned_to_user Users? @relation(fields: [assigned_to], references: [id])

// After (PostgreSQL)
assigned_to String? @db.Uuid
assigned_to_user Users? @relation(fields: [assigned_to], references: [id])
```

**Junction Table Addition:**
```prisma
// New junction table model
model _DocumentsToInvoices {
  document_id String @db.Uuid
  invoice_id  String @db.Uuid

  document Documents @relation(fields: [document_id], references: [id], onDelete: Cascade)
  invoice  Invoices  @relation(fields: [invoice_id], references: [id], onDelete: Cascade)

  @@id([document_id, invoice_id])
  @@index([document_id])
  @@index([invoice_id])
}
```

## Appendix B: PostgreSQL Configuration Recommendations

### postgresql.conf Tuning

**For Production Workload (Example for 8GB RAM server):**
```conf
# Memory settings
shared_buffers = 2GB
effective_cache_size = 6GB
maintenance_work_mem = 512MB
work_mem = 32MB

# Query planner
random_page_cost = 1.1  # For SSD storage
effective_io_concurrency = 200

# Write ahead log
wal_buffers = 16MB
max_wal_size = 4GB
min_wal_size = 1GB

# Checkpoints
checkpoint_completion_target = 0.9

# Connection pooling
max_connections = 100

# Logging
log_min_duration_statement = 100  # Log queries > 100ms
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
```

### pg_hba.conf Security

```conf
# Allow local connections
local   all             all                                     trust

# Allow connections from application server
host    nextcrm         nextcrm         10.0.0.0/24            scram-sha-256

# Reject all other connections
host    all             all             0.0.0.0/0              reject
```

## Appendix C: Migration Script Pseudocode

```
FUNCTION runMigration():
  1. Load checkpoint if exists, else initialize empty state
  2. Connect to MongoDB and PostgreSQL
  3. Validate PostgreSQL schema exists

  4. FOR each table in migrationOrder:
       IF table already completed (in checkpoint):
         SKIP to next table

       totalRecords = COUNT records in MongoDB table
       batchNumber = 0

       WHILE records remain:
         batch = FETCH next 1000 records from MongoDB

         BEGIN PostgreSQL transaction

         FOR each record in batch:
           newUUID = generateOrGetUUID(record._id)
           transformedRecord = transformRecord(record, newUUID)

           TRY:
             INSERT transformedRecord into PostgreSQL
           CATCH error:
             LOG error with record._id and error details
             ROLLBACK transaction
             CONTINUE to next batch

         COMMIT transaction

         batchNumber++
         UPDATE progress display
         SAVE checkpoint (every 10 batches)
       END WHILE
  5. END FOR

  6. Populate junction tables using UUID mapping
  7. Display migration summary
  8. DELETE checkpoint file
  9. Close database connections

FUNCTION transformRecord(mongoRecord, newUUID):
  pgRecord = {
    id: newUUID,
    // Copy scalar fields
    // Transform foreign keys using UUID mapping
    // Convert dates to ISO format
    // Handle arrays (normalize or keep as array)
    // Handle JSON fields (convert to JSONB)
  }
  RETURN pgRecord

FUNCTION generateOrGetUUID(mongoObjectId):
  IF mongoObjectId exists in mapping:
    RETURN mapping[mongoObjectId]
  ELSE:
    newUUID = generateUUID()
    mapping[mongoObjectId] = newUUID
    RETURN newUUID
```

## Appendix D: Validation Script Pseudocode

```
FUNCTION runValidation():
  1. Connect to MongoDB and PostgreSQL
  2. Load UUID mapping from checkpoint file
  3. Initialize validation report

  4. LAYER 1 - Row Count Validation:
     FOR each table:
       mongoCount = COUNT(*) from MongoDB table
       pgCount = COUNT(*) from PostgreSQL table
       IF mongoCount != pgCount:
         ADD discrepancy to report
         MARK validation as FAILED

  5. LAYER 2 - Sample Record Validation:
     FOR each table:
       samples = SELECT random 100 records from MongoDB
       FOR each sample:
         mongoRecord = sample
         pgUUID = getUUIDForMongoId(sample._id)
         pgRecord = SELECT from PostgreSQL WHERE id = pgUUID

         fieldMatches = compareFields(mongoRecord, pgRecord)
         IF fieldMatches < 100%:
           LOG field mismatches

       IF match percentage < 99%:
         MARK validation as FAILED

  6. LAYER 3 - Referential Integrity Validation:
     FOR each table with foreign keys:
       FOR each foreign key column:
         orphanedRecords = SELECT records WHERE foreign_key NOT IN referenced_table
         IF orphanedRecords.length > 0:
           LOG orphaned records
           MARK validation as FAILED

     FOR each junction table:
       Validate bidirectional relationships

  7. LAYER 4 - Data Type Validation:
     FOR each table:
       Validate DateTime fields are valid ISO format
       Validate enums are within defined values
       Validate JSONB is valid JSON
       Validate arrays are proper PostgreSQL arrays
       IF any validation fails:
         LOG type errors
         MARK validation as FAILED

  8. Generate validation report JSON
  9. Display summary to console
  10. EXIT with code 0 (pass) or 1 (fail)

FUNCTION compareFields(mongoRecord, pgRecord):
  matches = 0
  total = 0

  FOR each field in mongoRecord:
    total++
    pgValue = pgRecord[field]
    mongoValue = mongoRecord[field]

    IF field is DateTime:
      IF abs(pgValue - mongoValue) < 1 second:
        matches++
    ELSE IF field is Array:
      IF arraysEqual(pgValue, mongoValue):
        matches++
    ELSE IF field is JSON:
      IF deepEqual(pgValue, mongoValue):
        matches++
    ELSE:
      IF pgValue == mongoValue:
        matches++

  RETURN (matches / total) * 100
```

---

## Final Notes

This specification provides a comprehensive blueprint for migrating NextCRM from MongoDB to PostgreSQL. The migration is designed with enterprise-grade reliability, comprehensive validation, and operational flexibility as core principles.

**Key Success Factors:**
1. Thorough testing on staging before production
2. Comprehensive validation at every step
3. Clear rollback procedures if issues arise
4. Strategic indexing for performance
5. Robust tooling for large-scale data migration

**Next Steps:**
1. Review and approve this specification
2. Begin Phase 1: Schema design implementation
3. Develop migration and validation scripts
4. Test thoroughly on staging
5. Execute production migration

The migration establishes the foundation for NextCRM's evolution into an enterprise-grade, AI-powered CRM platform while maintaining the reliability and data integrity required for production use.
