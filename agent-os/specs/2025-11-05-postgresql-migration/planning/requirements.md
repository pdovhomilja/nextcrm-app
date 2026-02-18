# Spec Requirements: PostgreSQL Migration

## Initial Description

Migrate NextCRM's database layer from MongoDB to PostgreSQL to achieve better relational data modeling, improved performance at scale, enhanced ecosystem compatibility, and enable advanced AI/RAG features through pgvector support.

### Context from Product Roadmap
This is the **TOP PRIORITY for Phase 1 (Q1-Q2 2025)** to establish a rock-solid foundation for enterprise-grade quality. The migration is critical for:
- Supporting advanced AI/RAG features with pgvector
- Improving relational data modeling for CRM entities
- Better performance for complex queries and aggregations
- Broader ecosystem compatibility
- Enterprise-grade scalability

### Initial Objectives
1. Redesign database schema optimized for PostgreSQL's relational model
2. Preserve all existing CRM data relationships (accounts → contacts → opportunities → contracts → tasks)
3. Build robust data migration tooling for existing MongoDB deployments
4. Ensure zero data loss during migration
5. Maintain backward compatibility or provide clear migration path
6. Enable future pgvector integration for AI/RAG features
7. Achieve performance improvements for complex queries and aggregations

### Success Criteria
- All MongoDB data successfully migrated to PostgreSQL
- No data loss or corruption
- Performance improvements measurable (< 100ms for simple queries)
- Comprehensive test coverage for migration process
- Clear migration guide for users
- Production-ready PostgreSQL setup

---

## Requirements Discussion

### First Round Questions

**Q1:** For the schema redesign, I assume we should normalize array fields (like `tags[]`, `notes[]`, `documentsIDs[]`) into separate junction tables for better relational modeling. Is that correct, or should we use PostgreSQL's native array types?

**Answer:** Normalize the following into proper junction tables with relational foreign keys:
- `documentsIDs[]` - Create proper many-to-many relationships
- `opportunitiesIDs[]` - Create proper many-to-many relationships
- `accountsIDs[]` - Create proper many-to-many relationships
- `contactsIDs[]` - Create proper many-to-many relationships
- `tasksIDs[]` - Create proper many-to-many relationships
- `watchers[]` - Create proper many-to-many relationships
- `watching_boardsIDs[]` - Create proper many-to-many relationships
- `watching_accountsIDs[]` - Create proper many-to-many relationships

Keep as native PostgreSQL arrays:
- `tags[]` in crm_Contacts - Simple string arrays for tagging
- `notes[]` in crm_Contacts - Text notes can remain as array
- `connected_documents[]` in Documents - Already being normalized via junction tables

**Q2:** I'm thinking the migration script should support batch processing (e.g., 1000 records at a time) to handle large datasets efficiently. Should we make the batch size configurable, or is a fixed optimal batch size sufficient?

**Answer:** Fixed batch size is sufficient - no need for configuration.

**Q3:** For JSON fields like `invoice_items` and `tags` in Documents, should we:
- Keep them as PostgreSQL JSON/JSONB columns (simpler migration)
- Normalize them into separate tables (better relational design)

**Answer:**
- `invoice_items` (in Invoices model) - Keep as JSONB (complex nested structure, not frequently queried individually)
- `tags` (in Documents model) - Keep as JSONB (flexible schema)
- `tags` (in Tasks and crm_Accounts_Tasks) - Keep as JSONB (flexible schema)

**Q4:** For the data validation script, should we validate:
- Row counts match between MongoDB and PostgreSQL?
- Specific field values for sample records?
- Referential integrity (all foreign keys resolve correctly)?
- All of the above?

**Answer:** Validate ALL of the following:
- Row counts match between MongoDB and PostgreSQL
- Specific field values for sample records
- Referential integrity (all foreign keys resolve correctly)
- Data type conversions (dates, arrays, JSON)

