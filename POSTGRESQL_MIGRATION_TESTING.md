# PostgreSQL Migration - Testing & Verification Guide

**Date**: November 5, 2025
**Status**: Codebase migration complete - Ready for testing

---

## 1. TypeScript Compilation Verification

### ✅ Result: 0 Errors

**Command**: `pnpm exec tsc --noEmit`

All TypeScript compilation errors have been resolved:
- 25+ initial errors fixed across 32 files
- All junction table patterns updated
- All relation names corrected
- All field references updated

**Files Modified** (32 total):
- Phase 1: `/lib/junction-helpers.ts` (created)
- Phase 2: 8 files (CRM Accounts, Documents)
- Phase 3: 13 files (CRM Contacts, Opportunities, Leads)
- Phase 4: 11 files (Projects, Boards, Tasks, Invoices)

---

## 2. Manual Testing Checklist

### 2.1 CRM Accounts Module

**Test Group: Account CRUD Operations**

- [ ] **Create Account**
  - Navigate to `/crm/accounts/new`
  - Fill in required fields
  - Verify account created successfully
  - Check PostgreSQL: `SELECT * FROM "crm_Accounts" ORDER BY "created_on" DESC LIMIT 1;`

- [ ] **View Account**
  - Navigate to `/crm/accounts/[id]`
  - Verify all fields display correctly
  - Check assigned documents load from junction table
  - Check watchers display correctly

- [ ] **Update Account**
  - Edit account details
  - Update assigned documents
  - Verify changes saved
  - Check junction tables updated: `SELECT * FROM "DocumentsToAccounts" WHERE account_id = 'xxx';`

- [ ] **Delete Account**
  - Delete an account
  - Verify cascade deletions work
  - Check junction table entries removed

**Test Group: Account Watchers**

- [ ] **Add Watcher**
  - Click "Watch" on an account
  - Verify watcher added
  - Check: `SELECT * FROM "AccountWatchers" WHERE account_id = 'xxx';`

- [ ] **Remove Watcher**
  - Click "Unwatch" on an account
  - Verify watcher removed
  - Check junction table entry deleted (composite key)

- [ ] **List Watchers**
  - View account details
  - Verify watchers section shows all users
  - Check user details (name, email, avatar) load correctly

**Test Group: Account Documents**

- [ ] **Assign Document to Account**
  - Add document to account
  - Verify DocumentsToAccounts junction created
  - Check: `SELECT * FROM "DocumentsToAccounts" WHERE account_id = 'xxx';`

- [ ] **View Account Documents**
  - Navigate to account details
  - Verify documents section populated
  - Check document metadata displays

- [ ] **Remove Document from Account**
  - Remove document assignment
  - Verify junction entry deleted
  - Check document still exists in Documents table

### 2.2 CRM Contacts Module

**Test Group: Contact CRUD Operations**

- [ ] **Create Contact**
  - Navigate to `/crm/contacts/new`
  - Fill required fields
  - Verify contact created
  - Check: `SELECT * FROM "crm_Contacts" ORDER BY created_on DESC LIMIT 1;`

- [ ] **View Contact**
  - Navigate to `/crm/contacts/[id]`
  - Verify all fields display
  - Check assigned documents load
  - Check linked opportunities load

- [ ] **Update Contact**
  - Edit contact details
  - Update documents
  - Link/unlink opportunities
  - Verify all changes persist

- [ ] **Delete Contact**
  - Delete contact
  - Verify cascade behavior
  - Check junction tables cleaned up

**Test Group: Contact-Opportunity Links**

- [ ] **Link Opportunity to Contact**
  - From contact page, link opportunity
  - Verify ContactsToOpportunities junction created
  - Check: `SELECT * FROM "ContactsToOpportunities" WHERE contact_id = 'xxx';`

- [ ] **Unlink Opportunity from Contact**
  - Remove opportunity link
  - Verify composite key deletion works
  - Check: `DELETE FROM "ContactsToOpportunities" WHERE contact_id = 'xxx' AND opportunity_id = 'yyy';`

- [ ] **View Contact Opportunities**
  - Navigate to contact details
  - Verify opportunities section shows all linked opps
  - Check opportunity details load (name, stage, value)

**Test Group: Contact Documents**

- [ ] **Assign Document to Contact**
  - Add document to contact
  - Verify DocumentsToContacts junction created
  - Check: `SELECT * FROM "DocumentsToContacts" WHERE contact_id = 'xxx';`

- [ ] **View Contact Documents**
  - Verify documents display in contact details
  - Check document metadata

- [ ] **Remove Document from Contact**
  - Remove document assignment
  - Verify junction entry deleted

### 2.3 CRM Opportunities Module

**Test Group: Opportunity CRUD Operations**

- [ ] **Create Opportunity**
  - Navigate to `/crm/opportunities/new`
  - Fill required fields
  - Assign contacts
  - Verify opportunity created
  - Check: `SELECT * FROM "crm_Opportunities" ORDER BY created_on DESC LIMIT 1;`

