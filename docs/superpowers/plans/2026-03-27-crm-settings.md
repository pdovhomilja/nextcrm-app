# CRM Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/admin/crm-settings` page where admins can manage CRM configuration values (Industries, Contact Types, Lead Sources, Lead Statuses, Lead Types, Opportunity Types, Sales Stages), converting four plain-string fields to DB-backed FK relations with safe data migration.

**Architecture:** Four new Prisma models replace hardcoded string fields on `crm_Contacts` and `crm_Leads`. A single hand-written SQL migration backfills existing data before dropping old columns. The admin UI uses a tabbed page with a reusable `ConfigList` component and guarded deletion (reassign-then-delete in one transaction).

**Tech Stack:** Next.js 15 App Router, Prisma ORM (PostgreSQL), shadcn/ui (Dialog, Tabs, Select, Button), Zod, Jest (node environment), pnpm

**Spec:** `docs/superpowers/specs/2026-03-27-crm-settings-design.md`

---

## File Map

### Create
- `prisma/migrations/<timestamp>_crm_settings_db_backed/migration.sql` — hand-written raw SQL migration
- `app/[locale]/(routes)/admin/crm-settings/page.tsx` — admin CRM Settings page (Server Component)
- `app/[locale]/(routes)/admin/crm-settings/_components/CrmSettingsTabs.tsx` — tab container
- `app/[locale]/(routes)/admin/crm-settings/_components/ConfigList.tsx` — reusable list with edit/delete
- `app/[locale]/(routes)/admin/crm-settings/_components/ConfigAddDialog.tsx` — add value dialog
- `app/[locale]/(routes)/admin/crm-settings/_components/ConfigEditDialog.tsx` — edit value dialog
- `app/[locale]/(routes)/admin/crm-settings/_components/ConfigDeleteDialog.tsx` — reassign-then-delete dialog
- `app/[locale]/(routes)/admin/crm-settings/_actions/crm-settings.ts` — all server actions
- `__tests__/crm-settings-actions.test.ts` — unit tests for server actions

### Modify
- `prisma/schema.prisma` — 4 new models, update crm_Contacts + crm_Leads fields, remove orphaned enums
- `prisma/seeds/seed.ts` — seed defaults for 4 new config tables
- `app/[locale]/(routes)/admin/_components/AdminSidebarNav.tsx` — add CRM Settings nav item
- `actions/crm/get-crm-data.ts` — add fetching of 4 new config types for use in CRM forms
- `actions/crm/leads/create-lead.ts` — replace string fields with FK IDs
- `actions/crm/leads/update-lead.ts` — replace string fields with FK IDs
- `actions/crm/contacts/create-contact.ts` — replace `type` string with `contact_type_id`
- `actions/crm/contacts/update-contact.ts` — replace `type` string with `contact_type_id`
- `app/[locale]/(routes)/crm/leads/components/NewLeadForm.tsx` — use Select for status/type/source
- `app/[locale]/(routes)/crm/leads/components/UpdateLeadForm.tsx` — use Select for status/type/source
- `app/[locale]/(routes)/crm/contacts/components/UpdateContactForm.tsx` — use Select for contact type
- `app/[locale]/(routes)/crm/components/LeadsView.tsx` — pass new config props to NewLeadForm
- `app/[locale]/(routes)/crm/leads/table-components/data-table-row-actions.tsx` — pass new config props to UpdateLeadForm
- `app/[locale]/(routes)/crm/contacts/table-components/data-table-row-actions.tsx` — pass contactTypes prop to UpdateContactForm
- `app/[locale]/(routes)/crm/leads/[leadId]/components/BasicView.tsx` — display config names via relations
- `app/[locale]/(routes)/crm/contacts/[contactId]/components/BasicView.tsx` — display contact type name

---

## Task 1: Prisma Schema — Add 4 New Models + Update Existing

**Files:**
- Modify: `prisma/schema.prisma`

Read `prisma/schema.prisma` fully before editing. This task modifies three areas: adds new models, modifies `crm_Contacts`, modifies `crm_Leads`.

- [ ] **Step 1: Add 4 new models after the existing `crm_Opportunities_Type` model (around line 355)**

Find the block ending with `crm_Opportunities_Type` and insert after it:

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

- [ ] **Step 2: Update `crm_Contacts` model (around line 358)**

In `crm_Contacts`, replace:
```prisma
  type             String?   @default("Customer")
```
With:
```prisma
  contact_type_id  String?            @db.Uuid
  contact_type     crm_Contact_Types? @relation(fields: [contact_type_id], references: [id])
```

And replace `@@index([type])` with `@@index([contact_type_id])`.

- [ ] **Step 3: Update `crm_Leads` model (around line 67)**

In `crm_Leads`, replace:
```prisma
  lead_source       String?
  status            String?            @default("NEW")
  type              String?            @default("DEMO")
```
With:
```prisma
  lead_source_id  String?            @db.Uuid
  lead_status_id  String?            @db.Uuid
  lead_type_id    String?            @db.Uuid
  lead_source     crm_Lead_Sources?  @relation("lead_source_relation", fields: [lead_source_id], references: [id])
  lead_status     crm_Lead_Statuses? @relation("lead_status_relation", fields: [lead_status_id], references: [id])
  lead_type       crm_Lead_Types?    @relation("lead_type_relation", fields: [lead_type_id], references: [id])
```

And replace `@@index([status])`, `@@index([type])` with:
```prisma
  @@index([lead_source_id])
  @@index([lead_status_id])
  @@index([lead_type_id])
```

- [ ] **Step 4: Remove orphaned enums**

