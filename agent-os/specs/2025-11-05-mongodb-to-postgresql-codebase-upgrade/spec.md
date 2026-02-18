# Specification: MongoDB to PostgreSQL Codebase Upgrade

## Executive Summary

This specification outlines the comprehensive codebase upgrade required to make the NextCRM application fully compatible with PostgreSQL following the successful database migration from MongoDB. The PostgreSQL schema is deployed, and data has been migrated. This work focuses on updating application code to use the new schema patterns, particularly junction tables for many-to-many relationships.

**Key Deliverables:**
- Fix 25 TypeScript compilation errors in application code
- Update 10 junction table query patterns across all modules
- Create 20+ utility functions for standardized junction table operations
- Update all relation names to match new explicit schema
- Comprehensive testing and documentation

**Estimated Timeline:** 4-5 days

**Affected Modules:** CRM (Accounts, Contacts, Opportunities, Leads), Documents, Projects/Boards, Tasks, Invoices

---

## Background and Context

### Migration Overview

The NextCRM application has undergone a database migration from MongoDB to PostgreSQL. This migration involved:

1. **Schema Conversion:** All 26 models converted from MongoDB ObjectId to PostgreSQL UUID primary keys
2. **Data Normalization:** Array-based relationships converted to proper relational junction tables
3. **Relationship Updates:** 10 new junction tables created for many-to-many relationships
4. **Explicit Relations:** Relation names made explicit to avoid conflicts in Prisma

**Current Status:**
- PostgreSQL database is deployed and operational
- Data has been successfully migrated from MongoDB
- Prisma schema updated to PostgreSQL syntax (see `/prisma/schema.prisma`)
- Application code contains 25 TypeScript errors due to schema changes

### Schema Changes Summary

**Primary Key Migration:**
- **Old:** MongoDB ObjectId (`String @db.ObjectId`)
- **New:** PostgreSQL UUID (`String @default(uuid()) @db.Uuid`)

**Array Fields to Junction Tables:**
- **Old:** Direct array fields (e.g., `accountsIDs: String[] @db.ObjectId`)
- **New:** Junction table relations (e.g., `accounts: DocumentsToAccounts[]`)

**Junction Tables Created (10 total):**

| Junction Table | Links | Composite Key |
|----------------|-------|---------------|
| DocumentsToInvoices | Documents ↔ Invoices | (document_id, invoice_id) |
| DocumentsToOpportunities | Documents ↔ Opportunities | (document_id, opportunity_id) |
| DocumentsToContacts | Documents ↔ Contacts | (document_id, contact_id) |
| DocumentsToTasks | Documents ↔ Tasks | (document_id, task_id) |
| DocumentsToCrmAccountsTasks | Documents ↔ CRM Tasks | (document_id, crm_accounts_task_id) |
| DocumentsToLeads | Documents ↔ Leads | (document_id, lead_id) |
| DocumentsToAccounts | Documents ↔ Accounts | (document_id, account_id) |
| AccountWatchers | Accounts ↔ Users | (account_id, user_id) |
| BoardWatchers | Boards ↔ Users | (board_id, user_id) |
| ContactsToOpportunities | Contacts ↔ Opportunities | (contact_id, opportunity_id) |

---

## Technical Requirements

### 1. TypeScript Error Resolution

**Priority: CRITICAL**

Fix all 25 TypeScript compilation errors in application code (excludes migration scripts which are out of scope).

**Error Categories:**

**A. Junction Table Pattern Mismatches (15 errors)**
- Files using old array field names that no longer exist
- Files using MongoDB array operators (`has`, `push`)
- Files missing junction table includes

**B. Relation Name Mismatches (8 errors)**
- Files using generic relation names that were made explicit
- Files missing updated relation references

**C. Watchers Implementation Errors (2 errors)**
- Files using `watching_users` field (renamed to `watchers`)
- Files using array operations for watchers

**Validation:**
```bash
pnpm exec tsc --noEmit
```
Expected: Zero errors

### 2. Junction Table Query Pattern Updates

**Priority: HIGH**

Update all database queries from MongoDB array patterns to PostgreSQL junction table patterns.

**Pattern Comparison:**

**Old MongoDB Pattern:**
```typescript
// Query with array field
const documents = await prisma.documents.findMany({
  where: {
    accountsIDs: { has: accountId }  // Array contains operator
  }
});

// Update with array push
await prisma.crm_Accounts.update({
  where: { id },
  data: {
    watchers: { push: userId }  // Array push operator
  }
});
```

**New PostgreSQL Pattern:**
```typescript
// Query through junction table
const documents = await prisma.documents.findMany({
  where: {
    accounts: {  // Junction table relation
      some: {
        account_id: accountId
      }
    }
  }
});

// Update with nested create
await prisma.crm_Accounts.update({
  where: { id },
  data: {
    watchers: {
      create: { user_id: userId }
    }
  }
});
```

**Required Updates:**
- Replace all array field references with junction table relations
- Update all MongoDB operators to Prisma relational queries
- Add proper includes for fetching related data through junction tables

### 3. Relation Name Updates

**Priority: MEDIUM**

Update all relation references to use explicit relation names defined in the schema.

**Explicit Relations in Users Model:**

| Old Pattern | New Relation Name | Usage Context |
|-------------|-------------------|---------------|
| Generic `accounts` | "AccountAssignedTo" | CRM Accounts assigned_to |
| Generic `leads` | "LeadAssignedTo" | CRM Leads assigned_to |
| Generic `opportunities` | "assigned_to_user_relation" | Opportunities assigned_to |
| Generic `opportunities` | "created_by_user_relation" | Opportunities created_by |
| Generic `contacts` | "assigned_contacts" | Contacts assigned_to |
| Generic `contacts` | "created_contacts" | Contacts created_by |
| Generic `documents` | "created_by_user" | Documents created_by |
| Generic `documents` | "assigned_to_user" | Documents assigned_to |
| Generic `boards` | "assigned_user" | Boards user field |

**Example Update:**
```typescript
// Query account with assigned user
const account = await prisma.crm_Accounts.findUnique({
  where: { id },
  include: {
    assigned_to_user: true  // Uses "AccountAssignedTo" relation
  }
});
```

### 4. Utility Functions Creation