- [ ] **View Opportunity**
  - Navigate to `/crm/opportunities/[id]`
  - Verify all fields display
  - Check linked contacts load
  - Check assigned documents load

- [ ] **Update Opportunity**
  - Edit opportunity details
  - Change stage
  - Update contacts
  - Update documents
  - Verify all changes persist

- [ ] **Delete Opportunity**
  - Delete opportunity
  - Verify cascade behavior
  - Check junction tables cleaned up

**Test Group: Opportunity Documents**

- [ ] **Assign Document to Opportunity**
  - Add document to opportunity
  - Verify DocumentsToOpportunities junction created
  - Check: `SELECT * FROM "DocumentsToOpportunities" WHERE opportunity_id = 'xxx';`

- [ ] **View Opportunity Documents**
  - Verify documents display
  - Check document metadata

- [ ] **Remove Document from Opportunity**
  - Remove document assignment
  - Verify junction entry deleted

### 2.4 CRM Leads Module

**Test Group: Lead CRUD Operations**

- [ ] **Create Lead**
  - Navigate to `/crm/leads/new`
  - Fill required fields
  - Verify lead created
  - Check: `SELECT * FROM "crm_Leads" ORDER BY created_on DESC LIMIT 1;`

- [ ] **View Lead**
  - Navigate to `/crm/leads/[id]`
  - Verify all fields display
  - Check assigned documents load

- [ ] **Update Lead**
  - Edit lead details
  - Update documents
  - Verify changes persist

- [ ] **Delete Lead**
  - Delete lead
  - Verify cascade behavior
  - Check junction tables cleaned up

**Test Group: Lead Documents**

- [ ] **Assign Document to Lead**
  - Add document to lead
  - Verify DocumentsToLeads junction created
  - Check: `SELECT * FROM "DocumentsToLeads" WHERE lead_id = 'xxx';`

- [ ] **View Lead Documents**
  - Verify documents display
  - Check document metadata

- [ ] **Remove Document from Lead**
  - Remove document assignment
  - Verify junction entry deleted

### 2.5 Documents Module

**Test Group: Document Management**

- [ ] **Upload Document**
  - Navigate to `/documents/new`
  - Upload file via UploadThing
  - Verify document created
  - Check: `SELECT * FROM "Documents" ORDER BY created_on DESC LIMIT 1;`

- [ ] **View Document**
  - Navigate to `/documents/[id]`
  - Verify metadata displays
  - Check related entities section

- [ ] **View Documents by Account**
  - Navigate to documents page
  - Filter by account
  - Verify query uses DocumentsToAccounts junction
  - Check: API `/api/documents?accountId=xxx`

- [ ] **View Documents by Contact**
  - Filter by contact
  - Verify query uses DocumentsToContacts junction

- [ ] **View Documents by Opportunity**
  - Filter by opportunity
  - Verify query uses DocumentsToOpportunities junction

- [ ] **View Documents by Lead**
  - Filter by lead
  - Verify query uses DocumentsToLeads junction

- [ ] **View Documents by Task**
  - Filter by task
  - Verify query uses DocumentsToTasks junction

- [ ] **View Documents by Invoice**
  - Filter by invoice
  - Verify query uses DocumentsToInvoices junction

### 2.6 Projects & Boards Module

**Test Group: Board CRUD Operations**

- [ ] **Create Board**
  - Navigate to `/projects/new`
  - Create new board
  - Verify board created
  - Check: `SELECT * FROM "Boards" ORDER BY created_on DESC LIMIT 1;`

- [ ] **View Board**
  - Navigate to `/projects/[id]`
  - Verify board displays
  - Check columns load
  - Check tasks load

- [ ] **Update Board**
  - Edit board details
  - Verify changes persist

- [ ] **Delete Board**
  - Delete board
  - Verify cascade deletions

**Test Group: Board Watchers**

- [ ] **Add Board Watcher**
  - Watch a board
  - Verify BoardWatchers junction created
  - Check: `SELECT * FROM "BoardWatchers" WHERE board_id = 'xxx';`

- [ ] **Remove Board Watcher**
  - Unwatch board
  - Verify junction entry deleted (composite key)

- [ ] **List Board Watchers**
  - View board
  - Verify watchers section shows all users
  - Check user details load

### 2.7 Tasks Module

**Test Group: Task CRUD Operations**

- [ ] **Create Task**
  - Create new task in board
  - Assign documents
  - Verify task created
  - Check: `SELECT * FROM "Tasks" ORDER BY created_on DESC LIMIT 1;`

- [ ] **View Task**
  - Navigate to task details
  - Verify all fields display
  - Check assigned documents load

- [ ] **Update Task**
  - Edit task details
  - Move to different column
  - Update documents
  - Verify changes persist

- [ ] **Delete Task**
  - Delete task
  - Verify cascade behavior
  - Check junction tables cleaned up

**Test Group: Task Documents**

- [ ] **Assign Document to Task**
  - Add document to task
  - Verify DocumentsToTasks junction created
  - Check: `SELECT * FROM "DocumentsToTasks" WHERE task_id = 'xxx';`

