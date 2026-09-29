# Target Type (Individual vs Company) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `crm_Targets` a first-class `INDIVIDUAL | COMPANY` type that drives which fields are shown and required across forms, detail view, list, MCP, and CSV import.

**Architecture:** A single fork-owned config module (`lib/crm/target-type.ts`) is the source of truth for the type taxonomy (field groups, required identity, title/label resolvers). Upstream-owned components get thin conditional hooks that read the config. A single-table discriminator column with an additive migration; existing rows backfill to `COMPANY`.

**Tech Stack:** Next.js 16 App Router, React 19, Prisma 7 (`@prisma/adapter-pg`), better-auth, Zod, Jest, Playwright, pnpm 11.

**Spec:** `docs/superpowers/specs/2026-09-28-target-individual-vs-company-design.md`

## Global Constraints

- Package manager is **pnpm**; never npm/yarn. Lint is `eslint . --max-warnings=0`; typecheck `pnpm exec tsc --noEmit`.
- **Never `prisma db push`.** Every schema change is a committed migration authored with `prisma migrate dev` (use `--create-only` in this agent shell — `migrate dev` is interactive and hangs otherwise; see `docs/reference/LESSONS_LEARNED.md`).
- **The security boundary is application code (no RLS).** Every read/write stays scoped by `created_by` / the existing `authz` helpers; type/identity validation is enforced server-side, not only in the form.
- **Additive-first / upstream hygiene:** put real logic in the new fork-owned `lib/crm/target-type.ts`; touch upstream-owned files with thin, insertion-only hooks and **log every upstream-owned edit** in `docs/reference/UPSTREAM_IMPACT_LOG.md`.
- Match import-path casing exactly (CI is Linux, case-sensitive).
- `last_name` is a **non-null** column; "no last name" is the empty string `""`.
- Enum values verbatim: `INDIVIDUAL`, `COMPANY`. Prisma enum name verbatim: `crm_Target_Type`.

## Review Focus

- **Toggling type on an existing record must not wipe stored fields.** A user switching Company→Individual (or back) in the edit form re-renders the field set but does not null out now-hidden columns. → pinned in Task 6.
- **A company target with `last_name = ""` is valid; an individual with `company = ""` is valid.** The required-identity guard keys off `type`, not "either field present." → pinned in Tasks 1 and 3.
- **An unknown/missing `type` value coerces to `COMPANY`, never crashes.** MCP/import/detail all normalize. → pinned in Tasks 1 and 8.
- **CSV import with no `type` column still imports (as COMPANY); a bad `type` cell coerces to COMPANY.** → pinned in Task 8.
- **The migration backfill + `last_name = company` cleanup are idempotent** (re-running the deploy does not corrupt data). → pinned in Task 2.

---

### Task 1: Fork-owned config module `lib/crm/target-type.ts`