**Priority: HIGH**

Create standardized helper functions for common junction table operations to reduce code duplication and ensure consistency.

**Location:** `/lib/junction-helpers.ts` (new file)

**Functions Required (20+ total):**

**Document Junction Helpers:**
- `connectDocuments(documentIds)` - Connect documents to entity on create
- `updateDocuments(newDocumentIds)` - Replace all documents
- `addDocuments(documentIds)` - Add documents without removing existing
- `removeDocuments(documentIds)` - Remove specific documents

**Watcher Junction Helpers:**
- `connectWatchers(userIds)` - Connect watchers to entity on create
- `updateWatchers(newUserIds)` - Replace all watchers
- `addWatcher(userId)` - Add single watcher
- `removeAccountWatcher(accountId, userId)` - Remove watcher from account
- `removeBoardWatcher(boardId, userId)` - Remove watcher from board

**Contact Junction Helpers:**
- `connectContactsToOpportunity(contactIds)` - Connect contacts on create
- `updateContactsForOpportunity(newContactIds)` - Replace all contacts

**Query Helper Functions:**
- `hasDocument(documentId)` - Filter entities with specific document
- `hasAnyDocument(documentIds)` - Filter entities with any of documents
- `watchedByUser(userId)` - Filter entities watched by user

**Include Helper Functions:**
- `includeWatchersWithUsers()` - Standard watcher include with user details
- `includeDocuments()` - Standard document include with metadata

**Extract Helper Functions:**
- `extractWatcherUsers(watchers)` - Extract user objects from junction result
- `extractDocuments(documentJunctions)` - Extract documents from junction result
- `extractContacts(contactJunctions)` - Extract contacts from junction result

### 5. Remove Unnecessary Select Clauses

**Priority: LOW**

Simplify junction table queries by removing unnecessary select statements.

**Before (unnecessary):**
```typescript
documents: {
  select: {
    document_id: true,
    account_id: true,
    document: true
  }
}
```

**After (simplified):**
```typescript
documents: {
  include: {
    document: true  // Only include related entity
  }
}
```

**Rationale:** Junction tables only contain foreign keys. Complex selects add no value and reduce readability.

---

## Implementation Approach

### Phase 1: Foundation (Day 1)

**Goal:** Create utility infrastructure and fix critical errors

1. **Create Junction Helper Library**
   - Create `/lib/junction-helpers.ts`
   - Implement all 20+ helper functions
   - Add TypeScript types and JSDoc documentation
   - Add usage examples in comments

2. **Fix CRM Accounts Module (Highest Priority)**
   - Fix documents relationship in `actions/crm/get-account.ts`
   - Fix watchers relationship in `actions/crm/get-accounts.ts`
   - Update create/update operations in `actions/crm/update-account.ts`
   - Fix API routes: `app/api/crm/account/[accountId]/route.ts`
   - Fix watcher API: `app/api/crm/account/[accountId]/watch/route.ts`

3. **Initial Testing**
   - Run TypeScript compilation check
   - Test account CRUD operations
   - Verify junction helper functions work

### Phase 2: Core Modules (Days 2-3)

**Goal:** Update all CRM and Document modules

**Day 2:**
1. **Documents Module**
   - Fix `actions/documents/get-documents-by-accountId.ts`
   - Fix `actions/documents/get-documents-by-contactId.ts`
   - Fix `actions/documents/get-documents-by-opportunityId.ts`
   - Fix `actions/documents/get-documents-by-leadId.ts`
   - Update main documents query in `actions/documents/get-documents.ts`

2. **CRM Contacts Module**
   - Update documents relationship queries
   - Update opportunities relationship (ContactsToOpportunities junction)
   - Fix relation name references
   - Update create/update operations

**Day 3:**
3. **CRM Opportunities Module**
   - Update documents relationship queries
   - Update contacts relationship (ContactsToOpportunities junction)
   - Fix relation name references
   - Update create/update operations

4. **CRM Leads Module**
   - Update documents relationship queries
   - Fix relation name references
   - Update create/update operations

### Phase 3: Projects and Tasks (Day 3)

**Goal:** Update projects, boards, and task modules

1. **Projects/Boards Module**
   - Fix watchers in `actions/projects/get-board.ts`
   - Fix watchers in `actions/projects/update-board.ts`
   - Fix API routes: `app/api/projects/board/[boardId]/route.ts`
   - Fix watcher API: `app/api/projects/board/[boardId]/watch/route.ts`

2. **Tasks Modules**
   - Update documents relationship in `actions/projects/get-task.ts`
   - Update CRM task documents in `actions/crm/get-account-task.ts`
   - Update create/update operations

3. **Invoices Module**
   - Update documents relationship in `actions/invoice/get-invoice.ts`

### Phase 4: Testing and Validation (Day 4)

**Goal:** Comprehensive testing of all updated code

1. **TypeScript Compilation**
   - Run full compilation check
   - Verify zero errors
   - Fix any newly discovered issues

2. **Manual Testing** (see Testing Strategy section)
   - Test each module's CRUD operations
   - Test junction table operations (add, remove, update)
   - Test edge cases (empty arrays, null values)

3. **Database Verification**
   - Verify junction tables are populated correctly
   - Check for orphaned records
   - Test cascade deletes

4. **Performance Testing**
   - Measure query performance
   - Identify slow queries
   - Document performance characteristics

### Phase 5: Documentation (Day 5)

**Goal:** Document all changes for future reference

1. **Code Documentation**
   - Add comments to complex junction table queries
   - Document pattern changes in helper file
   - Add usage examples

2. **Change Log**
   - Update `CHANGELOG.md` with all changes
   - List all modified files
   - Document breaking changes (if any)

3. **Developer Guide**
   - Create `docs/POSTGRESQL_MIGRATION_GUIDE.md`
   - Include before/after examples
   - Document common patterns
   - List troubleshooting tips

4. **Testing Documentation**
   - Create `docs/TESTING_CHECKLIST.md`
   - Document test data setup
   - List expected results

---

## Detailed Specifications by Module

### Module 1: CRM Accounts

**Files to Update:** 5-6 files

**A. Documents Relationship**

