# PostgreSQL Migration - Developer Guide

**Last Updated**: November 5, 2025
**Target Audience**: Developers working with NextCRM codebase
**Purpose**: Reference guide for working with the new PostgreSQL schema

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Schema Changes Overview](#schema-changes-overview)
3. [Junction Table Patterns](#junction-table-patterns)
4. [Common Code Patterns](#common-code-patterns)
5. [Junction Helpers API](#junction-helpers-api)
6. [Migration Examples by Module](#migration-examples-by-module)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

---

## Quick Reference

### What Changed?

**Database**: MongoDB → PostgreSQL
**Primary Keys**: MongoDB ObjectId → PostgreSQL UUID (both `string` type)
**Relationships**: Array fields → Junction tables (10 total)
**Query Pattern**: Array operations → Prisma nested operations

### Key Files

- **Junction Helpers**: `/lib/junction-helpers.ts` - Utility functions for all junction operations
- **Testing Guide**: `/POSTGRESQL_MIGRATION_TESTING.md` - Complete testing documentation
- **Changelog**: `/CHANGELOG_POSTGRESQL.md` - Complete list of changes
- **Schema**: `/prisma/schema.prisma` - PostgreSQL database schema

### Quick Commands

```bash
# TypeScript check
pnpm exec tsc --noEmit

# Run tests
pnpm test

# Prisma Studio (database GUI)
pnpm prisma studio

# Generate Prisma client
pnpm prisma generate
```

---

## Schema Changes Overview

### Junction Tables (10 Total)

| Junction Table | Replaces | Purpose | Composite Key |
|----------------|----------|---------|---------------|
| DocumentsToAccounts | `crm_Accounts.assigned_documents` | Links documents to accounts | `(document_id, account_id)` |
| DocumentsToContacts | `crm_Contacts.assigned_documents` | Links documents to contacts | `(document_id, contact_id)` |
| DocumentsToOpportunities | `crm_Opportunities.assigned_documents` | Links documents to opportunities | `(document_id, opportunity_id)` |
| DocumentsToLeads | `crm_Leads.assigned_documents` | Links documents to leads | `(document_id, lead_id)` |
| DocumentsToTasks | `Tasks.document` | Links documents to tasks | `(document_id, task_id)` |
| DocumentsToCrmAccountsTasks | `crm_Accounts_Tasks.document` | Links documents to CRM tasks | `(document_id, task_id)` |
| DocumentsToInvoices | `Invoices.assigned_documents` | Links documents to invoices | `(document_id, invoice_id)` |
| ContactsToOpportunities | `crm_Opportunities.assigned_contacts` | Links contacts to opportunities | `(contact_id, opportunity_id)` |
| AccountWatchers | `crm_Accounts.watchers` | Links users watching accounts | `(account_id, user_id)` |
| BoardWatchers | `Boards.watchers` | Links users watching boards | `(board_id, user_id)` |

### Primary Key Changes

**Before (MongoDB)**:
```typescript
id: string // MongoDB ObjectId as string
```

**After (PostgreSQL)**:
```typescript
id: string // PostgreSQL UUID as string
```

**Important**: Type remains `string` in both - no breaking changes to application code that uses IDs.

---

## Junction Table Patterns

### Pattern 1: One-to-Many with Documents

**Used by**: Accounts, Contacts, Opportunities, Leads, Tasks, CRM Account Tasks, Invoices

**Schema Definition**:
```prisma
model crm_Accounts {
  id        String   @id @default(uuid())
  // ... other fields

  // Junction table relation
  documents DocumentsToAccounts[]
}

model DocumentsToAccounts {
  document_id String
  account_id  String

  document crm_Document @relation(fields: [document_id], references: [id], onDelete: Cascade)
  account  crm_Accounts @relation(fields: [account_id], references: [id], onDelete: Cascade)

  @@id([document_id, account_id])
  @@index([document_id])
  @@index([account_id])
}
```

**Key Points**:
- Composite primary key prevents duplicate assignments
- Cascade deletes: Remove junction entry when either entity is deleted
- Indexes on both foreign keys for query performance
- Document remains in Documents table when entity is deleted

### Pattern 2: Many-to-Many

**Used by**: Contacts ↔ Opportunities

**Schema Definition**:
```prisma
model crm_Contacts {
  id            String   @id @default(uuid())
  // ... other fields

  // Junction table relations
  opportunities ContactsToOpportunities[]
}

model crm_Opportunities {
  id       String   @id @default(uuid())
  // ... other fields

  // Junction table relations
  contacts ContactsToOpportunities[]
}

model ContactsToOpportunities {
  contact_id     String
  opportunity_id String

  contact     crm_Contacts      @relation(fields: [contact_id], references: [id], onDelete: Cascade)
  opportunity crm_Opportunities @relation(fields: [opportunity_id], references: [id], onDelete: Cascade)

  @@id([contact_id, opportunity_id])
  @@index([contact_id])
  @@index([opportunity_id])
}
```

**Key Points**:
- True many-to-many: Each side can have multiple of the other
- Symmetrical relationship: Can query from either direction
- Cascade deletes: Unlinks relationship when either entity is deleted

### Pattern 3: Watchers

**Used by**: Accounts, Boards

**Schema Definition**:
```prisma
model crm_Accounts {
  id       String   @id @default(uuid())
  // ... other fields

  // Junction table relation
  watchers AccountWatchers[]
}

model AccountWatchers {
  account_id String
  user_id    String

  account crm_Accounts @relation(fields: [account_id], references: [id], onDelete: Cascade)
  user    Users        @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@id([account_id, user_id])
  @@index([account_id])
  @@index([user_id])
}
```

**Key Points**:
- Prevents duplicate watchers (composite primary key)
- Cascade deletes: Auto-unwatch when account or user deleted
- Can query: "All accounts watched by user" or "All users watching account"

---

## Common Code Patterns

### Pattern 1: Create Entity with Related Data

**Before (MongoDB)**:
```typescript
await prisma.crm_Accounts.create({
  data: {
    account_name: "Acme Corp",
    assigned_to_user: userId,
    assigned_documents: documentIds,  // Array of document IDs
    watchers: [userId1, userId2]      // Array of user IDs
  }
});
```

**After (PostgreSQL)**:
```typescript
import * as junctionTableHelpers from '@/lib/junction-helpers';

await prisma.crm_Accounts.create({
  data: {
    account_name: "Acme Corp",
    assigned_to_user: userId,
    documents: junctionTableHelpers.connectDocuments(documentIds),
    watchers: junctionTableHelpers.connectWatchers([userId1, userId2])
  }
});
```

**Explanation**:
- `connectDocuments()` creates junction table entries for each document
- `connectWatchers()` creates junction table entries for each watcher
- Both return Prisma nested create operations

### Pattern 2: Update Related Data

**Before (MongoDB)**:
```typescript
await prisma.crm_Accounts.update({
  where: { id: accountId },
  data: {
    assigned_documents: newDocumentIds  // Replace entire array
  }
});
```

**After (PostgreSQL)**:
```typescript
import * as junctionTableHelpers from '@/lib/junction-helpers';

await prisma.crm_Accounts.update({
  where: { id: accountId },
  data: {
    documents: junctionTableHelpers.updateDocuments(newDocumentIds)
  }
});
```

**Explanation**:
- `updateDocuments()` deletes all existing junction entries and creates new ones
- Atomic operation: All-or-nothing using Prisma nested operations
- Old documents are preserved (only junction entries deleted)

### Pattern 3: Add Single Item to Relationship

**Before (MongoDB)**:
```typescript
await prisma.crm_Accounts.update({
  where: { id: accountId },
  data: {
    watchers: {
      push: userId  // Add to array
    }
  }
});
```

**After (PostgreSQL)**:
```typescript
import * as junctionTableHelpers from '@/lib/junction-helpers';

await prisma.crm_Accounts.update({
  where: { id: accountId },
  data: {
    watchers: junctionTableHelpers.addWatcher(userId)
  }
});
```

**Explanation**:
- `addWatcher()` creates a single junction table entry
- Composite primary key prevents duplicates automatically
- If user is already watching, operation fails gracefully

### Pattern 4: Remove Single Item from Relationship

**Before (MongoDB)**:
```typescript
const account = await prisma.crm_Accounts.findUnique({
  where: { id: accountId }
});

await prisma.crm_Accounts.update({
  where: { id: accountId },
  data: {
    watchers: {
      set: account.watchers.filter(w => w !== userId)
    }
  }
});
```

**After (PostgreSQL)**:
```typescript
// Method 1: Direct junction table deletion
await prisma.accountWatchers.delete({
  where: {
    account_id_user_id: {
      account_id: accountId,
      user_id: userId
    }
  }
});

// Method 2: Using helper (returns delete config)
import * as junctionTableHelpers from '@/lib/junction-helpers';

await prisma.accountWatchers.delete(
  junctionTableHelpers.removeAccountWatcher(accountId, userId)
);
```

**Explanation**:
- Composite key deletion requires both fields
- Format: `{field1}__{field2}` for the unique constraint name
- Operation is idempotent: Safe to call even if not watching

### Pattern 5: Query with Related Data

**Before (MongoDB)**:
```typescript
const account = await prisma.crm_Accounts.findUnique({
  where: { id: accountId },
  include: {
    assigned_documents: true  // Returns array of document IDs
  }
});

// Result: account.assigned_documents = ["doc1", "doc2", "doc3"]
```

**After (PostgreSQL)**:
```typescript
const account = await prisma.crm_Accounts.findUnique({
  where: { id: accountId },
  include: {
    documents: {
      include: {
        document: {
          select: {
            id: true,
            document_name: true,
            created_by: true,
            storage_type: true
          }
        }
      }
    }
  }
});

// Result: account.documents = [
//   { document_id: "doc1", account_id: "acc1", document: { id: "doc1", document_name: "File1.pdf", ... } },
//   { document_id: "doc2", account_id: "acc1", document: { id: "doc2", document_name: "File2.pdf", ... } },
// ]

// Extract document IDs:
const documentIds = account.documents.map(d => d.document_id);

// Or use helper:
import * as junctionTableHelpers from '@/lib/junction-helpers';
const documentIds = junctionTableHelpers.extractDocumentIds(account.documents);
```

**Explanation**:
- Junction table requires nested include to get full document data
- Use `select` to limit fields and improve performance
- Helper functions simplify extracting IDs when needed

### Pattern 6: Filter by Related Data

**Before (MongoDB)**:
```typescript
// Find documents assigned to account
const documents = await prisma.documents.findMany({
  where: {
    accountsIDs: {
      has: accountId  // Array contains check
    }
  }
});

// Find accounts watched by user
const accounts = await prisma.crm_Accounts.findMany({
  where: {
    watchers: {
      has: userId  // Array contains check
    }
  }
});
```

**After (PostgreSQL)**:
```typescript
// Find documents assigned to account
const documents = await prisma.documents.findMany({
  where: {
    accounts: {
      some: {
        account_id: accountId  // Junction table relation
      }
    }
  }
});

// Find accounts watched by user
const accounts = await prisma.crm_Accounts.findMany({
  where: {
    watchers: {
      some: {
        user_id: userId  // Junction table relation
      }
    }
  }
});
```

**Explanation**:
- `some` checks if at least one junction entry matches condition
- Can also use `every` or `none` for other scenarios
- Query is optimized by database using junction table indexes

### Pattern 7: Many-to-Many Linking

**Before (MongoDB)**:
```typescript
// Link contact to opportunity
await prisma.crm_Opportunities.update({
  where: { id: opportunityId },
  data: {
    assigned_contacts: {
      push: contactId
    }
  }
});
```

**After (PostgreSQL)**:
```typescript
// Method 1: Direct junction table creation
await prisma.contactsToOpportunities.create({
  data: {
    contact_id: contactId,
    opportunity_id: opportunityId
  }
});

// Method 2: Nested operation from opportunity
await prisma.crm_Opportunities.update({
  where: { id: opportunityId },
  data: {
    contacts: {
      create: {
        contact_id: contactId
      }
    }
  }
});

// Method 3: Using helper
import * as junctionTableHelpers from '@/lib/junction-helpers';

await prisma.crm_Opportunities.update({
  where: { id: opportunityId },
  data: {
    contacts: junctionTableHelpers.addContact(contactId)
  }
});
```

**Explanation**:
- Three equivalent approaches, choose based on context
- Direct creation is clearest for single links
- Nested operations useful when updating multiple fields
- Helpers provide consistency across codebase

### Pattern 8: Many-to-Many Unlinking

**Before (MongoDB)**:
```typescript
const opportunity = await prisma.crm_Opportunities.findUnique({
  where: { id: opportunityId }
});

await prisma.crm_Opportunities.update({
  where: { id: opportunityId },
  data: {
    assigned_contacts: {
      set: opportunity.assigned_contacts.filter(c => c !== contactId)
    }
  }
});
```

**After (PostgreSQL)**:
```typescript
await prisma.contactsToOpportunities.delete({
  where: {
    contact_id_opportunity_id: {
      contact_id: contactId,
      opportunity_id: opportunityId
    }
  }
});
```

**Explanation**:
- Composite key deletion
- No need to fetch opportunity first
- Operation fails gracefully if link doesn't exist

---

## Junction Helpers API

### Import Statement

```typescript
import * as junctionTableHelpers from '@/lib/junction-helpers';
```

### Document Junction Helpers

#### `connectDocuments(documentIds: string[])`
Creates junction entries for multiple documents. Use when creating an entity with documents.

```typescript
await prisma.crm_Accounts.create({
  data: {
    account_name: "Acme Corp",
    documents: junctionTableHelpers.connectDocuments(["doc1", "doc2"])
  }
});
```

#### `updateDocuments(documentIds: string[])`
Replaces all existing document associations with new ones. Atomic operation.

```typescript
await prisma.crm_Accounts.update({
  where: { id: accountId },
  data: {
    documents: junctionTableHelpers.updateDocuments(["doc3", "doc4"])
  }
});
```

#### `addDocument(documentId: string)`
Adds a single document to existing associations.

```typescript
await prisma.crm_Accounts.update({
  where: { id: accountId },
  data: {
    documents: junctionTableHelpers.addDocument("doc5")
  }
});
```

#### `hasDocument(documentId: string)`
Query condition to check if entity has specific document.

```typescript
const accounts = await prisma.crm_Accounts.findMany({
  where: {
    documents: junctionTableHelpers.hasDocument("doc1")
  }
});
```

#### `extractDocumentIds(junctionEntries: { document_id: string }[])`
Extracts document IDs from junction table array.

```typescript
const account = await prisma.crm_Accounts.findUnique({
  where: { id: accountId },
  include: { documents: true }
});

const documentIds = junctionTableHelpers.extractDocumentIds(account.documents);
// Result: ["doc1", "doc2", "doc3"]
```

### Watcher Junction Helpers

#### `connectWatchers(userIds: string[])`
Creates junction entries for multiple watchers.

```typescript
await prisma.crm_Accounts.create({
  data: {
    account_name: "Acme Corp",
    watchers: junctionTableHelpers.connectWatchers(["user1", "user2"])
  }
});
```

#### `updateWatchers(userIds: string[])`
Replaces all existing watchers with new ones.

```typescript
await prisma.crm_Accounts.update({
  where: { id: accountId },
  data: {
    watchers: junctionTableHelpers.updateWatchers(["user3", "user4"])
  }
});
```

#### `addWatcher(userId: string)`
Adds a single watcher to existing watchers.

```typescript
await prisma.crm_Accounts.update({
  where: { id: accountId },
  data: {
    watchers: junctionTableHelpers.addWatcher("user5")
  }
});
```

#### `removeAccountWatcher(accountId: string, userId: string)`
Returns delete configuration for removing account watcher.

```typescript
await prisma.accountWatchers.delete(
  junctionTableHelpers.removeAccountWatcher(accountId, userId)
);
```

#### `removeBoardWatcher(boardId: string, userId: string)`
Returns delete configuration for removing board watcher.

```typescript
await prisma.boardWatchers.delete(
  junctionTableHelpers.removeBoardWatcher(boardId, userId)
);
```

#### `hasWatcher(userId: string)`
Query condition to check if entity has specific watcher.

```typescript
const accounts = await prisma.crm_Accounts.findMany({
  where: {
    watchers: junctionTableHelpers.hasWatcher(userId)
  }
});
```

#### `extractWatcherUserIds(junctionEntries: { user_id: string }[])`
Extracts user IDs from watcher junction table array.

```typescript
const account = await prisma.crm_Accounts.findUnique({
  where: { id: accountId },
  include: { watchers: true }
});

const userIds = junctionTableHelpers.extractWatcherUserIds(account.watchers);
// Result: ["user1", "user2"]
```

### Opportunity-Contact Junction Helpers

#### `connectOpportunities(opportunityIds: string[])`
Creates junction entries for multiple opportunities (from contact side).

```typescript
await prisma.crm_Contacts.update({
  where: { id: contactId },
  data: {
    opportunities: junctionTableHelpers.connectOpportunities(["opp1", "opp2"])
  }
});
```

#### `connectContacts(contactIds: string[])`
Creates junction entries for multiple contacts (from opportunity side).

```typescript
await prisma.crm_Opportunities.update({
  where: { id: opportunityId },
  data: {
    contacts: junctionTableHelpers.connectContacts(["contact1", "contact2"])
  }
});
```

#### `addOpportunity(opportunityId: string)`
Adds single opportunity to contact.

```typescript
await prisma.crm_Contacts.update({
  where: { id: contactId },
  data: {
    opportunities: junctionTableHelpers.addOpportunity("opp3")
  }
});
```

#### `addContact(contactId: string)`
Adds single contact to opportunity.

```typescript
await prisma.crm_Opportunities.update({
  where: { id: opportunityId },
  data: {
    contacts: junctionTableHelpers.addContact("contact3")
  }
});
```

### Include Helpers

#### `includeWatchersWithUsers()`
Returns include configuration for watchers with full user details.

```typescript
const account = await prisma.crm_Accounts.findUnique({
  where: { id: accountId },
  ...junctionTableHelpers.includeWatchersWithUsers()
});

// Result: account.watchers = [
//   { account_id: "acc1", user_id: "user1", user: { id: "user1", name: "John", email: "john@example.com", avatar: "..." } }
// ]
```

#### `includeDocumentsWithMetadata()`
Returns include configuration for documents with metadata.

```typescript
const account = await prisma.crm_Accounts.findUnique({
  where: { id: accountId },
  ...junctionTableHelpers.includeDocumentsWithMetadata()
});

// Result: account.documents = [
//   { document_id: "doc1", account_id: "acc1", document: { id: "doc1", document_name: "File.pdf", ... } }
// ]
```

---

## Migration Examples by Module

### CRM Accounts Module

**File**: `actions/crm/get-account.ts`

**Before**:
```typescript
export const getAccountById = async (id: string) => {
  const account = await prisma.crm_Accounts.findUnique({
    where: { id },
    include: {
      assigned_documents: true,
      watchers: true
    }
  });

  return account;
};
```

**After**:
```typescript
export const getAccountById = async (id: string) => {
  const account = await prisma.crm_Accounts.findUnique({
    where: { id },
    include: {
      documents: {
        include: {
          document: {
            select: {
              id: true,
              document_name: true,
              created_by: true,
              storage_type: true
            }
          }
        }
      },
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

  return account;
};
```

### CRM Contacts Module

**File**: `app/api/crm/contacts/unlink-opportunity/[contactId]/route.ts`

**Before**:
```typescript
export async function DELETE(
  req: Request,
  { params }: { params: { contactId: string } }
) {
  const { opportunityId } = await req.json();

  const contact = await prisma.crm_Contacts.findUnique({
    where: { id: params.contactId }
  });

  await prisma.crm_Contacts.update({
    where: { id: params.contactId },
    data: {
      assigned_opportunities: {
        set: contact.assigned_opportunities.filter(o => o !== opportunityId)
      }
    }
  });

  return NextResponse.json({ success: true });
}
```

**After**:
```typescript
export async function DELETE(
  req: Request,
  { params }: { params: { contactId: string } }
) {
  const { opportunityId } = await req.json();

  await prisma.contactsToOpportunities.delete({
    where: {
      contact_id_opportunity_id: {
        contact_id: params.contactId,
        opportunity_id: opportunityId
      }
    }
  });

  return NextResponse.json({ success: true });
}
```

### Documents Module

**File**: `actions/documents/get-documents-by-accountId.ts`

**Before**:
```typescript
export const getDocumentsByAccountId = async (accountId: string) => {
  const documents = await prisma.documents.findMany({
    where: {
      accountsIDs: {
        has: accountId
      }
    },
    orderBy: {
      created_on: "desc"
    }
  });

  return documents;
};
```

**After**:
```typescript
export const getDocumentsByAccountId = async (accountId: string) => {
  const documents = await prisma.documents.findMany({
    where: {
      accounts: {
        some: {
          account_id: accountId
        }
      }
    },
    orderBy: {
      created_on: "desc"
    }
  });

  return documents;
};
```

### Projects/Boards Module

**File**: `actions/projects/get-boards-by-user.ts`

**Before**:
```typescript
export const getBoardsByUser = async (userId: string) => {
  const boards = await prisma.boards.findMany({
    where: {
      OR: [
        { created_by: userId },
        { sharedWith: { has: userId } }
      ]
    }
  });

  return boards;
};
```

**After**:
```typescript
export const getBoardsByUser = async (userId: string) => {
  const boards = await prisma.boards.findMany({
    where: {
      OR: [
        { created_by: userId },
        { watchers: { some: { user_id: userId } } }
      ]
    },
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

  return boards;
};
```

---

## Troubleshooting

### Issue 1: "Cannot read property 'document' of undefined"

**Cause**: Junction table query not including nested document.

**Solution**: Add nested include:
```typescript
// Wrong
include: {
  documents: true  // Only returns junction entries
}

// Correct
include: {
  documents: {
    include: {
      document: { select: { id: true, document_name: true } }
    }
  }
}
```

### Issue 2: "Foreign key constraint violation"

**Cause**: Trying to create junction entry with invalid ID.

**Solution**: Verify entity exists before creating junction:
```typescript
// Check document exists
const documentExists = await prisma.documents.findUnique({
  where: { id: documentId }
});

if (!documentExists) {
  throw new Error("Document not found");
}

// Now safe to create junction
await prisma.documentsToAccounts.create({
  data: {
    document_id: documentId,
    account_id: accountId
  }
});
```

### Issue 3: "Unique constraint violation"

**Cause**: Trying to create duplicate junction entry.

**Solution 1**: Use `upsert` instead of `create`:
```typescript
await prisma.documentsToAccounts.upsert({
  where: {
    document_id_account_id: {
      document_id: documentId,
      account_id: accountId
    }
  },
  create: {
    document_id: documentId,
    account_id: accountId
  },
  update: {}  // No-op if exists
});
```

**Solution 2**: Use update pattern (replaces all):
```typescript
await prisma.crm_Accounts.update({
  where: { id: accountId },
  data: {
    documents: junctionTableHelpers.updateDocuments(documentIds)
  }
});
```

### Issue 4: Slow query with many documents

**Cause**: Not using proper indexes or returning too much data.

**Solution 1**: Verify indexes exist:
```sql
-- Check indexes on junction table
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'DocumentsToAccounts';
```

**Solution 2**: Use `select` to limit returned fields:
```typescript
const account = await prisma.crm_Accounts.findUnique({
  where: { id: accountId },
  include: {
    documents: {
      include: {
        document: {
          select: {
            id: true,
            document_name: true
            // Only fields you need
          }
        }
      }
    }
  }
});
```

**Solution 3**: Add pagination:
```typescript
const account = await prisma.crm_Accounts.findUnique({
  where: { id: accountId },
  include: {
    documents: {
      take: 10,
      skip: page * 10,
      include: {
        document: { select: { id: true, document_name: true } }
      }
    }
  }
});
```

### Issue 5: Documents not showing for account

**Cause**: Junction table entries missing or query incorrect.

**Solution**: Verify junction table has entries:
```sql
SELECT * FROM "DocumentsToAccounts" WHERE account_id = 'YOUR_ACCOUNT_ID';
```

If empty, documents were never assigned. If populated, check query includes junction:
```typescript
// Must include documents relation
include: {
  documents: {
    include: {
      document: { select: { id: true, document_name: true } }
    }
  }
}
```

---

## Best Practices

### 1. Always Use Junction Helpers

**Why**: Consistency and maintainability.

**Good**:
```typescript
import * as junctionTableHelpers from '@/lib/junction-helpers';

await prisma.crm_Accounts.update({
  where: { id: accountId },
  data: {
    documents: junctionTableHelpers.updateDocuments(documentIds)
  }
});
```

**Avoid**:
```typescript
// Manual nested operation (error-prone)
await prisma.crm_Accounts.update({
  where: { id: accountId },
  data: {
    documents: {
      deleteMany: {},
      create: documentIds.map(id => ({ document_id: id }))
    }
  }
});
```

### 2. Use Proper Includes

**Why**: Avoid N+1 queries and get all data in one query.

**Good**:
```typescript
const accounts = await prisma.crm_Accounts.findMany({
  include: {
    documents: {
      include: {
        document: { select: { id: true, document_name: true } }
      }
    }
  }
});
```

**Avoid**:
```typescript
const accounts = await prisma.crm_Accounts.findMany({});

// Then fetching documents separately (N+1 query problem)
for (const account of accounts) {
  const documents = await prisma.documents.findMany({
    where: {
      accounts: { some: { account_id: account.id } }
    }
  });
}
```

### 3. Limit Returned Fields

**Why**: Performance and network efficiency.

**Good**:
```typescript
const account = await prisma.crm_Accounts.findUnique({
  where: { id: accountId },
  select: {
    id: true,
    account_name: true,
    documents: {
      include: {
        document: {
          select: {
            id: true,
            document_name: true  // Only what you need
          }
        }
      }
    }
  }
});
```

**Avoid**:
```typescript
const account = await prisma.crm_Accounts.findUnique({
  where: { id: accountId },
  include: {
    documents: {
      include: {
        document: true  // Returns ALL document fields
      }
    }
  }
});
```

### 4. Handle Errors Gracefully

**Why**: Junction operations can fail (missing entities, duplicates).

**Good**:
```typescript
try {
  await prisma.contactsToOpportunities.delete({
    where: {
      contact_id_opportunity_id: {
        contact_id: contactId,
        opportunity_id: opportunityId
      }
    }
  });
} catch (error) {
  if (error.code === 'P2025') {
    // Record not found - already unlinked
    return { success: true, message: "Already unlinked" };
  }
  throw error;
}
```

### 5. Use Transactions for Multiple Operations

**Why**: Ensure atomicity when updating multiple entities.

**Good**:
```typescript
await prisma.$transaction([
  prisma.crm_Accounts.update({
    where: { id: accountId },
    data: { account_name: "Updated Name" }
  }),
  prisma.documentsToAccounts.create({
    data: {
      document_id: documentId,
      account_id: accountId
    }
  })
]);
```

### 6. Verify Data Integrity

**Why**: Ensure junction tables match expected state.

**Recommended Checks**:
```sql
-- Check for orphaned junction entries
SELECT dta.*
FROM "DocumentsToAccounts" dta
LEFT JOIN "Documents" d ON d.id = dta.document_id
WHERE d.id IS NULL;

-- Should return 0 rows

-- Verify no duplicates (should be prevented by primary key)
SELECT document_id, account_id, COUNT(*)
FROM "DocumentsToAccounts"
GROUP BY document_id, account_id
HAVING COUNT(*) > 1;

-- Should return 0 rows
```

### 7. Monitor Query Performance

**Why**: Junction table queries can be expensive with large datasets.

**Tools**:
- Prisma query logging: `log: ['query']` in PrismaClient
- PostgreSQL `EXPLAIN ANALYZE`
- pg_stat_statements extension

**Example**:
```typescript
const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
  ],
});

prisma.$on('query', (e) => {
  console.log('Query: ' + e.query);
  console.log('Duration: ' + e.duration + 'ms');
});
```

---

## Additional Resources

- **Junction Helpers Source**: `/lib/junction-helpers.ts`
- **Prisma Schema**: `/prisma/schema.prisma`
- **Testing Guide**: `/POSTGRESQL_MIGRATION_TESTING.md`
- **Complete Changelog**: `/CHANGELOG_POSTGRESQL.md`
- **Prisma Docs**: https://www.prisma.io/docs/

---

**Questions or Issues?**

1. Check this guide first for common patterns
2. Review the junction helpers source code
3. Run database verification queries
4. Check PostgreSQL logs for query issues
5. Consult the testing guide for validation procedures

**Last Updated**: November 5, 2025
