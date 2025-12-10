# Spec Requirements: MongoDB to PostgreSQL Codebase Upgrade

## Initial Description

The MongoDB to PostgreSQL data migration is complete. Now the application codebase needs to be updated to work with the new PostgreSQL schema. This includes:

1. Updating all database queries from MongoDB syntax to PostgreSQL/Prisma syntax
2. Updating queries that used array fields to use the new junction tables
3. Updating ObjectId references to UUID types
4. Updating Prisma relation queries to use new relation names
5. Testing all CRUD operations work correctly
6. Fixing any TypeScript errors related to the schema changes

**Context:**
- PostgreSQL schema is already deployed and working
- Data has been migrated from MongoDB to PostgreSQL
- Migration included creating 10 junction tables for normalized many-to-many relationships
- All primary keys changed from ObjectId to UUID
- The Prisma schema is already updated for PostgreSQL

**Affected Areas:**
- `actions/crm/*.ts` - CRM operations (~10 files)
- `actions/documents/*.ts` - Document operations (~3 files)
- `actions/projects/*.ts` - Project/task operations (~5 files)
- `app/api/crm/*.ts` - CRM API routes (~8 files)
- `app/api/projects/*.ts` - Project API routes (~4 files)
- Other API routes and actions as needed

---

## Requirements Discussion

### First Round Questions

**Q1:** What should be the primary focus of this codebase upgrade?
**Answer:** Fix 25 TypeScript errors in application code (actions/ and app/api/) first, then address all other issues.

**Q2:** Should we fix modules incrementally (CRM first, then Projects, then Documents) or fix all modules comprehensively at once?
**Answer:** Fix all modules comprehensively (not incremental).

**Q3:** How should junction table queries be updated - should we use the composite key pattern (document_id, invoice_id) consistently across the codebase?
**Answer:** Update all to use composite key pattern consistently.

**Q4:** For the watchers implementation, should we use Prisma's nested create/delete operations or separate queries?
**Answer:** Use Prisma's nested create/delete operations.

**Q5:** What is the testing sequence you prefer?
**Answer:** Fix TypeScript errors → Document changes → Provide testing guidance.

**Q6:** Which module should be prioritized if we need to sequence the work?
**Answer:** All modules comprehensively (CRM, Projects, Documents, etc.).

**Q7:** Should we create helper functions for common junction table operations to reduce code duplication?
**Answer:** Create utility functions for junction table operations.

**Q8:** Should we remove unnecessary select clauses on junction tables since they only contain foreign keys?
**Answer:** Remove unnecessary select clauses on junction tables.

### Existing Code to Reference

**Similar Features Identified:**
No similar existing features identified for reference. This is a schema migration update affecting the entire codebase.

### Follow-up Questions

No follow-up questions were needed as all initial questions were answered comprehensively.

---

## Visual Assets

### Files Provided:
No visual assets provided.

### Visual Insights:
N/A - No visual assets were provided for this specification.

---

## Requirements Summary

### Functional Requirements

**1. Fix TypeScript Compilation Errors (25 errors in application code)**

Based on the verification report, the following files have TypeScript errors:

**Application Code Errors (18 errors) - Schema-related:**
- `actions/crm/get-account.ts` - `assigned_documents` field no longer exists (now uses junction table)
- `actions/crm/get-accounts.ts` - Watchers field reference issues
- `actions/crm/update-account.ts` - Watchers operations need updating
- `actions/documents/get-documents-by-accountId.ts` - Should use junction table pattern
- `actions/documents/get-documents-by-contactId.ts` - Should use junction table pattern
- `actions/documents/get-documents-by-opportunityId.ts` - Should use junction table pattern
- `actions/documents/get-documents-by-leadId.ts` - Should use junction table pattern
- `actions/projects/get-board.ts` - Watchers field changes
- `actions/projects/update-board.ts` - Watchers operations
- `app/api/crm/account/[accountId]/watch/route.ts` - `watching_users` field changed to `watchers` junction table
- `app/api/crm/account/[accountId]/route.ts` - Documents field should use junction table
- `app/api/projects/board/[boardId]/watch/route.ts` - Watchers implementation
- Other files in `app/api/crm/` and `app/api/projects/` with similar issues

**Migration Script Errors (8 errors) - NOT in scope for this spec:**
These are separate from application code and will be addressed in the migration script spec:
- `scripts/migration/orchestrator.ts` - Junction table type issues
- `scripts/migration/transformers/index.ts` - Transformer function issues

**2. Update Junction Table Query Patterns**

All queries using the old MongoDB array pattern must be updated to use junction tables:

**Old MongoDB Pattern:**
```typescript
documents: { some: { id: documentId } }
watchers: { has: userId }
```

**New PostgreSQL Pattern:**
```typescript
documents: { some: { document_id: documentId } }
watchers: { some: { user_id: userId } }
```

**Affected Junction Tables (10 total):**
- DocumentsToInvoices
- DocumentsToOpportunities
- DocumentsToContacts
- DocumentsToTasks
- DocumentsToCrmAccountsTasks
- DocumentsToLeads
- DocumentsToAccounts
- AccountWatchers
- BoardWatchers
- ContactsToOpportunities

**3. Update Relation Names**

Several relation names were made explicit during the PostgreSQL migration:

**Changes in Users Model:**
- `AccountAssignedTo` - for crm_Accounts assigned_to relationship
- `LeadAssignedTo` - for crm_Leads assigned_to relationship
- `assigned_to_user_relation` - for crm_Opportunities assigned_to
- `created_by_user_relation` - for crm_Opportunities created_by
- `assigned_contacts` - for crm_Contacts assigned_to
- `created_contacts` - for crm_Contacts created_by
- `created_by_user` - for Documents created_by_user
- `assigned_to_user` - for Documents assigned_user
- `assigned_user` - for Boards user field