**Current Implementation (BROKEN):**
```typescript
// actions/crm/get-account.ts - Line 11
const account = await prisma.crm_Accounts.findUnique({
  where: { id },
  include: {
    assigned_documents: true  // ERROR: Field doesn't exist
  }
});
```

**New Implementation:**
```typescript
import { junctionTableHelpers } from '@/lib/junction-helpers';

// Get account with documents
const account = await prisma.crm_Accounts.findUnique({
  where: { id },
  include: junctionTableHelpers.includeDocuments()
});

// Extract documents array from junction result
const documents = junctionTableHelpers.extractDocuments(account.documents || []);
```

**B. Watchers Relationship**

**Current Implementation (BROKEN):**
```typescript
// Add watcher using array push
await prisma.crm_Accounts.update({
  where: { id },
  data: {
    watchers: { push: userId }  // ERROR: Not an array
  }
});

// Query using watching_users field
const accounts = await prisma.crm_Accounts.findMany({
  where: {
    watching_users: { has: userId }  // ERROR: Field doesn't exist
  }
});
```

**New Implementation:**
```typescript
import { junctionTableHelpers } from '@/lib/junction-helpers';

// Add watcher using junction table
await prisma.crm_Accounts.update({
  where: { id },
  data: {
    watchers: junctionTableHelpers.addWatcher(userId)
  }
});

// Remove watcher using composite key
await prisma.crm_Accounts.update({
  where: { id },
  data: {
    watchers: junctionTableHelpers.removeAccountWatcher(accountId, userId)
  }
});

// Query accounts watched by user
const accounts = await prisma.crm_Accounts.findMany({
  where: junctionTableHelpers.watchedByUser(userId),
  include: junctionTableHelpers.includeWatchersWithUsers()
});

// Extract watcher users from result
const watcherUsers = junctionTableHelpers.extractWatcherUsers(account.watchers || []);
```

**C. Create Account with Documents and Watchers**

```typescript
import { junctionTableHelpers } from '@/lib/junction-helpers';

const account = await prisma.crm_Accounts.create({
  data: {
    name: data.name,
    email: data.email,
    // ... other fields
    documents: junctionTableHelpers.connectDocuments(documentIds),
    watchers: junctionTableHelpers.connectWatchers([userId])
  },
  include: {
    ...junctionTableHelpers.includeDocuments(),
    ...junctionTableHelpers.includeWatchersWithUsers()
  }
});
```

**D. Update Account Documents**

```typescript
// Replace all documents
await prisma.crm_Accounts.update({
  where: { id },
  data: {
    documents: junctionTableHelpers.updateDocuments(newDocumentIds)
  }
});

// Add documents without removing existing
await prisma.crm_Accounts.update({
  where: { id },
  data: {
    documents: junctionTableHelpers.addDocuments(additionalDocumentIds)
  }
});
```

**Files:**
- `actions/crm/get-account.ts`
- `actions/crm/get-accounts.ts`
- `actions/crm/create-account.ts`
- `actions/crm/update-account.ts`
- `app/api/crm/account/[accountId]/route.ts`
- `app/api/crm/account/[accountId]/watch/route.ts`

### Module 2: Documents

**Files to Update:** 5 files

**A. Get Documents by Entity ID Pattern**

**Current Implementation (BROKEN):**
```typescript
// actions/documents/get-documents-by-accountId.ts
const data = await prisma.documents.findMany({
  where: {
    accountsIDs: { has: accountId }  // ERROR: Field doesn't exist
  }
});
```

**New Implementation:**
```typescript
// Query through junction table
const data = await prisma.documents.findMany({
  where: {
    accounts: {
      some: {
        account_id: accountId
      }
    }
  },
  include: {
    created_by: {
      select: {
        id: true,
        name: true,
        email: true
      }
    },
    assigned_to_user: {
      select: {
        id: true,
        name: true,
        email: true
      }
    },
    // Optionally include related accounts
    accounts: {
      include: {
        account: {
          select: {
            id: true,
            name: true
          }
        }
      }
    }
  },
  orderBy: {
    date_created: "desc"
  }
});
```

**B. Alternative Using Helper Function**

```typescript
import { junctionTableHelpers } from '@/lib/junction-helpers';

const data = await prisma.documents.findMany({
  where: junctionTableHelpers.hasDocument(accountId),  // If querying by document
  // OR for filtering by entity:
  where: {
    accounts: {
      some: {
        account_id: accountId
      }
    }
  }
});
```

**Files:**
- `actions/documents/get-documents-by-accountId.ts`
- `actions/documents/get-documents-by-contactId.ts`
- `actions/documents/get-documents-by-opportunityId.ts`
- `actions/documents/get-documents-by-leadId.ts`
- `actions/documents/get-documents-by-taskId.ts` (if exists)

### Module 3: CRM Contacts

**Files to Update:** 4-5 files

**A. Documents Relationship**

Same pattern as Accounts module - use junction table helpers.

**B. Opportunities Relationship**

**Current Implementation (BROKEN):**
```typescript
// Direct array field reference
const contact = await prisma.crm_Contacts.findUnique({
  where: { id },
  include: {
    opportunitiesIDs: true  // ERROR: Not a relation
  }
});
```

**New Implementation:**
```typescript
import { junctionTableHelpers } from '@/lib/junction-helpers';

// Get contact with opportunities
const contact = await prisma.crm_Contacts.findUnique({
  where: { id },
  include: {
    opportunities: {
      include: {
        opportunity: {
          select: {
            id: true,
            name: true,
            sales_stage: true,
            close_date: true,
            budget: true
          }
        }
      }
    }
  }
});

// Extract opportunities array
const opportunities = junctionTableHelpers.extractContacts(contact.opportunities || []);

// Create contact with opportunities
await prisma.crm_Contacts.create({
  data: {
    first_name: data.firstName,
    last_name: data.lastName,
    email: data.email,
    opportunities: junctionTableHelpers.connectContactsToOpportunity(opportunityIds)
  }
});

// Update contact opportunities
await prisma.crm_Contacts.update({
  where: { id },
  data: {
    opportunities: junctionTableHelpers.updateContactsForOpportunity(newOpportunityIds)
  }
});
```

**C. Relation Name Updates**

Ensure all queries use explicit relation names:
- `assigned_to_user` (uses "assigned_contacts" relation)
- `crate_by_user` (uses "created_contacts" relation)