**Files:**
- Create: `lib/crm/target-type.ts`
- Test: `__tests__/lib/target-type.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `TargetType`, `TARGET_TYPES`, `TARGET_TYPE_OPTIONS`, `targetTypeLabel(v)`, `normalizeTargetType(v): TargetType`, `resolveTargetTitle(t)`, `requiredIdentityField(type): "company"|"last_name"`, `hasRequiredIdentity(t): boolean`, `fieldsForType(type): string[]`, `isFieldForType(type,key): boolean`, `fieldLabel(type,key): string`.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/lib/target-type.test.ts
import {
  normalizeTargetType, resolveTargetTitle, requiredIdentityField,
  hasRequiredIdentity, fieldsForType, isFieldForType, fieldLabel,
} from "@/lib/crm/target-type";

describe("target-type config", () => {
  it("normalizes unknown/missing type to COMPANY", () => {
    expect(normalizeTargetType(null)).toBe("COMPANY");
    expect(normalizeTargetType("nonsense")).toBe("COMPANY");
    expect(normalizeTargetType("INDIVIDUAL")).toBe("INDIVIDUAL");
  });

  it("resolves the title by type", () => {
    expect(resolveTargetTitle({ type: "COMPANY", company: "Acme Inc" })).toBe("Acme Inc");
    expect(resolveTargetTitle({ type: "INDIVIDUAL", first_name: "Ada", last_name: "Lovelace" }))
      .toBe("Ada Lovelace");
    expect(resolveTargetTitle({ type: "INDIVIDUAL", last_name: "Lovelace" })).toBe("Lovelace");
  });

  it("keys required identity off type, not 'either field'", () => {
    expect(requiredIdentityField("COMPANY")).toBe("company");
    expect(requiredIdentityField("INDIVIDUAL")).toBe("last_name");
    expect(hasRequiredIdentity({ type: "COMPANY", company: "Acme", last_name: "" })).toBe(true);
    expect(hasRequiredIdentity({ type: "COMPANY", company: "" })).toBe(false);
    expect(hasRequiredIdentity({ type: "INDIVIDUAL", last_name: "Lovelace", company: "" })).toBe(true);
    expect(hasRequiredIdentity({ type: "INDIVIDUAL", last_name: "" })).toBe(false);
  });

  it("returns per-type field groups and labels", () => {
    expect(isFieldForType("COMPANY", "industry")).toBe(true);
    expect(isFieldForType("COMPANY", "position")).toBe(false);
    expect(isFieldForType("INDIVIDUAL", "position")).toBe(true);
    expect(isFieldForType("INDIVIDUAL", "industry")).toBe(false);
    expect(fieldsForType("COMPANY")).toContain("company");
    expect(fieldLabel("INDIVIDUAL", "company")).toBe("Employer");
    expect(fieldLabel("COMPANY", "company")).toBe("Company name");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec jest __tests__/lib/target-type.test.ts`
Expected: FAIL — cannot resolve `@/lib/crm/target-type`.

- [ ] **Step 3: Write the module**

```ts
// lib/crm/target-type.ts
// Fork-owned single source of truth for the Individual/Company target
// taxonomy. Consumed by forms, detail view, list, MCP tools, and CSV import.

export const TARGET_TYPES = ["INDIVIDUAL", "COMPANY"] as const;
export type TargetType = (typeof TARGET_TYPES)[number];

export const TARGET_TYPE_OPTIONS = [
  { label: "Individual", value: "INDIVIDUAL" },
  { label: "Company", value: "COMPANY" },
] as const;

export function targetTypeLabel(value?: string | null): string {
  return TARGET_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? "Company";
}

// Badge variant: COMPANY neutral, INDIVIDUAL highlighted.
export function targetTypeBadgeVariant(
  value?: string | null
): "default" | "secondary" {
  return value === "INDIVIDUAL" ? "default" : "secondary";
}

export function normalizeTargetType(value?: string | null): TargetType {
  return value === "INDIVIDUAL" ? "INDIVIDUAL" : "COMPANY";
}

export interface TargetIdentityFields {
  type?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  company?: string | null;
}

export function resolveTargetTitle(t: TargetIdentityFields): string {
  if (normalizeTargetType(t.type) === "INDIVIDUAL") {
    const name = `${t.first_name ?? ""} ${t.last_name ?? ""}`.trim();
    return name || "(unnamed individual)";
  }
  return (t.company ?? "").trim() || "(unnamed company)";
}

export function requiredIdentityField(type: TargetType): "company" | "last_name" {
  return type === "COMPANY" ? "company" : "last_name";
}

export function hasRequiredIdentity(t: TargetIdentityFields): boolean {
  if (normalizeTargetType(t.type) === "COMPANY") return Boolean((t.company ?? "").trim());
  return Boolean((t.last_name ?? "").trim());
}

// Ordered field keys to display per type. Shared fields (location, socials,
// description) appear in both groups. `company` appears in both with a
// type-specific label (see fieldLabel).
const TARGET_FIELD_GROUPS: Record<TargetType, string[]> = {
  INDIVIDUAL: [
    "first_name", "last_name", "position", "company",
    "email", "personal_email", "mobile_phone", "office_phone", "personal_website",
    "city", "country",
    "social_linkedin", "social_x", "social_instagram", "social_facebook",
    "description",
  ],
  COMPANY: [
    "company", "industry", "employees",
    "company_website", "company_email", "company_phone",
    "city", "country",
    "social_linkedin", "social_x", "social_instagram", "social_facebook",
    "description",
  ],
};

export function fieldsForType(type: TargetType): string[] {
  return TARGET_FIELD_GROUPS[type];
}

export function isFieldForType(type: TargetType, key: string): boolean {
  return TARGET_FIELD_GROUPS[type].includes(key);
}

const FIELD_LABELS: Record<string, string> = {
  first_name: "First name", last_name: "Last name", position: "Position",
  email: "Email", personal_email: "Personal email", mobile_phone: "Mobile phone",
  office_phone: "Office phone", personal_website: "Personal website",
  company_website: "Company website", company_email: "Company email",
  company_phone: "Company phone", industry: "Industry", employees: "Employees",
  city: "City", country: "Country", description: "Description",
  social_linkedin: "LinkedIn", social_x: "X (Twitter)",
  social_instagram: "Instagram", social_facebook: "Facebook",
};

export function fieldLabel(type: TargetType, key: string): string {
  if (key === "company") return type === "INDIVIDUAL" ? "Employer" : "Company name";
  return FIELD_LABELS[key] ?? key;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec jest __tests__/lib/target-type.test.ts` → PASS.