**4. Create Utility Functions for Junction Tables**

Create helper functions to standardize junction table operations:

```typescript
// Proposed utility functions to create:
export const junctionTableHelpers = {
  // Connect documents to entity
  connectDocuments(documentIds: string[]) {
    return { create: documentIds.map(id => ({ document_id: id })) };
  },

  // Update documents (remove old, add new)
  updateDocuments(newDocumentIds: string[]) {
    return {
      deleteMany: {},
      create: newDocumentIds.map(id => ({ document_id: id }))
    };
  },

  // Connect watchers to entity
  connectWatchers(userIds: string[]) {
    return { create: userIds.map(id => ({ user_id: id })) };
  },

  // Update watchers (remove old, add new)
  updateWatchers(newUserIds: string[]) {
    return {
      deleteMany: {},
      create: newUserIds.map(id => ({ user_id: id }))
    };
  },

  // Connect contacts to opportunity
  connectContactsToOpportunity(contactIds: string[]) {
    return { create: contactIds.map(id => ({ contact_id: id })) };
  },

  // Update contacts for opportunity
  updateContactsForOpportunity(newContactIds: string[]) {
    return {
      deleteMany: {},
      create: newContactIds.map(id => ({ contact_id: id }))
    };
  }
};
```

**5. Remove Unnecessary Select Clauses**

Junction tables only contain foreign keys and should not have complex select statements:

**Before (unnecessary):**
```typescript
documents: {
  select: {
    document_id: true,
    invoice_id: true,
    document: true
  }
}
```

**After (simplified):**
```typescript
documents: {
  include: {
    document: true  // Only include related entity if needed
  }
}
```

**6. Update Watchers Implementation Pattern**

Use Prisma's nested create/delete operations for watchers:

**Pattern for Adding Watchers:**
```typescript
await prisma.crm_Accounts.update({
  where: { id: accountId },
  data: {
    watchers: {
      create: { user_id: userId }
    }
  }
});
```

**Pattern for Removing Watchers:**
```typescript
await prisma.crm_Accounts.update({
  where: { id: accountId },
  data: {
    watchers: {
      delete: {
        account_id_user_id: {
          account_id: accountId,
          user_id: userId
        }
      }
    }
  }
});
```

**Pattern for Getting Watchers:**
```typescript
const account = await prisma.crm_Accounts.findUnique({
  where: { id: accountId },
  include: {
    watchers: {
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      }
    }
  }
});
```

### Reusability Opportunities

No existing similar features identified. This is a comprehensive schema update affecting the entire application codebase.

### Scope Boundaries

**In Scope:**
- Fix all 25 TypeScript errors in application code (actions/ and app/api/)
- Update all junction table query patterns across all modules (CRM, Projects, Documents)
- Update all relation name references to match new schema
- Create utility functions for junction table operations
- Remove unnecessary select clauses on junction tables
- Update watchers implementation to use nested create/delete
- Provide testing guidance for all updated code
- Document all changes made

**Out of Scope:**
- Migration script TypeScript errors (separate spec: 2025-11-05-postgresql-migration)
- Database schema changes (already complete)
- Data migration (already complete)
- Prisma schema updates (already complete)
- Performance optimization (future enhancement)
- Full-text search implementation (future enhancement)
- Unit test creation (future enhancement, though testing guidance will be provided)

### Technical Considerations

**1. Schema Changes Impact:**
- All 26 models converted from ObjectId to UUID
- 10 new junction tables created for many-to-many relationships
- Array-based relationships converted to junction tables
- Relation names made explicit to avoid conflicts

**2. Junction Tables Created:**

| Junction Table | Links | Purpose |
|---------------|-------|---------|
| DocumentsToInvoices | Documents ↔ Invoices | Document-invoice relationships |
| DocumentsToOpportunities | Documents ↔ Opportunities | Document-opportunity relationships |
| DocumentsToContacts | Documents ↔ Contacts | Document-contact relationships |
| DocumentsToTasks | Documents ↔ Tasks | Document-task relationships |
| DocumentsToCrmAccountsTasks | Documents ↔ CRM Account Tasks | Document-CRM task relationships |
| DocumentsToLeads | Documents ↔ Leads | Document-lead relationships |
| DocumentsToAccounts | Documents ↔ Accounts | Document-account relationships |
| AccountWatchers | Accounts ↔ Users | Account watching relationships |
| BoardWatchers | Boards ↔ Users | Board watching relationships |
| ContactsToOpportunities | Contacts ↔ Opportunities | Contact-opportunity relationships |

**3. Composite Primary Keys:**

All junction tables use composite primary keys:
```prisma
@@id([document_id, invoice_id])
@@id([account_id, user_id])
@@id([contact_id, opportunity_id])
```

**4. Cascade Delete Behavior:**

All junction table relationships have cascade delete:
```prisma
@relation(fields: [document_id], references: [id], onDelete: Cascade)
```

**5. Files Requiring Updates (Estimated 25-30 files):**

**CRM Module (~10 files):**
- `actions/crm/get-account.ts`
- `actions/crm/get-accounts.ts`
- `actions/crm/create-account.ts`
- `actions/crm/update-account.ts`
- `actions/crm/get-contact.ts`
- `actions/crm/get-contacts.ts`
- `actions/crm/get-opportunity.ts`
- `actions/crm/get-opportunities.ts`
- `app/api/crm/account/[accountId]/route.ts`
- `app/api/crm/account/[accountId]/watch/route.ts`

**Documents Module (~5 files):**
- `actions/documents/get-documents.ts`
- `actions/documents/get-documents-by-accountId.ts`
- `actions/documents/get-documents-by-contactId.ts`
- `actions/documents/get-documents-by-opportunityId.ts`
- `actions/documents/get-documents-by-leadId.ts`