**Files:**
- `actions/crm/get-contact.ts`
- `actions/crm/get-contacts.ts`
- `actions/crm/create-contact.ts`
- `actions/crm/update-contact.ts`

### Module 4: CRM Opportunities

**Files to Update:** 4-5 files

**A. Documents Relationship**

Use junction table helpers (same pattern as Accounts).

**B. Contacts Relationship**

Use `ContactsToOpportunities` junction table (same pattern as Contacts module, but inverse).

**C. Relation Name Updates**

Ensure queries use explicit relation names:
- `assigned_to_user` (uses "assigned_to_user_relation")
- `created_by_user` (uses "created_by_user_relation")

**Files:**
- `actions/crm/get-opportunity.ts`
- `actions/crm/get-opportunities.ts`
- `actions/crm/create-opportunity.ts`
- `actions/crm/update-opportunity.ts`

### Module 5: CRM Leads

**Files to Update:** 4 files

**A. Documents Relationship**

Use `DocumentsToLeads` junction table with helpers.

**B. Relation Name Updates**

Ensure queries use explicit relation name:
- `assigned_to_user` (uses "LeadAssignedTo" relation)

**Files:**
- `actions/crm/get-lead.ts`
- `actions/crm/get-leads.ts`
- `actions/crm/create-lead.ts`
- `actions/crm/update-lead.ts`

### Module 6: Projects/Boards

**Files to Update:** 5 files

**A. Watchers Relationship**

**Current Implementation (BROKEN):**
```typescript
// Array field reference
const board = await prisma.boards.findUnique({
  where: { id },
  select: {
    watchers: true  // ERROR: Not a simple field
  }
});
```

**New Implementation:**
```typescript
import { junctionTableHelpers } from '@/lib/junction-helpers';

// Get board with watchers
const board = await prisma.boards.findUnique({
  where: { id },
  include: junctionTableHelpers.includeWatchersWithUsers()
});

const watcherUsers = junctionTableHelpers.extractWatcherUsers(board.watchers || []);

// Add watcher
await prisma.boards.update({
  where: { id },
  data: {
    watchers: junctionTableHelpers.addWatcher(userId)
  }
});

// Remove watcher
await prisma.boards.update({
  where: { id },
  data: {
    watchers: junctionTableHelpers.removeBoardWatcher(boardId, userId)
  }
});
```

**B. Relation Name Updates**

Ensure queries use explicit relation name:
- `assigned_user` (uses "assigned_user" relation)

**Files:**
- `actions/projects/get-board.ts`
- `actions/projects/get-boards.ts`
- `actions/projects/update-board.ts`
- `app/api/projects/board/[boardId]/route.ts`
- `app/api/projects/board/[boardId]/watch/route.ts`

### Module 7: Tasks

**Files to Update:** 3-4 files

**A. Documents Relationship**

Use `DocumentsToTasks` junction table with helpers.

**Files:**
- `actions/projects/get-task.ts`
- `actions/projects/get-tasks.ts`
- `actions/projects/create-task.ts`
- `actions/projects/update-task.ts`

### Module 8: CRM Account Tasks

**Files to Update:** 3-4 files

**A. Documents Relationship**

Use `DocumentsToCrmAccountsTasks` junction table with helpers.

**Files:**
- `actions/crm/get-account-task.ts`
- `actions/crm/get-account-tasks.ts`
- `actions/crm/create-account-task.ts`
- `actions/crm/update-account-task.ts`

### Module 9: Invoices

**Files to Update:** 1-2 files

**A. Documents Relationship**

Use `DocumentsToInvoices` junction table with helpers.

**Files:**
- `actions/invoice/get-invoice.ts`
- `actions/invoice/get-invoices.ts`

---

## Junction Helper Library Specification

### File: `/lib/junction-helpers.ts`

This utility library provides standardized functions for working with PostgreSQL junction tables in the Prisma schema.

**Structure:**

```typescript
/**
 * Junction Table Helpers
 *
 * Standardized utility functions for working with many-to-many relationships
 * through junction tables in the PostgreSQL schema.
 *
 * Usage:
 * import { junctionTableHelpers } from '@/lib/junction-helpers';
 *
 * // Connect documents on create
 * documents: junctionTableHelpers.connectDocuments(documentIds)
 *
 * // Update documents (replace all)
 * documents: junctionTableHelpers.updateDocuments(newDocumentIds)
 *
 * // Query entities with documents
 * where: junctionTableHelpers.hasDocument(documentId)
 *
 * @see /docs/POSTGRESQL_MIGRATION_GUIDE.md for detailed examples
 */

export const junctionTableHelpers = {
  // Document Junction Operations
  connectDocuments(documentIds: string[]) { ... },
  updateDocuments(newDocumentIds: string[]) { ... },
  addDocuments(documentIds: string[]) { ... },
  removeDocuments(documentIds: string[]) { ... },

  // Watcher Junction Operations
  connectWatchers(userIds: string[]) { ... },
  updateWatchers(newUserIds: string[]) { ... },
  addWatcher(userId: string) { ... },
  removeAccountWatcher(accountId: string, userId: string) { ... },
  removeBoardWatcher(boardId: string, userId: string) { ... },

  // Contact-Opportunity Junction Operations
  connectContactsToOpportunity(contactIds: string[]) { ... },
  updateContactsForOpportunity(newContactIds: string[]) { ... },

  // Query Helper Functions
  hasDocument(documentId: string) { ... },
  hasAnyDocument(documentIds: string[]) { ... },
  watchedByUser(userId: string) { ... },

  // Include Helper Functions
  includeWatchersWithUsers() { ... },
  includeDocuments() { ... },
};

// Type-safe extract helper functions
export function extractWatcherUsers(watchers: any[]) { ... }
export function extractDocuments(documentJunctions: any[]) { ... }
export function extractContacts(contactJunctions: any[]) { ... }
```

**Full Implementation:** See requirements.md lines 1026-1295 for complete function implementations.

---

## Query Pattern Standards

### Standard Pattern 1: Query Through Junction Table