**Q5:** I assume we'll use Prisma's connection pooling for PostgreSQL. Should we also recommend/configure PgBouncer for production deployments, or keep it simple with Prisma's built-in pooling?

**Answer:** Use Prisma's built-in connection pooling only. No external PgBouncer needed.

**Q6:** For Prisma configuration, should we:
- Use Prisma Migrate for schema management?
- Enable preview features like `prismaSchemaFolder` for better organization?
- Configure Prisma Studio for debugging?
- Set up query logging for performance monitoring?

**Answer:**
- Use Prisma Migrate for schema management - YES
- Enable Prisma Studio for debugging - YES
- Prisma Client query logging - NOT needed

**Q7:** Should the migration script include:
- Dry-run mode to preview changes without committing?
- Progress tracking with percentage completion?
- Ability to pause/resume (in case of interruption)?
- Detailed error logging with specific record IDs that fail?

**Answer:** The migration script MUST include:
- Progress tracking with percentage completion - YES
- Ability to pause/resume - YES
- Detailed error logging with specific record IDs - YES
- Dry-run mode - NOT needed
- Batch size configuration - NOT needed

**Q8:** For the indexing strategy, should we create indexes on:
- All foreign keys automatically?
- Common filter fields (status, created_at, owner_id)?
- Full-text search columns?
- Specific tables you know are queried heavily?

**Answer:** Create indexes for:
- All foreign keys automatically - YES
- Common filter fields (status, created_at, owner_id) - YES
- Full-text search on specific text fields (company names, contact names, notes) - YES

**Q9:** For environment variables and configuration, should we:
- Keep DATABASE_URL (switching from MongoDB to PostgreSQL URL)?
- Add separate DATABASE_URL_POSTGRES for parallel running during migration?
- Include migration script configuration (batch size, parallel workers)?
- Add rollback/fallback configuration flags?

**Answer:**
- Use DATABASE_URL only (no separate DATABASE_URL_POSTGRES) - SIMPLE approach
- No migration script configuration environment variables needed
- No fallback/rollback environment flags needed

**Q10:** Should the specification include a detailed deployment process and rollback procedures, or focus primarily on the technical migration implementation?

**Answer:** No deployment guide needed in the spec. Focus on technical implementation.

**Q11:** What exactly should be excluded from this spec?

**Answer:** No specific exclusions mentioned.

---

### Existing Code to Reference

**Similar Features Identified:**
No similar migration features exist in the codebase. This is the first major database migration for NextCRM.

---

### Follow-up Questions

**Follow-up 1:** You mentioned indexing on "specific text fields (company names, contact names, notes)" for full-text search. Can you specify exactly which tables and columns need full-text search indexes? For example:
- crm_Accounts.name?
- crm_Contacts.first_name, last_name?
- crm_Contacts.notes array?
- crm_Opportunities.name, description?
- Any other tables?

**Answer:** Create full-text search indexes on:
- `crm_Accounts.name` (company names)
- `crm_Contacts.first_name`, `crm_Contacts.last_name` (contact names)
- `crm_Contacts.notes` (if normalized to separate table, otherwise GIN index on array)
- `crm_Opportunities.name` (opportunity names)
- `crm_Opportunities.description` (opportunity descriptions)
- `Tasks.title`, `Tasks.content` (task search)
- `Documents.document_name`, `Documents.description` (document search)

---

## Visual Assets

### Files Provided:
No visual assets provided.

### Visual Insights:
No visual assets provided for this backend/database migration specification.

---

## Requirements Summary

### Current MongoDB Schema Analysis

Based on the `prisma/schema.prisma` file, NextCRM currently uses MongoDB with the following characteristics:

**Total Models to Migrate: 26 models**