Then `pnpm exec tsc --noEmit` and `pnpm exec eslint lib/crm/target-type.ts __tests__/lib/target-type.test.ts --max-warnings=0`.

- [ ] **Step 5: Commit**

```bash
git add lib/crm/target-type.ts __tests__/lib/target-type.test.ts
git commit -m "feat(targets): fork-owned Individual/Company type config module"
```

---

### Task 2: Schema migration — `type` enum + column + backfill + cleanup

**Files:**
- Modify: `prisma/schema.prisma` (add enum `crm_Target_Type`; add `type` field + `@@index([type])` to `model crm_Targets`)
- Create: `prisma/migrations/<timestamp>_target_type/migration.sql`

**Interfaces:**
- Produces: the `type` column on `crm_Targets` (default `COMPANY`) that every later task reads/writes.

- [ ] **Step 1: Edit `prisma/schema.prisma`**

Add near the other CRM enums:

```prisma
enum crm_Target_Type {
  INDIVIDUAL
  COMPANY
}
```

Inside `model crm_Targets`, add the field and index (place `type` next to `status`):

```prisma
  type            crm_Target_Type @default(COMPANY)
```

and in the model's index block:

```prisma
  @@index([type])
```

- [ ] **Step 2: Generate the migration WITHOUT applying (non-interactive)**

Run: `pnpm exec prisma migrate dev --name target_type --create-only`
Expected: writes `prisma/migrations/<timestamp>_target_type/migration.sql`, does not apply. (Do **not** use plain `migrate dev` — it prompts and hangs in this shell.)

- [ ] **Step 3: Append the idempotent data cleanup to the generated `migration.sql`**

After the generated `CREATE TYPE` / `ALTER TABLE ... ADD COLUMN "type" ... DEFAULT 'COMPANY'` statements, add:

```sql
-- Retire the last_name = company duplication from the initial MCP load of the
-- 28 company prospects. Idempotent: only rows where the two still match.
UPDATE "crm_Targets" SET "last_name" = '' WHERE "last_name" = "company";
```

(The `ADD COLUMN ... DEFAULT 'COMPANY'` already backfills every existing row; no separate UPDATE for `type` is needed.)

- [ ] **Step 4: Apply locally and regenerate the client**

Run: `pnpm db:migrate` (asserts local DB, runs `prisma migrate deploy`), then `pnpm exec prisma generate`.
Expected: migration applies; `crm_Targets.type` exists.

- [ ] **Step 5: Verify backfill + cleanup on the local DB**