- [ ] **View Task Documents**
  - Verify documents display
  - Check document metadata

- [ ] **Remove Document from Task**
  - Remove document assignment
  - Verify junction entry deleted

### 2.8 CRM Account Tasks Module

**Test Group: CRM Account Task CRUD**

- [ ] **Create CRM Account Task**
  - Navigate to account details
  - Create task for account
  - Assign documents
  - Verify task created
  - Check: `SELECT * FROM "crm_Accounts_Tasks" ORDER BY created_on DESC LIMIT 1;`

- [ ] **View CRM Account Task**
  - Navigate to task details
  - Verify assigned documents load

- [ ] **Update CRM Account Task**
  - Edit task
  - Update documents
  - Verify changes persist

- [ ] **Delete CRM Account Task**
  - Delete task
  - Verify junction tables cleaned up

**Test Group: CRM Account Task Documents**

- [ ] **Assign Document to CRM Account Task**
  - Add document to CRM account task
  - Verify DocumentsToCrmAccountsTasks junction created
  - Check: `SELECT * FROM "DocumentsToCrmAccountsTasks" WHERE task_id = 'xxx';`

- [ ] **View CRM Account Task Documents**
  - Verify documents display
  - Check document metadata

- [ ] **Remove Document from CRM Account Task**
  - Remove document assignment
  - Verify junction entry deleted

### 2.9 Invoices Module

**Test Group: Invoice CRUD Operations**

- [ ] **Create Invoice**
  - Navigate to `/invoice/new`
  - Create invoice
  - Verify invoice created
  - Check: `SELECT * FROM "Invoices" ORDER BY created_on DESC LIMIT 1;`

- [ ] **View Invoice**
  - Navigate to `/invoice/[id]`
  - Verify all fields display
  - Check assigned documents load

- [ ] **Update Invoice**
  - Edit invoice details
  - Update documents
  - Verify changes persist

- [ ] **Delete Invoice**
  - Delete invoice
  - Verify cascade behavior
  - Check junction tables cleaned up

**Test Group: Invoice Documents**

- [ ] **Assign Document to Invoice**
  - Add document to invoice
  - Verify DocumentsToInvoices junction created
  - Check: `SELECT * FROM "DocumentsToInvoices" WHERE invoice_id = 'xxx';`

- [ ] **View Invoice Documents**
  - Verify documents display
  - Check document metadata

- [ ] **Remove Document from Invoice**
  - Remove document assignment
  - Verify junction entry deleted

### 2.10 Cross-Module Integration Tests

**Test Group: Document Sharing Across Modules**

- [ ] **Document Assigned to Multiple Entities**
  - Create document
  - Assign to account
  - Assign same document to contact
  - Assign same document to opportunity
  - Verify all junction tables have entries
  - Check: Count references in each junction table

- [ ] **View Document Related Entities**
  - Navigate to document details
  - Verify "Related Entities" section shows:
    - All linked accounts
    - All linked contacts
    - All linked opportunities
    - All linked leads
    - All linked tasks
    - All linked invoices

**Test Group: Cascade Deletions**

- [ ] **Delete Document with Multiple Links**
  - Create document
  - Link to multiple entities
  - Delete document
  - Verify all junction table entries deleted
  - Verify entities remain intact

- [ ] **Delete Entity with Documents**
  - Create account with documents
  - Delete account
  - Verify DocumentsToAccounts entries deleted
  - Verify documents remain in Documents table

**Test Group: Watcher Consistency**

- [ ] **User Watches Multiple Entities**
  - User watches account
  - Same user watches board
  - Verify both AccountWatchers and BoardWatchers created
  - Check user can see both in their dashboard

- [ ] **Remove User from Watchers**
  - Remove user from account watchers
  - Verify only AccountWatchers entry removed
  - Verify user still watches board

---

## 3. Database Verification Queries

### 3.1 Junction Table Integrity Checks

**Check 1: DocumentsToAccounts Foreign Keys**
```sql
-- Verify all account_id references exist
SELECT dta.account_id, dta.document_id
FROM "DocumentsToAccounts" dta
LEFT JOIN "crm_Accounts" a ON dta.account_id = a.id
WHERE a.id IS NULL;
-- Expected: 0 rows (no orphaned references)

-- Verify all document_id references exist
SELECT dta.account_id, dta.document_id
FROM "DocumentsToAccounts" dta
LEFT JOIN "Documents" d ON dta.document_id = d.id
WHERE d.id IS NULL;
-- Expected: 0 rows (no orphaned references)
```

**Check 2: DocumentsToContacts Foreign Keys**
```sql
-- Verify all contact_id references exist
SELECT dtc.contact_id, dtc.document_id
FROM "DocumentsToContacts" dtc
LEFT JOIN "crm_Contacts" c ON dtc.contact_id = c.id
WHERE c.id IS NULL;
-- Expected: 0 rows

-- Verify all document_id references exist
SELECT dtc.contact_id, dtc.document_id
FROM "DocumentsToContacts" dtc
LEFT JOIN "Documents" d ON dtc.document_id = d.id
WHERE d.id IS NULL;
-- Expected: 0 rows
```