1. **CRM Core Models (8)**:
   - `crm_Accounts` - Company/account management with embedded addresses
   - `crm_Contacts` - Contact person records with social media links
   - `crm_Leads` - Lead tracking and qualification
   - `crm_Opportunities` - Sales pipeline and deals
   - `crm_Contracts` - Contract management
   - `crm_campaigns` - Marketing campaigns
   - `crm_Opportunities_Sales_Stages` - Pipeline stage definitions
   - `crm_Opportunities_Type` - Opportunity type classifications

2. **Task & Project Management (5)**:
   - `Tasks` - General tasks with kanban boards
   - `crm_Accounts_Tasks` - CRM-specific tasks linked to accounts
   - `tasksComments` - Comments on tasks
   - `Sections` - Kanban board sections
   - `Boards` - Project boards

3. **Document & Invoice Management (4)**:
   - `Documents` - File storage and document management
   - `Documents_Types` - Document type classifications
   - `Invoices` - Invoice records with Rossum integration
   - `invoice_States` - Invoice status definitions

4. **System & Configuration (5)**:
   - `Users` - User accounts and authentication
   - `system_Modules_Enabled` - Module visibility configuration
   - `modulStatus` - Module status tracking
   - `systemServices` - External service configurations
   - `MyAccount` - Organization account settings

5. **Lookup Tables (3)**:
   - `crm_Industry_Type` - Industry classifications
   - `secondBrain_notions` - Notion API integration
   - `openAi_keys` - OpenAI API keys per user

6. **Other Models (1)**:
   - `Employees` - Employee records
   - `ImageUpload` - Image upload tracking
   - `TodoList` - Personal todo lists
   - `gpt_models` - GPT model configurations

**Enums Currently Defined (9)**:
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

### Array Fields Requiring Normalization

**Many-to-Many Relationships (Create Junction Tables):**

1. **Documents Relations**:
   - `Documents.invoiceIDs[]` → Create `_DocumentsToInvoices` junction table
   - `Documents.opportunityIDs[]` → Create `_DocumentsToOpportunities` junction table
   - `Documents.contactsIDs[]` → Create `_DocumentsToContacts` junction table
   - `Documents.tasksIDs[]` → Create `_DocumentsToTasks` junction table
   - `Documents.crm_accounts_tasksIDs[]` → Create `_DocumentsToCrmAccountsTasks` junction table
   - `Documents.leadsIDs[]` → Create `_DocumentsToLeads` junction table
   - `Documents.accountsIDs[]` → Create `_DocumentsToAccounts` junction table

2. **Accounts Relations**:
   - `crm_Accounts.documentsIDs[]` → Use same `_DocumentsToAccounts` junction table
   - `crm_Accounts.watchers[]` → Create `_AccountWatchers` junction table
   - `crm_Accounts.watching_users[]` → Use same `_AccountWatchers` junction table

3. **Contacts Relations**:
   - `crm_Contacts.opportunitiesIDs[]` → Create `_ContactsToOpportunities` junction table
   - `crm_Contacts.documentsIDs[]` → Use same `_DocumentsToContacts` junction table

4. **Opportunities Relations**:
   - `crm_Opportunities.connected_documents[]` → Use same `_DocumentsToOpportunities` junction table
   - `crm_Opportunities.connected_contacts[]` → Use same `_ContactsToOpportunities` junction table

5. **Leads Relations**:
   - `crm_Leads.documentsIDs[]` → Use same `_DocumentsToLeads` junction table

6. **Tasks Relations**:
   - `Tasks.documentIDs[]` → Use same `_DocumentsToTasks` junction table

7. **Boards Relations**:
   - `Boards.watchers[]` → Create `_BoardWatchers` junction table
   - `Boards.watching_users[]` → Use same `_BoardWatchers` junction table

8. **Users Relations**:
   - `Users.watching_boardsIDs[]` → Use same `_BoardWatchers` junction table
   - `Users.watching_accountsIDs[]` → Use same `_AccountWatchers` junction table

9. **Invoices Relations**:
   - `Invoices.connected_documents[]` → Use same `_DocumentsToInvoices` junction table