Run: `pnpm exec prisma migrate status` → up to date.
Sanity SQL (via `pnpm exec prisma db execute --stdin --schema prisma/schema.prisma`):

```sql
SELECT type, count(*) FROM "crm_Targets" GROUP BY type;
```

Expected: all existing rows are `COMPANY`.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(targets): add crm_Target_Type column (migration, backfill COMPANY)"
```

---

### Task 3: Type-aware MCP create/update (`lib/mcp/tools/crm-targets.ts`)

**Files:**
- Modify: `lib/mcp/tools/crm-targets.ts` (add `type` to create/update schemas + type-aware required guard)
- Test: `__tests__/mcp/crm-targets-type.test.ts`

**Interfaces:**
- Consumes: `normalizeTargetType`, `requiredIdentityField` from `@/lib/crm/target-type`.
- Produces: MCP `crm_create_target` / `crm_update_target` accepting `type: "INDIVIDUAL" | "COMPANY"`.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/mcp/crm-targets-type.test.ts
jest.mock("@/lib/prisma", () => ({
  prismadb: { crm_Targets: { create: jest.fn(), update: jest.fn(), findFirst: jest.fn() } },
}));
import { prismadb } from "@/lib/prisma";
import { crmTargetTools } from "@/lib/mcp/tools/crm-targets";

const USER = "u1";
const createThroughSchema = (args: unknown) => {
  const tool = crmTargetTools.find((t) => t.name === "crm_create_target")!;
  return (tool.handler as any)((tool.schema as any).parse(args), USER);
};

beforeEach(() => {
  jest.clearAllMocks();
  (prismadb.crm_Targets.create as jest.Mock).mockImplementation(({ data }: any) => ({ id: "t1", ...data }));
});

it("creates a COMPANY target with only a company name", async () => {
  await createThroughSchema({ type: "COMPANY", company: "Acme Inc" });
  const data = (prismadb.crm_Targets.create as jest.Mock).mock.calls[0][0].data;
  expect(data.type).toBe("COMPANY");
  expect(data.company).toBe("Acme Inc");
  expect(data.last_name).toBe("");
});

it("creates an INDIVIDUAL target with only a last name", async () => {
  await createThroughSchema({ type: "INDIVIDUAL", last_name: "Lovelace" });
  const data = (prismadb.crm_Targets.create as jest.Mock).mock.calls[0][0].data;
  expect(data.type).toBe("INDIVIDUAL");
  expect(data.last_name).toBe("Lovelace");
});

it("rejects a COMPANY with no company name", async () => {
  await expect(createThroughSchema({ type: "COMPANY", last_name: "Lovelace" }))
    .rejects.toThrow(/company/i);
  expect(prismadb.crm_Targets.create).not.toHaveBeenCalled();
});

it("rejects an INDIVIDUAL with no last name", async () => {
  await expect(createThroughSchema({ type: "INDIVIDUAL", company: "Acme" }))
    .rejects.toThrow(/last name/i);
});

it("defaults type to COMPANY when omitted", async () => {
  await createThroughSchema({ company: "Acme Inc" });
  expect((prismadb.crm_Targets.create as jest.Mock).mock.calls[0][0].data.type).toBe("COMPANY");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec jest __tests__/mcp/crm-targets-type.test.ts` → FAIL (schema has no `type`; guard not type-aware).

- [ ] **Step 3: Implement**

In `lib/mcp/tools/crm-targets.ts`, add to the top imports:

```ts
import { normalizeTargetType, requiredIdentityField } from "@/lib/crm/target-type";
```

In the `crm_create_target` schema object add:

```ts
      type: z.enum(["INDIVIDUAL", "COMPANY"]).optional(),
```

Replace the create handler's existing identity guard with a type-aware one:

```ts
      const { last_name, ...rest } = args;
      const type = normalizeTargetType((args as { type?: string }).type);
      const required = requiredIdentityField(type);
      if (required === "company" && !rest.company) {
        throw new Error("A company target requires a company name");
      }
      if (required === "last_name" && !last_name) {
        throw new Error("An individual target requires a last name");
      }
      const target = await prismadb.crm_Targets.create({
        data: { last_name: last_name ?? "", ...rest, type, created_by: userId },
      });
```

In the `crm_update_target` schema object add the same `type: z.enum([...]).optional(),` line (update stays partial — no identity re-check on update, matching existing behavior). Add `type?: "INDIVIDUAL" | "COMPANY";` to both handler arg types.

- [ ] **Step 4: Run tests**

Run: `pnpm exec jest __tests__/mcp/crm-targets-type.test.ts __tests__/mcp/crm-targets-triage.test.ts` → PASS (the existing triage test's field-parity check still passes; `type` is additive).
Then `pnpm exec tsc --noEmit`.

- [ ] **Step 5: Commit**

```bash
git add lib/mcp/tools/crm-targets.ts __tests__/mcp/crm-targets-type.test.ts
git commit -m "feat(mcp): type-aware crm_create/update_target (Individual/Company)"
```

---

### Task 4: Web actions accept `type` + type-aware required (`create-target.ts`, `update-target.ts`)

**Files:**
- Modify: `actions/crm/targets/create-target.ts`, `actions/crm/targets/update-target.ts`
- Test: `__tests__/actions/create-target-type.test.ts`

**Interfaces:**
- Consumes: `normalizeTargetType`, `requiredIdentityField` from `@/lib/crm/target-type`.
- Produces: `createTarget` / `updateTarget` accepting `type` plus the full field set (`personal_email`, `company_email`, `company_phone`, `city`, `country`, `industry`, `employees`, `description`).

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/actions/create-target-type.test.ts
jest.mock("@/lib/prisma", () => ({ prismadb: { crm_Targets: { create: jest.fn() } } }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(async () => ({ id: "u1" })),
  AuthenticationError: class extends Error {},
}));
import { prismadb } from "@/lib/prisma";
import { createTarget } from "@/actions/crm/targets/create-target";

beforeEach(() => {
  jest.clearAllMocks();
  (prismadb.crm_Targets.create as jest.Mock).mockImplementation(({ data }: any) => ({ id: "t1", ...data }));
});

it("rejects a COMPANY target with no company name", async () => {
  const res = await createTarget({ type: "COMPANY", last_name: "X" });
  expect(res.error).toMatch(/company/i);
  expect(prismadb.crm_Targets.create).not.toHaveBeenCalled();
});