**Projects Module (~5 files):**
- `actions/projects/get-board.ts`
- `actions/projects/get-boards.ts`
- `actions/projects/update-board.ts`
- `app/api/projects/board/[boardId]/route.ts`
- `app/api/projects/board/[boardId]/watch/route.ts`

**Other Modules (~5-10 files):**
- Any other files with TypeScript errors related to schema changes
- Files using document relationships
- Files using watcher relationships

---

## Detailed Requirements by Module

### 1. CRM Accounts Module

**Files to Update:**
- `actions/crm/get-account.ts`
- `actions/crm/get-accounts.ts`
- `actions/crm/create-account.ts`
- `actions/crm/update-account.ts`
- `app/api/crm/account/[accountId]/route.ts`
- `app/api/crm/account/[accountId]/watch/route.ts`

**Changes Required:**

**A. Documents Relationship:**
```typescript
// OLD: Direct array reference
const account = await prisma.crm_Accounts.findUnique({
  where: { id },
  include: {
    assigned_documents: true  // WRONG - field doesn't exist
  }
});

// NEW: Junction table pattern
const account = await prisma.crm_Accounts.findUnique({
  where: { id },
  include: {
    documents: {  // Use junction table relation
      include: {
        document: true  // Include the actual document
      }
    }
  }
});
```

**B. Watchers Relationship:**
```typescript
// OLD: Array field
const account = await prisma.crm_Accounts.update({
  where: { id },
  data: {
    watchers: { push: userId }  // WRONG - not an array
  }
});

// NEW: Junction table with nested create
const account = await prisma.crm_Accounts.update({
  where: { id },
  data: {
    watchers: {
      create: { user_id: userId }
    }
  }
});

// Get watchers
const account = await prisma.crm_Accounts.findUnique({
  where: { id },
  include: {
    watchers: {
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      }
    }
  }
});
```

**C. Create Account with Documents:**
```typescript
// NEW: Use utility function
import { junctionTableHelpers } from '@/lib/junction-helpers';

const account = await prisma.crm_Accounts.create({
  data: {
    name: data.name,
    // ... other fields
    documents: junctionTableHelpers.connectDocuments(documentIds)
  }
});
```

**D. Update Account Documents:**
```typescript
// NEW: Replace all documents
const account = await prisma.crm_Accounts.update({
  where: { id },
  data: {
    documents: junctionTableHelpers.updateDocuments(newDocumentIds)
  }
});
```

### 2. CRM Contacts Module

**Files to Update:**
- `actions/crm/get-contact.ts`
- `actions/crm/get-contacts.ts`
- `actions/crm/create-contact.ts`
- `actions/crm/update-contact.ts`

**Changes Required:**

**A. Documents Relationship:**
```typescript
// NEW: Junction table pattern
const contact = await prisma.crm_Contacts.findUnique({
  where: { id },
  include: {
    documents: {
      include: {
        document: true
      }
    }
  }
});
```

**B. Opportunities Relationship:**
```typescript
// OLD: Array field
opportunitiesIDs: String[] @db.ObjectId

// NEW: Junction table
const contact = await prisma.crm_Contacts.findUnique({
  where: { id },
  include: {
    opportunities: {
      include: {
        opportunity: true
      }
    }
  }
});

// Create contact with opportunities
const contact = await prisma.crm_Contacts.create({
  data: {
    first_name: data.firstName,
    last_name: data.lastName,
    opportunities: junctionTableHelpers.connectContactsToOpportunity(opportunityIds)
  }
});
```

**C. Relation Name Update:**
```typescript
// OLD: Generic relation name
assigned_to_user: Users?

// NEW: Explicit relation name
assigned_to_user: Users? @relation("assigned_contacts")
crate_by_user: Users? @relation("created_contacts")
```

### 3. CRM Opportunities Module

**Files to Update:**
- `actions/crm/get-opportunity.ts`
- `actions/crm/get-opportunities.ts`
- `actions/crm/create-opportunity.ts`
- `actions/crm/update-opportunity.ts`

**Changes Required:**

**A. Documents Relationship:**
```typescript
// NEW: Junction table pattern
const opportunity = await prisma.crm_Opportunities.findUnique({
  where: { id },
  include: {
    documents: {
      include: {
        document: true
      }
    }
  }
});
```

**B. Contacts Relationship:**
```typescript
// OLD: Array field
connected_contacts: String[] @db.ObjectId

// NEW: Junction table
const opportunity = await prisma.crm_Opportunities.findUnique({
  where: { id },
  include: {
    contacts: {
      include: {
        contact: true
      }
    }
  }
});

// Update opportunity contacts
const opportunity = await prisma.crm_Opportunities.update({
  where: { id },
  data: {
    contacts: junctionTableHelpers.updateContactsForOpportunity(newContactIds)
  }
});
```

**C. Relation Name Updates:**
```typescript
// Use explicit relation names
assigned_to_user: Users? @relation("assigned_to_user_relation")
created_by_user: Users? @relation("created_by_user_relation")
```

### 4. CRM Leads Module

**Files to Update:**
- `actions/crm/get-lead.ts`
- `actions/crm/get-leads.ts`
- `actions/crm/create-lead.ts`
- `actions/crm/update-lead.ts`

**Changes Required:**

**A. Documents Relationship:**
```typescript
// NEW: Junction table pattern
const lead = await prisma.crm_Leads.findUnique({
  where: { id },
  include: {
    documents: {
      include: {
        document: true
      }
    }
  }
});
```

**B. Relation Name Update:**
```typescript
// Use explicit relation name
assigned_to_user: Users? @relation("LeadAssignedTo")
```

### 5. Documents Module

**Files to Update:**
- `actions/documents/get-documents.ts`
- `actions/documents/get-documents-by-accountId.ts`
- `actions/documents/get-documents-by-contactId.ts`
- `actions/documents/get-documents-by-opportunityId.ts`
- `actions/documents/get-documents-by-leadId.ts`
- `actions/documents/get-documents-by-taskId.ts`

