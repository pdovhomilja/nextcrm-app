# CRM Audit Log & Soft Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a complete field-level audit trail and soft delete to all 5 CRM entities (Accounts, Contacts, Leads, Opportunities, Contracts), with a per-record history timeline tab and a global admin audit log page.

**Architecture:** A single `crm_AuditLog` table stores every mutation event with a JSON diff. Soft delete adds `deletedAt`/`deletedBy` to each entity model. A shared `writeAuditLog()` utility is called after every successful Prisma mutation. UI is a new "History" tab on each detail page plus an admin page at `/admin/audit-log`.

**Tech Stack:** Next.js 15 App Router, TypeScript, Prisma ORM + PostgreSQL, next-auth (`getServerSession`), shadcn/ui (Table, Tabs, Avatar, Badge), `prismadb` from `@/lib/prisma`, `authOptions` from `@/lib/auth`

**Spec:** `docs/superpowers/specs/2026-03-27-crm-audit-log-design.md`

---

## File Map

### New files
| File | Purpose |
|------|---------|
| `lib/audit-log.ts` | `writeAuditLog()` + `diffObjects()` utility |
| `actions/crm/audit-log/get-audit-log-by-entity.ts` | Fetch paginated log for one record |
| `actions/crm/audit-log/get-audit-log-admin.ts` | Fetch filterable global log |
| `actions/crm/accounts/restore-account.ts` | Admin: un-soft-delete an account |
| `actions/crm/contacts/restore-contact.ts` | Admin: un-soft-delete a contact |
| `actions/crm/leads/restore-lead.ts` | Admin: un-soft-delete a lead |
| `actions/crm/opportunities/restore-opportunity.ts` | Admin: un-soft-delete an opportunity |
| `actions/crm/contracts/restore-contract/index.ts` | Admin: un-soft-delete a contract |
| `components/crm/audit-log/Entry.tsx` | Single timeline event row |
| `components/crm/audit-log/Timeline.tsx` | Paginated timeline of events for a record |
| `components/crm/audit-log/AdminTable.tsx` | Filterable global audit table |
| `app/[locale]/(routes)/admin/audit-log/page.tsx` | Admin audit log page |
| `app/[locale]/(routes)/crm/accounts/[accountId]/components/HistoryTab.tsx` | History tab for accounts |
| `app/[locale]/(routes)/crm/contacts/[contactId]/components/HistoryTab.tsx` | History tab for contacts |
| `app/[locale]/(routes)/crm/leads/[leadId]/components/HistoryTab.tsx` | History tab for leads |
| `app/[locale]/(routes)/crm/opportunities/[opportunityId]/components/HistoryTab.tsx` | History tab for opportunities |
| `app/[locale]/(routes)/crm/contracts/[contractId]/components/HistoryTab.tsx` | History tab for contracts |

### Modified files
| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `crm_AuditLog` model; add `deletedAt`/`deletedBy` to 5 entities; add `@db.Uuid` to `Users.id` |
| `actions/crm/accounts/delete-account.ts` | Hard → soft delete + audit |
| `actions/crm/accounts/create-account.ts` | Add audit `created` call |
| `actions/crm/accounts/update-account.ts` | Fetch before, add audit `updated` diff |
| `actions/crm/accounts/get-accounts.ts` | Add `deletedAt: null` filter |
| `actions/crm/get-account.ts` | Add `deletedAt: null` filter |
| `actions/crm/get-accounts.ts` | Add `deletedAt: null` filter |
| `actions/crm/contacts/delete-contact.ts` | Hard → soft delete + audit |
| `actions/crm/contacts/create-contact.ts` | Add audit `created` call |
| `actions/crm/contacts/update-contact.ts` | Fetch before, add audit `updated` diff |
| `actions/crm/get-contact.ts` | Add `deletedAt: null` filter |
| `actions/crm/get-contacts.ts` | Add `deletedAt: null` filter |
| `actions/crm/leads/delete-lead.ts` | Hard → soft delete + audit |
| `actions/crm/leads/create-lead.ts` | Add audit `created` call |
| `actions/crm/leads/update-lead.ts` | Fetch before, add audit `updated` diff |
| `actions/crm/get-lead.ts` | Add `deletedAt: null` filter (if exists) |
| `actions/crm/get-leads.ts` | Add `deletedAt: null` filter (if exists) |
| `actions/crm/opportunities/delete-opportunity.ts` | Hard → soft delete + audit |
| `actions/crm/opportunities/create-opportunity.ts` | Add audit `created` call |
| `actions/crm/opportunities/update-opportunity.ts` | Fetch before, add audit `updated` diff |
| `actions/crm/get-opportunity.ts` | Add `deletedAt: null` filter (if exists) |
| `actions/crm/get-opportunities.ts` | Add `deletedAt: null` filter (if exists) |
| `actions/crm/contracts/delete-contract/index.ts` | Hard → soft delete + audit |
| `actions/crm/contracts/create-new-contract/index.ts` | Add audit `created` call |
| `actions/crm/contracts/update-contract/index.ts` | Fetch before, add audit `updated` diff |
| `actions/crm/get-contracts.ts` | Add `deletedAt: null` filter |
| `app/[locale]/(routes)/crm/accounts/[accountId]/page.tsx` | Add History tab |
| `app/[locale]/(routes)/crm/contacts/[contactId]/page.tsx` | Add History tab |
| `app/[locale]/(routes)/crm/leads/[leadId]/page.tsx` | Add History tab |
| `app/[locale]/(routes)/crm/opportunities/[opportunityId]/page.tsx` | Add History tab |
| `app/[locale]/(routes)/crm/contracts/[contractId]/page.tsx` | Add History tab |