Delete these three enums from `schema.prisma` (they are not referenced by any model):
```prisma
enum crm_Contact_Type {
  Customer
  Partner
  Vendor
  Prospect
}

enum crm_Lead_Status {
  NEW
  CONTACTED
  QUALIFIED
  LOST
}

enum crm_Lead_Type {
  DEMO
}
```

- [ ] **Step 5: Generate Prisma client to validate schema**

```bash
cd /Users/pdovhomilja/development/Next.js/nextcrm-app
pnpm prisma generate
```

Expected: "Generated Prisma Client" with no errors. Fix any relation name conflicts before continuing.

- [ ] **Step 6: Commit schema-only change**

```bash
git add prisma/schema.prisma
git commit -m "feat: add crm_Contact_Types, crm_Lead_Sources, crm_Lead_Statuses, crm_Lead_Types models"
```

---

## Task 2: Write Raw SQL Migration

**Files:**
- Create: `prisma/migrations/<timestamp>_crm_settings_db_backed/migration.sql`

> **Critical:** Do NOT use `prisma migrate dev` without `--create-only`. This migration must be hand-written with explicit `BEGIN`/`COMMIT`.

- [ ] **Step 1: Create empty migration file**

```bash
cd /Users/pdovhomilja/development/Next.js/nextcrm-app
pnpm prisma migrate dev --create-only --name crm_settings_db_backed
```

This creates `prisma/migrations/<timestamp>_crm_settings_db_backed/migration.sql` with an empty file. Note the exact timestamp directory name.

- [ ] **Step 2: Write the migration SQL**

Replace the empty `migration.sql` with:

```sql
BEGIN;

-- Step 1: Create new config tables
CREATE TABLE IF NOT EXISTS "crm_Contact_Types" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "__v" INTEGER NOT NULL DEFAULT 0,
  "name" TEXT NOT NULL,
  CONSTRAINT "crm_Contact_Types_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "crm_Contact_Types_name_key" UNIQUE ("name")
);
CREATE INDEX IF NOT EXISTS "crm_Contact_Types_name_idx" ON "crm_Contact_Types"("name");

CREATE TABLE IF NOT EXISTS "crm_Lead_Sources" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "__v" INTEGER NOT NULL DEFAULT 0,
  "name" TEXT NOT NULL,
  CONSTRAINT "crm_Lead_Sources_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "crm_Lead_Sources_name_key" UNIQUE ("name")
);
CREATE INDEX IF NOT EXISTS "crm_Lead_Sources_name_idx" ON "crm_Lead_Sources"("name");

CREATE TABLE IF NOT EXISTS "crm_Lead_Statuses" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "__v" INTEGER NOT NULL DEFAULT 0,
  "name" TEXT NOT NULL,
  CONSTRAINT "crm_Lead_Statuses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "crm_Lead_Statuses_name_key" UNIQUE ("name")
);
CREATE INDEX IF NOT EXISTS "crm_Lead_Statuses_name_idx" ON "crm_Lead_Statuses"("name");

CREATE TABLE IF NOT EXISTS "crm_Lead_Types" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "__v" INTEGER NOT NULL DEFAULT 0,
  "name" TEXT NOT NULL,
  CONSTRAINT "crm_Lead_Types_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "crm_Lead_Types_name_key" UNIQUE ("name")
);
CREATE INDEX IF NOT EXISTS "crm_Lead_Types_name_idx" ON "crm_Lead_Types"("name");

-- Step 2: Populate new tables from known current string values
INSERT INTO "crm_Contact_Types" ("name") VALUES
  ('Customer'), ('Partner'), ('Vendor'), ('Prospect')
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "crm_Lead_Statuses" ("name") VALUES
  ('New'), ('Contacted'), ('Qualified'), ('Lost')
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "crm_Lead_Types" ("name") VALUES
  ('Demo')
ON CONFLICT ("name") DO NOTHING;

-- crm_Lead_Sources: lead_source was free-text, no backfill needed
-- Seed rows will be added by seed.ts after migration

-- Step 3: Add new nullable FK columns alongside old columns
ALTER TABLE "crm_Contacts" ADD COLUMN IF NOT EXISTS "contact_type_id" UUID;
ALTER TABLE "crm_Leads"    ADD COLUMN IF NOT EXISTS "lead_source_id"  UUID;
ALTER TABLE "crm_Leads"    ADD COLUMN IF NOT EXISTS "lead_status_id"  UUID;
ALTER TABLE "crm_Leads"    ADD COLUMN IF NOT EXISTS "lead_type_id"    UUID;

-- Step 4: Backfill FK columns from old string values
UPDATE "crm_Contacts" c
SET "contact_type_id" = ct.id
FROM "crm_Contact_Types" ct
WHERE c.type = ct.name AND c.type IS NOT NULL;

-- Case-insensitive match: old values were uppercase ("NEW"), new rows are title-case ("New")
UPDATE "crm_Leads" l
SET "lead_status_id" = ls.id
FROM "crm_Lead_Statuses" ls
WHERE LOWER(l.status) = LOWER(ls.name) AND l.status IS NOT NULL;

UPDATE "crm_Leads" l
SET "lead_type_id" = lt.id
FROM "crm_Lead_Types" lt
WHERE LOWER(l.type) = LOWER(lt.name) AND l.type IS NOT NULL;

-- lead_source was free-text; no reliable backfill (values won't match seeded rows)

-- Step 5: Assert backfill is complete (rolls back transaction on failure)
DO $$ BEGIN
  ASSERT (
    SELECT COUNT(*) FROM "crm_Contacts"
    WHERE type IS NOT NULL AND "contact_type_id" IS NULL
  ) = 0, 'Contact type backfill incomplete — unmatched values exist';

  ASSERT (
    SELECT COUNT(*) FROM "crm_Leads"
    WHERE status IS NOT NULL AND "lead_status_id" IS NULL
  ) = 0, 'Lead status backfill incomplete — unmatched values exist';

  ASSERT (
    SELECT COUNT(*) FROM "crm_Leads"
    WHERE type IS NOT NULL AND "lead_type_id" IS NULL
  ) = 0, 'Lead type backfill incomplete — unmatched values exist';
END $$;

-- Step 6: Drop old string columns
ALTER TABLE "crm_Contacts" DROP COLUMN IF EXISTS "type";
ALTER TABLE "crm_Leads"    DROP COLUMN IF EXISTS "status";
ALTER TABLE "crm_Leads"    DROP COLUMN IF EXISTS "type";
ALTER TABLE "crm_Leads"    DROP COLUMN IF EXISTS "lead_source";

-- Step 7: Drop orphaned enum types (they were unused by any model field)
DROP TYPE IF EXISTS "crm_Contact_Type";
DROP TYPE IF EXISTS "crm_Lead_Status";
DROP TYPE IF EXISTS "crm_Lead_Type";

-- Step 8: Add FK constraints
ALTER TABLE "crm_Contacts" ADD CONSTRAINT "fk_contact_type"
  FOREIGN KEY ("contact_type_id") REFERENCES "crm_Contact_Types"("id") ON DELETE SET NULL;

ALTER TABLE "crm_Leads" ADD CONSTRAINT "fk_lead_source"
  FOREIGN KEY ("lead_source_id") REFERENCES "crm_Lead_Sources"("id") ON DELETE SET NULL;

ALTER TABLE "crm_Leads" ADD CONSTRAINT "fk_lead_status"
  FOREIGN KEY ("lead_status_id") REFERENCES "crm_Lead_Statuses"("id") ON DELETE SET NULL;

ALTER TABLE "crm_Leads" ADD CONSTRAINT "fk_lead_type"
  FOREIGN KEY ("lead_type_id") REFERENCES "crm_Lead_Types"("id") ON DELETE SET NULL;

-- Indexes for new FK columns
CREATE INDEX IF NOT EXISTS "crm_Contacts_contact_type_id_idx" ON "crm_Contacts"("contact_type_id");
CREATE INDEX IF NOT EXISTS "crm_Leads_lead_source_id_idx"     ON "crm_Leads"("lead_source_id");
CREATE INDEX IF NOT EXISTS "crm_Leads_lead_status_id_idx"     ON "crm_Leads"("lead_status_id");
CREATE INDEX IF NOT EXISTS "crm_Leads_lead_type_id_idx"       ON "crm_Leads"("lead_type_id");

COMMIT;
```

