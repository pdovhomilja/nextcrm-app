# PostgreSQL Schema Migration - Detailed Changes

## Executive Summary

This document details all changes made to the Prisma schema during the MongoDB to PostgreSQL migration. The migration maintains all 26 entity models while converting them to PostgreSQL-native patterns.

## 1. Core Schema Transformations

### 1.1 Datasource Configuration

**Before (MongoDB):**
```prisma
datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}
```

**After (PostgreSQL):**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 1.2 Primary Key Migration (ObjectId → UUID)

**All 26 models updated from:**
```prisma
id String @id @default(auto()) @map("_id") @db.ObjectId
```

**To:**
```prisma
id String @id @default(uuid()) @db.Uuid
```

**Models affected:** All 26 entity models

### 1.3 Foreign Key Type Updates

**All foreign key fields updated from:**
```prisma
assigned_to String? @db.ObjectId
```

**To:**
```prisma
assigned_to String? @db.Uuid
```

### 1.4 MongoDB-Specific Attribute Removal

- Removed `@map("_id")` from all primary key fields
- Removed `@db.Date` from DateTime fields (PostgreSQL uses native DateTime)
- Updated default DateTime handling

## 2. Junction Tables Created

### 2.1 Document-Related Junction Tables (7 tables)

#### DocumentsToInvoices
```prisma
model DocumentsToInvoices {
  document_id String @db.Uuid
  invoice_id  String @db.Uuid

  document Documents @relation(fields: [document_id], references: [id], onDelete: Cascade)
  invoice  Invoices  @relation(fields: [invoice_id], references: [id], onDelete: Cascade)

  @@id([document_id, invoice_id])
  @@index([document_id])
  @@index([invoice_id])
}
```

**Other Document Junction Tables:**
- `DocumentsToOpportunities` - Links documents to opportunities
- `DocumentsToContacts` - Links documents to contacts
- `DocumentsToTasks` - Links documents to tasks
- `DocumentsToCrmAccountsTasks` - Links documents to CRM account tasks
- `DocumentsToLeads` - Links documents to leads
- `DocumentsToAccounts` - Links documents to accounts

### 2.2 Watcher Junction Tables (2 tables)

#### AccountWatchers
```prisma
model AccountWatchers {
  account_id String @db.Uuid
  user_id    String @db.Uuid

  account crm_Accounts @relation(fields: [account_id], references: [id], onDelete: Cascade)
  user    Users        @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@id([account_id, user_id])
  @@index([account_id])
  @@index([user_id])
}
```

#### BoardWatchers
```prisma
model BoardWatchers {
  board_id String @db.Uuid
  user_id  String @db.Uuid

  board Boards @relation(fields: [board_id], references: [id], onDelete: Cascade)
  user  Users  @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@id([board_id, user_id])
  @@index([board_id])
  @@index([user_id])
}
```

### 2.3 Contact-Opportunity Junction Table

#### ContactsToOpportunities
```prisma
model ContactsToOpportunities {
  contact_id     String @db.Uuid
  opportunity_id String @db.Uuid

  contact     crm_Contacts      @relation(fields: [contact_id], references: [id], onDelete: Cascade)
  opportunity crm_Opportunities @relation(fields: [opportunity_id], references: [id], onDelete: Cascade)

  @@id([contact_id, opportunity_id])
  @@index([contact_id])
  @@index([opportunity_id])
}
```

## 3. Array Fields - PostgreSQL Native Arrays

The following fields are kept as PostgreSQL native arrays:

### crm_Contacts
```prisma
tags   String[]
notes  String[]
```

### Boards
```prisma
sharedWith String[] @db.Uuid
```

### Documents
```prisma
connected_documents String[]
```

## 4. JSONB Fields

The following fields use PostgreSQL's JSONB type:

### Invoices
```prisma
invoice_items Json? @db.JsonB
```

### Documents
```prisma
tags Json? @db.JsonB
```