---

## Task 1: Database Schema Migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add `crm_AuditLog` model**

Add this model to `prisma/schema.prisma` (place after the Users model):

```prisma
model crm_AuditLog {
  id         String    @id @default(uuid()) @db.Uuid
  entityType String
  entityId   String    @db.Uuid
  action     String
  changes    Json?     @db.JsonB
  userId     String?   @db.Uuid
  createdAt  DateTime  @default(now())

  user Users? @relation(fields: [userId], references: [id])

  @@index([entityType, entityId])
  @@index([entityType, entityId, createdAt])
  @@index([userId])
  @@index([createdAt])
  @@index([entityType, createdAt])
}
```

Also add the reverse relation to `Users` model:
```prisma
auditLogs crm_AuditLog[]
```

- [ ] **Step 2: Add soft delete columns to all 5 CRM entities**

Add these two fields to `crm_Accounts`, `crm_Contacts`, `crm_Leads`, `crm_Opportunities`, `crm_Contracts`:

```prisma
deletedAt DateTime?
deletedBy String?   @db.Uuid
```

Also add indexes to each:
```prisma
@@index([deletedAt])
```

- [ ] **Step 3: Run migration**

```bash
cd /Users/pdovhomilja/development/Next.js/nextcrm-app
npx prisma migrate dev --name add_audit_log_and_soft_delete
```

Expected: Migration runs cleanly, generates Prisma client with new models.

- [ ] **Step 4: Verify Prisma client generated**

```bash
npx prisma generate
```

Expected: `prismadb.crm_AuditLog` is now available.

- [ ] **Step 5: Commit**

```bash
git add prisma/
git commit -m "feat: add crm_AuditLog model and soft delete columns"
```

---

## Task 2: `writeAuditLog` Utility + Unit Tests

**Files:**
- Create: `lib/audit-log.ts`

- [ ] **Step 1: Write `diffObjects` unit test**

Create a temporary test file to verify the diff logic before implementing. Since there's no Jest config, create `lib/__tests__/audit-log.test.ts`:

```typescript
// lib/__tests__/audit-log.test.ts
import { diffObjects } from "../audit-log";

describe("diffObjects", () => {
  it("returns only changed fields", () => {
    const before = { name: "Acme", status: "Active", updatedAt: new Date() };
    const after  = { name: "Acme Corp", status: "Active", updatedAt: new Date() };
    const diff = diffObjects(before, after);
    expect(diff).toHaveLength(1);
    expect(diff[0]).toEqual({ field: "name", old: "Acme", new: "Acme Corp" });
  });

  it("ignores internal fields", () => {
    const before = { name: "X", updatedAt: new Date("2020-01-01"), createdAt: new Date(), v: 0 };
    const after  = { name: "X", updatedAt: new Date("2025-01-01"), createdAt: new Date(), v: 1 };
    const diff = diffObjects(before, after);
    expect(diff).toHaveLength(0);
  });

  it("returns empty array when nothing changed", () => {
    const obj = { name: "Acme", status: "Active" };
    expect(diffObjects(obj, obj)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Add Jest config if missing**

Check if `jest.config.ts` exists. If not, create it:

```typescript
// jest.config.ts
import type { Config } from "jest";
const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" },
  // isolatedModules avoids pulling in Next.js-specific types (jsx:preserve etc.)
  // which would cause ts-jest to fail on first run
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { isolatedModules: true }],
  },
  testPathPattern: "lib/__tests__",
};
export default config;
```

Install if needed:
```bash
pnpm add -D jest ts-jest @types/jest
```

- [ ] **Step 3: Run test to confirm it fails**

```bash
cd /Users/pdovhomilja/development/Next.js/nextcrm-app
pnpm test lib/__tests__/audit-log.test.ts
```

Expected: FAIL — `diffObjects` not found.

- [ ] **Step 4: Implement `lib/audit-log.ts`**

```typescript
// lib/audit-log.ts
import { prismadb } from "@/lib/prisma";

export type AuditEntityType =
  | "account"
  | "contact"
  | "lead"
  | "opportunity"
  | "contract";

export type AuditAction =
  | "created"
  | "updated"
  | "deleted"
  | "restored"
  | "relation_added"
  | "relation_removed";

export interface AuditChange {
  field: string;
  old: unknown;
  new: unknown;
}

const INTERNAL_FIELDS = new Set([
  "updatedAt", "updatedBy", "createdAt", "createdBy",
  "created_on", "cratedAt", "v", "deletedAt", "deletedBy",
]);

export function diffObjects(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): AuditChange[] {
  const changes: AuditChange[] = [];
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    if (INTERNAL_FIELDS.has(key)) continue;
    const oldVal = before[key];
    const newVal = after[key];
    // Simple equality — JSON stringify handles objects/arrays
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({ field: key, old: oldVal ?? null, new: newVal ?? null });
    }
  }
  return changes;
}

interface WriteAuditLogParams {
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  changes?: AuditChange[] | null;
  userId: string | null;
}

export async function writeAuditLog(params: WriteAuditLogParams): Promise<void> {
  try {
    await prismadb.crm_AuditLog.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        changes: params.changes ?? undefined,
        userId: params.userId ?? undefined,
      },
    });
  } catch (err) {
    console.error("[AUDIT_LOG_WRITE_FAILED]", err);
    // Never rethrow — audit failures must not block CRM mutations
  }
}
```

- [ ] **Step 5: Run tests — confirm pass**

```bash
pnpm test lib/__tests__/audit-log.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/audit-log.ts lib/__tests__/audit-log.test.ts jest.config.ts
git commit -m "feat: add writeAuditLog utility and diffObjects with unit tests"
```

---

## Task 3: Soft Delete + Audit — Accounts

**Files:**
- Modify: `actions/crm/accounts/delete-account.ts`
- Modify: `actions/crm/accounts/create-account.ts`
- Modify: `actions/crm/accounts/update-account.ts`
- Create: `actions/crm/accounts/restore-account.ts`

- [ ] **Step 1: Convert `delete-account.ts` to soft delete**

Replace the `.delete()` call with `.update()`:

```typescript
// actions/crm/accounts/delete-account.ts
"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit-log";

export const deleteAccount = async (accountId: string) => {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };
  if (!accountId) return { error: "accountId is required" };

  try {
    await prismadb.crm_Accounts.update({
      where: { id: accountId },
      data: { deletedAt: new Date(), deletedBy: session.user.id },
    });
    await writeAuditLog({
      entityType: "account",
      entityId: accountId,
      action: "deleted",
      changes: null,
      userId: session.user.id,
    });
    revalidatePath("/[locale]/(routes)/crm/accounts", "page");
    return { success: true };
  } catch (error) {
    console.log("[DELETE_ACCOUNT]", error);
    return { error: "Failed to delete account" };
  }
};
```

- [ ] **Step 2: Add audit log to `create-account.ts`**

After the `prismadb.crm_Accounts.create()` call succeeds, add:

```typescript
import { writeAuditLog } from "@/lib/audit-log";

