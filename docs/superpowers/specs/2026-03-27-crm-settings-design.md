# CRM Settings Admin Feature — Design Spec

**Date:** 2026-03-27
**Status:** Approved

---

## Overview

Add a CRM Settings section to the admin area (`/admin/crm-settings`) where admins can manage default configuration values used across CRM modules. This includes converting four plain `String?` fields (and cleaning up orphaned Prisma enums) into DB-backed FK relations, and providing a full CRUD UI for all seven config types.

---

## Config Types in Scope

| Config Type | Module | Current State | New State |
|---|---|---|---|
| Industries | Companies/Accounts | DB table (`crm_Industry_Type`) | No schema change |
| Contact Types | Contacts | `type String? @default("Customer")` | New DB table + FK |
| Lead Sources | Leads | `lead_source String?` | New DB table + FK |
| Lead Statuses | Leads | `status String? @default("NEW")` | New DB table + FK |
| Lead Types | Leads | `type String? @default("DEMO")` | New DB table + FK |
| Opportunity Types | Opportunities | DB table (`crm_Opportunities_Type`) | No schema change |
| Sales Stages | Opportunities | DB table (`crm_Opportunities_Sales_Stages`) | No schema change |

> **Note:** The enums `crm_Contact_Type`, `crm_Lead_Status`, and `crm_Lead_Type` exist in the schema file but are orphaned — no model field references them. They will be removed as cleanup in the migration.

---

## Schema Changes

### New Prisma Models

```prisma
model crm_Contact_Types {
  id       String         @id @default(uuid()) @db.Uuid
  v        Int            @default(0) @map("__v")
  name     String         @unique
  contacts crm_Contacts[]

  @@index([name])
}

model crm_Lead_Sources {
  id    String      @id @default(uuid()) @db.Uuid
  v     Int         @default(0) @map("__v")
  name  String      @unique
  leads crm_Leads[] @relation("lead_source_relation")

  @@index([name])
}

model crm_Lead_Statuses {
  id    String      @id @default(uuid()) @db.Uuid
  v     Int         @default(0) @map("__v")
  name  String      @unique
  leads crm_Leads[] @relation("lead_status_relation")

  @@index([name])
}

model crm_Lead_Types {
  id    String      @id @default(uuid()) @db.Uuid
  v     Int         @default(0) @map("__v")
  name  String      @unique
  leads crm_Leads[] @relation("lead_type_relation")

  @@index([name])
}
```

### Field Changes on Existing Models

**`crm_Contacts`** — replace `type String?` with FK:
```prisma
// Remove: type String? @default("Customer")
// Remove: @@index([type])
// Add:
contact_type_id String?            @db.Uuid
contact_type    crm_Contact_Types? @relation(fields: [contact_type_id], references: [id])
@@index([contact_type_id])
```

**`crm_Leads`** — replace three String fields with FKs:
```prisma
// Remove: lead_source String?
// Remove: status String? @default("NEW")
// Remove: type String? @default("DEMO")
// Remove: @@index([status]), @@index([type])
// Add:
lead_source_id  String?            @db.Uuid
lead_status_id  String?            @db.Uuid
lead_type_id    String?            @db.Uuid
lead_source     crm_Lead_Sources?  @relation("lead_source_relation", fields: [lead_source_id], references: [id])
lead_status     crm_Lead_Statuses? @relation("lead_status_relation", fields: [lead_status_id], references: [id])
lead_type       crm_Lead_Types?    @relation("lead_type_relation", fields: [lead_type_id], references: [id])
@@index([lead_source_id])
@@index([lead_status_id])
@@index([lead_type_id])
```

### Orphaned Enums to Remove

These enums are unused by any model and will be deleted in the migration:
- `crm_Contact_Type`
- `crm_Lead_Status`
- `crm_Lead_Type`

---

## Migration Safety Strategy

> **Critical:** This migration must be written as a **single hand-written raw SQL file** with an explicit `BEGIN`/`COMMIT` block. Do NOT rely on Prisma's auto-generated migration, which would execute steps independently with no rollback on partial failure. Use `prisma migrate dev --create-only` to generate an empty migration file, then fill it manually.

Steps (all within one transaction):

1. **Create new tables** — `CREATE TABLE IF NOT EXISTS` for all four new config tables
2. **Populate new tables** — `INSERT` default rows from current known string values:
   - Contact Types: Customer, Partner, Vendor, Prospect
   - Lead Statuses: NEW, CONTACTED, QUALIFIED, LOST
   - Lead Types: DEMO
   - Lead Sources: (no existing values to backfill — field was free-text)
