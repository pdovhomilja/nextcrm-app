# CRM Audit Log & Soft Delete — Design Spec

**Date:** 2026-03-27
**Status:** Approved
**Scope:** Sub-project A of CRM completeness initiative

---

## Overview

Add a complete audit trail to the NextCRM sales module. Every field change, creation, deletion, and relationship mutation on any CRM record is permanently recorded. Deleted records are soft-deleted (hidden from the app, recoverable by admins). History is visible inline on every record detail page and in a global admin audit log page.

---

## Goals

- Full field-level change history on all 5 CRM entities: Accounts, Contacts, Leads, Opportunities, Contracts
- Soft delete across all 5 entities (records hidden from app but retained in DB)
- Admin restore capability for soft-deleted records
- Inline history timeline tab on every CRM record detail page
- Global `/admin/audit-log` page with filtering and inline diff expansion

---

## Non-Goals

- Real-time push updates to the timeline (polling/refresh is sufficient)
- Audit log for non-CRM entities (Tasks, Documents, Campaigns) — deferred to future
- Email/activity log (Calls, Meetings, Notes) — separate sub-project B

---

## Data Model

### `crm_AuditLog` (new table)

```prisma
model crm_AuditLog {
  id         String   @id @default(uuid()) @db.Uuid
  entityType String   // "account" | "contact" | "lead" | "opportunity" | "contract"
  entityId   String   @db.Uuid
  action     String   // "created" | "updated" | "deleted" | "restored" | "relation_added" | "relation_removed"
  changes    Json?    @db.JsonB
  userId     String   @db.Uuid
  createdAt  DateTime @default(now())

  user Users @relation(fields: [userId], references: [id])

  @@index([entityType, entityId])
  @@index([userId])
  @@index([createdAt])
  @@index([entityType, createdAt])
}
```

**`changes` JSON shape:**

For field updates:
```json
[
  { "field": "status", "old": "Active", "new": "Inactive" },
  { "field": "assigned_to", "old": "uuid-1", "new": "uuid-2" }
]
```

For created/deleted/restored (no field diff):
```json
null
```

For relation events:
```json
[{ "field": "contact", "old": null, "new": "contact-uuid" }]
```

### Soft Delete columns (added to 5 existing models)

Added to `crm_Accounts`, `crm_Contacts`, `crm_Leads`, `crm_Opportunities`, `crm_Contracts`:

```prisma
deletedAt DateTime?
deletedBy String?   @db.Uuid  // FK to Users.id
```

No cascade delete changes — records stay in DB indefinitely.

---

## API Layer

### New utility: `lib/audit-log.ts`

```typescript
interface WriteAuditLogParams {
  entityType: "account" | "contact" | "lead" | "opportunity" | "contract"
  entityId: string
  action: "created" | "updated" | "deleted" | "restored" | "relation_added" | "relation_removed"
  changes?: Array<{ field: string; old: unknown; new: unknown }>
  userId: string
}

export async function writeAuditLog(params: WriteAuditLogParams): Promise<void>
```

- Called inside every mutating server action **after** the Prisma write succeeds
- Failures are caught and logged to console — they never throw or block the main operation
- `diffObjects(before: object, after: object)` helper computes field-level diff, skipping internal fields: `updatedAt`, `updatedBy`, `createdAt`, `createdBy`, `v`, `deletedAt`, `deletedBy`

### Server actions modified

**Soft delete changes** — the following actions stop calling `.delete()` and instead call `.update()` with `{ deletedAt: new Date(), deletedBy: userId }`:

- `actions/crm/accounts/delete-account.ts`
- `actions/crm/contacts/delete-contact.ts`
- `actions/crm/leads/delete-lead.ts` (if exists, otherwise create)
- `actions/crm/opportunities/delete-opportunity.ts` (if exists, otherwise create)
- `actions/crm/contracts/delete-contract/index.ts`

**Audit log calls added to:**

| Action file | Event |
|-------------|-------|
| `create-account.ts` | `created` |
| `update-account.ts` | `updated` (diff before/after) |
| `delete-account.ts` | `deleted` |
| `create-contact.ts` | `created` |
| `update-contact.ts` | `updated` |
| `delete-contact.ts` | `deleted` |
| `create-lead.ts` | `created` |
| `update-lead.ts` | `updated` |
| `delete-lead.ts` | `deleted` |
| `create-opportunity.ts` | `created` |
| `update-opportunity.ts` | `updated` |
| `delete-opportunity.ts` | `deleted` |
| `create-new-contract/index.ts` | `created` |
| `update-contract/index.ts` | `updated` |
| `delete-contract/index.ts` | `deleted` |
| Any link/unlink relation action | `relation_added` / `relation_removed` |

**New admin actions:**

- `actions/crm/accounts/restore-account.ts` — sets `deletedAt: null, deletedBy: null`, writes `restored` audit entry
- Same pattern for contacts, leads, opportunities, contracts