// inside try, after account is created:
await writeAuditLog({
  entityType: "account",
  entityId: account.id,
  action: "created",
  changes: null,
  userId: session.user.id,
});
```

- [ ] **Step 3: Add before/after diff to `update-account.ts`**

Fetch the record before updating, then diff after:

```typescript
import { writeAuditLog, diffObjects } from "@/lib/audit-log";

// inside the function, before the update:
const before = await prismadb.crm_Accounts.findUnique({ where: { id } });

// after the update:
const changes = before ? diffObjects(
  before as Record<string, unknown>,
  account as Record<string, unknown>
) : null;
await writeAuditLog({
  entityType: "account",
  entityId: account.id,
  action: "updated",
  changes,
  userId: session.user.id,
});
```

- [ ] **Step 4: Create `restore-account.ts`**

```typescript
// actions/crm/accounts/restore-account.ts
"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit-log";

export const restoreAccount = async (accountId: string) => {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };
  if (!session.user.isAdmin) return { error: "Forbidden" };
  if (!accountId) return { error: "accountId is required" };

  try {
    await prismadb.crm_Accounts.update({
      where: { id: accountId },
      data: { deletedAt: null, deletedBy: null },
    });
    await writeAuditLog({
      entityType: "account",
      entityId: accountId,
      action: "restored",
      changes: null,
      userId: session.user.id,
    });
    revalidatePath("/[locale]/(routes)/crm/accounts", "page");
    revalidatePath("/[locale]/(routes)/admin/audit-log", "page");
    return { success: true };
  } catch (error) {
    console.log("[RESTORE_ACCOUNT]", error);
    return { error: "Failed to restore account" };
  }
};
```

- [ ] **Step 5: Commit**

```bash
git add actions/crm/accounts/
git commit -m "feat: soft delete + audit log for accounts"
```

---

## Task 4: Soft Delete + Audit — Contacts, Leads, Opportunities, Contracts

**Files:**
- Modify: all delete/create/update actions for the 4 remaining entities
- Create: restore action for each entity

- [ ] **Step 1: Apply same pattern as Task 3 to `delete-contact.ts`**

```typescript
// actions/crm/contacts/delete-contact.ts
"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit-log";