3. **Add new nullable FK columns** alongside old string columns (both coexist temporarily):
   ```sql
   ALTER TABLE "crm_Contacts" ADD COLUMN "contact_type_id" UUID;
   ALTER TABLE "crm_Leads"    ADD COLUMN "lead_status_id"  UUID;
   ALTER TABLE "crm_Leads"    ADD COLUMN "lead_type_id"    UUID;
   ALTER TABLE "crm_Leads"    ADD COLUMN "lead_source_id"  UUID;
   ```
4. **Backfill FKs** — match old string value to new table row by name (no cast needed, both are plain strings):
   ```sql
   UPDATE "crm_Contacts" c
   SET contact_type_id = ct.id
   FROM "crm_Contact_Types" ct
   WHERE c.type = ct.name AND c.type IS NOT NULL;

   UPDATE "crm_Leads" l
   SET lead_status_id = ls.id
   FROM "crm_Lead_Statuses" ls
   WHERE l.status = ls.name AND l.status IS NOT NULL;

   UPDATE "crm_Leads" l
   SET lead_type_id = lt.id
   FROM "crm_Lead_Types" lt
   WHERE l.type = lt.name AND l.type IS NOT NULL;
   -- lead_source was free-text; no backfill possible (values won't match seeded rows)
   ```
5. **Verify backfill** — assert no unexpected nulls remain where old value was set:
   ```sql
   DO $$ BEGIN
     ASSERT (SELECT COUNT(*) FROM "crm_Contacts" WHERE type IS NOT NULL AND contact_type_id IS NULL) = 0,
       'Contact type backfill incomplete';
     ASSERT (SELECT COUNT(*) FROM "crm_Leads" WHERE status IS NOT NULL AND lead_status_id IS NULL) = 0,
       'Lead status backfill incomplete';
     ASSERT (SELECT COUNT(*) FROM "crm_Leads" WHERE type IS NOT NULL AND lead_type_id IS NULL) = 0,
       'Lead type backfill incomplete';
   END $$;
   ```
   If assertion fails, the transaction rolls back — no data is lost.
6. **Drop old string columns** after backfill verified:
   ```sql
   ALTER TABLE "crm_Contacts" DROP COLUMN "type";
   ALTER TABLE "crm_Leads"    DROP COLUMN "status", DROP COLUMN "type", DROP COLUMN "lead_source";
   ```
7. **Drop orphaned enum types** (cleanup only — they were unused):
   ```sql
   DROP TYPE IF EXISTS "crm_Contact_Type";
   DROP TYPE IF EXISTS "crm_Lead_Status";
   DROP TYPE IF EXISTS "crm_Lead_Type";
   ```
8. **Add FK constraints:**
   ```sql
   ALTER TABLE "crm_Contacts" ADD CONSTRAINT fk_contact_type
     FOREIGN KEY (contact_type_id) REFERENCES "crm_Contact_Types"(id) ON DELETE SET NULL;
   ALTER TABLE "crm_Leads" ADD CONSTRAINT fk_lead_source
     FOREIGN KEY (lead_source_id) REFERENCES "crm_Lead_Sources"(id) ON DELETE SET NULL;
   ALTER TABLE "crm_Leads" ADD CONSTRAINT fk_lead_status
     FOREIGN KEY (lead_status_id) REFERENCES "crm_Lead_Statuses"(id) ON DELETE SET NULL;
   ALTER TABLE "crm_Leads" ADD CONSTRAINT fk_lead_type
     FOREIGN KEY (lead_type_id) REFERENCES "crm_Lead_Types"(id) ON DELETE SET NULL;
   ```

---

## Admin UI

### Route

```
app/[locale]/(routes)/admin/crm-settings/
├── page.tsx
├── _components/
│   ├── CrmSettingsTabs.tsx       # Tab container (7 tabs)
│   ├── ConfigList.tsx            # Reusable list: name, usage count, edit/delete buttons
│   ├── ConfigAddDialog.tsx       # Add new value
│   ├── ConfigEditDialog.tsx      # Edit existing value name
│   └── ConfigDeleteDialog.tsx    # Reassign-then-delete flow
└── _actions/
    └── crm-settings.ts           # All server actions
```

### Tabs

| Tab Label | Model |
|---|---|
| Industries | `crm_Industry_Type` |
| Contact Types | `crm_Contact_Types` |
| Lead Sources | `crm_Lead_Sources` |
| Lead Statuses | `crm_Lead_Statuses` |
| Lead Types | `crm_Lead_Types` |
| Opportunity Types | `crm_Opportunities_Type` |
| Sales Stages | `crm_Opportunities_Sales_Stages` |