**Keep as PostgreSQL Arrays:**
- `crm_Contacts.tags[]` - Simple string array for tagging
- `crm_Contacts.notes[]` - Text notes array
- `Boards.sharedWith[]` - User IDs for board sharing

### JSON Fields Strategy

**Keep as JSONB (No Normalization):**
- `Invoices.invoice_items` - Complex nested invoice line items
- `Documents.tags` - Flexible tag structure
- `Tasks.tags` - Flexible tag structure
- `crm_Accounts_Tasks.tags` - Flexible tag structure

**Reason:** These fields have flexible schemas, complex nested structures, and are not frequently queried individually. JSONB provides the flexibility needed while maintaining PostgreSQL query capabilities.

### ObjectId to UUID Migration

MongoDB uses ObjectId (`@db.ObjectId`) as primary keys. PostgreSQL migration should:
- Replace all `@db.ObjectId` with UUID (`@db.Uuid`)
- Use `@default(uuid())` instead of `@default(auto())`
- Update all foreign key references from ObjectId to UUID
- Migration script must map MongoDB ObjectIds to new UUIDs and maintain referential integrity

### Indexing Requirements by Table

**1. CRM Core Tables:**

`crm_Accounts`:
- Primary key: `id` (automatic)
- Foreign keys: `assigned_to`, `industry`, `createdBy`, `updatedBy` (automatic indexes)
- Filter fields: `status`, `type`, `createdAt`
- Full-text search: `name` (GIN or GiST index for full-text)

`crm_Contacts`:
- Primary key: `id` (automatic)
- Foreign keys: `assigned_to`, `created_by`, `accountsIDs`, `createdBy`, `updatedBy` (automatic indexes)
- Filter fields: `status`, `type`, `createdAt`, `last_activity`
- Full-text search: `first_name`, `last_name`, `notes` (combined full-text index)

`crm_Leads`:
- Primary key: `id` (automatic)
- Foreign keys: `assigned_to`, `accountsIDs`, `createdBy`, `updatedBy` (automatic indexes)
- Filter fields: `status`, `type`, `createdAt`
- Full-text search: `firstName`, `lastName`, `company`

`crm_Opportunities`:
- Primary key: `id` (automatic)
- Foreign keys: `account`, `assigned_to`, `campaign`, `contact`, `created_by`, `sales_stage`, `type` (automatic indexes)
- Filter fields: `status`, `createdAt`, `close_date`, `sales_stage`
- Full-text search: `name`, `description` (combined full-text index)

`crm_Contracts`:
- Primary key: `id` (automatic)
- Foreign keys: `account`, `assigned_to`, `createdBy`, `updatedBy` (automatic indexes)
- Filter fields: `status`, `startDate`, `endDate`, `createdAt`

**2. Task & Project Management:**

`Tasks`:
- Primary key: `id` (automatic)
- Foreign keys: `user`, `section`, `createdBy`, `updatedBy` (automatic indexes)
- Filter fields: `priority`, `taskStatus`, `dueDateAt`, `createdAt`
- Full-text search: `title`, `content` (combined full-text index)

`crm_Accounts_Tasks`:
- Primary key: `id` (automatic)
- Foreign keys: `user`, `account`, `createdBy`, `updatedBy` (automatic indexes)
- Filter fields: `priority`, `taskStatus`, `dueDateAt`, `createdAt`
- Full-text search: `title`, `content`

`Boards`:
- Primary key: `id` (automatic)
- Foreign keys: `user`, `createdBy`, `updatedBy` (automatic indexes)
- Filter fields: `favourite`, `visibility`, `createdAt`

**3. Documents & Invoices:**

`Documents`:
- Primary key: `id` (automatic)
- Foreign keys: `created_by_user`, `assigned_user`, `document_type`, `createdBy`, `updatedBy` (automatic indexes)
- Filter fields: `document_type`, `status`, `visibility`, `favourite`, `createdAt`
- Full-text search: `document_name`, `description` (combined full-text index)