**Check 3: DocumentsToOpportunities Foreign Keys**
```sql
-- Verify all opportunity_id references exist
SELECT dto.opportunity_id, dto.document_id
FROM "DocumentsToOpportunities" dto
LEFT JOIN "crm_Opportunities" o ON dto.opportunity_id = o.id
WHERE o.id IS NULL;
-- Expected: 0 rows

-- Verify all document_id references exist
SELECT dto.opportunity_id, dto.document_id
FROM "DocumentsToOpportunities" dto
LEFT JOIN "Documents" d ON dto.document_id = d.id
WHERE d.id IS NULL;
-- Expected: 0 rows
```

**Check 4: DocumentsToLeads Foreign Keys**
```sql
-- Verify all lead_id references exist
SELECT dtl.lead_id, dtl.document_id
FROM "DocumentsToLeads" dtl
LEFT JOIN "crm_Leads" l ON dtl.lead_id = l.id
WHERE l.id IS NULL;
-- Expected: 0 rows

-- Verify all document_id references exist
SELECT dtl.lead_id, dtl.document_id
FROM "DocumentsToLeads" dtl
LEFT JOIN "Documents" d ON dtl.document_id = d.id
WHERE d.id IS NULL;
-- Expected: 0 rows
```

**Check 5: DocumentsToTasks Foreign Keys**
```sql
-- Verify all task_id references exist
SELECT dtt.task_id, dtt.document_id
FROM "DocumentsToTasks" dtt
LEFT JOIN "Tasks" t ON dtt.task_id = t.id
WHERE t.id IS NULL;
-- Expected: 0 rows

-- Verify all document_id references exist
SELECT dtt.task_id, dtt.document_id
FROM "DocumentsToTasks" dtt
LEFT JOIN "Documents" d ON dtt.document_id = d.id
WHERE d.id IS NULL;
-- Expected: 0 rows
```

**Check 6: DocumentsToCrmAccountsTasks Foreign Keys**
```sql
-- Verify all task_id references exist
SELECT dtcat.task_id, dtcat.document_id
FROM "DocumentsToCrmAccountsTasks" dtcat
LEFT JOIN "crm_Accounts_Tasks" cat ON dtcat.task_id = cat.id
WHERE cat.id IS NULL;
-- Expected: 0 rows

-- Verify all document_id references exist
SELECT dtcat.task_id, dtcat.document_id
FROM "DocumentsToCrmAccountsTasks" dtcat
LEFT JOIN "Documents" d ON dtcat.document_id = d.id
WHERE d.id IS NULL;
-- Expected: 0 rows
```

**Check 7: DocumentsToInvoices Foreign Keys**
```sql
-- Verify all invoice_id references exist
SELECT dti.invoice_id, dti.document_id
FROM "DocumentsToInvoices" dti
LEFT JOIN "Invoices" i ON dti.invoice_id = i.id
WHERE i.id IS NULL;
-- Expected: 0 rows

-- Verify all document_id references exist
SELECT dti.invoice_id, dti.document_id
FROM "DocumentsToInvoices" dti
LEFT JOIN "Documents" d ON dti.document_id = d.id
WHERE d.id IS NULL;
-- Expected: 0 rows
```

**Check 8: ContactsToOpportunities Foreign Keys**
```sql
-- Verify all contact_id references exist
SELECT cto.contact_id, cto.opportunity_id
FROM "ContactsToOpportunities" cto
LEFT JOIN "crm_Contacts" c ON cto.contact_id = c.id
WHERE c.id IS NULL;
-- Expected: 0 rows

-- Verify all opportunity_id references exist
SELECT cto.contact_id, cto.opportunity_id
FROM "ContactsToOpportunities" cto
LEFT JOIN "crm_Opportunities" o ON cto.opportunity_id = o.id
WHERE o.id IS NULL;
-- Expected: 0 rows
```

**Check 9: AccountWatchers Foreign Keys**
```sql
-- Verify all account_id references exist
SELECT aw.account_id, aw.user_id
FROM "AccountWatchers" aw
LEFT JOIN "crm_Accounts" a ON aw.account_id = a.id
WHERE a.id IS NULL;
-- Expected: 0 rows

-- Verify all user_id references exist
SELECT aw.account_id, aw.user_id
FROM "AccountWatchers" aw
LEFT JOIN "Users" u ON aw.user_id = u.id
WHERE u.id IS NULL;
-- Expected: 0 rows
```

**Check 10: BoardWatchers Foreign Keys**
```sql
-- Verify all board_id references exist
SELECT bw.board_id, bw.user_id
FROM "BoardWatchers" bw
LEFT JOIN "Boards" b ON bw.board_id = b.id
WHERE b.id IS NULL;
-- Expected: 0 rows

-- Verify all user_id references exist
SELECT bw.board_id, bw.user_id
FROM "BoardWatchers" bw
LEFT JOIN "Users" u ON bw.user_id = u.id
WHERE u.id IS NULL;
-- Expected: 0 rows
```