### `ConfigList` Component

Reusable across all 7 tabs. Displays each value with:
- Name
- Usage count (number of records referencing this value)
- **Edit** button → opens `ConfigEditDialog`
- **Delete** button:
  - **Disabled** if this is the last remaining value in the config type (cannot delete — at least one value must exist)
  - If usage count = 0 and other values exist: deletes directly with a simple confirmation
  - If usage count > 0 and other values exist: opens `ConfigDeleteDialog`

### `ConfigDeleteDialog` — Deletion Protection Flow

1. Dialog shows: "X records use '[value name]'. Choose a replacement before deleting."
2. Dropdown lists all **other** values of the same config type (always has at least one option, enforced by the disabled-last-value rule)
3. "Reassign & Delete" button — calls `deleteConfigValue` server action
4. Server action runs in a single DB transaction:
   - `UPDATE` all affected records to use `replacementId`
   - `DELETE` the config value row
5. On success: list refreshes, dialog closes

### Sidebar Navigation

Add to `AdminSidebarNav.tsx`:

```ts
{ label: "CRM Settings", href: "/admin/crm-settings", icon: SlidersHorizontal }
```

The existing `pathname.includes(href)` active-state logic works correctly with locale-prefixed paths (e.g., `/en/admin/crm-settings` includes `/admin/crm-settings`).

---

## Server Actions (`_actions/crm-settings.ts`)

```ts
type CrmConfigType =
  | "industry"
  | "contactType"
  | "leadSource"
  | "leadStatus"
  | "leadType"
  | "opportunityType"
  | "salesStage";

type ConfigValue = { id: string; name: string; usageCount: number };

getConfigValues(configType: CrmConfigType): Promise<ConfigValue[]>
// Fetches rows with Prisma _count include on the appropriate relation:
// e.g. for "contactType": prisma.crm_Contact_Types.findMany({ include: { _count: { select: { contacts: true } } } })
// usageCount = _count.contacts (or .leads, .accounts, .opportunities as appropriate)

createConfigValue(configType: CrmConfigType, name: string): Promise<void>
// Calls revalidatePath after mutation

updateConfigValue(configType: CrmConfigType, id: string, name: string): Promise<void>
// Calls revalidatePath after mutation

deleteConfigValue(configType: CrmConfigType, id: string, replacementId?: string): Promise<void>
// If replacementId provided: runs UPDATE references + DELETE in one prisma.$transaction
// If no references (usageCount = 0): runs DELETE directly
// Calls revalidatePath after mutation
```

**Cache invalidation:** All mutating actions call `revalidatePath('/admin/crm-settings', 'page')` — Next.js 15 accepts a path pattern without the locale segment when using the App Router's `revalidatePath`. Alternatively, pass the locale from the client and call `revalidatePath(`/${locale}/admin/crm-settings`)` explicitly.

### Input Validation (Zod)

All inputs validated server-side:
- `name`: non-empty string, max 100 characters, trimmed
- Uniqueness: enforce unique `name` per config type (catch Prisma unique constraint or pre-check)
- `replacementId`: must be a valid UUID and must differ from the `id` being deleted

---

## Seed Data

`prisma/seeds/seed.ts` extended with defaults for the 4 new tables (same guard pattern: skip if rows exist):

| Config | Default values |
|---|---|
| Contact Types | Customer, Partner, Vendor, Prospect |
| Lead Sources | Web, Referral, Cold Call, Email Campaign, Event, Other |
| Lead Statuses | New, Contacted, Qualified, Lost |
| Lead Types | Demo |

> `lead_source` on existing `crm_Leads` rows was free-text and won't match seeded Lead Sources. These will remain `null` after migration — acceptable, as they were optional.

Existing three seeded tables (`crm_Industry_Type`, `crm_Opportunities_Type`, `crm_Opportunities_Sales_Stages`) are unchanged.

The `v` field on all new models uses `@default(0)` — a deliberate improvement over the existing models that require the caller to supply `v`.

---

## Out of Scope

- Color/badge attributes on config values
- Drag-to-reorder UI for Sales Stages (order field exists; UI not included)
- Bulk import/export of config values
- Per-user or per-tenant config overrides
- DB-level unique constraint on `name` for the three existing tables (`crm_Industry_Type`, `crm_Opportunities_Type`, `crm_Opportunities_Sales_Stages`) — enforced at app layer only to avoid risk on tables with live data. The four new tables have `@unique` at DB level.
