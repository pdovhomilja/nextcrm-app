# Universal `deletedAt` Soft-Delete Migration

> Standardize soft-delete across all CRM models using `deletedAt DateTime?` + `deletedBy String?`, replacing status-based patterns and enabling 6 previously-stubbed MCP delete tools.

## Scope

8 Prisma models affected:
- **6 new** (gap models): `crm_Contacts`, `crm_Leads`, `crm_Targets`, `crm_Activities`, `crm_campaign_templates`, `Boards`
- **2 migrated** (from status-based): `crm_Accounts`, `crm_campaigns`

Models NOT touched (already working or different semantic):
- `crm_Products`, `crm_Contracts` — already use `deletedAt`
- `Tasks` — uses `taskStatus: COMPLETE` (completion, not deletion)
- `Documents` — uses `status: "DELETED"` (lower priority, can migrate later)
- `crm_TargetLists` — uses `status: Boolean` (can migrate later)

## Schema Changes

### New fields on all 8 models

```prisma
deletedAt DateTime?
deletedBy String?   @db.Uuid

@@index([deletedAt])
```

### Per-model details

| Model | New Fields | Existing Soft-Delete | Migration |
|-------|-----------|---------------------|-----------|
| `crm_Contacts` | `deletedAt`, `deletedBy` | None | N/A |
| `crm_Leads` | `deletedAt`, `deletedBy` | None | N/A |
| `crm_Targets` | `deletedAt`, `deletedBy` | None | N/A |
| `crm_Activities` | `deletedAt`, `deletedBy` | None | N/A |
| `crm_campaign_templates` | `deletedAt`, `deletedBy` | None | N/A |
| `Boards` | `deletedAt`, `deletedBy` | None | N/A |
| `crm_Accounts` | `deletedAt`, `deletedBy` | `status = "DELETED"` | Backfill `deletedAt = updatedAt` where `status = 'DELETED'` |
| `crm_campaigns` | `deletedAt`, `deletedBy` | `status = "deleted"` | Backfill `deletedAt = updatedAt` where `status = 'deleted'` |

### Data migration (SQL in Prisma migration)

```sql
-- Backfill Accounts
UPDATE "crm_Accounts"
SET "deletedAt" = COALESCE("updatedAt", NOW()),
    "deletedBy" = "updatedBy"
WHERE "status" = 'DELETED';

-- Backfill Campaigns
UPDATE "crm_campaigns"
SET "deletedAt" = COALESCE("updatedAt", NOW()),
    "deletedBy" = "created_by"
WHERE "status" = 'deleted';
```

After backfill, Accounts with `status = "DELETED"` keep their status value (it's still a valid string). The MCP tools and app code switch to filtering by `deletedAt` instead.

## Helper Changes (`lib/mcp/helpers.ts`)

```typescript
// Before
export function isNotDeleted() {
  return { status: { not: "DELETED" } };
}

// After
export function isNotDeleted() {
  return { deletedAt: null };
}

// Before
export function softDeleteUpdate(userId: string) {
  return { status: "DELETED", updatedBy: userId, updatedAt: new Date() };
}

// After
export function softDeleteData(userId: string) {
  return { deletedAt: new Date(), deletedBy: userId };
}
```

## MCP Tool Updates

### 6 gap models: enable delete tools

Replace `conflict("Soft delete not yet supported...")` with actual implementation:

```typescript
// Pattern for all 6:
async handler(args: { id: string }, userId: string) {
  const existing = await prismadb.MODEL.findFirst({
    where: { id: args.id, deletedAt: null, /* ownership check */ },
  });
  if (!existing) notFound("Entity");
  const result = await prismadb.MODEL.update({
    where: { id: args.id },
    data: softDeleteData(userId),
  });
  return itemResponse({ id: result.id, deletedAt: result.deletedAt });
}
```

### 6 gap models: add `deletedAt: null` filter

Add `deletedAt: null` to all `where` clauses in list/get/search/update handlers for:
- `crm-contacts.ts`
- `crm-leads.ts`
- `crm-targets.ts`
- `crm-activities.ts`
- `campaigns.ts` (templates only)
- `projects.ts` (boards only)

### 2 migrated models: switch from status to deletedAt

**`crm-accounts.ts`:**
- Replace `...isNotDeleted()` (already using helper) — helper change handles this automatically
- Delete handler: replace `status: "DELETED"` with `softDeleteData(userId)`
- Create handler: keep `status: "Active"` (business meaning, unrelated to deletion)

**`campaigns.ts`:**
- Replace `status: { not: "deleted" }` with `deletedAt: null` in list/get/update/delete/send/pause/resume handlers
- Delete handler: replace `status: "deleted"` with `softDeleteData(userId)`
- Keep campaign status for business states (draft/scheduled/sending/sent/paused)

## What NOT to change

- Products/Contracts tool files — already use `deletedAt: null` pattern
- `isNotDeleted()` callers on Accounts/Opportunities — helper change propagates automatically
- Opportunities — no `deletedAt` field, delete still throws conflict (enum migration separate concern)
- Frontend code — not in scope; frontend can adopt `deletedAt` filtering incrementally

## Testing

After migration:
1. `pnpm exec prisma migrate dev` succeeds
2. `pnpm exec tsc --noEmit` passes
3. Verify backfill: `SELECT count(*) FROM "crm_Accounts" WHERE "status" = 'DELETED' AND "deletedAt" IS NOT NULL` returns same count as pre-migration deleted accounts