**All list/get queries updated:**

Every `getXxx()` action for the 5 entities adds `where: { deletedAt: null }` (or merges with existing where clause). Admin-facing queries (audit log page) omit this filter.

### New data fetch actions

- `actions/crm/audit-log/get-audit-log-by-entity.ts` — paginated, 25 per page, newest first
- `actions/crm/audit-log/get-audit-log-admin.ts` — paginated 50/page, filterable by entityType/action/userId/dateRange, includes soft-deleted records

---

## UI

### Record detail page — "History" tab

Added to all 5 entity detail pages alongside existing content sections.

**Tab structure** (each detail page):
```
[Basic Info]  [History]
```

**Timeline entry anatomy:**
```
● [Avatar] John Smith  updated  · 2 hours ago
  status:       Active → Inactive
  assigned_to:  Alice Johnson → Bob Williams
```

- User avatar + full name resolved from `userId`
- FK values (assigned_to, industry, type etc.) resolved to human-readable names
- Relative timestamps ("2 hours ago", "3 days ago") with absolute on hover
- `deleted` entries show a **[Restore]** button — admin only
- `created` entries show "Record created" with no field diff
- `relation_added`/`relation_removed` show "Contact linked" / "Document removed" etc.
- Pagination: 25 entries, "Load more" button
- Empty state: "No history yet"

**Component:** `components/crm/audit-log/Timeline.tsx`
**Entry sub-component:** `components/crm/audit-log/Entry.tsx`

### Admin Audit Log Page — `/admin/audit-log`

New page at `app/[locale]/(routes)/admin/audit-log/page.tsx`.

Linked from existing admin sidebar/nav.

**Filter bar:**
- Entity type (All / Account / Contact / Lead / Opportunity / Contract)
- Action (All / created / updated / deleted / restored / relation)
- User (dropdown of all users)
- Date range (from / to)

**Table columns:**

| Entity Type | Record Name | Action | User | Date |
|-------------|-------------|--------|------|------|
| Account | Acme Inc | updated | John Smith | 2h ago |
| Contact | Bob Lee | deleted | Sarah Jones | 3d ago |

- Clicking a row expands inline to show the full `changes` diff
- Soft-deleted records appear normally (no special styling needed — filter shows all)
- Restore action available inline on `deleted` rows (admin only)
- Server-side pagination, 50 rows per page

**Component:** `components/crm/audit-log/AdminTable.tsx`

---

## File Structure

```
lib/
  audit-log.ts                          # writeAuditLog() + diffObjects()

actions/crm/audit-log/
  get-audit-log-by-entity.ts
  get-audit-log-admin.ts

actions/crm/accounts/
  restore-account.ts                    # new

actions/crm/contacts/
  restore-contact.ts                    # new

actions/crm/leads/
  restore-lead.ts                       # new

actions/crm/opportunities/
  restore-opportunity.ts                # new

actions/crm/contracts/
  restore-contract/index.ts             # new

components/crm/audit-log/
  Timeline.tsx
  Entry.tsx
  AdminTable.tsx

app/[locale]/(routes)/admin/audit-log/
  page.tsx

app/[locale]/(routes)/crm/accounts/[accountId]/components/
  HistoryTab.tsx                        # wraps Timeline for accounts

app/[locale]/(routes)/crm/contacts/[contactId]/components/
  HistoryTab.tsx

app/[locale]/(routes)/crm/leads/[leadId]/components/
  HistoryTab.tsx

app/[locale]/(routes)/crm/opportunities/[opportunityId]/components/
  HistoryTab.tsx

app/[locale]/(routes)/crm/contracts/[contractId]/components/
  HistoryTab.tsx
```

---

## Migration Strategy

1. Add `crm_AuditLog` table and soft delete columns via Prisma migration
2. Update all 5 entity queries to filter `deletedAt: null`
3. Add `writeAuditLog` calls to all mutating actions
4. Convert hard deletes to soft deletes in all 5 delete actions
5. Add restore actions
6. Build `Timeline` component + wire into each detail page
7. Build `AdminTable` + admin page

No existing data migration needed — audit log starts from zero on deploy.

---

## Error Handling

- `writeAuditLog` wraps DB write in try/catch; on failure logs error but does not throw
- Soft-deleted records are invisible to all non-admin queries — no UI changes needed beyond filter
- If `userId` is missing (edge case), audit entry is skipped silently

---

## Success Criteria

- [ ] Every field change on any of the 5 CRM entities creates an audit log entry
- [ ] Record create/delete/restore events are logged
- [ ] Relation add/remove events are logged
- [ ] Deleted records do not appear in any list or detail page (except admin audit log)
- [ ] Admin can restore a soft-deleted record
- [ ] History tab renders correctly on all 5 entity detail pages
- [ ] Admin audit log page supports filtering by entity type, action, user, date range
- [ ] `writeAuditLog` failure never breaks a CRM mutation