### Tasks
```prisma
tags Json? @db.JsonB
```

### crm_Accounts_Tasks
```prisma
tags Json? @db.JsonB
```

## 5. Array Fields Normalized to Junction Tables

### 5.1 Documents Model
**Before (MongoDB):**
```prisma
invoiceIDs               String[]  @db.ObjectId
opportunityIDs           String[]  @db.ObjectId
contactsIDs              String[]  @db.ObjectId
tasksIDs                 String[]  @db.ObjectId
crm_accounts_tasksIDs    String[]  @db.ObjectId
leadsIDs                 String[]  @db.ObjectId
accountsIDs              String[]  @db.ObjectId
```

**After (PostgreSQL):**
```prisma
invoices               DocumentsToInvoices[]
opportunities          DocumentsToOpportunities[]
contacts               DocumentsToContacts[]
tasks                  DocumentsToTasks[]
crm_accounts_tasks     DocumentsToCrmAccountsTasks[]
leads                  DocumentsToLeads[]
accounts               DocumentsToAccounts[]
```

### 5.2 crm_Accounts Model
**Before (MongoDB):**
```prisma
documentsIDs  String[] @db.ObjectId
watchers      String[] @db.ObjectId
```

**After (PostgreSQL):**
```prisma
documents DocumentsToAccounts[]
watchers  AccountWatchers[]
```

### 5.3 Boards Model
**Before (MongoDB):**
```prisma
watchers String[] @db.ObjectId
```

**After (PostgreSQL):**
```prisma
watchers BoardWatchers[]
```

### 5.4 crm_Opportunities Model
**Before (MongoDB):**
```prisma
connected_documents String[] @db.ObjectId
connected_contacts  String[] @db.ObjectId
```

**After (PostgreSQL):**
```prisma
documents DocumentsToOpportunities[]
contacts  ContactsToOpportunities[]
```

### 5.5 crm_Contacts Model
**Before (MongoDB):**
```prisma
opportunitiesIDs String[] @db.ObjectId
documentsIDs     String[] @db.ObjectId
```

**After (PostgreSQL):**
```prisma
opportunities ContactsToOpportunities[]
documents     DocumentsToContacts[]
```

### 5.6 Users Model
**Before (MongoDB):**
```prisma
watching_boardsIDs   String[] @db.ObjectId
watching_accountsIDs String[] @db.ObjectId
```

**After (PostgreSQL):**
```prisma
watching_boards   BoardWatchers[]
watching_accounts AccountWatchers[]
```

### 5.7 Tasks Model
**Before (MongoDB):**
```prisma
documentIDs String[] @db.ObjectId
```

**After (PostgreSQL):**
```prisma
documents DocumentsToTasks[]
```

### 5.8 crm_Accounts_Tasks Model
**Before (MongoDB):**
```prisma
documentsIDs String[] @db.ObjectId
```

**After (PostgreSQL):**
```prisma
documents DocumentsToCrmAccountsTasks[]
```

### 5.9 crm_Leads Model
**Before (MongoDB):**
```prisma
documentsIDs String[] @db.ObjectId
```

**After (PostgreSQL):**
```prisma
documents DocumentsToLeads[]
```

### 5.10 Invoices Model
**Before (MongoDB):**
```prisma
connected_documents String[] @db.ObjectId
```

**After (PostgreSQL):**
```prisma
documents DocumentsToInvoices[]
```

## 6. Index Strategy Implementation

### 6.1 Tier 1 Indexes (Foreign Keys - Automatic)

All foreign key columns automatically receive B-tree indexes. Examples:

**crm_Accounts:**
```prisma
@@index([assigned_to])
@@index([industry])
@@index([createdBy])
@@index([updatedBy])
```

**crm_Opportunities:**
```prisma
@@index([account])
@@index([assigned_to])
@@index([campaign])
@@index([contact])
@@index([created_by])
@@index([sales_stage])
@@index([type])
```