`Invoices`:
- Primary key: `id` (automatic)
- Foreign keys: `invoice_state_id`, `assigned_user_id`, `assigned_account_id`, `last_updated_by` (automatic indexes)
- Filter fields: `status`, `invoice_type`, `date_created`, `date_due`
- Full-text search: `invoice_number`, `partner`, `description`

**4. Users & System:**

`Users`:
- Primary key: `id` (automatic)
- Unique index: `email` (already defined)
- Filter fields: `userStatus`, `userLanguage`, `is_admin`, `is_account_admin`, `created_on`, `lastLoginAt`

**Index Strategy Summary:**
- Automatic indexes on all foreign key columns
- Composite indexes on frequently filtered combinations (e.g., `status + createdAt`)
- GIN indexes for full-text search on text columns
- GIN indexes for JSONB columns that need querying
- Consider partial indexes for common filters (e.g., `WHERE status = 'ACTIVE'`)

### Migration Script Feature Requirements

The migration script MUST include:

1. **Progress Tracking:**
   - Display percentage completion for overall migration
   - Show progress per table/model being migrated
   - Display record counts (processed / total)
   - Estimated time remaining based on current progress

2. **Pause/Resume Capability:**
   - Support graceful interruption (CTRL+C handling)
   - Save migration state to checkpoint file
   - Resume from last checkpoint when restarted
   - Track which records have been successfully migrated
   - Skip already-migrated records on resume

3. **Detailed Error Logging:**
   - Log specific record IDs that fail to migrate
   - Include full error messages and stack traces
   - Log the original MongoDB document that failed
   - Create separate error log file for failed records
   - Continue migration for other records even if some fail
   - Provide summary of all errors at the end

4. **NOT Required:**
   - Dry-run mode - NOT needed
   - Batch size configuration - Fixed batch size is sufficient

### Data Validation Requirements

The data validation script MUST validate:

1. **Row Count Validation:**
   - Compare total record counts for each table between MongoDB and PostgreSQL
   - Report any discrepancies with specific counts
   - Fail validation if counts don't match

2. **Sample Record Validation:**
   - Select random sample of records (e.g., 100 records per table)
   - Compare field values between MongoDB and PostgreSQL
   - Validate data type conversions are correct
   - Check for data truncation or corruption

3. **Referential Integrity Validation:**
   - Verify all foreign key relationships resolve correctly
   - Check that no orphaned records exist
   - Validate junction table relationships are bidirectional
   - Ensure UUID mappings maintain original relationships

4. **Data Type Conversion Validation:**
   - Verify DateTime fields converted correctly
   - Check array fields (normalized vs. kept as arrays)
   - Validate JSONB fields maintain structure
   - Confirm enum values match defined types
   - Check boolean field conversions

5. **Specific Field Validations:**
   - Email format validation
   - Required fields are not null
   - Enum values are within defined constraints
   - Date ranges are logical (e.g., endDate > startDate)

### Environment Variables & Configuration

**Database Connection:**
- `DATABASE_URL` - Single environment variable used for database connection
  - During migration: Will be MongoDB URL initially
  - Post-migration: Will be PostgreSQL URL
  - Format (MongoDB): `mongodb://username:password@host:port/database`
  - Format (PostgreSQL): `postgresql://username:password@host:port/database`

**No Additional Migration Variables Needed:**
- No separate `DATABASE_URL_POSTGRES` variable
- No migration script configuration variables
- No fallback/rollback flags

**Prisma Configuration:**
- Update `prisma/schema.prisma` datasource from `mongodb` to `postgresql`
- Enable Prisma Studio for debugging (no special env var needed)
- Use Prisma's built-in connection pooling (configured in Prisma schema)

### Technical Considerations