**Changes Required:**

**A. Get Documents by Account:**
```typescript
// OLD: Direct array query
const documents = await prisma.documents.findMany({
  where: {
    accountsIDs: { has: accountId }  // WRONG - field doesn't exist
  }
});

// NEW: Junction table query
const documents = await prisma.documents.findMany({
  where: {
    accounts: {
      some: {
        account_id: accountId
      }
    }
  },
  include: {
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
  }
});
```

**B. Get Documents by Contact:**
```typescript
// NEW: Junction table query
const documents = await prisma.documents.findMany({
  where: {
    contacts: {
      some: {
        contact_id: contactId
      }
    }
  }
});
```

**C. Get Documents by Opportunity:**
```typescript
// NEW: Junction table query
const documents = await prisma.documents.findMany({
  where: {
    opportunities: {
      some: {
        opportunity_id: opportunityId
      }
    }
  }
});
```

**D. Get Documents by Lead:**
```typescript
// NEW: Junction table query
const documents = await prisma.documents.findMany({
  where: {
    leads: {
      some: {
        lead_id: leadId
      }
    }
  }
});
```

**E. Get Documents by Task:**
```typescript
// NEW: Junction table query
const documents = await prisma.documents.findMany({
  where: {
    tasks: {
      some: {
        task_id: taskId
      }
    }
  }
});
```

**F. Relation Name Updates:**
```typescript
// Use explicit relation names
created_by: Users? @relation("created_by_user")
assigned_to_user: Users? @relation("assigned_to_user")
```

### 6. Projects/Boards Module

**Files to Update:**
- `actions/projects/get-board.ts`
- `actions/projects/get-boards.ts`
- `actions/projects/create-board.ts`
- `actions/projects/update-board.ts`
- `app/api/projects/board/[boardId]/route.ts`
- `app/api/projects/board/[boardId]/watch/route.ts`

**Changes Required:**

**A. Watchers Relationship:**
```typescript
// OLD: Array field
watchers: String[] @db.ObjectId

// NEW: Junction table
const board = await prisma.boards.findUnique({
  where: { id },
  include: {
    watchers: {
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      }
    }
  }
});

// Add watcher
const board = await prisma.boards.update({
  where: { id },
  data: {
    watchers: {
      create: { user_id: userId }
    }
  }
});

// Remove watcher
const board = await prisma.boards.update({
  where: { id },
  data: {
    watchers: {
      delete: {
        board_id_user_id: {
          board_id: boardId,
          user_id: userId
        }
      }
    }
  }
});
```

**B. Relation Name Update:**
```typescript
// Use explicit relation name
assigned_user: Users? @relation("assigned_user")
```

### 7. Tasks Module

**Files to Update:**
- `actions/projects/get-task.ts`
- `actions/projects/get-tasks.ts`
- `actions/projects/create-task.ts`
- `actions/projects/update-task.ts`

**Changes Required:**

**A. Documents Relationship:**
```typescript
// NEW: Junction table pattern
const task = await prisma.tasks.findUnique({
  where: { id },
  include: {
    documents: {
      include: {
        document: true
      }
    }
  }
});
```

### 8. CRM Account Tasks Module

**Files to Update:**
- `actions/crm/get-account-task.ts`
- `actions/crm/get-account-tasks.ts`
- `actions/crm/create-account-task.ts`
- `actions/crm/update-account-task.ts`

**Changes Required:**

**A. Documents Relationship:**
```typescript
// NEW: Junction table pattern
const task = await prisma.crm_Accounts_Tasks.findUnique({
  where: { id },
  include: {
    documents: {
      include: {
        document: true
      }
    }
  }
});
```

### 9. Invoices Module

**Files to Update:**
- `actions/invoice/get-invoice.ts`
- `actions/invoice/get-invoices.ts`

**Changes Required:**

**A. Documents Relationship:**
```typescript
// NEW: Junction table pattern
const invoice = await prisma.invoices.findUnique({
  where: { id },
  include: {
    documents: {
      include: {
        document: true
      }
    }
  }
});
```

---

## Implementation Patterns and Standards

### Pattern 1: Query Junction Tables

**Standard Pattern for Querying Through Junction Tables:**

```typescript
// Get entity with related items through junction table
const entity = await prisma.entityModel.findUnique({
  where: { id },
  include: {
    junctionTableRelation: {
      include: {
        relatedEntity: {
          select: {
            // Select only needed fields
            id: true,
            name: true,
            // ... other fields
          }
        }
      }
    }
  }
});

// Access the related items
const relatedItems = entity.junctionTableRelation.map(j => j.relatedEntity);
```

### Pattern 2: Create with Junction Table Relations

**Standard Pattern for Creating with Relations:**

```typescript
import { junctionTableHelpers } from '@/lib/junction-helpers';

const entity = await prisma.entityModel.create({
  data: {
    // ... entity fields
    junctionTableRelation: junctionTableHelpers.connectRelation(relatedIds)
  }
});
```

### Pattern 3: Update Junction Table Relations

**Standard Pattern for Updating Relations:**

```typescript
// Replace all relations (delete old, create new)
const entity = await prisma.entityModel.update({
  where: { id },
  data: {
    junctionTableRelation: junctionTableHelpers.updateRelation(newRelatedIds)
  }
});

// Add single relation
const entity = await prisma.entityModel.update({
  where: { id },
  data: {
    junctionTableRelation: {
      create: { related_id: relatedId }
    }
  }
});

// Remove single relation (using composite key)
const entity = await prisma.entityModel.update({
  where: { id },
  data: {
    junctionTableRelation: {
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

### Pattern 4: Filter by Junction Table Relations

**Standard Pattern for Filtering:**

```typescript
// Find entities that have a specific related item
const entities = await prisma.entityModel.findMany({
  where: {
    junctionTableRelation: {
      some: {
        related_id: relatedId
      }
    }
  }
});