export const deleteContact = async (contactId: string) => {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };
  if (!contactId) return { error: "contactId is required" };

  try {
    await prismadb.crm_Contacts.update({
      where: { id: contactId },
      data: { deletedAt: new Date(), deletedBy: session.user.id },
    });
    await writeAuditLog({
      entityType: "contact", entityId: contactId,
      action: "deleted", changes: null, userId: session.user.id,
    });
    revalidatePath("/[locale]/(routes)/crm/contacts", "page");
    return { success: true };
  } catch (error) {
    console.log("[DELETE_CONTACT]", error);
    return { error: "Failed to delete contact" };
  }
};
```

- [ ] **Step 2: Apply same soft delete + audit pattern to `delete-lead.ts`**

Same as above, using `prismadb.crm_Leads`, entityType `"lead"`, revalidate `/crm/leads`.

- [ ] **Step 3: Apply same pattern to `delete-opportunity.ts`**

Using `prismadb.crm_Opportunities`, entityType `"opportunity"`, revalidate `/crm/opportunities`.

- [ ] **Step 4: Apply same pattern to `delete-contract/index.ts`**

The contract delete uses `createSafeAction` pattern. After the existing `prismadb.crm_Contracts.delete()` call, replace it with `.update({ data: { deletedAt: new Date(), deletedBy: user.id } })` and add `writeAuditLog(...)` after.

- [ ] **Step 5: Add `writeAuditLog("created")` to create-contact.ts, create-lead.ts, create-opportunity.ts, create-new-contract/index.ts**

Follow the same pattern as `create-account.ts` in Task 3. Each one: call `writeAuditLog` with `action: "created"` after the Prisma create succeeds.

- [ ] **Step 6: Add before/after diff to update-contact.ts, update-lead.ts, update-opportunity.ts, update-contract/index.ts**

Follow the same pattern as `update-account.ts` in Task 3. Fetch `before`, compute `diffObjects`, call `writeAuditLog` with `action: "updated"`.

- [ ] **Step 7: Create restore actions for all 4 entities**

Create these files using the same pattern as `restore-account.ts` in Task 3:
- `actions/crm/contacts/restore-contact.ts` — `prismadb.crm_Contacts`, entityType `"contact"`, revalidate `/crm/contacts`
- `actions/crm/leads/restore-lead.ts` — `prismadb.crm_Leads`, entityType `"lead"`, revalidate `/crm/leads`
- `actions/crm/opportunities/restore-opportunity.ts` — `prismadb.crm_Opportunities`, entityType `"opportunity"`, revalidate `/crm/opportunities`
- `actions/crm/contracts/restore-contract/index.ts` — `prismadb.crm_Contracts`, entityType `"contract"`, revalidate `/crm/contracts`

All restore actions must include: `if (!session.user.isAdmin) return { error: "Forbidden" };`

- [ ] **Step 8: Commit**

```bash
git add actions/crm/contacts/ actions/crm/leads/ actions/crm/opportunities/ actions/crm/contracts/
git commit -m "feat: soft delete + audit log for contacts, leads, opportunities, contracts"
```

---

## Task 5: Add `deletedAt: null` Filter to All Get/List Queries

**Files:**
- Modify: all list and single-record fetch actions for 5 entities

- [ ] **Step 1: Update `actions/crm/get-account.ts`**

Find the `prismadb.crm_Accounts.findUnique()` or `findFirst()` call and add the filter:
```typescript
where: { id: accountId, deletedAt: null }
```

- [ ] **Step 2: Update `actions/crm/get-accounts.ts` and `actions/crm/accounts/get-accounts.ts`**

Find the `findMany()` call, merge `deletedAt: null` into the existing `where` clause.

- [ ] **Step 3: Update contact get actions**

Apply `deletedAt: null` to `get-contact.ts` and `get-contacts.ts` (both flat-namespace and any nested contact fetch).

- [ ] **Step 4: Update lead get actions**

Apply `deletedAt: null` to `get-lead.ts` and any `get-leads.ts` / `get-leads-by-accountId.ts`.

- [ ] **Step 5: Update opportunity get actions**

Apply `deletedAt: null` to `get-opportunity.ts`, `get-opportunities.ts`, and all `get-opportunities-*` variants.

- [ ] **Step 6: Update contract get actions**

Apply `deletedAt: null` to `get-contracts.ts` and any related contract fetch actions.

- [ ] **Step 7: Verify soft delete works end-to-end**

Start dev server:
```bash
pnpm dev
```

1. Create a test account in the UI
2. Delete it — confirm it disappears from the list
3. Check the DB directly to confirm `deletedAt` is set and the row still exists:
```bash
cd /Users/pdovhomilja/development/Next.js/nextcrm-app
npx prisma studio
```
Find the account in `crm_Accounts` — it should have `deletedAt` populated.

- [ ] **Step 8: Commit**

```bash
git add actions/crm/
git commit -m "feat: add deletedAt filter to all CRM entity get/list queries"
```

---

## Task 6: Audit Log Fetch Actions

**Files:**
- Create: `actions/crm/audit-log/get-audit-log-by-entity.ts`
- Create: `actions/crm/audit-log/get-audit-log-admin.ts`

- [ ] **Step 1: Create `get-audit-log-by-entity.ts`**

```typescript
// actions/crm/audit-log/get-audit-log-by-entity.ts
"use server";
import { prismadb } from "@/lib/prisma";

export const getAuditLogByEntity = async (
  entityType: string,
  entityId: string,
  cursor?: string
) => {
  const take = 25;

  const entries = await prismadb.crm_AuditLog.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: {
      user: { select: { id: true, name: true, avatar: true } },
    },
  });

  const hasMore = entries.length > take;
  const data = hasMore ? entries.slice(0, take) : entries;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return { data, nextCursor };
};
```

- [ ] **Step 2: Create `get-audit-log-admin.ts`**

```typescript
// actions/crm/audit-log/get-audit-log-admin.ts
"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";

interface AuditLogAdminFilters {
  entityType?: string;
  action?: string;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
}