```typescript
// Get entity with related items through junction table
const entity = await prisma.entityModel.findUnique({
  where: { id },
  include: {
    junctionRelation: {
      include: {
        relatedEntity: {
          select: {
            id: true,
            name: true,
            // ... only fields you need
          }
        }
      }
    }
  }
});

// Access related items
const relatedItems = entity.junctionRelation.map(j => j.relatedEntity);
```

### Standard Pattern 2: Create with Relations

```typescript
import { junctionTableHelpers } from '@/lib/junction-helpers';

const entity = await prisma.entityModel.create({
  data: {
    name: data.name,
    // ... other fields
    junctionRelation: junctionTableHelpers.connectRelation(relatedIds)
  }
});
```

### Standard Pattern 3: Update Relations

```typescript
// Replace ALL relations (delete old, create new)
const entity = await prisma.entityModel.update({
  where: { id },
  data: {
    junctionRelation: junctionTableHelpers.updateRelation(newRelatedIds)
  }
});

// Add single relation
const entity = await prisma.entityModel.update({
  where: { id },
  data: {
    junctionRelation: {
      create: { related_id: relatedId }
    }
  }
});

// Remove single relation (using composite key)
const entity = await prisma.entityModel.update({
  where: { id },
  data: {
    junctionRelation: {
      delete: {
        entity_id_related_id: {
          entity_id: entityId,
          related_id: relatedId
        }
      }
    }
  }
});
```

### Standard Pattern 4: Filter by Relations

```typescript
// Find entities with specific related item
const entities = await prisma.entityModel.findMany({
  where: {
    junctionRelation: {
      some: {
        related_id: relatedId
      }
    }
  }
});

// Find entities with ANY of the related items
const entities = await prisma.entityModel.findMany({
  where: {
    junctionRelation: {
      some: {
        related_id: {
          in: relatedIds
        }
      }
    }
  }
});
```

### Standard Pattern 5: Count Relations

```typescript
// Get entity with count of related items
const entity = await prisma.entityModel.findUnique({
  where: { id },
  include: {
    _count: {
      select: {
        junctionRelation: true
      }
    }
  }
});

const relationCount = entity._count.junctionRelation;
```

---

## Testing Strategy

### 1. TypeScript Compilation Testing

**After each module update:**
```bash
pnpm exec tsc --noEmit
```

**Expected Result:** Zero TypeScript errors

**Success Criteria:**
- All 25 original errors resolved
- No new errors introduced

### 2. Manual Testing Checklist

**CRM Accounts:**
- [ ] Create account (with documents if provided)
- [ ] Get account (verify documents and watchers load correctly)
- [ ] Update account (add/remove documents)
- [ ] Add watcher to account
- [ ] Remove watcher from account
- [ ] List accounts (verify relationships work in list view)
- [ ] Filter accounts by watcher user

**CRM Contacts:**
- [ ] Create contact (with documents and opportunities)
- [ ] Get contact (verify all relationships)
- [ ] Update contact (modify documents and opportunities)
- [ ] Link contact to opportunity
- [ ] Unlink contact from opportunity
- [ ] List contacts by account

**CRM Opportunities:**
- [ ] Create opportunity (with documents and contacts)
- [ ] Get opportunity (verify all relationships)
- [ ] Update opportunity (modify documents and contacts)
- [ ] Link document to opportunity
- [ ] Link contact to opportunity
- [ ] List opportunities with filters

**CRM Leads:**
- [ ] Create lead (with documents if provided)
- [ ] Get lead (verify documents relationship)
- [ ] Update lead (modify documents)
- [ ] List leads with filters

**Documents:**
- [ ] Get documents by account ID
- [ ] Get documents by contact ID
- [ ] Get documents by opportunity ID
- [ ] Get documents by lead ID
- [ ] Get documents by task ID
- [ ] Verify document appears in all related entities
- [ ] Upload and link document
- [ ] Remove document link

**Projects/Boards:**
- [ ] Create board
- [ ] Get board (verify watchers load correctly)
- [ ] Update board
- [ ] Add watcher to board
- [ ] Remove watcher from board
- [ ] List boards (verify sharedWith array works)
- [ ] Filter boards by watcher

**Tasks:**
- [ ] Create task (with documents if provided)
- [ ] Get task (verify documents relationship)
- [ ] Update task (modify documents)

**CRM Account Tasks:**
- [ ] Create account task (with documents if provided)
- [ ] Get account task (verify documents relationship)
- [ ] Update account task (modify documents)

**Invoices:**
- [ ] Get invoice (verify documents relationship)
- [ ] Link document to invoice

### 3. Database Verification

**Run these SQL queries to verify data integrity:**

```sql
-- Check junction tables are populated correctly
SELECT * FROM "DocumentsToAccounts" WHERE account_id = 'YOUR_TEST_ACCOUNT_ID';
SELECT * FROM "AccountWatchers" WHERE account_id = 'YOUR_TEST_ACCOUNT_ID';
SELECT * FROM "ContactsToOpportunities" WHERE opportunity_id = 'YOUR_TEST_OPPORTUNITY_ID';

-- Verify no orphaned records (should return 0 rows)
SELECT * FROM "DocumentsToAccounts"
WHERE document_id NOT IN (SELECT id FROM "Documents");

SELECT * FROM "AccountWatchers"
WHERE user_id NOT IN (SELECT id FROM "Users");

-- Check cascade deletes work
-- 1. Note count before delete
SELECT COUNT(*) FROM "DocumentsToAccounts" WHERE account_id = 'TEST_ACCOUNT_ID';

-- 2. Delete the account
DELETE FROM "crm_Accounts" WHERE id = 'TEST_ACCOUNT_ID';

-- 3. Verify junction entries are gone (should return 0)
SELECT COUNT(*) FROM "DocumentsToAccounts" WHERE account_id = 'TEST_ACCOUNT_ID';
```

### 4. Performance Testing

**Measure query performance for key operations:**

```typescript
// Add to test file
const start = performance.now();
const result = await prisma.crm_Accounts.findMany({
  where: { /* filters */ },
  include: {
    documents: { include: { document: true } },
    watchers: { include: { user: true } }
  }
});
const end = performance.now();
console.log(`Query took ${end - start}ms`);
```

**Performance Targets:**
- Simple queries (no joins): < 50ms
- Complex queries (with junction tables): < 200ms
- List queries (with pagination): < 300ms

