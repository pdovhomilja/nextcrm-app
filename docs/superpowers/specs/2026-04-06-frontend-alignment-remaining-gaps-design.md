# Frontend Alignment + Remaining Soft-Delete Gaps

> Add `deletedAt` to Documents and TargetLists, align all frontend server actions with `deletedAt`-based soft delete, and fix the 3 remaining MCP tool files.

## Part 1: Schema Changes (2 models)

### Documents

Add fields:
```prisma
deletedAt   DateTime?
deletedBy   String?   @db.Uuid

@@index([deletedAt])
```

Backfill:
```sql
UPDATE "Documents"
SET "deletedAt" = COALESCE("updatedAt", NOW())
WHERE "status" = 'DELETED'
  AND "deletedAt" IS NULL;
```

### crm_TargetLists

Add fields:
```prisma
deletedAt   DateTime?
deletedBy   String?   @db.Uuid

@@index([deletedAt])
```

Backfill:
```sql
UPDATE "crm_TargetLists"
SET "deletedAt" = COALESCE("updatedAt", NOW())
WHERE "status" = false
  AND "deletedAt" IS NULL;
```

## Part 2: Frontend Server Actions Alignment

### Targets (`actions/crm/targets/`)

| File | Change |
|------|--------|
| `get-targets.ts` | Add `where: { deletedAt: null }` |
| `delete-target.ts` | Replace `prismadb.crm_Targets.delete()` with `update({ data: { deletedAt, deletedBy } })` |
| `update-target.ts` | Add `deletedAt: null` to findFirst/update where |
| `convert-target.ts` | Add `deletedAt: null` to findUnique where |

### Activities (`actions/crm/activities/`)

| File | Change |
|------|--------|
| `get-activities-by-entity.ts` | Add `deletedAt: null` to where clause |
| `delete-activity.ts` | Replace hard delete with soft delete |
| `update-activity.ts` | Add `deletedAt: null` to findFirst where |

### Campaign Templates (`actions/campaigns/templates/`)

| File | Change |
|------|--------|
| `get-templates.ts` | Add `where: { deletedAt: null }` |
| `get-template.ts` | Add `deletedAt: null` to findUnique/findFirst |
| `update-template.ts` | Add `deletedAt: null` to findFirst where |
| `delete-template.ts` | Replace hard delete with soft delete |

### Boards (`actions/projects/`)

| File | Change |
|------|--------|
| `get-boards.ts` | Add `deletedAt: null` to where |
| `get-board.ts` | Add `deletedAt: null` to findFirst where |
| `delete-project.ts` | Replace hard delete with soft delete |

### Campaigns (`actions/crm/`)

| File | Change |
|------|--------|
| `get-crm-data.ts` (line ~31) | Add `where: { deletedAt: null }` to campaigns count/query |

### Target Lists (`actions/crm/target-lists/`)

| File | Change |
|------|--------|
| `get-target-lists.ts` | Add `where: { deletedAt: null }` |
| `delete-target-list.ts` | Replace hard delete with soft delete |
| `update-target-list.ts` | Add `deletedAt: null` to where |

## Part 3: MCP Tool Updates (3 files)

### `lib/mcp/tools/crm-opportunities.ts`

- Add `deletedAt: null` to all where clauses (list, get, search, update)
- Replace conflict-throwing delete handler with real `softDeleteData()` implementation

### `lib/mcp/tools/crm-documents.ts`

- Replace `status: { not: "DELETED" }` with `deletedAt: null` in list/get/delete handlers
- Replace `{ status: "DELETED" }` in delete handler with `softDeleteData(userId)`

### `lib/mcp/tools/crm-target-lists.ts`

- Replace `status: true` with `deletedAt: null` in list/get/update/delete handlers
- Replace `{ status: false }` in delete handler with `softDeleteData(userId)`

## What NOT to change

- `crm_Accounts`, `crm_Contacts`, `crm_Leads` frontend actions — already using `deletedAt: null`
- `Tasks` — uses `taskStatus: COMPLETE` semantic (not deletion)
- Documents `status` field itself — keep it for business use, just stop using it for soft-delete filtering
- TargetLists `status` field — keep it, but soft-delete uses `deletedAt` now