### 6.2 Tier 2 Indexes (Common Filter Fields)

Indexes on frequently filtered columns:

**Status fields:**
```prisma
@@index([status])      // crm_Accounts, crm_Leads, crm_Opportunities, Invoices, Documents
@@index([taskStatus])  // Tasks, crm_Accounts_Tasks
@@index([userStatus])  // Users
```

**Type fields:**
```prisma
@@index([type])        // crm_Accounts, crm_Leads, crm_Contacts
@@index([invoice_type]) // Invoices
@@index([document_system_type]) // Documents
```

**Date fields:**
```prisma
@@index([createdAt])   // Most models
@@index([updatedAt])   // Where applicable
@@index([dueDateAt])   // Tasks, crm_Accounts_Tasks
@@index([close_date])  // crm_Opportunities
@@index([date_created]) // Invoices
@@index([date_due])    // Invoices
@@index([startDate])   // crm_Contracts
@@index([endDate])     // crm_Contracts
```

### 6.3 Composite Indexes

**crm_Opportunities:**
```prisma
@@index([status, sales_stage])
```

**Tasks:**
```prisma
@@index([user, taskStatus])
```

**crm_Accounts_Tasks:**
```prisma
@@index([account, taskStatus])
```

**Invoices:**
```prisma
@@index([status, date_created])
```

**crm_Contracts:**
```prisma
@@index([startDate, endDate])
```

**Boards:**
```prisma
@@index([user, favourite])
```

### 6.4 Special Indexes

**Users email (unique):**
```prisma
@@index([email])
```

**Favorite/Important fields:**
```prisma
@@index([favourite])   // Documents, Boards
@@index([favorite])    // Invoices (note spelling difference)
```

**Visibility fields:**
```prisma
@@index([visibility])  // Boards, Documents
```

## 7. Relation Name Changes

To avoid naming conflicts in PostgreSQL, several relation names were made explicit:

### crm_Accounts
```prisma
assigned_to_user Users? @relation("AccountAssignedTo", fields: [assigned_to], references: [id])
```

### crm_Leads
```prisma
assigned_to_user Users? @relation("LeadAssignedTo", fields: [assigned_to], references: [id])
```

### crm_Opportunities
```prisma
assigned_to_user Users? @relation("assigned_to_user_relation", fields: [assigned_to], references: [id])
created_by_user  Users? @relation("created_by_user_relation", fields: [created_by], references: [id])
```

### crm_Contacts
```prisma
assigned_to_user Users? @relation("assigned_contacts", fields: [assigned_to], references: [id])
crate_by_user    Users? @relation("created_contacts", fields: [created_by], references: [id])
```

### Documents
```prisma
created_by       Users? @relation("created_by_user", fields: [created_by_user], references: [id])
assigned_to_user Users? @relation("assigned_to_user", fields: [assigned_user], references: [id])
```

### Boards
```prisma
assigned_user Users? @relation("assigned_user", fields: [user], references: [id])
```

## 8. Enums Preserved

All 9 enums remain unchanged:

1. `crm_Lead_Status` (NEW, CONTACTED, QUALIFIED, LOST)
2. `crm_Lead_Type` (DEMO)
3. `crm_Opportunity_Status` (ACTIVE, INACTIVE, PENDING, CLOSED)
4. `crm_Contact_Type` (Customer, Partner, Vendor, Prospect)
5. `crm_Contracts_Status` (NOTSTARTED, INPROGRESS, SIGNED)
6. `DocumentSystemType` (INVOICE, RECEIPT, CONTRACT, OFFER, OTHER)
7. `taskStatus` (ACTIVE, PENDING, COMPLETE)
8. `ActiveStatus` (ACTIVE, INACTIVE, PENDING)
9. `Language` (cz, en, de, uk)
10. `gptStatus` (ACTIVE, INACTIVE)

## 9. Models Overview

### Total Model Count
- **26 entity models** (unchanged from MongoDB)
- **10 junction tables** (new for PostgreSQL)
- **Total: 36 models**