**Actions if targets not met:**
- Add database indexes (check schema for existing indexes)
- Optimize select statements (only fetch needed fields)
- Consider query optimization or caching

### 5. API Testing

**Create test collection in Postman/Thunder Client:**

**Accounts API:**
- POST `/api/crm/account` - Create account
- GET `/api/crm/account/[id]` - Get account
- PUT `/api/crm/account/[id]` - Update account
- POST `/api/crm/account/[id]/watch` - Add watcher
- DELETE `/api/crm/account/[id]/watch` - Remove watcher

**Documents API:**
- GET `/api/documents?accountId=xxx` - Get by account
- GET `/api/documents?contactId=xxx` - Get by contact
- GET `/api/documents?opportunityId=xxx` - Get by opportunity

**Test edge cases:**
- Empty arrays
- Null values
- Non-existent IDs
- Duplicate operations
- Concurrent updates

### 6. Regression Testing

**Verify existing functionality still works:**
- [ ] User authentication and authorization
- [ ] Dashboard loads correctly with data
- [ ] All navigation links work
- [ ] Search functionality
- [ ] Filtering and sorting in list views
- [ ] Export functionality (if applicable)
- [ ] Notifications (if related to entities)
- [ ] File uploads and downloads

---

## Timeline and Milestones

### Total Estimated Time: 4-5 Days

### Day 1: Foundation and Critical Fixes (6-8 hours)

**Morning (3-4 hours):**
- [ ] Create `/lib/junction-helpers.ts` with all utility functions
- [ ] Add TypeScript types and JSDoc documentation
- [ ] Add usage examples in comments

**Afternoon (3-4 hours):**
- [ ] Fix CRM Accounts module (5-6 files)
- [ ] Run TypeScript compilation check
- [ ] Manual test account CRUD operations
- [ ] Test watcher add/remove functionality

**Deliverable:** Junction helpers library + Accounts module working

---

### Day 2: Documents and Contacts (6-8 hours)

**Morning (3-4 hours):**
- [ ] Fix all Documents module files (5 files)
- [ ] Test documents query by each entity type
- [ ] Verify junction table queries work correctly

**Afternoon (3-4 hours):**
- [ ] Fix CRM Contacts module (4-5 files)
- [ ] Test contacts with opportunities relationship
- [ ] Run TypeScript compilation check

**Deliverable:** Documents and Contacts modules working

---

### Day 3: Opportunities, Leads, and Projects (6-8 hours)

**Morning (3-4 hours):**
- [ ] Fix CRM Opportunities module (4-5 files)
- [ ] Fix CRM Leads module (4 files)
- [ ] Test opportunities-contacts many-to-many
- [ ] Run TypeScript compilation check

**Afternoon (3-4 hours):**
- [ ] Fix Projects/Boards module (5 files)
- [ ] Test board watchers functionality
- [ ] Verify all CRM modules working

**Deliverable:** All CRM modules + Projects module working

---

### Day 4: Tasks, Testing, and Validation (6-8 hours)

**Morning (3-4 hours):**
- [ ] Fix Tasks module (3-4 files)
- [ ] Fix CRM Account Tasks module (3-4 files)
- [ ] Fix Invoices module (1-2 files)
- [ ] Run final TypeScript compilation check
- [ ] Verify zero errors

**Afternoon (3-4 hours):**
- [ ] Complete manual testing checklist
- [ ] Run database verification queries
- [ ] Perform performance testing
- [ ] Create API test collection
- [ ] Fix any issues found

**Deliverable:** All modules working, all tests passing

---

### Day 5: Documentation and Final Review (4-6 hours)

**Morning (2-3 hours):**
- [ ] Update `CHANGELOG.md` with all changes
- [ ] Create `docs/POSTGRESQL_MIGRATION_GUIDE.md`
- [ ] Create `docs/TESTING_CHECKLIST.md`
- [ ] Add code comments to complex queries

**Afternoon (2-3 hours):**
- [ ] Final regression testing
- [ ] Code review and cleanup
- [ ] Remove any debug code or console.logs
- [ ] Final verification of all modules
- [ ] Prepare deployment checklist

**Deliverable:** Complete documentation, code ready for deployment

---

**Buffer Time:** Add 1-2 days for unexpected issues or complex edge cases

**Total:** 4-5 days for complete implementation, testing, and documentation

---

## Success Criteria

### Required for Completion

**1. Zero TypeScript Errors**
- [x] Run `pnpm exec tsc --noEmit` with zero errors
- [x] All 25 original errors fixed
- [x] No new errors introduced

**2. All Junction Table Queries Updated**
- [x] Documents relationships use `DocumentsTo*` tables (7 junction tables)
- [x] Watchers use `AccountWatchers`/`BoardWatchers` tables
- [x] Contacts-Opportunities use `ContactsToOpportunities` table
- [x] No queries using old array syntax (`has`, `push`, etc.)

**3. Utility Functions Created**
- [x] `/lib/junction-helpers.ts` file exists
- [x] All 20+ helper functions implemented
- [x] Functions have TypeScript types
- [x] Functions have JSDoc comments with usage examples

**4. All Relation Names Updated**
- [x] "AccountAssignedTo", "LeadAssignedTo" used correctly
- [x] "assigned_to_user_relation", "created_by_user_relation" used
- [x] "assigned_contacts", "created_contacts" used
- [x] "created_by_user", "assigned_to_user" for documents used
- [x] "assigned_user" for boards used
- [x] No relation name conflicts in queries

**5. Manual Testing Completed**
- [x] All items in testing checklist verified
- [x] Each module's CRUD operations tested
- [x] Junction table operations verified (create, read, update, delete)
- [x] Edge cases tested (empty arrays, nulls, invalid IDs)

**6. Database Integrity Verified**
- [x] Junction tables populated correctly
- [x] No orphaned records in junction tables
- [x] Cascade deletes working correctly
- [x] Foreign key constraints enforced

**7. Documentation Updated**
- [x] `CHANGELOG.md` updated with all changes
- [x] `docs/POSTGRESQL_MIGRATION_GUIDE.md` created
- [x] `docs/TESTING_CHECKLIST.md` created
- [x] Code comments added to complex queries