export const getAuditLogAdmin = async (filters: AuditLogAdminFilters = {}) => {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };
  if (!session.user.isAdmin) return { error: "Forbidden" };

  const { entityType, action, userId, dateFrom, dateTo, page = 1 } = filters;
  const take = 50;
  const skip = (page - 1) * take;

  const where: Record<string, unknown> = {};
  if (entityType) where.entityType = entityType;
  if (action) where.action = action;
  if (userId) where.userId = userId;
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {}),
    };
  }

  const [entries, total] = await Promise.all([
    prismadb.crm_AuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    }),
    prismadb.crm_AuditLog.count({ where }),
  ]);

  return { data: entries, total, page, totalPages: Math.ceil(total / take) };
};
```

- [ ] **Step 3: Verify actions work**

In Prisma Studio, manually insert a test audit log entry. Then call `getAuditLogByEntity("account", "<test-uuid>")` in a server component to verify it returns data.

- [ ] **Step 4: Commit**

```bash
git add actions/crm/audit-log/
git commit -m "feat: add audit log fetch actions (by entity + admin global)"
```

---

## Task 7: Timeline UI Components

**Files:**
- Create: `components/crm/audit-log/Entry.tsx`
- Create: `components/crm/audit-log/Timeline.tsx`

- [ ] **Step 1: Create `Entry.tsx`**

```typescript
// components/crm/audit-log/Entry.tsx
"use client";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const ACTION_LABELS: Record<string, string> = {
  created: "created",
  updated: "updated",
  deleted: "deleted",
  restored: "restored",
  relation_added: "linked",
  relation_removed: "unlinked",
};

const ACTION_VARIANTS: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
  created: "default",
  updated: "secondary",
  deleted: "destructive",
  restored: "default",
  relation_added: "outline",
  relation_removed: "outline",
};

interface AuditChange {
  field: string;
  old: unknown;
  new: unknown;
}

interface EntryProps {
  entry: {
    id: string;
    action: string;
    changes: AuditChange[] | null;
    createdAt: Date;
    user: { name: string | null; avatar: string | null } | null;
  };
  showRestore?: boolean;
  onRestore?: () => void;
}