- [ ] **Step 3: Apply migration to local DB**

```bash
cd /Users/pdovhomilja/development/Next.js/nextcrm-app
pnpm prisma migrate deploy
```

Expected: migration applied with no errors. If assertion fails, the transaction rolled back — check for unmatched string values in your local DB and add them to the INSERT block in Step 2.

- [ ] **Step 4: Regenerate Prisma client after migration**

```bash
pnpm prisma generate
```

- [ ] **Step 5: Commit migration**

```bash
git add prisma/migrations/
git commit -m "feat: raw SQL migration — convert crm string fields to DB-backed FK relations"
```

---

## Task 3: Update Seed Data

**Files:**
- Modify: `prisma/seeds/seed.ts`

Read `prisma/seeds/seed.ts` before editing.

- [ ] **Step 1: Add imports for new config data at top of seed.ts**

After the existing CRM imports, add:

```ts
// New CRM Config Tables
const contactTypesData = [
  { name: "Customer" }, { name: "Partner" }, { name: "Vendor" }, { name: "Prospect" },
];
const leadSourcesData = [
  { name: "Web" }, { name: "Referral" }, { name: "Cold Call" },
  { name: "Email Campaign" }, { name: "Event" }, { name: "Other" },
];
const leadStatusesData = [
  { name: "New" }, { name: "Contacted" }, { name: "Qualified" }, { name: "Lost" },
];
const leadTypesData = [
  { name: "Demo" },
];
```

- [ ] **Step 2: Add seed blocks inside `main()` before the final console.log**

```ts
  const contactTypes = await prisma.crm_Contact_Types.findMany();
  if (contactTypes.length === 0) {
    await prisma.crm_Contact_Types.createMany({ data: contactTypesData });
    console.log("Contact Types seeded successfully");
  } else {
    console.log("Contact Types already seeded");
  }

  const leadSources = await prisma.crm_Lead_Sources.findMany();
  if (leadSources.length === 0) {
    await prisma.crm_Lead_Sources.createMany({ data: leadSourcesData });
    console.log("Lead Sources seeded successfully");
  } else {
    console.log("Lead Sources already seeded");
  }

  const leadStatuses = await prisma.crm_Lead_Statuses.findMany();
  if (leadStatuses.length === 0) {
    await prisma.crm_Lead_Statuses.createMany({ data: leadStatusesData });
    console.log("Lead Statuses seeded successfully");
  } else {
    console.log("Lead Statuses already seeded");
  }

  const leadTypes = await prisma.crm_Lead_Types.findMany();
  if (leadTypes.length === 0) {
    await prisma.crm_Lead_Types.createMany({ data: leadTypesData });
    console.log("Lead Types seeded successfully");
  } else {
    console.log("Lead Types already seeded");
  }
```

- [ ] **Step 3: Run seed to verify**

```bash
cd /Users/pdovhomilja/development/Next.js/nextcrm-app
pnpm prisma db seed
```