**From Tech Stack Analysis:**
- Current: MongoDB 7 + Prisma ORM
- Target: PostgreSQL 16 + Prisma ORM
- Use Prisma Migrate for schema management
- Connection pooling via Prisma (no PgBouncer needed)
- Enable pgvector extension for future AI/RAG features

**MongoDB-Specific Features Currently NOT Used:**
- No `$lookup` aggregations that need special handling
- No MongoDB text indexes to migrate
- No embedded documents requiring complex normalization beyond what's already identified

**Performance Requirements:**
- Target < 100ms for simple queries (per success criteria)
- Migration should handle large datasets efficiently
- Use transactions for data integrity during migration

**Data Integrity:**
- Zero data loss requirement
- All relationships must be preserved
- Foreign key constraints must be enforced post-migration

---

## Functional Requirements

### Core Functionality

1. **Schema Redesign:**
   - Convert MongoDB schema to PostgreSQL-optimized relational schema
   - Normalize array-based many-to-many relationships into junction tables
   - Replace ObjectId with UUID for primary/foreign keys
   - Keep flexible fields as JSONB (invoice_items, tags)
   - Define all indexes (foreign keys, filter fields, full-text search)
   - Maintain all existing enums

2. **Migration Script:**
   - Read data from MongoDB using current Prisma client
   - Transform data to match new PostgreSQL schema
   - Handle ObjectId to UUID mapping with referential integrity
   - Migrate in batches for efficiency
   - Insert data into PostgreSQL with proper relationships
   - Track progress with percentage completion
   - Support pause/resume functionality with checkpoint files
   - Log errors with specific record IDs that fail
   - Continue processing even if individual records fail

3. **Data Validation Script:**
   - Compare row counts between MongoDB and PostgreSQL
   - Validate sample records field-by-field
   - Check referential integrity of all foreign keys
   - Verify data type conversions (dates, arrays, JSON, enums)
   - Generate validation report with pass/fail status

4. **Prisma Configuration:**
   - Update schema.prisma from mongodb to postgresql provider
   - Configure Prisma Migrate for schema management
   - Set up connection pooling in Prisma schema
   - Document Prisma Studio usage for debugging

### User Actions Enabled

1. **For Developers:**
   - Run migration script with `npm run migrate:mongo-to-postgres`
   - Monitor migration progress in real-time
   - Pause migration and resume later if needed
   - Review error logs for failed records
   - Run validation script to verify migration success
   - Use Prisma Studio to inspect PostgreSQL data

2. **For DevOps:**
   - Update DATABASE_URL environment variable
   - Run Prisma migrations (`npx prisma migrate deploy`)
   - Verify PostgreSQL indexes are created
   - Monitor query performance post-migration

### Data to be Managed

**All 26 Models Migrated:**
- CRM entities (accounts, contacts, leads, opportunities, contracts)
- Tasks and project management (tasks, boards, sections)
- Documents and invoices
- Users and authentication data
- System configuration and lookup tables
- All relationships and foreign keys preserved
- All historical data (creation dates, update dates, audit trails)

---

## Reusability Opportunities

### Components That Might Exist Already

No existing migration or database conversion features exist in NextCRM. This is a foundational infrastructure change.

### Backend Patterns to Reference

**Prisma Usage Patterns:**
- Existing Prisma client usage throughout the application
- Current API routes using Prisma for data access
- Server Actions using Prisma for mutations

**Migration Script Could Follow Patterns From:**
- Existing data import/export functionality (if any)
- Batch processing patterns used in the application

### Similar Features to Model After

No direct similar features, but the migration should:
- Follow NextCRM's existing TypeScript strict typing patterns
- Use Next.js API patterns for any migration status endpoints
- Match existing error handling and logging patterns

---

## Scope Boundaries

### In Scope

1. **Complete PostgreSQL Schema Design:**
   - All 26 models converted to PostgreSQL
   - Junction tables for many-to-many relationships
   - Proper indexing strategy implemented
   - JSONB for flexible schema fields
   - UUID replacement for ObjectId