export function AuditEntry({ entry, showRestore, onRestore }: EntryProps) {
  const userName = entry.user?.name ?? "System";
  const initials = userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="flex gap-3 py-3 border-b last:border-0">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={entry.user?.avatar ?? undefined} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{userName}</span>
          <Badge variant={ACTION_VARIANTS[entry.action] ?? "secondary"}>
            {ACTION_LABELS[entry.action] ?? entry.action}
          </Badge>
          <span className="text-xs text-muted-foreground ml-auto">
            {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
          </span>
        </div>
        {entry.changes && entry.changes.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {entry.changes.map((c, i) => (
              <div key={i} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{c.field}:</span>{" "}
                <span className="line-through opacity-60">{String(c.old ?? "—")}</span>
                {" → "}
                <span>{String(c.new ?? "—")}</span>
              </div>
            ))}
          </div>
        )}
        {showRestore && entry.action === "deleted" && onRestore && (
          <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={onRestore}>
            Restore
          </Button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `Timeline.tsx`**

> **IMPORTANT:** `getAuditLogByEntity` is marked `"use server"` — do NOT remove that directive. Next.js App Router requires it for server actions called from client components.

```typescript
// components/crm/audit-log/Timeline.tsx
"use client";
import { useState, useTransition } from "react";
import { AuditEntry } from "./Entry";
import { getAuditLogByEntity } from "@/actions/crm/audit-log/get-audit-log-by-entity";
import { Button } from "@/components/ui/button";

interface TimelineProps {
  entityType: string;
  entityId: string;
  initialData: Awaited<ReturnType<typeof getAuditLogByEntity>>;
  isAdmin?: boolean;
  onRestore?: (entryId: string) => void;
}

export function AuditTimeline({ entityType, entityId, initialData, isAdmin, onRestore }: TimelineProps) {
  const [entries, setEntries] = useState(initialData.data);
  const [cursor, setCursor] = useState(initialData.nextCursor);
  const [isPending, startTransition] = useTransition();

  const loadMore = () => {
    startTransition(async () => {
      const result = await getAuditLogByEntity(entityType, entityId, cursor ?? undefined);
      setEntries((prev) => [...prev, ...result.data]);
      setCursor(result.nextCursor);
    });
  };

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No history yet.</p>;
  }

  return (
    <div>
      <div className="divide-y">
        {entries.map((entry) => (
          <AuditEntry
            key={entry.id}
            entry={entry as any}
            showRestore={isAdmin}
            onRestore={onRestore ? () => onRestore(entry.id) : undefined}
          />
        ))}
      </div>
      {cursor && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full"
          onClick={loadMore}
          disabled={isPending}
        >
          {isPending ? "Loading..." : "Load more"}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Install `date-fns` if not present**

```bash
grep "date-fns" /Users/pdovhomilja/development/Next.js/nextcrm-app/package.json || pnpm add date-fns
```

- [ ] **Step 4: Commit**

```bash
git add components/crm/audit-log/
git commit -m "feat: add AuditEntry and AuditTimeline components"
```

---

## Task 8: Wire History Tab into Each Detail Page

**Files:**
- Create: 5 `HistoryTab.tsx` files
- Modify: 5 detail page `page.tsx` files

- [ ] **Step 1: Create `HistoryTab.tsx` for accounts**

```typescript
// app/[locale]/(routes)/crm/accounts/[accountId]/components/HistoryTab.tsx
import { getAuditLogByEntity } from "@/actions/crm/audit-log/get-audit-log-by-entity";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AuditTimeline } from "@/components/crm/audit-log/Timeline";

export async function HistoryTab({ accountId }: { accountId: string }) {
  const [initialData, session] = await Promise.all([
    getAuditLogByEntity("account", accountId),
    getServerSession(authOptions),
  ]);

  return (
    <AuditTimeline
      entityType="account"
      entityId={accountId}
      initialData={initialData}
      isAdmin={session?.user?.isAdmin ?? false}
    />
  );
}
```

Create equivalent files for contacts (`contactId`), leads (`leadId`), opportunities (`opportunityId`), contracts (`contractId`) — same pattern, change the entityType string and prop name.

- [ ] **Step 2: Update Account detail page to use Tabs**

In `app/[locale]/(routes)/crm/accounts/[accountId]/page.tsx`, wrap the existing content in a `Tabs` component:

```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HistoryTab } from "./components/HistoryTab";

// Replace the existing <div className="space-y-5"> with:
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="history">History</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">
    <div className="space-y-5">
      <BasicView data={account} />
      {/* ... all existing sections unchanged ... */}
    </div>
  </TabsContent>
  <TabsContent value="history">
    <HistoryTab accountId={accountId} />
  </TabsContent>
</Tabs>
```

- [ ] **Step 3: Apply same Tabs pattern to Contact, Lead, Opportunity, Contract detail pages**

Same structure as Step 2. Move existing `<div className="space-y-5">` content into the "Overview" tab. Add "History" tab that renders the entity-specific `HistoryTab`.

- [ ] **Step 4: Verify UI in browser**

Start dev server, navigate to an Account detail page. Confirm:
- Two tabs render: "Overview" and "History"
- Overview tab shows existing content unchanged
- History tab shows audit entries (or "No history yet" if none recorded)

- [ ] **Step 5: Commit**

```bash
git add app/
git commit -m "feat: add History tab to all CRM entity detail pages"
```

---

## Task 9: Admin Audit Log Page

**Files:**
- Create: `components/crm/audit-log/AdminTable.tsx`
- Create: `app/[locale]/(routes)/admin/audit-log/page.tsx`

- [ ] **Step 1: Create `AdminTable.tsx`**

```typescript
// components/crm/audit-log/AdminTable.tsx
"use client";
import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

interface AuditEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changes: unknown;
  createdAt: Date;
  user: { name: string | null } | null;
}

interface AdminTableProps {
  entries: AuditEntry[];
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onRestore?: (entityType: string, entityId: string) => void;
  isAdmin?: boolean;
}