### Entity Models by Category

**CRM Core (8 models):**
- crm_Accounts
- crm_Contacts
- crm_Leads
- crm_Opportunities
- crm_Contracts
- crm_campaigns
- crm_Opportunities_Sales_Stages
- crm_Opportunities_Type

**Task & Project Management (5 models):**
- Tasks
- crm_Accounts_Tasks
- tasksComments
- Sections
- Boards

**Documents & Invoices (4 models):**
- Documents
- Documents_Types
- Invoices
- invoice_States

**System & Configuration (5 models):**
- Users
- system_Modules_Enabled
- modulStatus
- systemServices
- MyAccount

**Lookup & Other (4 models):**
- crm_Industry_Type
- secondBrain_notions
- openAi_keys
- Employees
- ImageUpload
- TodoList
- gpt_models

## 10. Breaking Changes Summary

### For Application Code

1. **Junction table queries**: Array-based queries need to be updated to use junction tables
   - Example: `documents: { some: { id: documentId } }`
   - Becomes: `documents: { some: { document_id: documentId } }`

2. **Relation names**: Some explicit relation names may affect existing queries
   - Check all `Users` relations
   - Check `Documents` relations

3. **Primary keys**: All IDs are now UUIDs instead of ObjectIds
   - UUID format validation may be needed
   - String length considerations (UUIDs are longer than ObjectIds)

### For Database Operations

1. **No partial indexes yet**: PostgreSQL supports partial indexes, but they're not in this initial schema
   - Can be added via raw SQL or future migrations

2. **Full-text search**: GIN indexes for full-text search need to be added manually via SQL
   - Not currently in Prisma schema (limitation of Prisma)
   - Will need custom migration SQL

3. **Array operations**: PostgreSQL array operations differ from MongoDB
   - Use PostgreSQL array operators in raw queries
   - Prisma supports basic array operations

## 11. Migration Considerations

### Data Transformation Required

1. **ObjectId → UUID mapping**: Must maintain mapping during migration
2. **Array field data**: Documents relations need to be exploded into junction tables
3. **DateTime formats**: MongoDB dates → PostgreSQL timestamps
4. **JSONB conversion**: JSON → JSONB (mostly transparent)

### Foreign Key Integrity

- All foreign keys will have `ON DELETE CASCADE` in junction tables
- Main model relations use Prisma's default behavior
- Orphaned records will cause migration failures (intentional for data integrity)

## 12. Future Optimizations

### Not Included in Initial Schema

1. **Full-text search indexes** (GIN with to_tsvector)
   - Requires raw SQL in migration
   - See spec.md for detailed FTS strategy

2. **Partial indexes** for common filters
   - Example: `WHERE userStatus = 'ACTIVE'`
   - Can be added in future migrations

3. **Expression indexes** for computed values
   - Not needed initially
   - Can optimize specific queries later

4. **Materialized views** for reports
   - Consider for Phase 2 optimizations

## 13. Validation Checklist

- [x] All 26 models converted to PostgreSQL
- [x] All primary keys use UUID
- [x] All foreign keys use UUID
- [x] All MongoDB-specific attributes removed
- [x] All 10 junction tables created
- [x] All indexes defined
- [x] All relations properly named
- [x] All enums preserved
- [x] Schema validates with `npx prisma format`
- [x] Schema compiles without errors

## 14. Next Steps

1. **Create PostgreSQL database** with required extensions (uuid-ossp, pgvector)
2. **Run Prisma migrate** to generate migration SQL
3. **Review generated migration** for correctness
4. **Test migration** on empty PostgreSQL database
5. **Develop data migration script** (Phase 2)
6. **Implement validation script** (Phase 3)
7. **Add full-text search indexes** via custom SQL migration

---

**Document Version:** 1.0
**Last Updated:** 2025-11-05
**Prisma Version:** 5.22.0
**PostgreSQL Target:** 16+