### 3.2 Data Consistency Checks

**Check 11: Documents Without Any Assignments**
```sql
-- Find documents not assigned to any entity
SELECT d.id, d.document_name, d.created_on
FROM "Documents" d
WHERE NOT EXISTS (SELECT 1 FROM "DocumentsToAccounts" WHERE document_id = d.id)
  AND NOT EXISTS (SELECT 1 FROM "DocumentsToContacts" WHERE document_id = d.id)
  AND NOT EXISTS (SELECT 1 FROM "DocumentsToOpportunities" WHERE document_id = d.id)
  AND NOT EXISTS (SELECT 1 FROM "DocumentsToLeads" WHERE document_id = d.id)
  AND NOT EXISTS (SELECT 1 FROM "DocumentsToTasks" WHERE document_id = d.id)
  AND NOT EXISTS (SELECT 1 FROM "DocumentsToCrmAccountsTasks" WHERE document_id = d.id)
  AND NOT EXISTS (SELECT 1 FROM "DocumentsToInvoices" WHERE document_id = d.id);
-- Note: Some unassigned documents may be expected (newly uploaded, etc.)
```

**Check 12: Duplicate Junction Table Entries**
```sql
-- Check for duplicates in DocumentsToAccounts
SELECT account_id, document_id, COUNT(*)
FROM "DocumentsToAccounts"
GROUP BY account_id, document_id
HAVING COUNT(*) > 1;
-- Expected: 0 rows (composite primary key prevents duplicates)

-- Repeat for other junction tables...
```

**Check 13: Accounts Without Assigned Documents (Legacy Check)**
```sql
-- Verify old array field is not being used
SELECT id, account_name, assigned_documents
FROM "crm_Accounts"
WHERE assigned_documents IS NOT NULL AND array_length(assigned_documents, 1) > 0;
-- Expected: 0 rows (field should be null or empty array)
```

**Check 14: Row Count Comparison (MongoDB vs PostgreSQL)**
```sql
-- PostgreSQL counts
SELECT 'Users' as table_name, COUNT(*) as count FROM "Users"
UNION ALL
SELECT 'crm_Accounts', COUNT(*) FROM "crm_Accounts"
UNION ALL
SELECT 'crm_Contacts', COUNT(*) FROM "crm_Contacts"
UNION ALL
SELECT 'crm_Opportunities', COUNT(*) FROM "crm_Opportunities"
UNION ALL
SELECT 'crm_Leads', COUNT(*) FROM "crm_Leads"
UNION ALL
SELECT 'Documents', COUNT(*) FROM "Documents"
UNION ALL
SELECT 'Boards', COUNT(*) FROM "Boards"
UNION ALL
SELECT 'Tasks', COUNT(*) FROM "Tasks"
UNION ALL
SELECT 'crm_Accounts_Tasks', COUNT(*) FROM "crm_Accounts_Tasks"
UNION ALL
SELECT 'Invoices', COUNT(*) FROM "Invoices";

-- Compare with MongoDB counts (run in MongoDB shell):
-- db.Users.countDocuments()
-- db.crm_Accounts.countDocuments()
-- etc.
```

### 3.3 Performance Verification Queries

**Check 15: Index Usage on Junction Tables**
```sql
-- Verify indexes exist on junction tables
SELECT
    t.tablename,
    i.indexname,
    array_agg(a.attname ORDER BY a.attnum) as columns
FROM pg_indexes i
JOIN pg_class c ON c.relname = i.indexname
JOIN pg_attribute a ON a.attrelid = c.oid
JOIN pg_tables t ON t.tablename = i.tablename
WHERE t.tablename IN (
    'DocumentsToAccounts',
    'DocumentsToContacts',
    'DocumentsToOpportunities',
    'DocumentsToLeads',
    'DocumentsToTasks',
    'DocumentsToCrmAccountsTasks',
    'DocumentsToInvoices',
    'ContactsToOpportunities',
    'AccountWatchers',
    'BoardWatchers'
)
GROUP BY t.tablename, i.indexname
ORDER BY t.tablename, i.indexname;
```

**Check 16: Query Performance Test**
```sql
-- Test query performance for account with documents
EXPLAIN ANALYZE
SELECT
    a.*,
    d.id as doc_id,
    d.document_name,
    d.created_by
FROM "crm_Accounts" a
LEFT JOIN "DocumentsToAccounts" dta ON dta.account_id = a.id
LEFT JOIN "Documents" d ON d.id = dta.document_id
WHERE a.id = 'YOUR_ACCOUNT_ID_HERE';

-- Expected: Index scans on both sides of joins
-- Execution time should be < 50ms for typical datasets
```