export function AuditAdminTable({
  entries, total, page, totalPages, onPageChange, onRestore, isAdmin
}: AdminTableProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{total} total entries</p>
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2 text-left font-medium">Entity</th>
              <th className="px-4 py-2 text-left font-medium">Action</th>
              <th className="px-4 py-2 text-left font-medium">User</th>
              <th className="px-4 py-2 text-left font-medium">Date</th>
              {isAdmin && <th className="px-4 py-2 text-left font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              // key must be on React.Fragment, not on the inner <tr>
              <React.Fragment key={entry.id}>
                <tr
                  className="border-b cursor-pointer hover:bg-muted/30"
                  onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                >
                  <td className="px-4 py-2 capitalize">{entry.entityType}</td>
                  <td className="px-4 py-2">
                    <Badge variant={entry.action === "deleted" ? "destructive" : "secondary"}>
                      {entry.action}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">{entry.user?.name ?? "System"}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-2">
                      {/* Restore button on admin page is deferred — requires client wrapper */}
                      {entry.action === "deleted" && onRestore && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={(e) => { e.stopPropagation(); onRestore(entry.entityType, entry.entityId); }}
                        >
                          Restore
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
                {expanded === entry.id && entry.changes && (
                  <tr className="bg-muted/20">
                    <td colSpan={isAdmin ? 5 : 4} className="px-4 py-2">
                      <pre className="text-xs overflow-auto">
                        {JSON.stringify(entry.changes, null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm" variant="outline"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >Previous</Button>
        <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
        <Button
          size="sm" variant="outline"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >Next</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create admin audit log page**

```typescript
// app/[locale]/(routes)/admin/audit-log/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAuditLogAdmin } from "@/actions/crm/audit-log/get-audit-log-admin";
import Container from "@/app/[locale]/(routes)/components/ui/Container";
import { AuditAdminTable } from "@/components/crm/audit-log/AdminTable";

const AuditLogPage = async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) redirect("/");

  const result = await getAuditLogAdmin({ page: 1 });
  if ("error" in result) return <div>Access denied</div>;

  return (
    <Container
      title="Audit Log"
      description="Complete history of all CRM changes"
    >
      <AuditAdminTable
        entries={result.data as any}
        total={result.total}
        page={result.page}
        totalPages={result.totalPages}
        onPageChange={() => {}}
        isAdmin
      />
    </Container>
  );
};

export default AuditLogPage;
```

> **Deferred (follow-up):** Two features are scoped out of this initial implementation:
> 1. **Restore from admin page** — requires a client wrapper component. The `AuditAdminTable` `onRestore` prop is wired in the component but not connected on the server page. Restore still works from the per-record History tab.
> 2. **Record Name column** — the `crm_AuditLog` schema stores only `entityId`, not a denormalized display name. Resolving names requires joins to 5 different entity tables. This column is omitted from the initial admin table. Add it in a follow-up by fetching the record name alongside the audit entry.
> 3. **Filtering + pagination** — admin page renders page 1 only. Add URL search param handling in a follow-up.

- [ ] **Step 3: Add audit log link to admin nav**

Find the admin sidebar/navigation component (search for `admin` links in `components/`). Add:
```tsx
<Link href="/admin/audit-log">Audit Log</Link>
```

- [ ] **Step 4: Verify admin page in browser**

Navigate to `/admin/audit-log`. Confirm the table renders with audit entries. Confirm non-admin users are redirected.

- [ ] **Step 5: Commit**

```bash
git add components/crm/audit-log/AdminTable.tsx app/
git commit -m "feat: add admin audit log page with global filterable table"
```

---

## Task 10: Final Verification

- [ ] **Step 1: Run TypeScript compiler check**

```bash
cd /Users/pdovhomilja/development/Next.js/nextcrm-app
pnpm build
```

Expected: Build completes without TypeScript errors. Fix any type errors before proceeding.

- [ ] **Step 2: End-to-end smoke test**

1. Create a new Account — check History tab shows "created" entry
2. Update the account name — check History tab shows "updated" with old → new diff
3. Delete the account — confirm it disappears from list
4. Go to `/admin/audit-log` — confirm deleted entry appears with "Restore" button
5. Click Restore — confirm account reappears in the accounts list
6. Check History tab on restored account — confirm "restored" entry appears

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete CRM audit log & soft delete implementation"
```

---

## Summary

| Task | Output |
|------|--------|
| 1 | DB schema with `crm_AuditLog` + soft delete columns |
| 2 | `writeAuditLog()` utility + `diffObjects()` with unit tests |
| 3 | Accounts: soft delete + audit on all mutations + restore action |
| 4 | Contacts/Leads/Opportunities/Contracts: same pattern |
| 5 | All get/list queries filter soft-deleted records |
| 6 | Fetch actions for timeline + admin table |
| 7 | `AuditEntry` + `AuditTimeline` components |
| 8 | History tab wired into all 5 entity detail pages |
| 9 | Admin audit log page |
| 10 | Build verification + smoke test |