Expected: all "seeded successfully" or "already seeded" messages, no errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/seeds/seed.ts
git commit -m "feat: seed default values for crm_Contact_Types, crm_Lead_Sources, crm_Lead_Statuses, crm_Lead_Types"
```

---

## Task 4: CRM Settings Server Actions (TDD)

**Files:**
- Create: `app/[locale]/(routes)/admin/crm-settings/_actions/crm-settings.ts`
- Create: `__tests__/crm-settings-actions.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/crm-settings-actions.test.ts`:

```ts
// Jest runs in node environment — mock Prisma
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    crm_Industry_Type: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    crm_Contact_Types: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    crm_Lead_Sources: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    crm_Lead_Statuses: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    crm_Lead_Types: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    crm_Opportunities_Type: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    crm_Opportunities_Sales_Stages: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    crm_Contacts: { updateMany: jest.fn() },
    crm_Leads: { updateMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

// Mock next/cache
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import prisma from "@/lib/prisma";
import {
  getConfigValues,
  createConfigValue,
  updateConfigValue,
  deleteConfigValue,
} from "@/app/[locale]/(routes)/admin/crm-settings/_actions/crm-settings";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("getConfigValues", () => {
  it("returns contact types with usageCount", async () => {
    (mockPrisma.crm_Contact_Types.findMany as jest.Mock).mockResolvedValue([
      { id: "1", name: "Customer", _count: { contacts: 5 } },
    ]);
    const result = await getConfigValues("contactType");
    expect(result).toEqual([{ id: "1", name: "Customer", usageCount: 5 }]);
  });

  it("returns lead statuses with usageCount", async () => {
    (mockPrisma.crm_Lead_Statuses.findMany as jest.Mock).mockResolvedValue([
      { id: "2", name: "NEW", _count: { leads: 3 } },
    ]);
    const result = await getConfigValues("leadStatus");
    expect(result).toEqual([{ id: "2", name: "NEW", usageCount: 3 }]);
  });
});

describe("createConfigValue", () => {
  it("creates a new contact type", async () => {
    (mockPrisma.crm_Contact_Types.create as jest.Mock).mockResolvedValue({});
    await createConfigValue("contactType", "Investor");
    expect(mockPrisma.crm_Contact_Types.create).toHaveBeenCalledWith({
      data: { name: "Investor" },
    });
  });

  it("rejects empty name", async () => {
    await expect(createConfigValue("contactType", "")).rejects.toThrow();
  });

  it("rejects name over 100 characters", async () => {
    await expect(createConfigValue("contactType", "x".repeat(101))).rejects.toThrow();
  });
});

describe("deleteConfigValue", () => {
  it("deletes directly when no replacement needed", async () => {
    (mockPrisma.crm_Contact_Types.delete as jest.Mock).mockResolvedValue({});
    await deleteConfigValue("contactType", "id-1");
    expect(mockPrisma.crm_Contact_Types.delete).toHaveBeenCalledWith({
      where: { id: "id-1" },
    });
  });

  it("reassigns and deletes in transaction when replacementId provided", async () => {
    (mockPrisma.$transaction as jest.Mock).mockResolvedValue([]);
    await deleteConfigValue("contactType", "id-1", "id-2");
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it("rejects if replacementId equals id", async () => {
    await expect(deleteConfigValue("contactType", "id-1", "id-1")).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/pdovhomilja/development/Next.js/nextcrm-app
pnpm test __tests__/crm-settings-actions.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement server actions**

Create `app/[locale]/(routes)/admin/crm-settings/_actions/crm-settings.ts`:

```ts
"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type CrmConfigType =
  | "industry"
  | "contactType"
  | "leadSource"
  | "leadStatus"
  | "leadType"
  | "opportunityType"
  | "salesStage";

export type ConfigValue = { id: string; name: string; usageCount: number };

const nameSchema = z.string().trim().min(1, "Name is required").max(100, "Max 100 characters");

// Map config type to Prisma model + relation count key
const configMap = {
  industry: {
    model: () => prisma.crm_Industry_Type,
    countRelation: "accounts",
    updateMany: null,
  },
  contactType: {
    model: () => prisma.crm_Contact_Types,
    countRelation: "contacts",
    updateMany: () => prisma.crm_Contacts,
  },
  leadSource: {
    model: () => prisma.crm_Lead_Sources,
    countRelation: "leads",
    updateMany: () => prisma.crm_Leads,
  },
  leadStatus: {
    model: () => prisma.crm_Lead_Statuses,
    countRelation: "leads",
    updateMany: () => prisma.crm_Leads,
  },
  leadType: {
    model: () => prisma.crm_Lead_Types,
    countRelation: "leads",
    updateMany: () => prisma.crm_Leads,
  },
  opportunityType: {
    model: () => prisma.crm_Opportunities_Type,
    countRelation: "assigned_opportunities",
    updateMany: null,
  },
  salesStage: {
    model: () => prisma.crm_Opportunities_Sales_Stages,
    countRelation: "assigned_opportunities_sales_stage",
    updateMany: null,
  },
} as const;

// FK field name on the referencing table per config type
const fkField: Record<CrmConfigType, string | null> = {
  industry: "industry",
  contactType: "contact_type_id",
  leadSource: "lead_source_id",
  leadStatus: "lead_status_id",
  leadType: "lead_type_id",
  opportunityType: "type",
  salesStage: "sales_stage",
};

export async function getConfigValues(configType: CrmConfigType): Promise<ConfigValue[]> {
  const { model, countRelation } = configMap[configType];
  const rows = await (model() as any).findMany({
    include: { _count: { select: { [countRelation]: true } } },
    orderBy: { name: "asc" },
  });
  return rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    usageCount: r._count[countRelation] ?? 0,
  }));
}

export async function createConfigValue(configType: CrmConfigType, name: string): Promise<void> {
  const parsed = nameSchema.parse(name);
  const { model } = configMap[configType];
  await (model() as any).create({ data: { name: parsed } });
  revalidatePath("/admin/crm-settings");
}

export async function updateConfigValue(
  configType: CrmConfigType,
  id: string,
  name: string
): Promise<void> {
  const parsed = nameSchema.parse(name);
  const { model } = configMap[configType];
  await (model() as any).update({ where: { id }, data: { name: parsed } });
  revalidatePath("/admin/crm-settings");
}

export async function deleteConfigValue(
  configType: CrmConfigType,
  id: string,
  replacementId?: string
): Promise<void> {
  if (replacementId !== undefined && replacementId === id) {
    throw new Error("replacementId must differ from id");
  }

  const { model, updateMany } = configMap[configType];
  const field = fkField[configType];

  if (replacementId && updateMany && field) {
    // Reassign all references then delete — in one transaction
    await prisma.$transaction([
      (updateMany() as any).updateMany({
        where: { [field]: id },
        data: { [field]: replacementId },
      }),
      (model() as any).delete({ where: { id } }),
    ]);
  } else {
    await (model() as any).delete({ where: { id } });
  }

  revalidatePath("/admin/crm-settings");
}
```

- [ ] **Step 4: Run tests — all must pass**

```bash
pnpm test __tests__/crm-settings-actions.test.ts
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/\(routes\)/admin/crm-settings/_actions/crm-settings.ts __tests__/crm-settings-actions.test.ts
git commit -m "feat: CRM settings server actions with unit tests"
```

---

## Task 5: Admin UI — Reusable Components

**Files:**
- Create: `app/[locale]/(routes)/admin/crm-settings/_components/ConfigList.tsx`
- Create: `app/[locale]/(routes)/admin/crm-settings/_components/ConfigAddDialog.tsx`
- Create: `app/[locale]/(routes)/admin/crm-settings/_components/ConfigEditDialog.tsx`
- Create: `app/[locale]/(routes)/admin/crm-settings/_components/ConfigDeleteDialog.tsx`

Before writing these components, check `app/[locale]/(routes)/admin/llm-keys/ProviderKeyCard.tsx` and `app/[locale]/(routes)/admin/users/components/IviteForm.tsx` for patterns (Dialog usage, form patterns, toast usage).

- [ ] **Step 1: Create ConfigAddDialog**

```tsx
// app/[locale]/(routes)/admin/crm-settings/_components/ConfigAddDialog.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { createConfigValue, type CrmConfigType } from "../_actions/crm-settings";
import { toast } from "sonner";

interface Props {
  configType: CrmConfigType;
  label: string;
}

export function ConfigAddDialog({ configType, label }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await createConfigValue(configType, name);
      toast.success(`${label} added`);
      setName("");
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" /> Add {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add {label}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Adding…" : "Add"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create ConfigEditDialog**

```tsx
// app/[locale]/(routes)/admin/crm-settings/_components/ConfigEditDialog.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateConfigValue, type CrmConfigType } from "../_actions/crm-settings";
import { toast } from "sonner";

interface Props {
  configType: CrmConfigType;
  id: string;
  currentName: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ConfigEditDialog({ configType, id, currentName, open, onOpenChange }: Props) {
  const [name, setName] = useState(currentName);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await updateConfigValue(configType, id, name);
      toast.success("Updated");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Value</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Saving…" : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Create ConfigDeleteDialog**

```tsx
// app/[locale]/(routes)/admin/crm-settings/_components/ConfigDeleteDialog.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { deleteConfigValue, type CrmConfigType, type ConfigValue } from "../_actions/crm-settings";
import { toast } from "sonner";

interface Props {
  configType: CrmConfigType;
  item: ConfigValue;
  allValues: ConfigValue[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ConfigDeleteDialog({ configType, item, allValues, open, onOpenChange }: Props) {
  const others = allValues.filter((v) => v.id !== item.id);
  const [replacementId, setReplacementId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (item.usageCount > 0 && !replacementId) {
      toast.error("Select a replacement before deleting");
      return;
    }
    setLoading(true);
    try {
      await deleteConfigValue(configType, item.id, item.usageCount > 0 ? replacementId : undefined);
      toast.success("Deleted");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete &quot;{item.name}&quot;</DialogTitle>
          {item.usageCount > 0 && (
            <DialogDescription>
              {item.usageCount} record{item.usageCount !== 1 ? "s" : ""} use this value.
              Choose a replacement before deleting.
            </DialogDescription>
          )}
        </DialogHeader>
        {item.usageCount > 0 && (
          <div className="py-2">
            <Select onValueChange={setReplacementId}>
              <SelectTrigger>
                <SelectValue placeholder="Select replacement…" />
              </SelectTrigger>
              <SelectContent>
                {others.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading || (item.usageCount > 0 && !replacementId)}
          >
            {loading ? "Deleting…" : item.usageCount > 0 ? "Reassign & Delete" : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Create ConfigList**

```tsx
// app/[locale]/(routes)/admin/crm-settings/_components/ConfigList.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import { ConfigEditDialog } from "./ConfigEditDialog";
import { ConfigDeleteDialog } from "./ConfigDeleteDialog";
import { ConfigAddDialog } from "./ConfigAddDialog";
import type { CrmConfigType, ConfigValue } from "../_actions/crm-settings";

interface Props {
  configType: CrmConfigType;
  label: string;
  values: ConfigValue[];
}

export function ConfigList({ configType, label, values }: Props) {
  const [editItem, setEditItem] = useState<ConfigValue | null>(null);
  const [deleteItem, setDeleteItem] = useState<ConfigValue | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{values.length} value{values.length !== 1 ? "s" : ""}</p>
        <ConfigAddDialog configType={configType} label={label} />
      </div>

      <div className="divide-y rounded-md border">
        {values.length === 0 && (
          <p className="px-4 py-3 text-sm text-muted-foreground">No values yet.</p>
        )}
        {values.map((item) => (
          <div key={item.id} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{item.name}</span>
              {item.usageCount > 0 && (
                <Badge variant="secondary">{item.usageCount} in use</Badge>
              )}
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => setEditItem(item)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                disabled={values.length <= 1}
                title={values.length <= 1 ? "Cannot delete the last value" : undefined}
                onClick={() => setDeleteItem(item)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {editItem && (
        <ConfigEditDialog
          configType={configType}
          id={editItem.id}
          currentName={editItem.name}
          open={!!editItem}
          onOpenChange={(v) => { if (!v) setEditItem(null); }}
        />
      )}
      {deleteItem && (
        <ConfigDeleteDialog
          configType={configType}
          item={deleteItem}
          allValues={values}
          open={!!deleteItem}
          onOpenChange={(v) => { if (!v) setDeleteItem(null); }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/pdovhomilja/development/Next.js/nextcrm-app
pnpm tsc --noEmit 2>&1 | head -30
```

Expected: no errors in new files.

- [ ] **Step 6: Commit components**

```bash
git add app/\[locale\]/\(routes\)/admin/crm-settings/_components/
git commit -m "feat: CRM settings admin UI components — ConfigList, Add/Edit/Delete dialogs"
```

---

## Task 6: Admin CRM Settings Page + Tabs

**Files:**
- Create: `app/[locale]/(routes)/admin/crm-settings/_components/CrmSettingsTabs.tsx`
- Create: `app/[locale]/(routes)/admin/crm-settings/page.tsx`

- [ ] **Step 1: Check admin layout for wrapper patterns**

Read `app/[locale]/(routes)/admin/layout.tsx` to understand the page wrapper (sidebar + content area) before writing the page.

- [ ] **Step 2: Create CrmSettingsTabs**

```tsx
// app/[locale]/(routes)/admin/crm-settings/_components/CrmSettingsTabs.tsx
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfigList } from "./ConfigList";
import type { CrmConfigType, ConfigValue } from "../_actions/crm-settings";

type TabConfig = {
  key: CrmConfigType;
  label: string;
  values: ConfigValue[];
};

interface Props {
  tabs: TabConfig[];
}

export function CrmSettingsTabs({ tabs }: Props) {
  return (
    <Tabs defaultValue={tabs[0]?.key}>
      <TabsList className="flex-wrap h-auto gap-1">
        {tabs.map((t) => (
          <TabsTrigger key={t.key} value={t.key}>
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((t) => (
        <TabsContent key={t.key} value={t.key} className="mt-6">
          <ConfigList configType={t.key} label={t.label} values={t.values} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
```

- [ ] **Step 3: Create page.tsx**

```tsx
// app/[locale]/(routes)/admin/crm-settings/page.tsx
import { getConfigValues } from "./_actions/crm-settings";
import { CrmSettingsTabs } from "./_components/CrmSettingsTabs";

export default async function CrmSettingsPage() {
  const [
    industries,
    contactTypes,
    leadSources,
    leadStatuses,
    leadTypes,
    opportunityTypes,
    salesStages,
  ] = await Promise.all([
    getConfigValues("industry"),
    getConfigValues("contactType"),
    getConfigValues("leadSource"),
    getConfigValues("leadStatus"),
    getConfigValues("leadType"),
    getConfigValues("opportunityType"),
    getConfigValues("salesStage"),
  ]);

  const tabs = [
    { key: "industry" as const,       label: "Industries",        values: industries },
    { key: "contactType" as const,    label: "Contact Types",     values: contactTypes },
    { key: "leadSource" as const,     label: "Lead Sources",      values: leadSources },
    { key: "leadStatus" as const,     label: "Lead Statuses",     values: leadStatuses },
    { key: "leadType" as const,       label: "Lead Types",        values: leadTypes },
    { key: "opportunityType" as const,label: "Opportunity Types", values: opportunityTypes },
    { key: "salesStage" as const,     label: "Sales Stages",      values: salesStages },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">CRM Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage default values used across CRM modules.
        </p>
      </div>
      <CrmSettingsTabs tabs={tabs} />
    </div>
  );
}
```

- [ ] **Step 4: Compile check**

```bash
pnpm tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 5: Commit**

```bash
git add app/\[locale\]/\(routes\)/admin/crm-settings/
git commit -m "feat: CRM settings admin page with 7-tab config UI"
```

---

## Task 7: Update Admin Sidebar Navigation

**Files:**
- Modify: `app/[locale]/(routes)/admin/_components/AdminSidebarNav.tsx`

Read the file before editing. It uses `SlidersHorizontal` or similar icon — check what's available in `lucide-react` or use `Settings2`.

- [ ] **Step 1: Add CRM Settings nav item**

In `AdminSidebarNav.tsx`, add to the `navItems` array:

```ts
import { Key, Users, Settings, SlidersHorizontal } from "lucide-react";

const navItems = [
  { label: "LLM Keys",     href: "/admin/llm-keys",      icon: Key },
  { label: "Users",        href: "/admin/users",          icon: Users },
  { label: "Services",     href: "/admin/services",       icon: Settings },
  { label: "CRM Settings", href: "/admin/crm-settings",   icon: SlidersHorizontal },
];
```

- [ ] **Step 2: Verify in dev (quick manual check)**

```bash
cd /Users/pdovhomilja/development/Next.js/nextcrm-app
pnpm dev
```

Navigate to `http://localhost:3000/admin/crm-settings` — confirm the page loads with all 7 tabs, add/edit/delete dialogs work.

- [ ] **Step 3: Commit**

```bash
git add app/\[locale\]/\(routes\)/admin/_components/AdminSidebarNav.tsx
git commit -m "feat: add CRM Settings to admin sidebar navigation"
```

---

## Task 8: Update get-crm-data to Include New Config Types

**Files:**
- Modify: `actions/crm/get-crm-data.ts`

Read the file before editing. It currently fetches `crm_Opportunities_Type`, `crm_Opportunities_Sales_Stages`, and `crm_Industry_Type`. The CRM forms (NewLeadForm, UpdateLeadForm, UpdateContactForm) receive this data as props. Extend it to also return the 4 new config types.

- [ ] **Step 1: Read the file**

```bash
# Read actions/crm/get-crm-data.ts in full before making changes
```

- [ ] **Step 2: Add the 4 new fetches**

In the `Promise.all` block, add:
```ts
prismadb.crm_Contact_Types.findMany({ orderBy: { name: "asc" } }),
prismadb.crm_Lead_Sources.findMany({ orderBy: { name: "asc" } }),
prismadb.crm_Lead_Statuses.findMany({ orderBy: { name: "asc" } }),
prismadb.crm_Lead_Types.findMany({ orderBy: { name: "asc" } }),
```

Destructure the results and add them to the returned object:
```ts
contactTypes,
leadSources,
leadStatuses,
leadTypes,
```

- [ ] **Step 3: Compile check**

```bash
pnpm tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add actions/crm/get-crm-data.ts
git commit -m "feat: extend get-crm-data to fetch contactTypes, leadSources, leadStatuses, leadTypes"
```

---

## Task 9: Update Lead + Contact Server Actions

**Files:**
- Modify: `actions/crm/leads/create-lead.ts`
- Modify: `actions/crm/leads/update-lead.ts`
- Modify: `actions/crm/contacts/create-contact.ts`
- Modify: `actions/crm/contacts/update-contact.ts`

Read each file before editing.

- [ ] **Step 1: Update create-lead.ts**

Replace `lead_source`, `status`, `type` string fields with FK ID fields:

```ts
// In the type / interface:
// Replace: lead_source?: string; status?: string; type?: string;
// With:
lead_source_id?: string;
lead_status_id?: string;
lead_type_id?: string;

// In the prisma.crm_Leads.create({ data: { ... } }):
// Replace: lead_source, status: "NEW", type: "DEMO"
// With:
lead_source_id: lead_source_id ?? undefined,
lead_status_id: lead_status_id ?? undefined,
lead_type_id: lead_type_id ?? undefined,
```

- [ ] **Step 2: Update update-lead.ts**

Same field replacements as create-lead.ts. Replace all references to `lead_source`, `status`, `type` with their FK ID counterparts.

- [ ] **Step 3: Update create-contact.ts**

Replace `type?: string` with `contact_type_id?: string` in the input type and Prisma create call.

- [ ] **Step 4: Update update-contact.ts**

Same — replace `type` with `contact_type_id`.

- [ ] **Step 5: Compile check**

```bash
pnpm tsc --noEmit 2>&1 | head -30
```

Fix any type errors before continuing.

- [ ] **Step 6: Commit**

```bash
git add actions/crm/leads/ actions/crm/contacts/
git commit -m "feat: update lead and contact server actions to use FK ID fields"
```

---

## Task 10: Update Lead Forms

**Files:**
- Modify: `app/[locale]/(routes)/crm/leads/components/NewLeadForm.tsx`
- Modify: `app/[locale]/(routes)/crm/leads/components/UpdateLeadForm.tsx`

Read both files before editing. The forms receive data from `get-crm-data` as props — check how the existing `crm_Opportunities_Type` select is rendered to follow the same pattern.

- [ ] **Step 1: Update NewLeadForm Zod schema and defaults**

```ts
// Replace:
lead_source: z.string().optional(),
// With:
lead_source_id: z.string().optional(),
lead_status_id: z.string().optional(),
lead_type_id: z.string().optional(),

// Replace default values:
lead_source: "",
// With:
lead_source_id: "",
lead_status_id: "",
lead_type_id: "",
```

- [ ] **Step 2: Replace text inputs with Selects in NewLeadForm**

For each of the three fields, replace the `<Input name="lead_source" />` (or equivalent) with a `<Select>` populated from the config data passed as props:

```tsx
// Props must include: leadSources, leadStatuses, leadTypes (from get-crm-data)
<FormField
  control={form.control}
  name="lead_source_id"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Lead Source</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger><SelectValue placeholder="Select source…" /></SelectTrigger>
        </FormControl>
        <SelectContent>
          {leadSources.map((s) => (
            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormItem>
  )}
/>
```

Repeat for `lead_status_id` and `lead_type_id`.

- [ ] **Step 3: Update UpdateLeadForm with same changes**

Same schema, defaults, and Select replacements. UpdateLeadForm also needs to set the initial `field.value` from `initialData.lead_source_id`, `initialData.lead_status_id`, `initialData.lead_type_id`.

- [ ] **Step 4: Thread config props through parent components**

Read `app/[locale]/(routes)/crm/components/LeadsView.tsx` and `app/[locale]/(routes)/crm/leads/table-components/data-table-row-actions.tsx` before editing.

**LeadsView.tsx** — currently passes only `accounts` to `NewLeadForm`. It receives `crmData` from its parent page. Add the three new config arrays:
```tsx
// Add to props passed to <NewLeadForm>:
leadSources={crmData.leadSources}
leadStatuses={crmData.leadStatuses}
leadTypes={crmData.leadTypes}
```

**leads/data-table-row-actions.tsx** — renders `<UpdateLeadForm initialData={row.original} setOpen={setUpdateOpen} />`. This component needs access to the same config arrays. The data table is rendered from a page that has `crmData`. Trace the prop chain and thread the three arrays down:
- Add props to the data table row actions component
- Pass them to `<UpdateLeadForm>`

- [ ] **Step 5: Compile check**

```bash
pnpm tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 6: Commit**

```bash
git add app/\[locale\]/\(routes\)/crm/leads/components/ app/\[locale\]/\(routes\)/crm/components/LeadsView.tsx app/\[locale\]/\(routes\)/crm/leads/table-components/
git commit -m "feat: update lead forms to use Select from DB-backed config values"
```

---

## Task 11: Update Contact Form

**Files:**
- Modify: `app/[locale]/(routes)/crm/contacts/components/UpdateContactForm.tsx`

Read the file before editing (it's 586 lines — search for the `type` field specifically).

- [ ] **Step 1: Update Zod schema**

```ts
// Replace: type: z.string(),
// With:
contact_type_id: z.string().optional(),
```

- [ ] **Step 2: Update default value**

```ts
// Replace: type: initialData.type ?? "",
// With:
contact_type_id: initialData.contact_type_id ?? "",
```

- [ ] **Step 3: Replace Input with Select for contact_type_id**

Find the `name="type"` input (around line 434) and replace with:

```tsx
<FormField
  control={form.control}
  name="contact_type_id"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Contact Type</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger><SelectValue placeholder="Select type…" /></SelectTrigger>
        </FormControl>
        <SelectContent>
          {contactTypes.map((t) => (
            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormItem>
  )}
/>
```

The `contactTypes` prop must be threaded through from the page that renders `UpdateContactForm`. Check how `opportunityTypes` is passed in the opportunities module for the same pattern.

- [ ] **Step 4: Thread contactTypes through parent**

Read `app/[locale]/(routes)/crm/contacts/table-components/data-table-row-actions.tsx`. It renders `<UpdateContactForm>` — add a `contactTypes` prop to it and thread the array down from the contacts page (which calls `get-crm-data`).

- [ ] **Step 5: Compile check**

```bash
pnpm tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 6: Commit**

```bash
git add app/\[locale\]/\(routes\)/crm/contacts/components/UpdateContactForm.tsx app/\[locale\]/\(routes\)/crm/contacts/table-components/
git commit -m "feat: update contact form to use Select from DB-backed contact types"
```

---

## Task 12: Update BasicView Displays

**Files:**
- Modify: `app/[locale]/(routes)/crm/leads/[leadId]/components/BasicView.tsx`
- Modify: `app/[locale]/(routes)/crm/contacts/[contactId]/components/BasicView.tsx`

Read both files before editing. These components display record details. They currently show `record.status`, `record.type`, `record.lead_source` (plain strings). After migration, these fields no longer exist — the relations `record.lead_status`, `record.lead_type`, `record.lead_source` (Prisma relations) will be used instead.

- [ ] **Step 1: Update lead BasicView**

The page that fetches the lead for this view must include the relations:

```ts
// In the Prisma query fetching the lead (likely in the page.tsx or a server action):
include: {
  lead_source: true,
  lead_status: true,
  lead_type: true,
  // ... other includes
}
```

In `BasicView.tsx`, update the display cells:
```tsx
// Replace: <span>{lead.status}</span>
// With:
<span>{lead.lead_status?.name ?? "—"}</span>

// Replace: <span>{lead.type}</span>
// With:
<span>{lead.lead_type?.name ?? "—"}</span>

// Replace: <span>{lead.lead_source}</span>
// With:
<span>{lead.lead_source?.name ?? "—"}</span>
```

- [ ] **Step 2: Update contact BasicView**

Find where `contact.type` is displayed and replace with:
```tsx
<span>{contact.contact_type?.name ?? "—"}</span>
```

Ensure the contact fetch includes `contact_type: true`.

- [ ] **Step 3: Compile check**

```bash
pnpm tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Final run of all tests**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 5: Build check**

```bash
pnpm build 2>&1 | tail -20
```

Expected: build completes with no type errors.

- [ ] **Step 6: Final commit**

```bash
git add app/\[locale\]/\(routes\)/crm/leads/\[leadId\]/ app/\[locale\]/\(routes\)/crm/contacts/\[contactId\]/
git commit -m "feat: update lead and contact BasicView to display FK-backed config names"
```

---

## Final Checklist

- [ ] All 4 new Prisma models created with `@unique` on `name` and `@@index`
- [ ] Raw SQL migration applied with no assertion failures
- [ ] Seed data populates all 4 new config tables on fresh install
- [ ] Admin CRM Settings page accessible at `/admin/crm-settings` for admin users only
- [ ] All 7 tabs render correct values with usage counts
- [ ] Add / Edit / Delete flows work for all tabs
- [ ] Delete is blocked (button disabled) when only one value remains
- [ ] Delete with usage > 0 requires reassignment before proceeding
- [ ] Reassign + delete runs in a single DB transaction
- [ ] Lead forms use Selects for source/status/type (no free-text input)
- [ ] Config props (leadSources, leadStatuses, leadTypes) threaded through LeadsView and row-actions to forms
- [ ] Contact form uses Select for contact type
- [ ] contactTypes prop threaded through contacts row-actions to UpdateContactForm
- [ ] Lead Statuses display with title-case names (New, Contacted, Qualified, Lost)
- [ ] BasicView displays show config names, not null/undefined
- [ ] `pnpm build` passes with no errors