**Check 17: Junction Table Sizes**
```sql
-- Check size of junction tables
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename IN (
    'DocumentsToAccounts',
    'DocumentsToContacts',
    'DocumentsToOpportunities',
    'DocumentsToLeads',
    'DocumentsToTasks',
    'DocumentsToCrmAccountsTasks',
    'DocumentsToInvoices',
    'ContactsToOpportunities',
    'AccountWatchers',
    'BoardWatchers'
)
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 4. Performance Testing

### 4.1 Load Testing Approach

**Test Scenario 1: Document Assignment at Scale**
- Create 100 accounts
- Create 500 documents
- Assign each document to random 5-10 accounts
- Measure: Time to assign, query performance, memory usage

**Test Scenario 2: Junction Table Query Performance**
- Create account with 1,000 assigned documents
- Query account with all documents
- Measure: Query time, memory usage, index effectiveness

**Test Scenario 3: Watcher Operations**
- Create 100 accounts
- Add 50 users as watchers to each account
- List all accounts with watchers
- Measure: Query time, pagination performance

**Test Scenario 4: Cascade Deletion Performance**
- Create account with 100 documents, 50 watchers
- Delete account
- Measure: Deletion time, cascade cleanup

### 4.2 Performance Benchmarks

**Expected Performance Targets:**

| Operation | Target | Acceptable | Action Required |
|-----------|--------|------------|-----------------|
| Account query with 10 documents | < 50ms | < 100ms | > 100ms investigate |
| Account query with 100 documents | < 200ms | < 500ms | > 500ms investigate |
| Document assignment (single) | < 10ms | < 50ms | > 50ms investigate |
| Document assignment (bulk 100) | < 500ms | < 2s | > 2s investigate |
| Watcher add/remove | < 10ms | < 50ms | > 50ms investigate |
| Junction table join (10 results) | < 20ms | < 100ms | > 100ms investigate |
| Cascade deletion | < 1s | < 5s | > 5s investigate |

### 4.3 Memory Usage Monitoring

**Monitor these metrics during testing:**
- Next.js memory usage: `process.memoryUsage()`
- PostgreSQL connection pool: Check active connections
- Query result set sizes: Monitor returned row counts
- Prisma query caching: Monitor cache hit rates

### 4.4 Database Performance Tools

**Tools to use:**
1. **pg_stat_statements**: Track slow queries
   ```sql
   SELECT query, calls, total_time, mean_time
   FROM pg_stat_statements
   ORDER BY mean_time DESC
   LIMIT 20;
   ```

2. **EXPLAIN ANALYZE**: Analyze query execution plans
   ```sql
   EXPLAIN (ANALYZE, BUFFERS)
   SELECT ... FROM ... WHERE ...;
   ```

3. **Prisma Debug Logging**: Enable query logging
   ```typescript
   // In prisma client
   const prisma = new PrismaClient({
     log: ['query', 'info', 'warn', 'error']
   });
   ```

---

## 5. API Testing Checklist

### 5.1 CRM API Routes

**Account APIs**
- [ ] `GET /api/crm/account` - List accounts with pagination
- [ ] `GET /api/crm/account/[accountId]` - Get single account with documents
- [ ] `POST /api/crm/account` - Create account
- [ ] `PUT /api/crm/account/[accountId]` - Update account
- [ ] `DELETE /api/crm/account/[accountId]` - Delete account
- [ ] `POST /api/crm/account/[accountId]/watch` - Add watcher
- [ ] `DELETE /api/crm/account/[accountId]/watch` - Remove watcher

**Contact APIs**
- [ ] `GET /api/crm/contacts` - List contacts
- [ ] `GET /api/crm/contacts/[contactId]` - Get contact with opportunities and documents
- [ ] `POST /api/crm/contacts` - Create contact
- [ ] `PUT /api/crm/contacts/[contactId]` - Update contact
- [ ] `DELETE /api/crm/contacts/[contactId]` - Delete contact
- [ ] `POST /api/crm/contacts/link-opportunity/[contactId]` - Link opportunity
- [ ] `DELETE /api/crm/contacts/unlink-opportunity/[contactId]` - Unlink opportunity

**Opportunity APIs**
- [ ] `GET /api/crm/opportunity` - List opportunities
- [ ] `GET /api/crm/opportunity/[opportunityId]` - Get opportunity with contacts and documents
- [ ] `POST /api/crm/opportunity` - Create opportunity
- [ ] `PUT /api/crm/opportunity/[opportunityId]` - Update opportunity
- [ ] `DELETE /api/crm/opportunity/[opportunityId]` - Delete opportunity

**Lead APIs**
- [ ] `GET /api/crm/leads` - List leads
- [ ] `GET /api/crm/leads/[leadId]` - Get lead with documents
- [ ] `POST /api/crm/leads` - Create lead
- [ ] `PUT /api/crm/leads/[leadId]` - Update lead
- [ ] `DELETE /api/crm/leads/[leadId]` - Delete lead

### 5.2 Document APIs

- [ ] `GET /api/documents` - List all documents
- [ ] `GET /api/documents?accountId=xxx` - Filter by account
- [ ] `GET /api/documents?contactId=xxx` - Filter by contact
- [ ] `GET /api/documents?opportunityId=xxx` - Filter by opportunity
- [ ] `GET /api/documents?leadId=xxx` - Filter by lead
- [ ] `GET /api/documents?taskId=xxx` - Filter by task
- [ ] `GET /api/documents?invoiceId=xxx` - Filter by invoice
- [ ] `GET /api/documents/[documentId]` - Get single document
- [ ] `POST /api/documents` - Upload document
- [ ] `DELETE /api/documents/[documentId]` - Delete document

### 5.3 Project APIs

- [ ] `GET /api/projects` - List boards
- [ ] `GET /api/projects/[boardId]` - Get board with watchers
- [ ] `POST /api/projects` - Create board
- [ ] `PUT /api/projects/[boardId]` - Update board
- [ ] `DELETE /api/projects/[boardId]` - Delete board
- [ ] `POST /api/projects/[boardId]/watch` - Add watcher
- [ ] `DELETE /api/projects/[boardId]/watch` - Remove watcher

### 5.4 Task APIs

- [ ] `GET /api/projects/tasks` - List tasks
- [ ] `GET /api/projects/tasks/[taskId]` - Get task with documents
- [ ] `POST /api/projects/tasks` - Create task
- [ ] `PUT /api/projects/tasks/[taskId]` - Update task
- [ ] `DELETE /api/projects/tasks/[taskId]` - Delete task
- [ ] `POST /api/projects/tasks/[taskId]/assign` - Assign document to task
- [ ] `DELETE /api/projects/tasks/[taskId]/unassign` - Unassign document from task

### 5.5 Invoice APIs

- [ ] `GET /api/invoice` - List invoices
- [ ] `GET /api/invoice/[invoiceId]` - Get invoice with documents
- [ ] `POST /api/invoice` - Create invoice
- [ ] `PUT /api/invoice/[invoiceId]` - Update invoice
- [ ] `DELETE /api/invoice/[invoiceId]` - Delete invoice

---

## 6. Regression Testing

### 6.1 Critical User Flows

**Flow 1: Complete CRM Sales Cycle**
1. Create lead
2. Assign documents to lead
3. Convert lead to opportunity
4. Link contacts to opportunity
5. Assign documents to opportunity
6. Update opportunity stage
7. Close opportunity (won)
8. Verify all documents preserved
9. Verify all relationships intact

**Flow 2: Document Management Workflow**
1. Upload document
2. Assign to account
3. Assign same document to contact
4. Assign same document to opportunity
5. View document "Related Entities"
6. Remove from contact
7. Verify still linked to account and opportunity
8. Delete document
9. Verify all junction entries removed

**Flow 3: Project Collaboration Workflow**
1. Create board
2. Add watchers
3. Create tasks in board
4. Assign documents to tasks
5. Move tasks between columns
6. Update watchers
7. Complete tasks
8. Archive board
9. Verify cascade behavior

### 6.2 Edge Cases to Test

**Edge Case 1: Empty Relationships**
- Account with no documents
- Contact with no opportunities
- Opportunity with no contacts
- Board with no watchers
- Task with no documents

**Edge Case 2: Bulk Operations**
- Assign 100 documents to single account
- Link 50 contacts to single opportunity
- Add 100 watchers to single board
- Remove all documents from account at once
- Delete account with 100+ junction entries

**Edge Case 3: Concurrent Modifications**
- Two users adding same document to account simultaneously
- User removing document while another assigns it
- Multiple users watching/unwatching same entity

**Edge Case 4: Null/Undefined Handling**
- Update entity with empty document array
- Query entity with no assigned_documents field
- Filter documents with null entity IDs

---

## 7. Rollback Testing

### 7.1 Rollback Verification

If you need to rollback to MongoDB:

**Test Rollback Procedure:**
1. Backup current PostgreSQL state
2. Switch `.env` back to MongoDB URL
3. Update `schema.prisma` datasource to MongoDB
4. Run `pnpm prisma generate`
5. Test application works with MongoDB
6. Verify data still intact in MongoDB

**Expected Result:**
- Application should work exactly as before migration
- MongoDB data should be unchanged (not modified during migration)
- Can roll forward again by switching back to PostgreSQL

### 7.2 Dual-Database Testing (Optional)

If maintaining both databases temporarily:

**Test Parallel Operations:**
1. Keep MongoDB connection active
2. Use PostgreSQL as primary
3. Compare query results between both
4. Verify data consistency

---

## 8. Test Results Documentation

### 8.1 Test Execution Log Template

```markdown
## Test Execution Log