// Find entities that have ANY of the related items
const entities = await prisma.entityModel.findMany({
  where: {
    junctionTableRelation: {
      some: {
        related_id: {
          in: relatedIds
        }
      }
    }
  }
});

// Find entities that have ALL of the related items (requires multiple queries or raw SQL)
// This is more complex and may need custom implementation
```

### Pattern 5: Count Junction Table Relations

**Standard Pattern for Counting:**

```typescript
// Get entity with count of related items
const entity = await prisma.entityModel.findUnique({
  where: { id },
  include: {
    _count: {
      select: {
        junctionTableRelation: true
      }
    }
  }
});

const relationCount = entity._count.junctionTableRelation;
```

---

## Utility Functions Specification

### Location
Create file: `lib/junction-helpers.ts`

### Functions to Implement

```typescript
/**
 * Junction Table Helpers
 *
 * Utility functions for working with PostgreSQL junction tables
 * in the Prisma schema.
 */

export const junctionTableHelpers = {
  /**
   * Connect documents to an entity (Account, Contact, Opportunity, etc.)
   * @param documentIds - Array of document IDs to connect
   * @returns Prisma create input for junction table
   */
  connectDocuments(documentIds: string[]) {
    if (!documentIds || documentIds.length === 0) return undefined;
    return {
      create: documentIds.map(id => ({ document_id: id }))
    };
  },

  /**
   * Update documents for an entity (removes all old, adds new)
   * @param newDocumentIds - Array of document IDs to set
   * @returns Prisma update input for junction table
   */
  updateDocuments(newDocumentIds: string[]) {
    return {
      deleteMany: {},
      create: newDocumentIds.map(id => ({ document_id: id }))
    };
  },

  /**
   * Add documents to an entity without removing existing ones
   * @param documentIds - Array of document IDs to add
   * @returns Prisma create input for junction table
   */
  addDocuments(documentIds: string[]) {
    if (!documentIds || documentIds.length === 0) return undefined;
    return {
      create: documentIds.map(id => ({ document_id: id }))
    };
  },

  /**
   * Remove specific documents from an entity
   * @param documentIds - Array of document IDs to remove
   * @returns Prisma delete input for junction table
   */
  removeDocuments(documentIds: string[]) {
    if (!documentIds || documentIds.length === 0) return undefined;
    return {
      delete: documentIds.map(id => ({ document_id: id }))
    };
  },

  /**
   * Connect watchers to an entity (Account or Board)
   * @param userIds - Array of user IDs to connect as watchers
   * @returns Prisma create input for watcher junction table
   */
  connectWatchers(userIds: string[]) {
    if (!userIds || userIds.length === 0) return undefined;
    return {
      create: userIds.map(id => ({ user_id: id }))
    };
  },

  /**
   * Update watchers for an entity (removes all old, adds new)
   * @param newUserIds - Array of user IDs to set as watchers
   * @returns Prisma update input for watcher junction table
   */
  updateWatchers(newUserIds: string[]) {
    return {
      deleteMany: {},
      create: newUserIds.map(id => ({ user_id: id }))
    };
  },

  /**
   * Add a single watcher to an entity
   * @param userId - User ID to add as watcher
   * @returns Prisma create input for watcher junction table
   */
  addWatcher(userId: string) {
    return {
      create: { user_id: userId }
    };
  },

  /**
   * Remove a single watcher from an account
   * @param accountId - Account ID
   * @param userId - User ID to remove
   * @returns Prisma delete input for AccountWatchers junction table
   */
  removeAccountWatcher(accountId: string, userId: string) {
    return {
      delete: {
        account_id_user_id: {
          account_id: accountId,
          user_id: userId
        }
      }
    };
  },

  /**
   * Remove a single watcher from a board
   * @param boardId - Board ID
   * @param userId - User ID to remove
   * @returns Prisma delete input for BoardWatchers junction table
   */
  removeBoardWatcher(boardId: string, userId: string) {
    return {
      delete: {
        board_id_user_id: {
          board_id: boardId,
          user_id: userId
        }
      }
    };
  },

  /**
   * Connect contacts to an opportunity
   * @param contactIds - Array of contact IDs to connect
   * @returns Prisma create input for ContactsToOpportunities junction table
   */
  connectContactsToOpportunity(contactIds: string[]) {
    if (!contactIds || contactIds.length === 0) return undefined;
    return {
      create: contactIds.map(id => ({ contact_id: id }))
    };
  },

  /**
   * Update contacts for an opportunity (removes all old, adds new)
   * @param newContactIds - Array of contact IDs to set
   * @returns Prisma update input for ContactsToOpportunities junction table
   */
  updateContactsForOpportunity(newContactIds: string[]) {
    return {
      deleteMany: {},
      create: newContactIds.map(id => ({ contact_id: id }))
    };
  },

  /**
   * Filter condition for entities that have a specific document
   * @param documentId - Document ID to filter by
   * @returns Prisma where condition
   */
  hasDocument(documentId: string) {
    return {
      documents: {
        some: {
          document_id: documentId
        }
      }
    };
  },

  /**
   * Filter condition for entities that have any of the specified documents
   * @param documentIds - Array of document IDs to filter by
   * @returns Prisma where condition
   */
  hasAnyDocument(documentIds: string[]) {
    return {
      documents: {
        some: {
          document_id: {
            in: documentIds
          }
        }
      }
    };
  },

  /**
   * Filter condition for entities watched by a specific user
   * @param userId - User ID to filter by
   * @returns Prisma where condition
   */
  watchedByUser(userId: string) {
    return {
      watchers: {
        some: {
          user_id: userId
        }
      }
    };
  },

  /**
   * Include watchers with user details
   * @returns Prisma include for watchers with user data
   */
  includeWatchersWithUsers() {
    return {
      watchers: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          }
        }
      }
    };
  },

  /**
   * Include documents with full details
   * @returns Prisma include for documents
   */
  includeDocuments() {
    return {
      documents: {
        include: {
          document: {
            select: {
              id: true,
              document_name: true,
              document_type: true,
              document_file_url: true,
              document_file_mimeType: true,
              createdAt: true,
              created_by_user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      }
    };
  }
};

/**
 * Type helper to extract watcher users from query result
 */
export function extractWatcherUsers(watchers: any[]) {
  return watchers.map(w => w.user);
}

/**
 * Type helper to extract documents from query result
 */
export function extractDocuments(documentJunctions: any[]) {
  return documentJunctions.map(d => d.document);
}

/**
 * Type helper to extract contacts from opportunity query result
 */
export function extractContacts(contactJunctions: any[]) {
  return contactJunctions.map(c => c.contact);
}
```

---

## Testing Strategy

### 1. TypeScript Compilation Testing

**After each module update:**
```bash
pnpm exec tsc --noEmit
```

**Expected Result:** Zero TypeScript errors

### 2. Manual Testing Checklist

**For each updated module, test:**

**CRM Accounts:**
- [ ] Create account (with documents if provided)
- [ ] Get account (verify documents and watchers load correctly)
- [ ] Update account (add/remove documents)
- [ ] Add watcher to account
- [ ] Remove watcher from account
- [ ] List accounts (verify relationships work in list view)

**CRM Contacts:**
- [ ] Create contact (with documents and opportunities if provided)
- [ ] Get contact (verify all relationships)
- [ ] Update contact (modify documents and opportunities)
- [ ] Link contact to opportunity
- [ ] Unlink contact from opportunity

**CRM Opportunities:**
- [ ] Create opportunity (with documents and contacts if provided)
- [ ] Get opportunity (verify all relationships)
- [ ] Update opportunity (modify documents and contacts)
- [ ] Link document to opportunity
- [ ] Link contact to opportunity

**CRM Leads:**
- [ ] Create lead (with documents if provided)
- [ ] Get lead (verify documents relationship)
- [ ] Update lead (modify documents)

**Documents:**
- [ ] Get documents by account ID
- [ ] Get documents by contact ID
- [ ] Get documents by opportunity ID
- [ ] Get documents by lead ID
- [ ] Get documents by task ID
- [ ] Verify document appears in all related entities

**Projects/Boards:**
- [ ] Create board
- [ ] Get board (verify watchers load correctly)
- [ ] Update board
- [ ] Add watcher to board
- [ ] Remove watcher from board
- [ ] List boards (verify sharedWith array works)

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

### 3. API Testing

**Use Postman/Thunder Client or similar:**

Create a test collection with requests for:
- Each CRUD operation for each module
- Focus on operations involving junction tables
- Test edge cases (empty arrays, null values, non-existent IDs)

### 4. Database Verification

**After testing, verify database state:**

```sql
-- Check junction tables are populated correctly
SELECT * FROM "DocumentsToAccounts" WHERE account_id = 'YOUR_TEST_ACCOUNT_ID';
SELECT * FROM "AccountWatchers" WHERE account_id = 'YOUR_TEST_ACCOUNT_ID';
SELECT * FROM "ContactsToOpportunities" WHERE opportunity_id = 'YOUR_TEST_OPPORTUNITY_ID';

-- Verify no orphaned records
SELECT * FROM "DocumentsToAccounts" WHERE document_id NOT IN (SELECT id FROM "Documents");
SELECT * FROM "AccountWatchers" WHERE user_id NOT IN (SELECT id FROM "Users");

-- Check cascade deletes work
-- Delete a test account and verify junction table entries are removed
```

### 5. Performance Testing

**For key queries, verify performance is acceptable:**

```typescript
// Measure query time
const start = performance.now();
const result = await prisma.crm_Accounts.findMany({
  where: { /* your filters */ },
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

### 6. Regression Testing

**Verify existing functionality still works:**

- [ ] User authentication and authorization
- [ ] Dashboard loads correctly
- [ ] All navigation links work
- [ ] Search functionality
- [ ] Filtering and sorting
- [ ] Export functionality (if applicable)
- [ ] Notifications (if related to entities)

---

## Documentation Requirements

### 1. Change Log

Document all changes in: `CHANGELOG.md`

Format:
```markdown
## [Version] - 2025-11-05

### Changed - PostgreSQL Codebase Upgrade

#### Junction Table Migrations
- Migrated all array-based relationships to PostgreSQL junction tables
- Updated 10 junction tables: DocumentsToAccounts, AccountWatchers, etc.

#### Files Updated
**CRM Module (10 files)**
- actions/crm/get-account.ts - Updated documents and watchers queries
- actions/crm/update-account.ts - Updated watchers operations
- [... list all files ...]

**Documents Module (5 files)**
- [... list all files ...]

**Projects Module (5 files)**
- [... list all files ...]

#### New Utilities
- Created lib/junction-helpers.ts with 20+ helper functions

#### Breaking Changes
- None - internal implementation changes only

#### Testing
- All TypeScript errors resolved (25 errors fixed)
- Manual testing completed for all modules
- Database verification passed
```

### 2. Developer Guide

Create: `docs/POSTGRESQL_MIGRATION_GUIDE.md`

Include:
- Summary of schema changes
- Before/after code examples for each pattern
- How to use junction table helpers
- Common pitfalls and solutions
- Migration checklist for future similar updates

### 3. Code Comments

Add comments to complex junction table queries:

```typescript
// Query accounts with their documents through DocumentsToAccounts junction table
// This replaces the old MongoDB array field pattern
const accounts = await prisma.crm_Accounts.findMany({
  include: {
    documents: {  // Junction table relation
      include: {
        document: true  // Actual document data
      }
    }
  }
});
```

### 4. Testing Documentation

Document in: `docs/TESTING_CHECKLIST.md`

Include:
- Complete testing checklist
- Test data setup instructions
- Expected results for each test
- Known issues or limitations

---

## Priority and Sequencing

### Priority 1: Fix TypeScript Errors (Days 1-2)

**Goal:** Get codebase compiling without errors

1. Fix CRM Accounts module (highest impact)
2. Fix Documents module queries
3. Fix Projects/Boards watchers
4. Fix remaining modules

### Priority 2: Create Utility Functions (Day 2)

**Goal:** Standardize junction table operations

1. Create `lib/junction-helpers.ts`
2. Implement all helper functions
3. Add TypeScript types and JSDoc comments
4. Write usage examples

### Priority 3: Update All Modules (Days 2-4)

**Goal:** Complete migration for all modules

1. CRM Accounts ✓
2. CRM Contacts
3. CRM Opportunities
4. CRM Leads
5. Documents
6. Projects/Boards
7. Tasks
8. CRM Account Tasks
9. Invoices

### Priority 4: Testing (Day 4-5)

**Goal:** Verify everything works correctly

1. TypeScript compilation test
2. Manual testing per checklist
3. API testing
4. Database verification
5. Performance testing
6. Regression testing

### Priority 5: Documentation (Day 5)

**Goal:** Document all changes

1. Update CHANGELOG.md
2. Create developer guide
3. Add code comments
4. Create testing documentation

---

## Success Criteria

### Required for Completion

1. ✅ **Zero TypeScript Errors**
   - `pnpm exec tsc --noEmit` returns no errors
   - All 25 original errors fixed
   - No new errors introduced

2. ✅ **All Junction Table Queries Updated**
   - Documents relationships use DocumentsTo* tables
   - Watchers use AccountWatchers/BoardWatchers tables
   - Contacts-Opportunities use ContactsToOpportunities table
   - No queries using old array syntax

3. ✅ **Utility Functions Created**
   - `lib/junction-helpers.ts` file exists
   - All 20+ helper functions implemented
   - Functions have TypeScript types
   - Functions have JSDoc comments

4. ✅ **All Relation Names Updated**
   - AccountAssignedTo, LeadAssignedTo, etc. used correctly
   - No relation name conflicts
   - All User relations explicit

5. ✅ **Manual Testing Completed**
   - All items in testing checklist verified
   - Each module's CRUD operations tested
   - Junction table operations verified

6. ✅ **Documentation Updated**
   - CHANGELOG.md updated
   - Developer guide created
   - Testing documentation created
   - Code comments added to complex queries

### Optional Enhancements (Future)

- Unit tests for junction table helpers
- Integration tests for API endpoints
- Performance benchmarking report
- Automated testing in CI/CD pipeline

---

## Risk Assessment

### Low Risk
- Schema is already deployed and validated
- Data migration is complete
- Changes are internal implementation only
- No breaking changes to API contracts

### Medium Risk
- Complex queries may have edge cases
- Performance characteristics may differ from MongoDB
- Some query patterns may need optimization

### Mitigation Strategies

1. **Comprehensive Testing**
   - Follow testing checklist completely
   - Test edge cases (empty arrays, nulls, etc.)
   - Verify database state after operations

2. **Incremental Deployment**
   - Fix and test one module at a time
   - Verify each module before moving to next
   - Keep MongoDB backup available (already exists)

3. **Monitoring**
   - Monitor query performance
   - Watch for slow queries
   - Set up error tracking

4. **Rollback Plan**
   - Document can be rolled back to MongoDB if critical issues found
   - Migration script can re-run if needed
   - No data loss risk (PostgreSQL is source of truth)

---

## Estimated Timeline

### Total Estimated Time: 4-5 Days

**Day 1 (6-8 hours):**
- Fix TypeScript errors in CRM Accounts module
- Fix TypeScript errors in Documents module
- Create junction-helpers.ts utility file
- Initial testing of fixed modules

**Day 2 (6-8 hours):**
- Complete all utility functions
- Fix TypeScript errors in Projects/Boards module
- Fix CRM Contacts and Opportunities modules
- Testing of completed modules

**Day 3 (6-8 hours):**
- Fix CRM Leads, Tasks, and Invoices modules
- Complete all TypeScript error fixes
- Run full TypeScript compilation test
- Begin comprehensive manual testing

**Day 4 (6-8 hours):**
- Complete manual testing checklist
- API testing with Postman/Thunder Client
- Database verification queries
- Performance testing
- Fix any issues found

**Day 5 (4-6 hours):**
- Final regression testing
- Documentation (CHANGELOG, guides)
- Code review and cleanup
- Final verification
- Deployment preparation

**Buffer:** Add 1-2 days for unexpected issues or complex edge cases

---

## Files Modified Summary

### Total Files: ~25-30

**Core Implementation Files:**
1. `lib/junction-helpers.ts` (NEW)

**CRM Module (~10 files):**
2. `actions/crm/get-account.ts`
3. `actions/crm/get-accounts.ts`
4. `actions/crm/create-account.ts`
5. `actions/crm/update-account.ts`
6. `actions/crm/get-contact.ts`
7. `actions/crm/get-contacts.ts`
8. `actions/crm/get-opportunity.ts`
9. `actions/crm/get-opportunities.ts`
10. `actions/crm/get-lead.ts`
11. `actions/crm/get-leads.ts`
12. `app/api/crm/account/[accountId]/route.ts`
13. `app/api/crm/account/[accountId]/watch/route.ts`

**Documents Module (~5 files):**
14. `actions/documents/get-documents.ts`
15. `actions/documents/get-documents-by-accountId.ts`
16. `actions/documents/get-documents-by-contactId.ts`
17. `actions/documents/get-documents-by-opportunityId.ts`
18. `actions/documents/get-documents-by-leadId.ts`

**Projects Module (~5 files):**
19. `actions/projects/get-board.ts`
20. `actions/projects/get-boards.ts`
21. `actions/projects/update-board.ts`
22. `app/api/projects/board/[boardId]/route.ts`
23. `app/api/projects/board/[boardId]/watch/route.ts`

**Tasks Module (~3 files):**
24. `actions/projects/get-task.ts`
25. `actions/crm/get-account-task.ts`

**Invoices Module (~1 file):**
26. `actions/invoice/get-invoice.ts`

**Documentation (~4 files):**
27. `CHANGELOG.md` (UPDATE)
28. `docs/POSTGRESQL_MIGRATION_GUIDE.md` (NEW)
29. `docs/TESTING_CHECKLIST.md` (NEW)
30. Plus code comments in all updated files

---

## Appendix A: TypeScript Errors from Verification Report

### Application Code Errors (18 total)

**Error Category: Junction Table Pattern Mismatches**

1. `actions/crm/get-account.ts` - Line 11
   - **Error:** `Object literal may only specify known properties, and 'assigned_documents' does not exist`
   - **Fix:** Change to `documents: { include: { document: true } }`

2. `actions/crm/get-accounts.ts` - Multiple lines
   - **Error:** Watchers field reference issues
   - **Fix:** Update to use `watchers` junction table pattern

3. `actions/crm/update-account.ts` - Multiple lines
   - **Error:** Watchers operations using array syntax
   - **Fix:** Use nested create/delete operations

4. `actions/documents/get-documents-by-accountId.ts`
   - **Error:** Using old array field `accountsIDs`
   - **Fix:** Query through `accounts` junction table

5. `actions/documents/get-documents-by-contactId.ts`
   - **Error:** Using old array field `contactsIDs`
   - **Fix:** Query through `contacts` junction table

6. `actions/documents/get-documents-by-opportunityId.ts`
   - **Error:** Using old array field `opportunityIDs`
   - **Fix:** Query through `opportunities` junction table

7. `actions/documents/get-documents-by-leadId.ts`
   - **Error:** Using old array field `leadsIDs`
   - **Fix:** Query through `leads` junction table

8. `actions/projects/get-board.ts`
   - **Error:** Watchers field type mismatch
   - **Fix:** Update to use `watchers` junction table

9. `actions/projects/update-board.ts`
   - **Error:** Watchers operations using array syntax
   - **Fix:** Use nested create/delete operations

10. `app/api/crm/account/[accountId]/watch/route.ts`
    - **Error:** `watching_users` field changed to `watchers`
    - **Fix:** Update field name and use junction table pattern

11. `app/api/crm/account/[accountId]/route.ts`
    - **Error:** Documents field should use junction table
    - **Fix:** Update to use `documents` junction table

12. `app/api/projects/board/[boardId]/watch/route.ts`
    - **Error:** Watchers implementation using array
    - **Fix:** Use junction table pattern

**Additional Files (estimated 6 more):**
- Various other files in `app/api/crm/` directory
- Various other files in `app/api/projects/` directory
- Files using Contact-Opportunity relationships
- Files querying documents by task ID

---

## Appendix B: Junction Table Reference

### Complete Junction Table Mapping

| Junction Table | Primary Keys | Foreign Keys | Purpose | Cascade Delete |
|---------------|--------------|--------------|---------|----------------|
| DocumentsToInvoices | (document_id, invoice_id) | Documents, Invoices | Link documents to invoices | Yes |
| DocumentsToOpportunities | (document_id, opportunity_id) | Documents, crm_Opportunities | Link documents to opportunities | Yes |
| DocumentsToContacts | (document_id, contact_id) | Documents, crm_Contacts | Link documents to contacts | Yes |
| DocumentsToTasks | (document_id, task_id) | Documents, Tasks | Link documents to tasks | Yes |
| DocumentsToCrmAccountsTasks | (document_id, crm_accounts_task_id) | Documents, crm_Accounts_Tasks | Link documents to CRM tasks | Yes |
| DocumentsToLeads | (document_id, lead_id) | Documents, crm_Leads | Link documents to leads | Yes |
| DocumentsToAccounts | (document_id, account_id) | Documents, crm_Accounts | Link documents to accounts | Yes |
| AccountWatchers | (account_id, user_id) | crm_Accounts, Users | Track account watchers | Yes |
| BoardWatchers | (board_id, user_id) | Boards, Users | Track board watchers | Yes |
| ContactsToOpportunities | (contact_id, opportunity_id) | crm_Contacts, crm_Opportunities | Link contacts to opportunities | Yes |

### Prisma Schema Snippets

**DocumentsToAccounts:**
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

**AccountWatchers:**
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

**ContactsToOpportunities:**
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

## Appendix C: Relation Name Reference

### Explicit Relation Names in Schema

**Users Model Relations:**

| Relation Field | Model | Relation Name | Purpose |
|---------------|-------|---------------|---------|
| accounts | crm_Accounts | "AccountAssignedTo" | Assigned accounts |
| leads | crm_Leads | "LeadAssignedTo" | Assigned leads |
| assigned_opportunity | crm_Opportunities | "assigned_to_user_relation" | Assigned opportunities |
| created_by_user | crm_Opportunities | "created_by_user_relation" | Created opportunities |
| assigned_contacts | crm_Contacts | "assigned_contacts" | Assigned contacts |
| crated_contacts | crm_Contacts | "created_contacts" | Created contacts |
| created_by_documents | Documents | "created_by_user" | Created documents |
| assigned_documents | Documents | "assigned_to_user" | Assigned documents |
| boards | Boards | "assigned_user" | Owned boards |

**Usage in Queries:**

```typescript
// Get user with all assigned accounts
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
```

---

**End of Requirements Document**

Date: 2025-11-05
Version: 1.0
Status: Final