it("creates an INDIVIDUAL and persists description/industry pass-through", async () => {
  const res = await createTarget({ type: "INDIVIDUAL", last_name: "Lovelace", description: "note" });
  expect(res.data.type).toBe("INDIVIDUAL");
  expect(res.data.description).toBe("note");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec jest __tests__/actions/create-target-type.test.ts` → FAIL.

- [ ] **Step 3: Implement**

In `create-target.ts`: add `import { normalizeTargetType, requiredIdentityField } from "@/lib/crm/target-type";`. Extend the `data` param type with `type?: "INDIVIDUAL" | "COMPANY";` and the missing fields (`personal_email?`, `company_email?`, `company_phone?`, `city?`, `country?`, `industry?`, `employees?`, `description?`). Replace the guard:

```ts
  const { last_name, email, mobile_phone, ...rest } = data;
  const type = normalizeTargetType(data.type);
  const required = requiredIdentityField(type);
  if (required === "company" && !data.company) return { error: "A company target requires a company name" };
  if (required === "last_name" && !last_name) return { error: "An individual target requires a last name" };
```

and pass `type` into `create({ data: { last_name: last_name ?? "", email, mobile_phone, ...rest, type, created_by: user.id } })`.

In `update-target.ts`: add `type?: "INDIVIDUAL" | "COMPANY";` to the param type (already spreads `...rest` into `update`, so no other change needed — `type` flows through).

- [ ] **Step 4: Run tests + typecheck**

Run: `pnpm exec jest __tests__/actions/create-target-type.test.ts` → PASS; `pnpm exec tsc --noEmit`.

- [ ] **Step 5: Commit**

```bash
git add actions/crm/targets/create-target.ts actions/crm/targets/update-target.ts __tests__/actions/create-target-type.test.ts
git commit -m "feat(targets): type-aware create/update actions + full field set"
```

---

### Task 5: List — Type badge column, adaptive Name, Type filter

**Files:**
- Modify: `app/[locale]/(routes)/campaigns/targets/table-data/schema.tsx` (add `type` + `first_name`)
- Modify: `.../table-components/columns.tsx` (add `type` badge column + adaptive `name` column)
- Modify: `.../table-components/data-table-toolbar.tsx` (add Type faceted filter; filter search by company/name)

**Interfaces:**
- Consumes: `TARGET_TYPE_OPTIONS`, `targetTypeLabel`, `targetTypeBadgeVariant`, `resolveTargetTitle`, `normalizeTargetType` from `@/lib/crm/target-type`.

- [ ] **Step 1: Extend the row schema**

In `table-data/schema.tsx`, add to `targetSchema`:

```ts
  type: z.enum(["INDIVIDUAL", "COMPANY"]).default("COMPANY"),
  first_name: z.string().nullable().optional(),
```

- [ ] **Step 2: Add the Type badge + adaptive Name columns**

In `columns.tsx` add import `import { targetTypeLabel, targetTypeBadgeVariant, resolveTargetTitle } from "@/lib/crm/target-type";`. Add a `type` column (faceted-filterable, like `triage_status`) and a `name` display column placed first after `select`:

```tsx
  {
    id: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => <div className="font-medium">{resolveTargetTitle(row.original)}</div>,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "type",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
    cell: ({ row }) => {
      const v = (row.getValue("type") as string) ?? "COMPANY";
      return <Badge variant={targetTypeBadgeVariant(v)}>{targetTypeLabel(v)}</Badge>;
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
    enableSorting: true,
    enableHiding: true,
  },
```

Keep the existing `company` / `industry` / `company_website` columns (they render blank for individuals). Update `data-table.tsx` `DEFAULT_COLUMN_VISIBILITY` to keep `name` and `type` visible (they are visible by default already since they are not listed as hidden).

- [ ] **Step 3: Add the Type filter to the toolbar**

In `data-table-toolbar.tsx` add `import { TARGET_TYPE_OPTIONS } from "@/lib/crm/target-type";` and, next to the Triage filter:

```tsx
        {table.getColumn("type") && (
          <DataTableFacetedFilter
            column={table.getColumn("type")}
            title="Type"
            options={TARGET_TYPE_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
          />
        )}
```

- [ ] **Step 4: Verify**

Run: `pnpm exec tsc --noEmit` and `pnpm exec eslint <the three files> --max-warnings=0`. (Visual check happens in the dev-preview step of Task 9.)

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/(routes)/campaigns/targets/table-data/schema.tsx" "app/[locale]/(routes)/campaigns/targets/table-components/columns.tsx" "app/[locale]/(routes)/campaigns/targets/table-components/data-table-toolbar.tsx"
git commit -m "feat(targets): unified list with Type badge, adaptive Name, Type filter"
```

---

### Task 6: Forms — Type selector + conditional fields

**Files:**
- Modify: `app/[locale]/(routes)/campaigns/targets/components/NewTargetForm.tsx`
- Modify: `app/[locale]/(routes)/campaigns/targets/components/UpdateTargetForm.tsx`

**Interfaces:**
- Consumes: `TARGET_TYPES`, `TARGET_TYPE_OPTIONS`, `normalizeTargetType`, `requiredIdentityField`, `isFieldForType`, `fieldLabel` from `@/lib/crm/target-type`.

- [ ] **Step 1: Add `type` to each form's Zod schema with a type-aware refine**

In both forms' `z.object({...})`, add `type: z.enum(["INDIVIDUAL", "COMPANY"]).default("COMPANY"),` and wrap the schema with:

```ts
  .refine(
    (v) => (requiredIdentityField(v.type) === "company" ? !!v.company : !!v.last_name),
    (v) => ({
      message: requiredIdentityField(v.type) === "company"
        ? "Company name is required" : "Last name is required",
      path: [requiredIdentityField(v.type)],
    })
  )
```

- [ ] **Step 2: Add the Type selector control**

At the top of the form JSX, add a segmented control bound to the `type` field (use the existing `Select` or a shadcn radio/toggle group already imported in the forms). It sets `form.setValue("type", value)` and defaults to `"COMPANY"` (New) or the record value (Update).

- [ ] **Step 3: Gate each field group on the selected type**

Read the live value: `const type = normalizeTargetType(form.watch("type"));`. Wrap each per-type field (position, personal_website, industry, employees, company_website, company_email, company_phone, personal/company email+phone, first_name) with `{isFieldForType(type, "<key>") && ( ... )}`, and label the `company` field with `fieldLabel(type, "company")`. Shared fields (city, country, socials, description) render unconditionally. **Do not** reset hidden fields when `type` changes — leave their form values intact (Review Focus: no destructive wipe).

- [ ] **Step 4: Verify**

Run: `pnpm exec tsc --noEmit` and `eslint` on both files. Behavior is exercised by the E2E in Task 9.

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/(routes)/campaigns/targets/components/NewTargetForm.tsx" "app/[locale]/(routes)/campaigns/targets/components/UpdateTargetForm.tsx"
git commit -m "feat(targets): type selector + conditional fields in target forms"
```

---

### Task 7: Detail view — config-driven sections + adaptive title (`BasicView.tsx`)

**Files:**
- Modify: `app/[locale]/(routes)/campaigns/targets/[targetId]/components/BasicView.tsx`

**Interfaces:**
- Consumes: `normalizeTargetType`, `resolveTargetTitle`, `isFieldForType`, `fieldLabel`, `targetTypeLabel`, `targetTypeBadgeVariant` from `@/lib/crm/target-type`.

- [ ] **Step 1: Adaptive title + Type badge**

Replace the `CardTitle` body (`{data.first_name} {data.last_name}`) with `{resolveTargetTitle(data)}` and add a `<Badge variant={targetTypeBadgeVariant(data.type)}>{targetTypeLabel(data.type)}</Badge>` beside it. Compute `const type = normalizeTargetType(data.type);` at the top of the component.

- [ ] **Step 2: Gate the info blocks by type**

Wrap the person-only blocks (Position, Personal website, and the Contact-information card's person email/phones, and the personal Social-networks framing) and company-only blocks (Industry, Employees, Company website, Company email/phone) with `{isFieldForType(type, "<key>") && ( ... )}`. Add the shared **Industry**/**Location**/**Description** presentation for companies (folding in the superseded `feat/target-detail-fields` work): an Industry block (company only), a Location block showing `[city, country].filter(Boolean).join(", ")` (both types), and a full-width **Description** card rendered when `data.description` is present (both types). Label the company/employer field via `fieldLabel(type, "company")`.

- [ ] **Step 3: Verify**

Run: `pnpm exec tsc --noEmit` and `eslint`. Visual check in Task 9's dev preview.

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/(routes)/campaigns/targets/[targetId]/components/BasicView.tsx"
git commit -m "feat(targets): config-driven detail view (adaptive title, per-type fields, description)"
```

---

### Task 8: CSV import — optional `type` column, default COMPANY

**Files:**
- Modify: `actions/crm/targets/import-targets.ts`
- Modify: `actions/crm/targets/suggest-mapping.ts` (add `type` to mappable fields), and `lib/spreadsheet/target-fields.ts` (add `{ key: "type", label: "Type", required: false }`)
- Test: `__tests__/actions/import-targets-type.test.ts`

**Interfaces:**
- Consumes: `normalizeTargetType` from `@/lib/crm/target-type`.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/actions/import-targets-type.test.ts
// (Mirror the harness in __tests__/actions/import-targets-suppression.test.ts:
//  mock @/lib/prisma, @/lib/authz, and @/lib/spreadsheet/parse.)
// Assert: a row with type "INDIVIDUAL" imports as INDIVIDUAL; a row with no
// type imports as COMPANY; a row with a garbage type value imports as COMPANY.
```

Fill this in following `import-targets-suppression.test.ts` (read it): build a `FormData` with a fake file, mock `parseSpreadsheetFile` to return rows, and assert on the `createMany` `data` argument's `type` values.

- [ ] **Step 2: Run to verify it fails.** `pnpm exec jest __tests__/actions/import-targets-type.test.ts`

- [ ] **Step 3: Implement**

In `import-targets.ts` add `import { normalizeTargetType } from "@/lib/crm/target-type";` and, in the `valid.push({...})` object, add `type: normalizeTargetType(row.type),`. In `lib/spreadsheet/target-fields.ts` add the `type` entry so the mapping UI offers it. In `suggest-mapping.ts` ensure `type` is an allowed target field (it reads `TARGET_FIELDS`, so adding it there is sufficient — verify).

- [ ] **Step 4: Run tests + typecheck.** PASS.

- [ ] **Step 5: Commit**

```bash
git add actions/crm/targets/import-targets.ts actions/crm/targets/suggest-mapping.ts lib/spreadsheet/target-fields.ts __tests__/actions/import-targets-type.test.ts
git commit -m "feat(targets): CSV import accepts optional type (default COMPANY)"
```

---

### Task 9: E2E, manual-test parity, dev-preview check, and doc-sync

**Files:**
- Create: `tests/e2e/target-type.spec.ts`
- Modify: the manual-test doc under `docs/testing/` (matching steps), `docs/testing/e2e-patterns.md` if a new pattern is used
- Modify: `docs/reference/UPSTREAM_IMPACT_LOG.md`, `docs/reference/PROJECT_STRUCTURE.md`, the data-model doc; `docs/reference/LESSONS_LEARNED.md` only if a gotcha surfaced

- [ ] **Step 1: Write the E2E spec** (`tests/e2e/target-type.spec.ts`), following `docs/testing/e2e-patterns.md` (read it first — RSC hydration waits, one-shot mocks, auth-user FK cleanup order). Cover: create a Company target (only company fields + required company name), create an Individual target (person fields + required last name), assert the list shows a Type badge and the Type filter narrows results, and the detail title is the company name / person name respectively.

- [ ] **Step 2: Run the E2E locally** per the repo's Playwright invocation; fix until green.

- [ ] **Step 3: Add the matching manual-test steps** (bidirectional parity) in the targets manual-test doc.

- [ ] **Step 4: Dev-preview visual check.** With the local stack up, `preview_start` `nextcrm-dev`, sign in via the `test-otp` flow, create one target of each type, and confirm the list badge/filter and both detail titles render correctly.

- [ ] **Step 5: Doc-sync.** Append the upstream-owned touches to `UPSTREAM_IMPACT_LOG.md` (schema, `crm-targets.ts`, `create-target.ts`, `update-target.ts`, `import-targets.ts`, `suggest-mapping.ts`, `target-fields.ts`, both forms, `BasicView.tsx`, `columns.tsx`, `data-table-toolbar.tsx`, `table-data/schema.tsx`). Add `lib/crm/target-type.ts` to `PROJECT_STRUCTURE.md`. Update the data-model doc with the `type` column.

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/target-type.spec.ts docs/
git commit -m "test(e2e)+docs: target type E2E, manual-test parity, doc-sync"
```

---

## Post-merge (not tasks — operational)

- Additive migration → **migration-first**: this PR's migration deploys to QA via `advance-qa` (Vercel runs `prisma migrate deploy`). Remind the user after merge; do not apply by hand.
- After QA deploy, reconnect the QA MCP so the session picks up the `type` param, then (optionally) set the 28 existing targets' details and re-run enrichment.