**Date**: [Date]
**Tester**: [Name]
**Environment**: [Staging/Local/Production]

### Test Results Summary

| Category | Total Tests | Passed | Failed | Skipped |
|----------|-------------|--------|--------|---------|
| CRM Accounts | X | X | X | X |
| CRM Contacts | X | X | X | X |
| CRM Opportunities | X | X | X | X |
| CRM Leads | X | X | X | X |
| Documents | X | X | X | X |
| Projects/Boards | X | X | X | X |
| Tasks | X | X | X | X |
| Invoices | X | X | X | X |
| API Routes | X | X | X | X |
| Database Integrity | X | X | X | X |
| Performance | X | X | X | X |
| **TOTAL** | **X** | **X** | **X** | **X** |

### Failed Tests Details

| Test Case | Expected | Actual | Error | Priority |
|-----------|----------|--------|-------|----------|
| Example | ... | ... | ... | High |

### Performance Results

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Account query (10 docs) | <50ms | Xms | Pass/Fail |
| Junction table join | <20ms | Xms | Pass/Fail |
| ... | ... | ... | ... |

### Database Integrity Results

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Orphaned references | 0 | X | Pass/Fail |
| Duplicate entries | 0 | X | Pass/Fail |
| ... | ... | ... | ... |
```

### 8.2 Bug Report Template

```markdown
## Bug Report