2. **Migration Tooling:**
   - Automated migration script with progress tracking
   - Pause/resume functionality
   - Comprehensive error logging
   - ObjectId to UUID mapping logic
   - Batch processing for efficiency

3. **Data Validation:**
   - Row count validation
   - Sample record field validation
   - Referential integrity checks
   - Data type conversion verification

4. **Prisma Configuration:**
   - Updated schema.prisma for PostgreSQL
   - Prisma Migrate setup
   - Connection pooling configuration
   - Prisma Studio enablement

5. **Testing Requirements:**
   - Migration script testing with sample data
   - Validation script testing
   - Edge case handling (null values, empty arrays, etc.)

### Out of Scope

1. **Deployment Guide:**
   - No detailed deployment procedures in the spec
   - DevOps documentation handled separately

2. **Application Code Changes:**
   - Focus is on database migration, not application refactoring
   - Assumes Prisma client code will work with new schema

3. **Performance Benchmarking:**
   - Migration spec focuses on correctness, not performance testing
   - Performance validation can be separate effort

4. **Rollback Procedures:**
   - No automatic rollback mechanisms
   - Manual rollback would require restoring MongoDB backup

5. **UI for Migration Status:**
   - Migration runs as CLI script, no web UI

6. **MongoDB Compatibility Layer:**
   - Clean cutover to PostgreSQL, no parallel running

7. **Advanced PostgreSQL Features:**
   - No pgvector setup (future enhancement)
   - No advanced partitioning or sharding
   - No PostgreSQL-specific optimizations beyond indexes

### Future Enhancements Mentioned

1. **pgvector Integration:**
   - Will be enabled by this migration
   - Actual RAG implementation is Phase 2

2. **Advanced Indexing:**
   - May add more sophisticated indexes based on usage patterns
   - Partial indexes for common query patterns

3. **Query Optimization:**
   - Post-migration performance tuning
   - Analyzing slow queries with EXPLAIN

---

## Technical Considerations

### Integration Points

1. **Prisma ORM:**
   - Single source of truth for schema
   - Handles SQL generation and migrations
   - Type-safe database client

2. **Next.js Application:**
   - All API routes and Server Actions use Prisma
   - No application code changes expected (Prisma abstracts database)

3. **Environment Variables:**
   - DATABASE_URL must be updated to PostgreSQL connection string
   - No other environment variables needed

### Existing System Constraints

1. **Current MongoDB Schema:**
   - Cannot break existing deployments during development
   - Must support graceful migration for production users

2. **Data Integrity:**
   - Zero data loss requirement from success criteria
   - All relationships must be preserved

3. **TypeScript Strict Mode:**
   - All migration scripts must use TypeScript strict mode
   - No 'any' types allowed (aligns with Phase 1 goals)

4. **Testing Requirements:**
   - Comprehensive testing required per Phase 1 priorities
   - Migration script must be thoroughly tested

### Technology Stack Alignment

**From Tech Stack Document:**
- PostgreSQL 16 is planned target
- Prisma ORM for type-safe database access
- Prisma Migrate for schema management
- Built-in connection pooling (no PgBouncer)
- Future pgvector support for AI/RAG (Phase 2)

**Migration Aligns With:**
- Phase 1 TOP PRIORITY: PostgreSQL migration
- Enterprise-grade quality focus
- Type-safe development practices
- Self-hosting requirements (PostgreSQL runs on user infrastructure)

### Success Criteria Alignment

From initialization.md:
- All MongoDB data successfully migrated to PostgreSQL ✓
- No data loss or corruption ✓ (validation script ensures this)
- Performance improvements measurable (< 100ms for simple queries) ✓ (indexing strategy supports this)
- Comprehensive test coverage for migration process ✓
- Clear migration guide for users ✓ (out of scope for spec, but will be created)
- Production-ready PostgreSQL setup ✓ (proper schema, indexes, constraints)