### Optional Enhancements (Future Work)

**Not in scope for this specification:**
- Unit tests for junction table helpers
- Integration tests for API endpoints
- E2E tests with Cypress
- Performance benchmarking report
- Query optimization for slow queries
- Automated testing in CI/CD pipeline
- Full-text search implementation
- Database connection pooling optimization

---

## Risk Assessment and Mitigation

### Low Risk Items

**1. Schema Already Deployed**
- PostgreSQL schema is validated and working
- Data migration is complete and verified
- No schema changes required

**2. Internal Implementation Only**
- Changes are internal to application code
- No API contract changes
- No breaking changes for end users

**3. Comprehensive Requirements**
- Requirements well documented
- Clear patterns established
- Helper functions standardize approach

**Mitigation:** Follow established patterns, use helper functions

---

### Medium Risk Items

**1. Complex Query Patterns**
- Some junction table queries may have edge cases
- Performance characteristics differ from MongoDB
- Some query patterns may need optimization

**Mitigation Strategies:**
- Comprehensive testing of all query patterns
- Performance testing for complex queries
- Add database indexes if queries are slow
- Document any query limitations

**2. Many Files to Update**
- 25-30 files need updates
- Potential for missed files or inconsistent patterns
- Risk of introducing new bugs

**Mitigation Strategies:**
- Update files module by module
- Test each module before moving to next
- Use TypeScript compilation to catch errors
- Follow standard patterns using helper functions
- Code review before moving to next module

**3. Data Integrity**
- Risk of orphaned records if junction operations fail
- Cascade deletes must work correctly
- Concurrent updates could cause issues

**Mitigation Strategies:**
- Test cascade deletes thoroughly
- Run database verification queries
- Use database transactions where appropriate
- Test concurrent update scenarios

---

### Rollback Plan

**If Critical Issues Found:**

1. **Code Rollback**
   - Revert to previous Git commit
   - Application code can be rolled back immediately
   - No data loss (PostgreSQL is source of truth)

2. **Database Rollback (if needed)**
   - MongoDB backup still available
   - Migration script can re-run if needed
   - Data migration is idempotent

3. **Gradual Rollout Option**
   - Deploy to staging first
   - Test thoroughly before production
   - Can deploy module by module if preferred

**Recovery Time:** < 1 hour for code rollback, < 4 hours for full database rollback

---

## Files Modified Summary

### New Files (2)

1. `/lib/junction-helpers.ts` - Junction table utility functions
2. `/docs/POSTGRESQL_MIGRATION_GUIDE.md` - Developer guide

### Updated Files (25-30)

**CRM Module (10-12 files):**
- `actions/crm/get-account.ts`
- `actions/crm/get-accounts.ts`
- `actions/crm/create-account.ts`
- `actions/crm/update-account.ts`
- `actions/crm/get-contact.ts`
- `actions/crm/get-contacts.ts`
- `actions/crm/get-opportunity.ts`
- `actions/crm/get-opportunities.ts`
- `actions/crm/get-lead.ts`
- `actions/crm/get-leads.ts`
- `app/api/crm/account/[accountId]/route.ts`
- `app/api/crm/account/[accountId]/watch/route.ts`

**Documents Module (5 files):**
- `actions/documents/get-documents.ts`
- `actions/documents/get-documents-by-accountId.ts`
- `actions/documents/get-documents-by-contactId.ts`
- `actions/documents/get-documents-by-opportunityId.ts`
- `actions/documents/get-documents-by-leadId.ts`

**Projects Module (5 files):**
- `actions/projects/get-board.ts`
- `actions/projects/get-boards.ts`
- `actions/projects/update-board.ts`
- `app/api/projects/board/[boardId]/route.ts`
- `app/api/projects/board/[boardId]/watch/route.ts`

**Tasks Module (3 files):**
- `actions/projects/get-task.ts`
- `actions/crm/get-account-task.ts`
- Related create/update files

**Invoices Module (1 file):**
- `actions/invoice/get-invoice.ts`

**Documentation (3 files):**
- `CHANGELOG.md` (updated)
- `docs/POSTGRESQL_MIGRATION_GUIDE.md` (new)
- `docs/TESTING_CHECKLIST.md` (new)

---

## Out of Scope

The following items are explicitly **NOT** included in this specification:

### 1. Migration Scripts
- TypeScript errors in `/scripts/migration/` directory (8 errors)
- These will be addressed in separate specification: "2025-11-05-postgresql-migration"
- Migration script has already been run successfully

### 2. Database Schema Changes
- Schema is already deployed and working
- No changes to `/prisma/schema.prisma` required
- All junction tables already exist

### 3. Data Migration
- Data has been successfully migrated from MongoDB to PostgreSQL
- No re-migration required
- Data integrity already verified

### 4. Performance Optimization
- Query optimization beyond basic best practices
- Database connection pooling
- Caching strategies
- Full-text search implementation
These are future enhancements, not critical for initial deployment

### 5. New Features
- No new functionality being added
- Only making existing features work with PostgreSQL
- No UI changes required

### 6. Testing Infrastructure
- Unit test creation (manual testing only)
- Integration test setup
- E2E test updates
- CI/CD pipeline updates
Testing guidance will be provided, but automated tests are future work

### 7. Deployment
- Deployment procedures
- Environment configuration
- Rollout strategy
- Monitoring setup
These will be handled separately

---

## Appendix A: Junction Table Reference

### Complete Junction Table Schema

**DocumentsToInvoices**
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

**DocumentsToOpportunities**
```prisma
model DocumentsToOpportunities {
  document_id    String @db.Uuid
  opportunity_id String @db.Uuid

  document    Documents         @relation(fields: [document_id], references: [id], onDelete: Cascade)
  opportunity crm_Opportunities @relation(fields: [opportunity_id], references: [id], onDelete: Cascade)

  @@id([document_id, opportunity_id])
  @@index([document_id])
  @@index([opportunity_id])
}
```

**DocumentsToContacts**
```prisma
model DocumentsToContacts {
  document_id String @db.Uuid
  contact_id  String @db.Uuid

  document Documents    @relation(fields: [document_id], references: [id], onDelete: Cascade)
  contact  crm_Contacts @relation(fields: [contact_id], references: [id], onDelete: Cascade)

  @@id([document_id, contact_id])
  @@index([document_id])
  @@index([contact_id])
}
```