**Bug ID**: [Unique ID]
**Date**: [Date]
**Reported By**: [Name]
**Severity**: Critical/High/Medium/Low

### Description
[Clear description of the issue]

### Steps to Reproduce
1. Step 1
2. Step 2
3. ...

### Expected Result
[What should happen]

### Actual Result
[What actually happened]

### Environment
- Environment: [Local/Staging/Production]
- Database: PostgreSQL [version]
- Next.js: [version]
- Browser: [if applicable]

### Related Files
- [File paths]

### SQL Query (if applicable)
```sql
[Query that demonstrates the issue]
```

### Error Logs
```
[Relevant error messages]
```

### Screenshots
[If applicable]

### Suggested Fix
[If known]
```

---

## 9. Sign-Off Criteria

### 9.1 Testing Complete Checklist

Migration testing is considered complete when:

- [ ] **TypeScript Compilation**: 0 errors
- [ ] **All Manual Tests**: 100% pass rate on critical paths
- [ ] **Database Integrity**: All 17 verification queries pass
- [ ] **API Routes**: All endpoints return correct responses
- [ ] **Performance**: All metrics within target ranges
- [ ] **Junction Tables**: All foreign keys valid, no orphans
- [ ] **Cascade Behavior**: Deletions clean up properly
- [ ] **Watcher Operations**: Add/remove works correctly
- [ ] **Document Assignments**: Multi-entity assignments work
- [ ] **Regression Tests**: All critical user flows pass
- [ ] **Edge Cases**: Handled gracefully
- [ ] **Error Handling**: Appropriate errors returned
- [ ] **Rollback Tested**: Can switch back to MongoDB if needed

### 9.2 Production Deployment Checklist

Before deploying to production:

- [ ] All testing complete and signed off
- [ ] Performance benchmarks met
- [ ] Database backup completed
- [ ] Rollback plan documented and tested
- [ ] Monitoring alerts configured
- [ ] Team trained on new junction table patterns
- [ ] Documentation updated
- [ ] Changelog published
- [ ] User communication sent (if applicable)

---

## 10. Support and Troubleshooting

### 10.1 Common Issues and Solutions

**Issue**: "Cannot read property 'document' of undefined"
**Solution**: Junction table query not including nested document. Add `include: { document: { select: {...} } }` to query.

**Issue**: "Foreign key constraint violation"
**Solution**: Trying to insert invalid UUID. Verify entity exists before creating junction entry.

**Issue**: "Duplicate key value violates unique constraint"
**Solution**: Junction entry already exists. Use update pattern with `deleteMany` + `create` instead of direct `create`.

**Issue**: Slow query performance with many documents
**Solution**: Verify indexes exist on junction tables. Check query plan with `EXPLAIN ANALYZE`.

**Issue**: Documents not showing for account
**Solution**: Check DocumentsToAccounts junction table has entries. Verify query includes junction join.

### 10.2 Debug Commands

```bash
# Check TypeScript errors
pnpm exec tsc --noEmit

# Check Prisma schema
pnpm prisma validate

# View database in Prisma Studio
pnpm prisma studio

# Check database logs (if access available)
# tail -f /var/log/postgresql/postgresql.log

# Check Next.js logs
# tail -f .next/server/app-paths-manifest.json
```

### 10.3 Emergency Contacts

**Database Issues**: [DBA contact]
**Application Errors**: [Dev team lead]
**Performance Problems**: [DevOps contact]
**User-Reported Bugs**: [Product owner]

---

## 11. Test Status

**Current Status**: ⏳ **Ready for Testing**

**Last Updated**: November 5, 2025

**Next Steps**:
1. Execute manual testing checklist (Section 2)
2. Run database verification queries (Section 3)
3. Conduct performance testing (Section 4)
4. Document results in test log template (Section 8.1)

---

**For questions or issues, refer to:**
- Migration implementation: `/agent-os/specs/2025-11-05-mongodb-to-postgresql-codebase-upgrade/spec.md`
- Junction helpers API: `/lib/junction-helpers.ts`
- Tasks breakdown: `/agent-os/specs/2025-11-05-mongodb-to-postgresql-codebase-upgrade/tasks.md`