**DocumentsToTasks**
```prisma
model DocumentsToTasks {
  document_id String @db.Uuid
  task_id     String @db.Uuid

  document Documents @relation(fields: [document_id], references: [id], onDelete: Cascade)
  task     Tasks     @relation(fields: [task_id], references: [id], onDelete: Cascade)

  @@id([document_id, task_id])
  @@index([document_id])
  @@index([task_id])
}
```

**DocumentsToCrmAccountsTasks**
```prisma
model DocumentsToCrmAccountsTasks {
  document_id          String @db.Uuid
  crm_accounts_task_id String @db.Uuid

  document          Documents          @relation(fields: [document_id], references: [id], onDelete: Cascade)
  crm_accounts_task crm_Accounts_Tasks @relation(fields: [crm_accounts_task_id], references: [id], onDelete: Cascade)

  @@id([document_id, crm_accounts_task_id])
  @@index([document_id])
  @@index([crm_accounts_task_id])
}
```

**DocumentsToLeads**
```prisma
model DocumentsToLeads {
  document_id String @db.Uuid
  lead_id     String @db.Uuid

  document Documents @relation(fields: [document_id], references: [id], onDelete: Cascade)
  lead     crm_Leads @relation(fields: [lead_id], references: [id], onDelete: Cascade)

  @@id([document_id, lead_id])
  @@index([document_id])
  @@index([lead_id])
}
```

**DocumentsToAccounts**
```prisma
model DocumentsToAccounts {
  document_id String @db.Uuid
  account_id  String @db.Uuid

  document Documents    @relation(fields: [document_id], references: [id], onDelete: Cascade)
  account  crm_Accounts @relation(fields: [account_id], references: [id], onDelete: Cascade)

  @@id([document_id, account_id])
  @@index([document_id])
  @@index([account_id])
}
```

**AccountWatchers**
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

**BoardWatchers**
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

**ContactsToOpportunities**
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

---

## Appendix B: Relation Name Reference

### Users Model Explicit Relations

| Field in Users | Target Model | Relation Name | Field in Target Model |
|----------------|--------------|---------------|----------------------|
| accounts | crm_Accounts | "AccountAssignedTo" | assigned_to_user |
| leads | crm_Leads | "LeadAssignedTo" | assigned_to_user |
| assigned_opportunity | crm_Opportunities | "assigned_to_user_relation" | assigned_to_user |
| created_by_user | crm_Opportunities | "created_by_user_relation" | created_by_user |
| assigned_contacts | crm_Contacts | "assigned_contacts" | assigned_to_user |
| crated_contacts | crm_Contacts | "created_contacts" | crate_by_user |
| created_by_documents | Documents | "created_by_user" | created_by |
| assigned_documents | Documents | "assigned_to_user" | assigned_to_user |
| boards | Boards | "assigned_user" | assigned_user |

### Usage Examples

```typescript
// Get user with assigned accounts
const user = await prisma.users.findUnique({
  where: { id: userId },
  include: {
    accounts: true  // Uses "AccountAssignedTo" relation
  }
});

// Get account with assigned user
const account = await prisma.crm_Accounts.findUnique({
  where: { id: accountId },
  include: {
    assigned_to_user: true  // Uses "AccountAssignedTo" relation
  }
});

// Get opportunity with both created_by and assigned_to
const opportunity = await prisma.crm_Opportunities.findUnique({
  where: { id },
  include: {
    created_by_user: true,    // Uses "created_by_user_relation"
    assigned_to_user: true    // Uses "assigned_to_user_relation"
  }
});
```

---

## Appendix C: Before/After Examples

### Example 1: Get Account with Documents

**Before (MongoDB - BROKEN):**
```typescript
const account = await prisma.crm_Accounts.findUnique({
  where: { id },
  include: {
    assigned_documents: true  // ERROR: Field doesn't exist
  }
});
```

**After (PostgreSQL - WORKING):**
```typescript
import { junctionTableHelpers } from '@/lib/junction-helpers';

const account = await prisma.crm_Accounts.findUnique({
  where: { id },
  include: junctionTableHelpers.includeDocuments()
});

const documents = junctionTableHelpers.extractDocuments(account.documents || []);
```

### Example 2: Add Watcher to Account

**Before (MongoDB - BROKEN):**
```typescript
await prisma.crm_Accounts.update({
  where: { id },
  data: {
    watchers: { push: userId }  // ERROR: Not an array
  }
});
```

**After (PostgreSQL - WORKING):**
```typescript
import { junctionTableHelpers } from '@/lib/junction-helpers';

await prisma.crm_Accounts.update({
  where: { id },
  data: {
    watchers: junctionTableHelpers.addWatcher(userId)
  }
});
```

### Example 3: Get Documents by Account

**Before (MongoDB - BROKEN):**
```typescript
const documents = await prisma.documents.findMany({
  where: {
    accountsIDs: { has: accountId }  // ERROR: Field doesn't exist
  }
});
```

**After (PostgreSQL - WORKING):**
```typescript
const documents = await prisma.documents.findMany({
  where: {
    accounts: {
      some: {
        account_id: accountId
      }
    }
  },
  include: {
    created_by: true,
    assigned_to_user: true
  }
});
```

### Example 4: Create Contact with Opportunities

**Before (MongoDB - BROKEN):**
```typescript
const contact = await prisma.crm_Contacts.create({
  data: {
    first_name: data.firstName,
    last_name: data.lastName,
    opportunitiesIDs: opportunityIds  // ERROR: Not a valid field
  }
});
```

**After (PostgreSQL - WORKING):**
```typescript
import { junctionTableHelpers } from '@/lib/junction-helpers';

const contact = await prisma.crm_Contacts.create({
  data: {
    first_name: data.firstName,
    last_name: data.lastName,
    opportunities: junctionTableHelpers.connectContactsToOpportunity(opportunityIds)
  }
});
```

---

**End of Specification Document**

**Document Version:** 1.0
**Date:** 2025-11-05
**Status:** Final - Ready for Implementation
**Estimated Effort:** 4-5 days
**Priority:** HIGH - Critical for PostgreSQL migration completion
