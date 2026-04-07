# MCP Server Full Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the MCP server from 25 tools to ~95, covering all CRM functionality so a bot can operate the app identically to a frontend user.

**Architecture:** Hybrid approach — flat tool files per domain in `lib/mcp/tools/` with shared helpers in `lib/mcp/helpers.ts`. No service-layer extraction. Barrel export via `lib/mcp/tools/index.ts`. Route handler simplified to single `allTools` import.

**Tech Stack:** TypeScript, Zod, Prisma ORM, `mcp-handler` + `@modelcontextprotocol/sdk`, AWS S3 (MinIO), Inngest (async jobs)

**Spec:** `docs/superpowers/specs/2026-04-06-mcp-full-parity-design.md`

---

## File Map

| File | Status | Responsibility |
|------|--------|----------------|
| `lib/mcp/helpers.ts` | Create | Shared pagination, soft-delete, search, response, error helpers |
| `lib/mcp/tools/index.ts` | Create | Barrel export collecting all tool arrays into `allTools` |
| `lib/mcp/tools/crm-accounts.ts` | Rename from `accounts.ts` | Accounts CRUD + delete (6 tools) |
| `lib/mcp/tools/crm-contacts.ts` | Rename from `contacts.ts` | Contacts CRUD + delete (6 tools) |
| `lib/mcp/tools/crm-leads.ts` | Rename from `leads.ts` | Leads CRUD + delete (6 tools) |
| `lib/mcp/tools/crm-opportunities.ts` | Rename from `opportunities.ts` | Opportunities CRUD + delete (6 tools) |
| `lib/mcp/tools/crm-targets.ts` | Rename from `targets.ts` | Targets CRUD + delete (6 tools) |
| `lib/mcp/tools/crm-products.ts` | Create | Products CRUD + delete (5 tools) |
| `lib/mcp/tools/crm-contracts.ts` | Create | Contracts CRUD + delete with line items (5 tools) |
| `lib/mcp/tools/crm-activities.ts` | Create | Activities CRUD + delete with entity links (5 tools) |
| `lib/mcp/tools/crm-documents.ts` | Create | Documents lifecycle + presigned URLs + entity linking (8 tools) |
| `lib/mcp/tools/crm-target-lists.ts` | Create | Target lists CRUD + membership management (7 tools) |
| `lib/mcp/tools/crm-enrichment.ts` | Create | Contact + target enrichment, single + bulk (4 tools) |
| `lib/mcp/tools/crm-email-accounts.ts` | Create | List email accounts (1 tool) |
| `lib/mcp/tools/campaigns.ts` | Create | Campaigns lifecycle + templates + steps + stats (19 tools) |
| `lib/mcp/tools/projects.ts` | Create | Boards + sections + tasks + comments + watchers (18 tools) |
| `lib/mcp/tools/reports.ts` | Create | List + run reports (2 tools) |
| `app/api/mcp/[transport]/route.ts` | Modify | Simplify to import `allTools` from barrel |
| `docs/soft-delete-gaps.md` | Create | Audit of models missing status field for soft delete |

---

## Task 1: Create Shared Helpers

**Files:**
- Create: `lib/mcp/helpers.ts`

- [ ] **Step 1: Create `lib/mcp/helpers.ts`**

```typescript
import { z } from "zod";

// ── Pagination ──────────────────────────────────────────────────

export const paginationSchema = {
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
};

export function paginationArgs(args: { limit: number; offset: number }) {
  return { take: args.limit, skip: args.offset };
}

// ── Search ──────────────────────────────────────────────────────

export function ilike(field: string, value: string) {
  return { [field]: { contains: value, mode: "insensitive" as const } };
}

// ── Soft Delete ─────────────────────────────────────────────────

export function softDeleteUpdate(userId: string) {
  return { status: "DELETED", updatedBy: userId, updatedAt: new Date() };
}

export function isNotDeleted() {
  return { status: { not: "DELETED" } };
}

// ── Response Helpers ────────────────────────────────────────────

export function listResponse<T>(data: T[], total: number, offset: number) {
  return { data, total, offset };
}

export function itemResponse<T>(data: T) {
  return { data };
}

// ── Error Helpers ───────────────────────────────────────────────

export function notFound(entity: string): never {
  throw new Error("NOT_FOUND");
}

export function conflict(msg: string): never {
  throw new Error(`CONFLICT: ${msg}`);
}

export function validationError(msg: string): never {
  throw new Error(`VALIDATION_ERROR: ${msg}`);
}

export function externalError(msg: string): never {
  throw new Error(`EXTERNAL_ERROR: ${msg}`);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/pavel-clawdbot/.openclaw/workspace-chopper/development/nextcrm-app && pnpm exec tsc --noEmit lib/mcp/helpers.ts 2>&1 | head -20`

If there are path/tsconfig issues, just verify there are no syntax errors by checking that the file parses: `pnpm exec tsc --noEmit --skipLibCheck 2>&1 | grep helpers`

- [ ] **Step 3: Commit**

```bash
git add lib/mcp/helpers.ts
git commit -m "feat(mcp): add shared helpers for pagination, search, soft-delete, errors"
```

---

## Task 2: Rename & Refactor Existing Account Tools

**Files:**
- Create: `lib/mcp/tools/crm-accounts.ts` (from `accounts.ts`)
- Delete: `lib/mcp/tools/accounts.ts`

- [ ] **Step 1: Create `lib/mcp/tools/crm-accounts.ts`**

Rename tools with `crm_` prefix, use helpers, add `crm_delete_account`:

```typescript
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import {
  paginationSchema,
  paginationArgs,
  listResponse,
  itemResponse,
  ilike,
  isNotDeleted,
  notFound,
  conflict,
} from "../helpers";

export const crmAccountTools = [
  {
    name: "crm_list_accounts",
    description: "List CRM accounts assigned to the authenticated user",
    schema: z.object({
      ...paginationSchema,
    }),
    async handler(args: { limit: number; offset: number }, userId: string) {
      const where = { assigned_to: userId, ...isNotDeleted() };
      const [data, total] = await Promise.all([
        prismadb.crm_Accounts.findMany({
          where,
          ...paginationArgs(args),
          orderBy: { createdAt: "desc" },
        }),
        prismadb.crm_Accounts.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "crm_get_account",
    description: "Get a single CRM account by ID",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const account = await prismadb.crm_Accounts.findFirst({
        where: { id: args.id, assigned_to: userId, ...isNotDeleted() },
      });
      if (!account) notFound("Account");
      return itemResponse(account);
    },
  },
  {
    name: "crm_search_accounts",
    description: "Search accounts by name or website (substring match)",
    schema: z.object({
      query: z.string().min(1),
      ...paginationSchema,
    }),
    async handler(
      args: { query: string; limit: number; offset: number },
      userId: string
    ) {
      const where = {
        assigned_to: userId,
        ...isNotDeleted(),
        OR: [ilike("name", args.query), ilike("website", args.query)],
      };
      const [data, total] = await Promise.all([
        prismadb.crm_Accounts.findMany({
          where,
          ...paginationArgs(args),
          orderBy: { createdAt: "desc" },
        }),
        prismadb.crm_Accounts.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "crm_create_account",
    description: "Create a new CRM account",
    schema: z.object({
      name: z.string().min(1),
      email: z.string().email().optional(),
      description: z.string().optional(),
      office_phone: z.string().optional(),
      website: z.string().optional(),
    }),
    async handler(
      args: {
        name: string;
        email?: string;
        description?: string;
        office_phone?: string;
        website?: string;
      },
      userId: string
    ) {
      const { name, ...rest } = args;
      const account = await prismadb.crm_Accounts.create({
        data: {
          v: 0,
          name,
          ...rest,
          assigned_to: userId,
          createdBy: userId,
          updatedBy: userId,
          status: "Active",
        },
      });
      return itemResponse(account);
    },
  },
  {
    name: "crm_update_account",
    description: "Update an existing CRM account by ID",
    schema: z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      description: z.string().optional(),
      office_phone: z.string().optional(),
      website: z.string().optional(),
    }),
    async handler(
      args: {
        id: string;
        name?: string;
        email?: string;
        description?: string;
        office_phone?: string;
        website?: string;
      },
      userId: string
    ) {
      const existing = await prismadb.crm_Accounts.findFirst({
        where: { id: args.id, assigned_to: userId, ...isNotDeleted() },
      });
      if (!existing) notFound("Account");
      const { id, ...updateData } = args;
      const account = await prismadb.crm_Accounts.update({
        where: { id },
        data: { ...updateData, updatedBy: userId },
      });
      return itemResponse(account);
    },
  },
  {
    name: "crm_delete_account",
    description: "Soft-delete a CRM account by ID (sets status to DELETED)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const existing = await prismadb.crm_Accounts.findFirst({
        where: { id: args.id, assigned_to: userId, ...isNotDeleted() },
      });
      if (!existing) notFound("Account");
      const account = await prismadb.crm_Accounts.update({
        where: { id: args.id },
        data: { status: "DELETED", updatedBy: userId },
      });
      return itemResponse({ id: account.id, status: "DELETED" });
    },
  },
];
```

- [ ] **Step 2: Delete old `lib/mcp/tools/accounts.ts`**

```bash
rm lib/mcp/tools/accounts.ts
```

- [ ] **Step 3: Commit**

```bash
git add lib/mcp/tools/crm-accounts.ts
git add -u lib/mcp/tools/accounts.ts
git commit -m "feat(mcp): rename account tools with crm_ prefix, add soft-delete, use helpers"
```

---

## Task 3: Rename & Refactor Contacts, Leads, Opportunities, Targets

**Files:**
- Create: `lib/mcp/tools/crm-contacts.ts`, `crm-leads.ts`, `crm-opportunities.ts`, `crm-targets.ts`
- Delete: `lib/mcp/tools/contacts.ts`, `leads.ts`, `opportunities.ts`, `targets.ts`

Apply the same pattern as Task 2 to each file:
1. Rename export to `crm{Entity}Tools`
2. Add `crm_` prefix to all tool names
3. Import and use helpers (`paginationSchema`, `paginationArgs`, `listResponse`, `itemResponse`, `ilike`, `isNotDeleted`, `notFound`)
4. Add `isNotDeleted()` to all `where` clauses
5. Add `crm_delete_{entity}` tool — for contacts/leads/targets (no status field), throw `conflict("Soft delete not yet supported for this entity. See docs/soft-delete-gaps.md")`
6. For opportunities (has status field), implement soft delete by setting status to `DELETED`

- [ ] **Step 1: Create `lib/mcp/tools/crm-contacts.ts`**

Same pattern as `crm-accounts.ts`. Key differences:
- Export name: `crmContactTools`
- Model: `prismadb.crm_Contacts`
- Scoping: `assigned_to: userId`
- OrderBy: `created_on: "desc"` (not `createdAt`)
- Search fields: `first_name`, `last_name`, `email`, `office_phone`, `mobile_phone`
- Create fields: `first_name?`, `last_name` (required), `email?`, `office_phone?`, `mobile_phone?`, `position?`
- Create data: `v: 0`, `assigned_to: userId`, `createdBy: userId`, `updatedBy: userId`
- Delete: `conflict("Soft delete not yet supported for Contacts. See docs/soft-delete-gaps.md")`

```typescript
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import {
  paginationSchema,
  paginationArgs,
  listResponse,
  itemResponse,
  ilike,
  notFound,
  conflict,
} from "../helpers";

export const crmContactTools = [
  {
    name: "crm_list_contacts",
    description: "List CRM contacts assigned to the authenticated user",
    schema: z.object({ ...paginationSchema }),
    async handler(args: { limit: number; offset: number }, userId: string) {
      const where = { assigned_to: userId };
      const [data, total] = await Promise.all([
        prismadb.crm_Contacts.findMany({
          where,
          ...paginationArgs(args),
          orderBy: { created_on: "desc" },
        }),
        prismadb.crm_Contacts.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "crm_get_contact",
    description: "Get a single CRM contact by ID",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const contact = await prismadb.crm_Contacts.findFirst({
        where: { id: args.id, assigned_to: userId },
      });
      if (!contact) notFound("Contact");
      return itemResponse(contact);
    },
  },
  {
    name: "crm_search_contacts",
    description: "Search contacts by name, email, or phone (substring match)",
    schema: z.object({ query: z.string().min(1), ...paginationSchema }),
    async handler(
      args: { query: string; limit: number; offset: number },
      userId: string
    ) {
      const where = {
        assigned_to: userId,
        OR: [
          ilike("first_name", args.query),
          ilike("last_name", args.query),
          ilike("email", args.query),
          ilike("office_phone", args.query),
          ilike("mobile_phone", args.query),
        ],
      };
      const [data, total] = await Promise.all([
        prismadb.crm_Contacts.findMany({
          where,
          ...paginationArgs(args),
          orderBy: { created_on: "desc" },
        }),
        prismadb.crm_Contacts.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "crm_create_contact",
    description: "Create a new CRM contact",
    schema: z.object({
      first_name: z.string().min(1).optional(),
      last_name: z.string().min(1),
      email: z.string().email().optional(),
      office_phone: z.string().optional(),
      mobile_phone: z.string().optional(),
      position: z.string().optional(),
    }),
    async handler(
      args: {
        first_name?: string;
        last_name: string;
        email?: string;
        office_phone?: string;
        mobile_phone?: string;
        position?: string;
      },
      userId: string
    ) {
      const { last_name, ...rest } = args;
      const contact = await prismadb.crm_Contacts.create({
        data: {
          v: 0,
          last_name,
          ...rest,
          assigned_to: userId,
          createdBy: userId,
          updatedBy: userId,
        },
      });
      return itemResponse(contact);
    },
  },
  {
    name: "crm_update_contact",
    description: "Update an existing CRM contact by ID",
    schema: z.object({
      id: z.string().uuid(),
      first_name: z.string().min(1).optional(),
      last_name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      office_phone: z.string().optional(),
      mobile_phone: z.string().optional(),
      position: z.string().optional(),
    }),
    async handler(
      args: {
        id: string;
        first_name?: string;
        last_name?: string;
        email?: string;
        office_phone?: string;
        mobile_phone?: string;
        position?: string;
      },
      userId: string
    ) {
      const existing = await prismadb.crm_Contacts.findFirst({
        where: { id: args.id, assigned_to: userId },
      });
      if (!existing) notFound("Contact");
      const { id, ...updateData } = args;
      const contact = await prismadb.crm_Contacts.update({
        where: { id },
        data: { ...updateData, updatedBy: userId },
      });
      return itemResponse(contact);
    },
  },
  {
    name: "crm_delete_contact",
    description: "Soft-delete a CRM contact (not yet supported — pending schema migration)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(_args: { id: string }, _userId: string) {
      conflict("Soft delete not yet supported for Contacts. See docs/soft-delete-gaps.md");
    },
  },
];
```

- [ ] **Step 2: Create `lib/mcp/tools/crm-leads.ts`**

Same pattern. Key differences:
- Export: `crmLeadTools`
- Model: `prismadb.crm_Leads`
- Scoping: `assigned_to: userId`
- OrderBy: `createdAt: "desc"`
- Search fields: `firstName`, `lastName`, `email`, `company` (camelCase — different from contacts!)
- Create fields: `firstName?`, `lastName` (required), `email?`, `company?`, `phone?`, `jobTitle?`
- Create data: `v: 0`, `assigned_to: userId`, `createdBy: userId`
- Delete: `conflict(...)` — no status field

```typescript
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import {
  paginationSchema,
  paginationArgs,
  listResponse,
  itemResponse,
  ilike,
  notFound,
  conflict,
} from "../helpers";

export const crmLeadTools = [
  {
    name: "crm_list_leads",
    description: "List CRM leads assigned to the authenticated user",
    schema: z.object({ ...paginationSchema }),
    async handler(args: { limit: number; offset: number }, userId: string) {
      const where = { assigned_to: userId };
      const [data, total] = await Promise.all([
        prismadb.crm_Leads.findMany({
          where,
          ...paginationArgs(args),
          orderBy: { createdAt: "desc" },
        }),
        prismadb.crm_Leads.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "crm_get_lead",
    description: "Get a single CRM lead by ID",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const lead = await prismadb.crm_Leads.findFirst({
        where: { id: args.id, assigned_to: userId },
      });
      if (!lead) notFound("Lead");
      return itemResponse(lead);
    },
  },
  {
    name: "crm_search_leads",
    description: "Search leads by name, company, or email (substring match)",
    schema: z.object({ query: z.string().min(1), ...paginationSchema }),
    async handler(
      args: { query: string; limit: number; offset: number },
      userId: string
    ) {
      const where = {
        assigned_to: userId,
        OR: [
          ilike("firstName", args.query),
          ilike("lastName", args.query),
          ilike("email", args.query),
          ilike("company", args.query),
        ],
      };
      const [data, total] = await Promise.all([
        prismadb.crm_Leads.findMany({
          where,
          ...paginationArgs(args),
          orderBy: { createdAt: "desc" },
        }),
        prismadb.crm_Leads.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "crm_create_lead",
    description: "Create a new CRM lead",
    schema: z.object({
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1),
      email: z.string().email().optional(),
      company: z.string().optional(),
      phone: z.string().optional(),
      jobTitle: z.string().optional(),
    }),
    async handler(
      args: {
        firstName?: string;
        lastName: string;
        email?: string;
        company?: string;
        phone?: string;
        jobTitle?: string;
      },
      userId: string
    ) {
      const { lastName, ...rest } = args;
      const lead = await prismadb.crm_Leads.create({
        data: { v: 0, lastName, ...rest, assigned_to: userId, createdBy: userId },
      });
      return itemResponse(lead);
    },
  },
  {
    name: "crm_update_lead",
    description: "Update an existing CRM lead by ID",
    schema: z.object({
      id: z.string().uuid(),
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      email: z.string().email().optional(),
      company: z.string().optional(),
      phone: z.string().optional(),
      jobTitle: z.string().optional(),
    }),
    async handler(
      args: {
        id: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        company?: string;
        phone?: string;
        jobTitle?: string;
      },
      userId: string
    ) {
      const existing = await prismadb.crm_Leads.findFirst({
        where: { id: args.id, assigned_to: userId },
      });
      if (!existing) notFound("Lead");
      const { id, ...updateData } = args;
      const lead = await prismadb.crm_Leads.update({
        where: { id },
        data: { ...updateData, updatedBy: userId },
      });
      return itemResponse(lead);
    },
  },
  {
    name: "crm_delete_lead",
    description: "Soft-delete a CRM lead (not yet supported — pending schema migration)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(_args: { id: string }, _userId: string) {
      conflict("Soft delete not yet supported for Leads. See docs/soft-delete-gaps.md");
    },
  },
];
```

- [ ] **Step 3: Create `lib/mcp/tools/crm-opportunities.ts`**

Key differences:
- Export: `crmOpportunityTools`
- Model: `prismadb.crm_Opportunities`
- Has `status` field — soft delete sets `status: "DELETED"`
- OrderBy: `createdAt: "desc"`
- Search: `name`, `description`
- Create: `name`, `description?`, `close_date?` (DateTime), `budget?` (number→Int), `expected_revenue?` (number→Int), `currency?`, `next_step?`
- `isNotDeleted()` on all where clauses

```typescript
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import {
  paginationSchema,
  paginationArgs,
  listResponse,
  itemResponse,
  ilike,
  isNotDeleted,
  notFound,
} from "../helpers";

export const crmOpportunityTools = [
  {
    name: "crm_list_opportunities",
    description: "List CRM opportunities assigned to the authenticated user",
    schema: z.object({ ...paginationSchema }),
    async handler(args: { limit: number; offset: number }, userId: string) {
      const where = { assigned_to: userId, ...isNotDeleted() };
      const [data, total] = await Promise.all([
        prismadb.crm_Opportunities.findMany({
          where,
          ...paginationArgs(args),
          orderBy: { createdAt: "desc" },
        }),
        prismadb.crm_Opportunities.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "crm_get_opportunity",
    description: "Get a single CRM opportunity by ID",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const opp = await prismadb.crm_Opportunities.findFirst({
        where: { id: args.id, assigned_to: userId, ...isNotDeleted() },
      });
      if (!opp) notFound("Opportunity");
      return itemResponse(opp);
    },
  },
  {
    name: "crm_search_opportunities",
    description: "Search opportunities by name or description (substring match)",
    schema: z.object({ query: z.string().min(1), ...paginationSchema }),
    async handler(
      args: { query: string; limit: number; offset: number },
      userId: string
    ) {
      const where = {
        assigned_to: userId,
        ...isNotDeleted(),
        OR: [ilike("name", args.query), ilike("description", args.query)],
      };
      const [data, total] = await Promise.all([
        prismadb.crm_Opportunities.findMany({
          where,
          ...paginationArgs(args),
          orderBy: { createdAt: "desc" },
        }),
        prismadb.crm_Opportunities.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "crm_create_opportunity",
    description: "Create a new CRM opportunity",
    schema: z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      close_date: z.string().datetime().optional(),
      budget: z.number().int().min(0).optional(),
      expected_revenue: z.number().int().min(0).optional(),
      currency: z.string().optional(),
      next_step: z.string().optional(),
    }),
    async handler(
      args: {
        name: string;
        description?: string;
        close_date?: string;
        budget?: number;
        expected_revenue?: number;
        currency?: string;
        next_step?: string;
      },
      userId: string
    ) {
      const { name, budget, expected_revenue, close_date, ...rest } = args;
      const opp = await prismadb.crm_Opportunities.create({
        data: {
          v: 0,
          name,
          ...rest,
          ...(budget !== undefined && { budget }),
          ...(expected_revenue !== undefined && { expected_revenue }),
          ...(close_date !== undefined && { close_date: new Date(close_date) }),
          assigned_to: userId,
          createdBy: userId,
          updatedBy: userId,
        },
      });
      return itemResponse(opp);
    },
  },
  {
    name: "crm_update_opportunity",
    description: "Update an existing CRM opportunity by ID",
    schema: z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      close_date: z.string().datetime().optional(),
      budget: z.number().int().min(0).optional(),
      expected_revenue: z.number().int().min(0).optional(),
      currency: z.string().optional(),
      next_step: z.string().optional(),
    }),
    async handler(
      args: {
        id: string;
        name?: string;
        description?: string;
        close_date?: string;
        budget?: number;
        expected_revenue?: number;
        currency?: string;
        next_step?: string;
      },
      userId: string
    ) {
      const existing = await prismadb.crm_Opportunities.findFirst({
        where: { id: args.id, assigned_to: userId, ...isNotDeleted() },
      });
      if (!existing) notFound("Opportunity");
      const { id, budget, expected_revenue, close_date, currency, ...rest } = args;
      const opp = await prismadb.crm_Opportunities.update({
        where: { id },
        data: {
          ...rest,
          ...(currency !== undefined && { currency }),
          ...(budget !== undefined && { budget }),
          ...(expected_revenue !== undefined && { expected_revenue }),
          ...(close_date !== undefined && { close_date: new Date(close_date) }),
          updatedBy: userId,
        },
      });
      return itemResponse(opp);
    },
  },
  {
    name: "crm_delete_opportunity",
    description: "Soft-delete a CRM opportunity by ID (sets status to DELETED)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const existing = await prismadb.crm_Opportunities.findFirst({
        where: { id: args.id, assigned_to: userId, ...isNotDeleted() },
      });
      if (!existing) notFound("Opportunity");
      const opp = await prismadb.crm_Opportunities.update({
        where: { id: args.id },
        data: { status: "DELETED", updatedBy: userId },
      });
      return itemResponse({ id: opp.id, status: "DELETED" });
    },
  },
];
```

- [ ] **Step 4: Create `lib/mcp/tools/crm-targets.ts`**

Key differences:
- Export: `crmTargetTools`
- Model: `prismadb.crm_Targets`
- Scoping: `created_by: userId` (NOT `assigned_to`)
- OrderBy: `created_on: "desc"`
- Search: `first_name`, `last_name`, `email`, `company`
- Create: `first_name?`, `last_name` (required), `email?`, `mobile_phone?`, `office_phone?`, `company?`, `position?`
- Create data: `created_by: userId` (no `v` field, no `updatedBy`)
- Update data: `updatedBy: userId`
- Delete: `conflict(...)` — no status field

```typescript
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import {
  paginationSchema,
  paginationArgs,
  listResponse,
  itemResponse,
  ilike,
  notFound,
  conflict,
} from "../helpers";

export const crmTargetTools = [
  {
    name: "crm_list_targets",
    description: "List CRM targets created by the authenticated user",
    schema: z.object({ ...paginationSchema }),
    async handler(args: { limit: number; offset: number }, userId: string) {
      const where = { created_by: userId };
      const [data, total] = await Promise.all([
        prismadb.crm_Targets.findMany({
          where,
          ...paginationArgs(args),
          orderBy: { created_on: "desc" },
        }),
        prismadb.crm_Targets.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "crm_get_target",
    description: "Get a single CRM target by ID",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const target = await prismadb.crm_Targets.findFirst({
        where: { id: args.id, created_by: userId },
      });
      if (!target) notFound("Target");
      return itemResponse(target);
    },
  },
  {
    name: "crm_search_targets",
    description: "Search targets by name, email, or company (substring match)",
    schema: z.object({ query: z.string().min(1), ...paginationSchema }),
    async handler(
      args: { query: string; limit: number; offset: number },
      userId: string
    ) {
      const where = {
        created_by: userId,
        OR: [
          ilike("first_name", args.query),
          ilike("last_name", args.query),
          ilike("email", args.query),
          ilike("company", args.query),
        ],
      };
      const [data, total] = await Promise.all([
        prismadb.crm_Targets.findMany({
          where,
          ...paginationArgs(args),
          orderBy: { created_on: "desc" },
        }),
        prismadb.crm_Targets.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "crm_create_target",
    description: "Create a new CRM target",
    schema: z.object({
      first_name: z.string().min(1).optional(),
      last_name: z.string().min(1),
      email: z.string().email().optional(),
      mobile_phone: z.string().optional(),
      office_phone: z.string().optional(),
      company: z.string().optional(),
      position: z.string().optional(),
    }),
    async handler(
      args: {
        first_name?: string;
        last_name: string;
        email?: string;
        mobile_phone?: string;
        office_phone?: string;
        company?: string;
        position?: string;
      },
      userId: string
    ) {
      const { last_name, ...rest } = args;
      const target = await prismadb.crm_Targets.create({
        data: { last_name, ...rest, created_by: userId },
      });
      return itemResponse(target);
    },
  },
  {
    name: "crm_update_target",
    description: "Update an existing CRM target by ID",
    schema: z.object({
      id: z.string().uuid(),
      first_name: z.string().min(1).optional(),
      last_name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      mobile_phone: z.string().optional(),
      office_phone: z.string().optional(),
      company: z.string().optional(),
      position: z.string().optional(),
    }),
    async handler(
      args: {
        id: string;
        first_name?: string;
        last_name?: string;
        email?: string;
        mobile_phone?: string;
        office_phone?: string;
        company?: string;
        position?: string;
      },
      userId: string
    ) {
      const existing = await prismadb.crm_Targets.findFirst({
        where: { id: args.id, created_by: userId },
      });
      if (!existing) notFound("Target");
      const { id, ...updateData } = args;
      const target = await prismadb.crm_Targets.update({
        where: { id },
        data: { ...updateData, updatedBy: userId },
      });
      return itemResponse(target);
    },
  },
  {
    name: "crm_delete_target",
    description: "Soft-delete a CRM target (not yet supported — pending schema migration)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(_args: { id: string }, _userId: string) {
      conflict("Soft delete not yet supported for Targets. See docs/soft-delete-gaps.md");
    },
  },
];
```

- [ ] **Step 5: Delete old files**

```bash
rm lib/mcp/tools/contacts.ts lib/mcp/tools/leads.ts lib/mcp/tools/opportunities.ts lib/mcp/tools/targets.ts
```

- [ ] **Step 6: Commit**

```bash
git add lib/mcp/tools/crm-contacts.ts lib/mcp/tools/crm-leads.ts lib/mcp/tools/crm-opportunities.ts lib/mcp/tools/crm-targets.ts
git add -u lib/mcp/tools/contacts.ts lib/mcp/tools/leads.ts lib/mcp/tools/opportunities.ts lib/mcp/tools/targets.ts
git commit -m "feat(mcp): rename contacts/leads/opportunities/targets with crm_ prefix, add delete stubs"
```

---

## Task 4: Create Products Tools

**Files:**
- Create: `lib/mcp/tools/crm-products.ts`

- [ ] **Step 1: Create `lib/mcp/tools/crm-products.ts`**

Products are org-wide (no user filter on reads). Has `status` field (DRAFT/ACTIVE/ARCHIVED) and `deletedAt` — soft delete uses `deletedAt`.

```typescript
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import {
  paginationSchema,
  paginationArgs,
  listResponse,
  itemResponse,
  ilike,
  notFound,
} from "../helpers";

export const crmProductTools = [
  {
    name: "crm_list_products",
    description: "List CRM products (org-wide catalog)",
    schema: z.object({
      status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
      ...paginationSchema,
    }),
    async handler(
      args: { status?: string; limit: number; offset: number },
      _userId: string
    ) {
      const where = {
        deletedAt: null,
        ...(args.status && { status: args.status as any }),
      };
      const [data, total] = await Promise.all([
        prismadb.crm_Products.findMany({
          where,
          ...paginationArgs(args),
          orderBy: { createdAt: "desc" },
          include: { category: true },
        }),
        prismadb.crm_Products.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "crm_get_product",
    description: "Get a single CRM product by ID",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, _userId: string) {
      const product = await prismadb.crm_Products.findFirst({
        where: { id: args.id, deletedAt: null },
        include: { category: true },
      });
      if (!product) notFound("Product");
      return itemResponse(product);
    },
  },
  {
    name: "crm_create_product",
    description: "Create a new CRM product",
    schema: z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      sku: z.string().optional(),
      type: z.enum(["PRODUCT", "SERVICE"]),
      unit_price: z.number().min(0),
      unit_cost: z.number().min(0).optional(),
      currency: z.string().length(3),
      tax_rate: z.number().min(0).max(100).optional(),
      unit: z.string().optional(),
      is_recurring: z.boolean().optional(),
      billing_period: z.enum(["MONTHLY", "QUARTERLY", "SEMIANNUALLY", "ANNUALLY"]).optional(),
      categoryId: z.string().uuid().optional(),
    }),
    async handler(
      args: {
        name: string;
        description?: string;
        sku?: string;
        type: string;
        unit_price: number;
        unit_cost?: number;
        currency: string;
        tax_rate?: number;
        unit?: string;
        is_recurring?: boolean;
        billing_period?: string;
        categoryId?: string;
      },
      userId: string
    ) {
      const product = await prismadb.crm_Products.create({
        data: {
          name: args.name,
          description: args.description,
          sku: args.sku,
          type: args.type as any,
          status: "DRAFT",
          unit_price: args.unit_price,
          unit_cost: args.unit_cost,
          currency: args.currency,
          tax_rate: args.tax_rate,
          unit: args.unit,
          is_recurring: args.is_recurring ?? false,
          billing_period: args.billing_period as any,
          categoryId: args.categoryId,
          createdBy: userId,
          updatedBy: userId,
        },
      });
      return itemResponse(product);
    },
  },
  {
    name: "crm_update_product",
    description: "Update an existing CRM product by ID",
    schema: z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      sku: z.string().optional(),
      type: z.enum(["PRODUCT", "SERVICE"]).optional(),
      status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
      unit_price: z.number().min(0).optional(),
      unit_cost: z.number().min(0).optional(),
      currency: z.string().length(3).optional(),
      tax_rate: z.number().min(0).max(100).optional(),
      unit: z.string().optional(),
      is_recurring: z.boolean().optional(),
      billing_period: z.enum(["MONTHLY", "QUARTERLY", "SEMIANNUALLY", "ANNUALLY"]).optional(),
      categoryId: z.string().uuid().optional(),
    }),
    async handler(args: Record<string, any>, userId: string) {
      const existing = await prismadb.crm_Products.findFirst({
        where: { id: args.id, deletedAt: null },
      });
      if (!existing) notFound("Product");
      const { id, ...updateData } = args;
      const product = await prismadb.crm_Products.update({
        where: { id },
        data: { ...updateData, updatedBy: userId },
      });
      return itemResponse(product);
    },
  },
  {
    name: "crm_delete_product",
    description: "Soft-delete a CRM product (sets deletedAt timestamp)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const existing = await prismadb.crm_Products.findFirst({
        where: { id: args.id, deletedAt: null },
      });
      if (!existing) notFound("Product");
      const product = await prismadb.crm_Products.update({
        where: { id: args.id },
        data: { deletedAt: new Date(), deletedBy: userId, status: "ARCHIVED" as any },
      });
      return itemResponse({ id: product.id, status: "ARCHIVED" });
    },
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add lib/mcp/tools/crm-products.ts
git commit -m "feat(mcp): add products tools (5 tools, org-wide catalog)"
```

---

## Task 5: Create Contracts Tools

**Files:**
- Create: `lib/mcp/tools/crm-contracts.ts`

- [ ] **Step 1: Create `lib/mcp/tools/crm-contracts.ts`**

Contracts are org-wide. Has `status` enum (NOTSTARTED/INPROGRESS/SIGNED) and `deletedAt`. Get includes `lineItems`.

```typescript
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import {
  paginationSchema,
  paginationArgs,
  listResponse,
  itemResponse,
  notFound,
} from "../helpers";

const lineItemSchema = z.object({
  productId: z.string().uuid().optional(),
  name: z.string().min(1),
  sku: z.string().optional(),
  description: z.string().optional(),
  quantity: z.number().int().min(1).default(1),
  unit_price: z.number().min(0),
  discount_type: z.enum(["PERCENTAGE", "FIXED"]).default("PERCENTAGE"),
  discount_value: z.number().min(0).default(0),
  line_total: z.number().min(0),
  currency: z.string().length(3),
  sort_order: z.number().int().default(0),
});

export const crmContractTools = [
  {
    name: "crm_list_contracts",
    description: "List CRM contracts (org-wide)",
    schema: z.object({
      status: z.enum(["NOTSTARTED", "INPROGRESS", "SIGNED"]).optional(),
      account: z.string().uuid().optional(),
      ...paginationSchema,
    }),
    async handler(
      args: { status?: string; account?: string; limit: number; offset: number },
      _userId: string
    ) {
      const where = {
        deletedAt: null,
        ...(args.status && { status: args.status as any }),
        ...(args.account && { account: args.account }),
      };
      const [data, total] = await Promise.all([
        prismadb.crm_Contracts.findMany({
          where,
          ...paginationArgs(args),
          orderBy: { createdAt: "desc" },
          include: { lineItems: true, assigned_account: { select: { id: true, name: true } } },
        }),
        prismadb.crm_Contracts.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "crm_get_contract",
    description: "Get a single CRM contract by ID with line items",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, _userId: string) {
      const contract = await prismadb.crm_Contracts.findFirst({
        where: { id: args.id, deletedAt: null },
        include: {
          lineItems: { orderBy: { sort_order: "asc" } },
          assigned_account: { select: { id: true, name: true } },
        },
      });
      if (!contract) notFound("Contract");
      return itemResponse(contract);
    },
  },
  {
    name: "crm_create_contract",
    description: "Create a new CRM contract with optional line items",
    schema: z.object({
      title: z.string().min(1),
      value: z.number().min(0),
      description: z.string().optional(),
      account: z.string().uuid().optional(),
      assigned_to: z.string().uuid().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      type: z.string().optional(),
      currency: z.string().length(3).optional(),
      lineItems: z.array(lineItemSchema).optional(),
    }),
    async handler(args: Record<string, any>, userId: string) {
      const { lineItems, startDate, endDate, ...contractData } = args;
      const contract = await prismadb.crm_Contracts.create({
        data: {
          v: 0,
          ...contractData,
          ...(startDate && { startDate: new Date(startDate) }),
          ...(endDate && { endDate: new Date(endDate) }),
          createdBy: userId,
          updatedBy: userId,
          ...(lineItems?.length && {
            lineItems: {
              create: lineItems.map((li: any) => ({
                ...li,
                createdBy: userId,
              })),
            },
          }),
        },
        include: { lineItems: true },
      });
      return itemResponse(contract);
    },
  },
  {
    name: "crm_update_contract",
    description: "Update an existing CRM contract by ID (does not modify line items — use separate operations)",
    schema: z.object({
      id: z.string().uuid(),
      title: z.string().min(1).optional(),
      value: z.number().min(0).optional(),
      description: z.string().optional(),
      account: z.string().uuid().optional(),
      assigned_to: z.string().uuid().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      status: z.enum(["NOTSTARTED", "INPROGRESS", "SIGNED"]).optional(),
      type: z.string().optional(),
      currency: z.string().length(3).optional(),
    }),
    async handler(args: Record<string, any>, userId: string) {
      const existing = await prismadb.crm_Contracts.findFirst({
        where: { id: args.id, deletedAt: null },
      });
      if (!existing) notFound("Contract");
      const { id, startDate, endDate, ...rest } = args;
      const contract = await prismadb.crm_Contracts.update({
        where: { id },
        data: {
          ...rest,
          ...(startDate !== undefined && { startDate: new Date(startDate) }),
          ...(endDate !== undefined && { endDate: new Date(endDate) }),
          updatedBy: userId,
        },
      });
      return itemResponse(contract);
    },
  },
  {
    name: "crm_delete_contract",
    description: "Soft-delete a CRM contract (sets deletedAt timestamp)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const existing = await prismadb.crm_Contracts.findFirst({
        where: { id: args.id, deletedAt: null },
      });
      if (!existing) notFound("Contract");
      const contract = await prismadb.crm_Contracts.update({
        where: { id: args.id },
        data: { deletedAt: new Date(), deletedBy: userId },
      });
      return itemResponse({ id: contract.id, status: "DELETED" });
    },
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add lib/mcp/tools/crm-contracts.ts
git commit -m "feat(mcp): add contracts tools (5 tools, with line items)"
```

---

## Task 6: Create Activities Tools

**Files:**
- Create: `lib/mcp/tools/crm-activities.ts`

- [ ] **Step 1: Create `lib/mcp/tools/crm-activities.ts`**

Activities have `crm_Activity_Status` enum (scheduled/completed/cancelled) and `crm_ActivityLinks` for entity connections. Scoped to `createdBy: userId`.

```typescript
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import {
  paginationSchema,
  paginationArgs,
  listResponse,
  itemResponse,
  notFound,
  conflict,
} from "../helpers";

const entityLinkSchema = z.object({
  entityType: z.enum(["account", "contact", "lead", "opportunity", "contract"]),
  entityId: z.string().uuid(),
});

export const crmActivityTools = [
  {
    name: "crm_list_activities",
    description: "List CRM activities created by the authenticated user, optionally filtered by linked entity",
    schema: z.object({
      type: z.enum(["call", "meeting", "note", "email"]).optional(),
      status: z.enum(["scheduled", "completed", "cancelled"]).optional(),
      entityType: z.string().optional(),
      entityId: z.string().uuid().optional(),
      ...paginationSchema,
    }),
    async handler(
      args: {
        type?: string;
        status?: string;
        entityType?: string;
        entityId?: string;
        limit: number;
        offset: number;
      },
      userId: string
    ) {
      const where: any = {
        createdBy: userId,
        ...(args.type && { type: args.type as any }),
        ...(args.status && { status: args.status as any }),
        ...(args.entityType &&
          args.entityId && {
            links: {
              some: { entityType: args.entityType, entityId: args.entityId },
            },
          }),
      };
      const [data, total] = await Promise.all([
        prismadb.crm_Activities.findMany({
          where,
          ...paginationArgs(args),
          orderBy: { date: "desc" },
          include: { links: true },
        }),
        prismadb.crm_Activities.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "crm_get_activity",
    description: "Get a single CRM activity by ID with entity links",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const activity = await prismadb.crm_Activities.findFirst({
        where: { id: args.id, createdBy: userId },
        include: { links: true },
      });
      if (!activity) notFound("Activity");
      return itemResponse(activity);
    },
  },
  {
    name: "crm_create_activity",
    description: "Create a CRM activity (call/meeting/note/email) and link to entities",
    schema: z.object({
      type: z.enum(["call", "meeting", "note", "email"]),
      title: z.string().min(1),
      description: z.string().optional(),
      date: z.string().datetime(),
      duration: z.number().int().min(0).optional(),
      outcome: z.string().optional(),
      status: z.enum(["scheduled", "completed", "cancelled"]).default("scheduled"),
      links: z.array(entityLinkSchema).optional(),
    }),
    async handler(
      args: {
        type: string;
        title: string;
        description?: string;
        date: string;
        duration?: number;
        outcome?: string;
        status: string;
        links?: Array<{ entityType: string; entityId: string }>;
      },
      userId: string
    ) {
      const { links, date, ...rest } = args;
      const activity = await prismadb.crm_Activities.create({
        data: {
          ...rest,
          type: rest.type as any,
          status: rest.status as any,
          date: new Date(date),
          createdBy: userId,
          updatedBy: userId,
          ...(links?.length && {
            links: {
              createMany: {
                data: links.map((l) => ({
                  entityType: l.entityType,
                  entityId: l.entityId,
                })),
              },
            },
          }),
        },
        include: { links: true },
      });
      return itemResponse(activity);
    },
  },
  {
    name: "crm_update_activity",
    description: "Update an existing CRM activity by ID",
    schema: z.object({
      id: z.string().uuid(),
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      date: z.string().datetime().optional(),
      duration: z.number().int().min(0).optional(),
      outcome: z.string().optional(),
      status: z.enum(["scheduled", "completed", "cancelled"]).optional(),
    }),
    async handler(
      args: {
        id: string;
        title?: string;
        description?: string;
        date?: string;
        duration?: number;
        outcome?: string;
        status?: string;
      },
      userId: string
    ) {
      const existing = await prismadb.crm_Activities.findFirst({
        where: { id: args.id, createdBy: userId },
      });
      if (!existing) notFound("Activity");
      const { id, date, status, ...rest } = args;
      const activity = await prismadb.crm_Activities.update({
        where: { id },
        data: {
          ...rest,
          ...(date !== undefined && { date: new Date(date) }),
          ...(status !== undefined && { status: status as any }),
          updatedBy: userId,
        },
      });
      return itemResponse(activity);
    },
  },
  {
    name: "crm_delete_activity",
    description: "Soft-delete a CRM activity (not yet supported — pending schema migration)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(_args: { id: string }, _userId: string) {
      conflict("Soft delete not yet supported for Activities. See docs/soft-delete-gaps.md");
    },
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add lib/mcp/tools/crm-activities.ts
git commit -m "feat(mcp): add activities tools (5 tools, with entity links)"
```

---

## Task 7: Create Documents Tools

**Files:**
- Create: `lib/mcp/tools/crm-documents.ts`

- [ ] **Step 1: Create `lib/mcp/tools/crm-documents.ts`**

Documents have presigned URLs via MinIO/S3. Has `status` field. Junction tables for linking. Scoped to `created_by_user: userId`.

```typescript
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { minioClient, MINIO_BUCKET, MINIO_PUBLIC_URL } from "@/lib/minio";
import { randomUUID } from "crypto";
import {
  paginationSchema,
  paginationArgs,
  listResponse,
  itemResponse,
  notFound,
  validationError,
} from "../helpers";

// Map entity types to their Prisma junction table names
const ENTITY_LINK_MAP: Record<string, string> = {
  account: "DocumentsToAccounts",
  contact: "DocumentsToContacts",
  lead: "DocumentsToLeads",
  opportunity: "DocumentsToOpportunities",
  task: "DocumentsToTasks",
};

const ENTITY_FK_MAP: Record<string, string> = {
  account: "account_id",
  contact: "contact_id",
  lead: "lead_id",
  opportunity: "opportunity_id",
  task: "task_id",
};

export const crmDocumentTools = [
  {
    name: "crm_list_documents",
    description: "List documents, optionally filtered by linked entity type and ID",
    schema: z.object({
      entityType: z.enum(["account", "contact", "lead", "opportunity", "task"]).optional(),
      entityId: z.string().uuid().optional(),
      ...paginationSchema,
    }),
    async handler(
      args: { entityType?: string; entityId?: string; limit: number; offset: number },
      userId: string
    ) {
      const where: any = {
        created_by_user: userId,
        status: { not: "DELETED" },
      };
      if (args.entityType && args.entityId) {
        const relation = args.entityType === "account" ? "accounts"
          : args.entityType === "contact" ? "contacts"
          : args.entityType === "lead" ? "leads"
          : args.entityType === "opportunity" ? "opportunities"
          : "tasks";
        where[relation] = {
          some: { [ENTITY_FK_MAP[args.entityType]]: args.entityId },
        };
      }
      const [data, total] = await Promise.all([
        prismadb.documents.findMany({
          where,
          ...paginationArgs(args),
          orderBy: { createdAt: "desc" },
        }),
        prismadb.documents.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "crm_get_document",
    description: "Get a single document by ID",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const doc = await prismadb.documents.findFirst({
        where: { id: args.id, created_by_user: userId, status: { not: "DELETED" } },
        include: {
          accounts: true,
          contacts: true,
          leads: true,
          opportunities: true,
          tasks: true,
        },
      });
      if (!doc) notFound("Document");
      return itemResponse(doc);
    },
  },
  {
    name: "crm_create_document",
    description: "Create a document record and get a presigned upload URL",
    schema: z.object({
      document_name: z.string().min(1),
      contentType: z.string().min(1),
      description: z.string().optional(),
      visibility: z.string().optional(),
    }),
    async handler(
      args: {
        document_name: string;
        contentType: string;
        description?: string;
        visibility?: string;
      },
      userId: string
    ) {
      const ext = args.document_name.includes(".")
        ? args.document_name.split(".").pop()?.trim() || "bin"
        : "bin";
      const key = `documents/${randomUUID()}.${ext}`;
      const fileUrl = `${MINIO_PUBLIC_URL}/${MINIO_BUCKET}/${key}`;

      const doc = await prismadb.documents.create({
        data: {
          document_name: args.document_name,
          document_file_mimeType: args.contentType,
          document_file_url: fileUrl,
          key,
          description: args.description,
          visibility: args.visibility,
          created_by_user: userId,
          createdBy: userId,
          processing_status: "PENDING",
        },
      });

      const command = new PutObjectCommand({
        Bucket: MINIO_BUCKET,
        Key: key,
        ContentType: args.contentType,
      });
      const presignedUrl = await getSignedUrl(minioClient, command, { expiresIn: 600 });

      return itemResponse({ ...doc, presignedUrl, expiresIn: 600 });
    },
  },
  {
    name: "crm_get_upload_url",
    description: "Get a presigned upload URL for an existing document",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const doc = await prismadb.documents.findFirst({
        where: { id: args.id, created_by_user: userId },
      });
      if (!doc) notFound("Document");
      if (!doc.key) validationError("Document has no storage key");
      const command = new PutObjectCommand({
        Bucket: MINIO_BUCKET,
        Key: doc.key,
        ContentType: doc.document_file_mimeType,
      });
      const presignedUrl = await getSignedUrl(minioClient, command, { expiresIn: 600 });
      return itemResponse({ id: doc.id, url: presignedUrl, expiresIn: 600 });
    },
  },
  {
    name: "crm_get_download_url",
    description: "Get a presigned download URL for a document",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const doc = await prismadb.documents.findFirst({
        where: { id: args.id, created_by_user: userId },
      });
      if (!doc) notFound("Document");
      if (!doc.key) validationError("Document has no storage key");
      const command = new GetObjectCommand({
        Bucket: MINIO_BUCKET,
        Key: doc.key,
      });
      const presignedUrl = await getSignedUrl(minioClient, command, { expiresIn: 3600 });
      return itemResponse({ id: doc.id, url: presignedUrl, expiresIn: 3600 });
    },
  },
  {
    name: "crm_link_document",
    description: "Link a document to an entity (account, contact, lead, opportunity, or task)",
    schema: z.object({
      document_id: z.string().uuid(),
      entityType: z.enum(["account", "contact", "lead", "opportunity", "task"]),
      entityId: z.string().uuid(),
    }),
    async handler(
      args: { document_id: string; entityType: string; entityId: string },
      userId: string
    ) {
      const doc = await prismadb.documents.findFirst({
        where: { id: args.document_id, created_by_user: userId },
      });
      if (!doc) notFound("Document");

      const table = ENTITY_LINK_MAP[args.entityType];
      const fk = ENTITY_FK_MAP[args.entityType];
      if (!table || !fk) validationError(`Invalid entity type: ${args.entityType}`);

      await (prismadb as any)[table].create({
        data: { document_id: args.document_id, [fk]: args.entityId },
      });

      return itemResponse({ document_id: args.document_id, entityType: args.entityType, entityId: args.entityId });
    },
  },
  {
    name: "crm_unlink_document",
    description: "Remove a document link from an entity",
    schema: z.object({
      document_id: z.string().uuid(),
      entityType: z.enum(["account", "contact", "lead", "opportunity", "task"]),
      entityId: z.string().uuid(),
    }),
    async handler(
      args: { document_id: string; entityType: string; entityId: string },
      _userId: string
    ) {
      const table = ENTITY_LINK_MAP[args.entityType];
      const fk = ENTITY_FK_MAP[args.entityType];
      if (!table || !fk) validationError(`Invalid entity type: ${args.entityType}`);

      await (prismadb as any)[table].delete({
        where: {
          [`document_id_${fk}`]: {
            document_id: args.document_id,
            [fk]: args.entityId,
          },
        },
      });

      return itemResponse({ document_id: args.document_id, entityType: args.entityType, entityId: args.entityId, unlinked: true });
    },
  },
  {
    name: "crm_delete_document",
    description: "Soft-delete a document (sets status to DELETED)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const existing = await prismadb.documents.findFirst({
        where: { id: args.id, created_by_user: userId, status: { not: "DELETED" } },
      });
      if (!existing) notFound("Document");
      const doc = await prismadb.documents.update({
        where: { id: args.id },
        data: { status: "DELETED" },
      });
      return itemResponse({ id: doc.id, status: "DELETED" });
    },
  },
];
```

**Important:** The Prisma model name is lowercase `documents` (check the generated client). If the generated client uses `Documents`, adjust accordingly. Verify with `pnpm exec tsc --noEmit` after writing.

- [ ] **Step 2: Verify Prisma model name casing**

Run: `grep -r "prismadb\." lib/mcp/tools/ | head -5` to see the convention. Also check: `grep "documents\|Documents" node_modules/.prisma/client/index.d.ts | head -5`

If the Prisma client uses `documents` (lowercase), the code above is correct. If it uses `Documents` (uppercase), update all `prismadb.documents` to `prismadb.Documents`.

- [ ] **Step 3: Commit**

```bash
git add lib/mcp/tools/crm-documents.ts
git commit -m "feat(mcp): add documents tools (8 tools, presigned URLs, entity linking)"
```

---

## Task 8: Create Target Lists Tools

**Files:**
- Create: `lib/mcp/tools/crm-target-lists.ts`

- [ ] **Step 1: Create `lib/mcp/tools/crm-target-lists.ts`**

Org-wide. Junction table `TargetsToTargetLists` for membership. `status` is Boolean (not usable for soft delete).

```typescript
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import {
  paginationSchema,
  paginationArgs,
  listResponse,
  itemResponse,
  notFound,
  conflict,
} from "../helpers";

export const crmTargetListTools = [
  {
    name: "crm_list_target_lists",
    description: "List target lists (org-wide)",
    schema: z.object({ ...paginationSchema }),
    async handler(args: { limit: number; offset: number }, _userId: string) {
      const where = { status: true };
      const [data, total] = await Promise.all([
        prismadb.crm_TargetLists.findMany({
          where,
          ...paginationArgs(args),
          orderBy: { created_on: "desc" },
          include: { _count: { select: { targets: true } } },
        }),
        prismadb.crm_TargetLists.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "crm_get_target_list",
    description: "Get a target list by ID with its members",
    schema: z.object({
      id: z.string().uuid(),
      ...paginationSchema,
    }),
    async handler(args: { id: string; limit: number; offset: number }, _userId: string) {
      const tl = await prismadb.crm_TargetLists.findFirst({
        where: { id: args.id, status: true },
        include: {
          targets: {
            ...paginationArgs(args),
            include: { target: true },
          },
          _count: { select: { targets: true } },
        },
      });
      if (!tl) notFound("TargetList");
      return itemResponse(tl);
    },
  },
  {
    name: "crm_create_target_list",
    description: "Create a new target list",
    schema: z.object({
      name: z.string().min(1),
      description: z.string().optional(),
    }),
    async handler(args: { name: string; description?: string }, userId: string) {
      const tl = await prismadb.crm_TargetLists.create({
        data: { name: args.name, description: args.description, created_by: userId },
      });
      return itemResponse(tl);
    },
  },
  {
    name: "crm_update_target_list",
    description: "Update a target list by ID",
    schema: z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
    }),
    async handler(args: { id: string; name?: string; description?: string }, _userId: string) {
      const existing = await prismadb.crm_TargetLists.findFirst({
        where: { id: args.id, status: true },
      });
      if (!existing) notFound("TargetList");
      const { id, ...updateData } = args;
      const tl = await prismadb.crm_TargetLists.update({
        where: { id },
        data: updateData,
      });
      return itemResponse(tl);
    },
  },
  {
    name: "crm_delete_target_list",
    description: "Soft-delete a target list (sets status to false)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, _userId: string) {
      const existing = await prismadb.crm_TargetLists.findFirst({
        where: { id: args.id, status: true },
      });
      if (!existing) notFound("TargetList");
      await prismadb.crm_TargetLists.update({
        where: { id: args.id },
        data: { status: false },
      });
      return itemResponse({ id: args.id, status: "DELETED" });
    },
  },
  {
    name: "crm_add_to_target_list",
    description: "Add one or more targets to a target list",
    schema: z.object({
      target_list_id: z.string().uuid(),
      target_ids: z.array(z.string().uuid()).min(1).max(100),
    }),
    async handler(
      args: { target_list_id: string; target_ids: string[] },
      _userId: string
    ) {
      const tl = await prismadb.crm_TargetLists.findFirst({
        where: { id: args.target_list_id, status: true },
      });
      if (!tl) notFound("TargetList");
      await prismadb.targetsToTargetLists.createMany({
        data: args.target_ids.map((tid) => ({
          target_id: tid,
          target_list_id: args.target_list_id,
        })),
        skipDuplicates: true,
      });
      return itemResponse({ target_list_id: args.target_list_id, added: args.target_ids.length });
    },
  },
  {
    name: "crm_remove_from_target_list",
    description: "Remove one or more targets from a target list",
    schema: z.object({
      target_list_id: z.string().uuid(),
      target_ids: z.array(z.string().uuid()).min(1).max(100),
    }),
    async handler(
      args: { target_list_id: string; target_ids: string[] },
      _userId: string
    ) {
      await prismadb.targetsToTargetLists.deleteMany({
        where: {
          target_list_id: args.target_list_id,
          target_id: { in: args.target_ids },
        },
      });
      return itemResponse({ target_list_id: args.target_list_id, removed: args.target_ids.length });
    },
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add lib/mcp/tools/crm-target-lists.ts
git commit -m "feat(mcp): add target lists tools (7 tools, membership management)"
```

---

## Task 9: Create Enrichment Tools

**Files:**
- Create: `lib/mcp/tools/crm-enrichment.ts`

- [ ] **Step 1: Create `lib/mcp/tools/crm-enrichment.ts`**

Single enrichment creates a record and triggers Inngest. Bulk sends to Inngest directly. Requires API keys (Firecrawl + OpenAI).

```typescript
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { getApiKey } from "@/lib/api-keys";
import { itemResponse, notFound, externalError } from "../helpers";

export const crmEnrichmentTools = [
  {
    name: "crm_enrich_contact",
    description: "Enrich a single contact using Firecrawl + AI. Requires FIRECRAWL and OPENAI API keys configured. Returns enrichment record ID for tracking.",
    schema: z.object({
      contactId: z.string().uuid(),
      fields: z.array(z.object({
        name: z.string(),
        description: z.string().optional(),
      })).min(1),
    }),
    async handler(
      args: { contactId: string; fields: Array<{ name: string; description?: string }> },
      userId: string
    ) {
      const firecrawlKey = await getApiKey("FIRECRAWL", userId);
      const openaiKey = await getApiKey("OPENAI", userId);
      if (!firecrawlKey || !openaiKey) {
        externalError("Missing required API keys (FIRECRAWL and/or OPENAI). Configure them in Settings > API Keys.");
      }

      const contact = await prismadb.crm_Contacts.findUnique({
        where: { id: args.contactId },
        select: { id: true, email: true },
      });
      if (!contact) notFound("Contact");
      if (!contact.email) {
        externalError("Contact has no email. Add an email to enable enrichment.");
      }

      const enrichment = await prismadb.crm_Contact_Enrichment.create({
        data: {
          contactId: args.contactId,
          status: "RUNNING",
          fields: args.fields.map((f) => f.name),
          triggeredBy: userId,
        },
      });

      await inngest.send({
        name: "enrich/contact.single",
        data: { contactId: args.contactId, enrichmentId: enrichment.id, fields: args.fields, triggeredBy: userId },
      });

      return itemResponse({ enrichmentId: enrichment.id, status: "RUNNING" });
    },
  },
  {
    name: "crm_enrich_contact_bulk",
    description: "Enrich multiple contacts in bulk (max 100). Dispatches async jobs.",
    schema: z.object({
      contactIds: z.array(z.string().uuid()).min(1).max(100),
      fields: z.array(z.object({
        name: z.string(),
        description: z.string().optional(),
      })).min(1),
    }),
    async handler(
      args: { contactIds: string[]; fields: Array<{ name: string; description?: string }> },
      userId: string
    ) {
      const firecrawlKey = await getApiKey("FIRECRAWL", userId);
      const openaiKey = await getApiKey("OPENAI", userId);
      if (!firecrawlKey || !openaiKey) {
        externalError("Missing required API keys (FIRECRAWL and/or OPENAI).");
      }

      await inngest.send({
        name: "enrich/contacts.bulk",
        data: { contactIds: args.contactIds, fields: args.fields, triggeredBy: userId },
      });

      return itemResponse({ status: "DISPATCHED", count: args.contactIds.length });
    },
  },
  {
    name: "crm_enrich_target",
    description: "Enrich a single target using Firecrawl + AI. Requires FIRECRAWL and OPENAI API keys.",
    schema: z.object({
      targetId: z.string().uuid(),
      fields: z.array(z.object({
        name: z.string(),
        description: z.string().optional(),
      })).min(1),
    }),
    async handler(
      args: { targetId: string; fields: Array<{ name: string; description?: string }> },
      userId: string
    ) {
      const firecrawlKey = await getApiKey("FIRECRAWL", userId);
      const openaiKey = await getApiKey("OPENAI", userId);
      if (!firecrawlKey || !openaiKey) {
        externalError("Missing required API keys (FIRECRAWL and/or OPENAI).");
      }

      const target = await prismadb.crm_Targets.findUnique({
        where: { id: args.targetId },
        select: { id: true, email: true },
      });
      if (!target) notFound("Target");
      if (!target.email) {
        externalError("Target has no email. Add an email to enable enrichment.");
      }

      const enrichment = await prismadb.crm_Target_Enrichment.create({
        data: {
          targetId: args.targetId,
          status: "RUNNING",
          fields: args.fields.map((f) => f.name),
          triggeredBy: userId,
        },
      });

      await inngest.send({
        name: "enrich/target.single",
        data: { targetId: args.targetId, enrichmentId: enrichment.id, fields: args.fields, triggeredBy: userId },
      });

      return itemResponse({ enrichmentId: enrichment.id, status: "RUNNING" });
    },
  },
  {
    name: "crm_enrich_target_bulk",
    description: "Enrich multiple targets in bulk (max 100). Dispatches async jobs.",
    schema: z.object({
      targetIds: z.array(z.string().uuid()).min(1).max(100),
      fields: z.array(z.object({
        name: z.string(),
        description: z.string().optional(),
      })).min(1),
    }),
    async handler(
      args: { targetIds: string[]; fields: Array<{ name: string; description?: string }> },
      userId: string
    ) {
      const firecrawlKey = await getApiKey("FIRECRAWL", userId);
      const openaiKey = await getApiKey("OPENAI", userId);
      if (!firecrawlKey || !openaiKey) {
        externalError("Missing required API keys (FIRECRAWL and/or OPENAI).");
      }

      await inngest.send({
        name: "enrich/targets.bulk",
        data: { targetIds: args.targetIds, fields: args.fields, triggeredBy: userId },
      });

      return itemResponse({ status: "DISPATCHED", count: args.targetIds.length });
    },
  },
];
```

- [ ] **Step 2: Verify Inngest event names**

Check that these Inngest event names exist: `grep -r "enrich/" inngest/ --include="*.ts" | head -10`. If they differ, update the tool code.

- [ ] **Step 3: Commit**

```bash
git add lib/mcp/tools/crm-enrichment.ts
git commit -m "feat(mcp): add enrichment tools (4 tools, single + bulk for contacts and targets)"
```

---

## Task 10: Create Campaigns Tools

**Files:**
- Create: `lib/mcp/tools/campaigns.ts`

- [ ] **Step 1: Create `lib/mcp/tools/campaigns.ts`**

Org-wide. Campaign status includes "deleted" for soft delete. Uses Inngest for sends. Templates, steps, target list assignment, and stats.

```typescript
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import {
  paginationSchema,
  paginationArgs,
  listResponse,
  itemResponse,
  notFound,
  conflict,
} from "../helpers";

export const campaignTools = [
  // ── Campaigns CRUD ────────────────────────────────────
  {
    name: "campaigns_list",
    description: "List campaigns (org-wide)",
    schema: z.object({
      status: z.enum(["draft", "scheduled", "sending", "sent", "paused"]).optional(),
      ...paginationSchema,
    }),
    async handler(args: { status?: string; limit: number; offset: number }, _userId: string) {
      const where: any = { status: { not: "deleted" }, ...(args.status && { status: args.status }) };
      const [data, total] = await Promise.all([
        prismadb.crm_campaigns.findMany({
          where,
          ...paginationArgs(args),
          orderBy: { created_on: "desc" },
          include: { _count: { select: { steps: true, sends: true } } },
        }),
        prismadb.crm_campaigns.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "campaigns_get",
    description: "Get a campaign by ID with steps and stats summary",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, _userId: string) {
      const campaign = await prismadb.crm_campaigns.findFirst({
        where: { id: args.id, status: { not: "deleted" } },
        include: {
          steps: { orderBy: { order: "asc" }, include: { template: true } },
          target_lists: { include: { target_list: true } },
          _count: { select: { sends: true } },
        },
      });
      if (!campaign) notFound("Campaign");
      return itemResponse(campaign);
    },
  },
  {
    name: "campaigns_create",
    description: "Create a new campaign",
    schema: z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      from_name: z.string().optional(),
      reply_to: z.string().email().optional(),
      template_id: z.string().uuid().optional(),
    }),
    async handler(
      args: { name: string; description?: string; from_name?: string; reply_to?: string; template_id?: string },
      userId: string
    ) {
      const campaign = await prismadb.crm_campaigns.create({
        data: {
          v: 0,
          name: args.name,
          description: args.description,
          from_name: args.from_name,
          reply_to: args.reply_to,
          template_id: args.template_id,
          status: "draft",
          created_by: userId,
        },
      });
      return itemResponse(campaign);
    },
  },
  {
    name: "campaigns_update",
    description: "Update a campaign by ID",
    schema: z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      from_name: z.string().optional(),
      reply_to: z.string().email().optional(),
      template_id: z.string().uuid().optional(),
    }),
    async handler(args: Record<string, any>, _userId: string) {
      const existing = await prismadb.crm_campaigns.findFirst({
        where: { id: args.id, status: { not: "deleted" } },
      });
      if (!existing) notFound("Campaign");
      if (existing.status === "sending") conflict("Cannot update a campaign that is currently sending");
      const { id, ...updateData } = args;
      const campaign = await prismadb.crm_campaigns.update({ where: { id }, data: updateData });
      return itemResponse(campaign);
    },
  },
  {
    name: "campaigns_delete",
    description: "Soft-delete a campaign (sets status to deleted)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, _userId: string) {
      const existing = await prismadb.crm_campaigns.findFirst({
        where: { id: args.id, status: { not: "deleted" } },
      });
      if (!existing) notFound("Campaign");
      if (existing.status === "sending") conflict("Cannot delete a campaign that is currently sending");
      await prismadb.crm_campaigns.update({ where: { id: args.id }, data: { status: "deleted" } });
      return itemResponse({ id: args.id, status: "deleted" });
    },
  },

  // ── Send / Pause / Resume ─────────────────────────────
  {
    name: "campaigns_send",
    description: "Trigger sending a campaign. Campaign must be in draft or scheduled status.",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, _userId: string) {
      const campaign = await prismadb.crm_campaigns.findFirst({
        where: { id: args.id, status: { not: "deleted" } },
      });
      if (!campaign) notFound("Campaign");
      if (!["draft", "scheduled"].includes(campaign.status ?? "")) {
        conflict(`Cannot send campaign in status: ${campaign.status}`);
      }
      const now = new Date();
      await prismadb.crm_campaigns.update({
        where: { id: args.id },
        data: { status: "sending", scheduled_at: now },
      });
      await inngest.send({ name: "campaigns/send-now", data: { campaignId: args.id } });
      return itemResponse({ id: args.id, status: "sending" });
    },
  },
  {
    name: "campaigns_pause",
    description: "Pause an active/sending campaign",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, _userId: string) {
      const campaign = await prismadb.crm_campaigns.findFirst({
        where: { id: args.id },
      });
      if (!campaign) notFound("Campaign");
      if (campaign.status !== "sending") conflict(`Cannot pause campaign in status: ${campaign.status}`);
      await prismadb.crm_campaigns.update({ where: { id: args.id }, data: { status: "paused" } });
      return itemResponse({ id: args.id, status: "paused" });
    },
  },
  {
    name: "campaigns_resume",
    description: "Resume a paused campaign",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, _userId: string) {
      const campaign = await prismadb.crm_campaigns.findFirst({
        where: { id: args.id },
      });
      if (!campaign) notFound("Campaign");
      if (campaign.status !== "paused") conflict(`Cannot resume campaign in status: ${campaign.status}`);
      await prismadb.crm_campaigns.update({ where: { id: args.id }, data: { status: "sending" } });
      await inngest.send({ name: "campaigns/send-now", data: { campaignId: args.id } });
      return itemResponse({ id: args.id, status: "sending" });
    },
  },

  // ── Templates ─────────────────────────────────────────
  {
    name: "campaigns_list_templates",
    description: "List campaign email templates (org-wide)",
    schema: z.object({ ...paginationSchema }),
    async handler(args: { limit: number; offset: number }, _userId: string) {
      const [data, total] = await Promise.all([
        prismadb.crm_campaign_templates.findMany({
          ...paginationArgs(args),
          orderBy: { created_on: "desc" },
        }),
        prismadb.crm_campaign_templates.count(),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "campaigns_get_template",
    description: "Get a campaign template by ID",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, _userId: string) {
      const template = await prismadb.crm_campaign_templates.findUnique({ where: { id: args.id } });
      if (!template) notFound("Template");
      return itemResponse(template);
    },
  },
  {
    name: "campaigns_create_template",
    description: "Create a campaign email template",
    schema: z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      subject_default: z.string().optional(),
      content_html: z.string().min(1),
      content_json: z.any(),
    }),
    async handler(
      args: { name: string; description?: string; subject_default?: string; content_html: string; content_json: any },
      userId: string
    ) {
      const template = await prismadb.crm_campaign_templates.create({
        data: {
          name: args.name,
          description: args.description,
          subject_default: args.subject_default,
          content_html: args.content_html,
          content_json: args.content_json,
          created_by: userId,
        },
      });
      return itemResponse(template);
    },
  },
  {
    name: "campaigns_update_template",
    description: "Update a campaign template by ID",
    schema: z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      subject_default: z.string().optional(),
      content_html: z.string().optional(),
      content_json: z.any().optional(),
    }),
    async handler(args: Record<string, any>, _userId: string) {
      const existing = await prismadb.crm_campaign_templates.findUnique({ where: { id: args.id } });
      if (!existing) notFound("Template");
      const { id, ...updateData } = args;
      const template = await prismadb.crm_campaign_templates.update({ where: { id }, data: updateData });
      return itemResponse(template);
    },
  },
  {
    name: "campaigns_delete_template",
    description: "Soft-delete a campaign template (not yet supported — pending schema migration)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(_args: { id: string }, _userId: string) {
      conflict("Soft delete not yet supported for campaign templates. See docs/soft-delete-gaps.md");
    },
  },

  // ── Steps ─────────────────────────────────────────────
  {
    name: "campaigns_create_step",
    description: "Add a step to a campaign sequence",
    schema: z.object({
      campaign_id: z.string().uuid(),
      order: z.number().int().min(1),
      template_id: z.string().uuid(),
      subject: z.string().min(1),
      delay_days: z.number().int().min(0).default(0),
      send_to: z.enum(["all", "non_openers"]).default("all"),
    }),
    async handler(
      args: { campaign_id: string; order: number; template_id: string; subject: string; delay_days: number; send_to: string },
      _userId: string
    ) {
      const campaign = await prismadb.crm_campaigns.findFirst({
        where: { id: args.campaign_id, status: { not: "deleted" } },
      });
      if (!campaign) notFound("Campaign");
      const step = await prismadb.crm_campaign_steps.create({ data: args });
      return itemResponse(step);
    },
  },
  {
    name: "campaigns_update_step",
    description: "Update a campaign step by ID",
    schema: z.object({
      id: z.string().uuid(),
      order: z.number().int().min(1).optional(),
      template_id: z.string().uuid().optional(),
      subject: z.string().min(1).optional(),
      delay_days: z.number().int().min(0).optional(),
      send_to: z.enum(["all", "non_openers"]).optional(),
    }),
    async handler(args: Record<string, any>, _userId: string) {
      const existing = await prismadb.crm_campaign_steps.findUnique({ where: { id: args.id } });
      if (!existing) notFound("CampaignStep");
      const { id, ...updateData } = args;
      const step = await prismadb.crm_campaign_steps.update({ where: { id }, data: updateData });
      return itemResponse(step);
    },
  },
  {
    name: "campaigns_delete_step",
    description: "Delete a campaign step by ID (hard delete — step has no status field)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, _userId: string) {
      const existing = await prismadb.crm_campaign_steps.findUnique({ where: { id: args.id } });
      if (!existing) notFound("CampaignStep");
      await prismadb.crm_campaign_steps.delete({ where: { id: args.id } });
      return itemResponse({ id: args.id, deleted: true });
    },
  },

  // ── Target List Assignment ────────────────────────────
  {
    name: "campaigns_assign_target_list",
    description: "Assign a target list to a campaign",
    schema: z.object({
      campaign_id: z.string().uuid(),
      target_list_id: z.string().uuid(),
    }),
    async handler(args: { campaign_id: string; target_list_id: string }, _userId: string) {
      const campaign = await prismadb.crm_campaigns.findFirst({
        where: { id: args.campaign_id, status: { not: "deleted" } },
      });
      if (!campaign) notFound("Campaign");
      await prismadb.campaignToTargetLists.create({
        data: { campaign_id: args.campaign_id, target_list_id: args.target_list_id },
      });
      return itemResponse({ campaign_id: args.campaign_id, target_list_id: args.target_list_id });
    },
  },
  {
    name: "campaigns_remove_target_list",
    description: "Remove a target list from a campaign",
    schema: z.object({
      campaign_id: z.string().uuid(),
      target_list_id: z.string().uuid(),
    }),
    async handler(args: { campaign_id: string; target_list_id: string }, _userId: string) {
      await prismadb.campaignToTargetLists.delete({
        where: {
          campaign_id_target_list_id: {
            campaign_id: args.campaign_id,
            target_list_id: args.target_list_id,
          },
        },
      });
      return itemResponse({ campaign_id: args.campaign_id, target_list_id: args.target_list_id, removed: true });
    },
  },

  // ── Stats ─────────────────────────────────────────────
  {
    name: "campaigns_get_stats",
    description: "Get send/open/click/unsubscribe stats for a campaign",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, _userId: string) {
      const campaign = await prismadb.crm_campaigns.findFirst({
        where: { id: args.id, status: { not: "deleted" } },
      });
      if (!campaign) notFound("Campaign");
      const sends = await prismadb.crm_campaign_sends.findMany({
        where: { campaign_id: args.id },
        select: { status: true, opened_at: true, clicked_at: true, unsubscribed_at: true },
      });
      const stats = {
        total: sends.length,
        sent: sends.filter((s) => s.status === "sent" || s.status === "delivered").length,
        delivered: sends.filter((s) => s.status === "delivered").length,
        bounced: sends.filter((s) => s.status === "bounced").length,
        failed: sends.filter((s) => s.status === "failed").length,
        opened: sends.filter((s) => s.opened_at).length,
        clicked: sends.filter((s) => s.clicked_at).length,
        unsubscribed: sends.filter((s) => s.unsubscribed_at).length,
      };
      return itemResponse(stats);
    },
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add lib/mcp/tools/campaigns.ts
git commit -m "feat(mcp): add campaigns tools (19 tools, full lifecycle + templates + steps + stats)"
```

---

## Task 11: Create Projects Tools

**Files:**
- Create: `lib/mcp/tools/projects.ts`

- [ ] **Step 1: Create `lib/mcp/tools/projects.ts`**

Boards scoped to `user: userId` or `sharedWith` contains userId. Tasks within user's boards. Comments, sections, watchers.

```typescript
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import {
  paginationSchema,
  paginationArgs,
  listResponse,
  itemResponse,
  notFound,
  conflict,
} from "../helpers";

function userBoardWhere(userId: string) {
  return {
    OR: [
      { user: userId },
      { sharedWith: { has: userId } },
    ],
  };
}

export const projectTools = [
  // ── Boards ────────────────────────────────────────────
  {
    name: "projects_list_boards",
    description: "List project boards the user owns or is shared with",
    schema: z.object({ ...paginationSchema }),
    async handler(args: { limit: number; offset: number }, userId: string) {
      const where = userBoardWhere(userId);
      const [data, total] = await Promise.all([
        prismadb.boards.findMany({
          where,
          ...paginationArgs(args),
          orderBy: { createdAt: "desc" },
          include: { _count: { select: { sections: true } } },
        }),
        prismadb.boards.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "projects_get_board",
    description: "Get a project board with its sections and tasks",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const board = await prismadb.boards.findFirst({
        where: { id: args.id, ...userBoardWhere(userId) },
        include: {
          sections: {
            orderBy: { position: "asc" },
            include: {
              tasks: {
                orderBy: { position: "asc" },
                where: { taskStatus: { not: "COMPLETE" } },
              },
            },
          },
          watchers: true,
        },
      });
      if (!board) notFound("Board");
      return itemResponse(board);
    },
  },
  {
    name: "projects_create_board",
    description: "Create a new project board",
    schema: z.object({
      title: z.string().min(1),
      description: z.string().min(1),
      icon: z.string().optional(),
      visibility: z.string().optional(),
    }),
    async handler(
      args: { title: string; description: string; icon?: string; visibility?: string },
      userId: string
    ) {
      const board = await prismadb.boards.create({
        data: {
          v: 0,
          title: args.title,
          description: args.description,
          icon: args.icon,
          visibility: args.visibility,
          user: userId,
          createdBy: userId,
          updatedBy: userId,
        },
      });
      return itemResponse(board);
    },
  },
  {
    name: "projects_update_board",
    description: "Update a project board by ID",
    schema: z.object({
      id: z.string().uuid(),
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      icon: z.string().optional(),
      visibility: z.string().optional(),
    }),
    async handler(args: Record<string, any>, userId: string) {
      const existing = await prismadb.boards.findFirst({
        where: { id: args.id, ...userBoardWhere(userId) },
      });
      if (!existing) notFound("Board");
      const { id, ...updateData } = args;
      const board = await prismadb.boards.update({
        where: { id },
        data: { ...updateData, updatedBy: userId },
      });
      return itemResponse(board);
    },
  },
  {
    name: "projects_delete_board",
    description: "Soft-delete a project board (not yet supported — pending schema migration)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(_args: { id: string }, _userId: string) {
      conflict("Soft delete not yet supported for Boards. See docs/soft-delete-gaps.md");
    },
  },

  // ── Sections ──────────────────────────────────────────
  {
    name: "projects_create_section",
    description: "Add a section (column) to a board",
    schema: z.object({
      board: z.string().uuid(),
      title: z.string().min(1),
    }),
    async handler(args: { board: string; title: string }, userId: string) {
      const board = await prismadb.boards.findFirst({
        where: { id: args.board, ...userBoardWhere(userId) },
      });
      if (!board) notFound("Board");
      const maxPos = await prismadb.sections.aggregate({
        where: { board: args.board },
        _max: { position: true },
      });
      const section = await prismadb.sections.create({
        data: {
          v: 0,
          board: args.board,
          title: args.title,
          position: (maxPos._max.position ?? BigInt(0)) + BigInt(1000),
        },
      });
      return itemResponse(section);
    },
  },
  {
    name: "projects_update_section",
    description: "Update a section title or position",
    schema: z.object({
      id: z.string().uuid(),
      title: z.string().min(1).optional(),
      position: z.number().int().optional(),
    }),
    async handler(args: { id: string; title?: string; position?: number }, _userId: string) {
      const existing = await prismadb.sections.findUnique({ where: { id: args.id } });
      if (!existing) notFound("Section");
      const { id, position, ...rest } = args;
      const section = await prismadb.sections.update({
        where: { id },
        data: { ...rest, ...(position !== undefined && { position: BigInt(position) }) },
      });
      return itemResponse(section);
    },
  },
  {
    name: "projects_delete_section",
    description: "Delete a section (must be empty — no tasks)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, _userId: string) {
      const section = await prismadb.sections.findUnique({
        where: { id: args.id },
        include: { _count: { select: { tasks: true } } },
      });
      if (!section) notFound("Section");
      if (section._count.tasks > 0) conflict("Cannot delete section with tasks. Move or delete tasks first.");
      await prismadb.sections.delete({ where: { id: args.id } });
      return itemResponse({ id: args.id, deleted: true });
    },
  },

  // ── Tasks ─────────────────────────────────────────────
  {
    name: "projects_list_tasks",
    description: "List tasks, optionally filtered by board, section, user, or status",
    schema: z.object({
      board: z.string().uuid().optional(),
      section: z.string().uuid().optional(),
      user: z.string().uuid().optional(),
      status: z.enum(["ACTIVE", "PENDING", "COMPLETE"]).optional(),
      ...paginationSchema,
    }),
    async handler(
      args: { board?: string; section?: string; user?: string; status?: string; limit: number; offset: number },
      userId: string
    ) {
      const where: any = {
        ...(args.section && { section: args.section }),
        ...(args.user && { user: args.user }),
        ...(args.status && { taskStatus: args.status as any }),
      };
      if (args.board) {
        where.assigned_section = { board: args.board };
      }
      if (!args.board && !args.section) {
        // Default: tasks in user's boards
        where.assigned_section = { board_relation: userBoardWhere(userId) };
      }
      const [data, total] = await Promise.all([
        prismadb.tasks.findMany({
          where,
          ...paginationArgs(args),
          orderBy: { createdAt: "desc" },
        }),
        prismadb.tasks.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "projects_get_task",
    description: "Get a task by ID with comments and documents",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, _userId: string) {
      const task = await prismadb.tasks.findUnique({
        where: { id: args.id },
        include: {
          comments: { orderBy: { createdAt: "desc" }, take: 20 },
          documents: { include: { document: true } },
          assigned_section: { select: { id: true, title: true, board: true } },
        },
      });
      if (!task) notFound("Task");
      return itemResponse(task);
    },
  },
  {
    name: "projects_create_task",
    description: "Create a task in a board section",
    schema: z.object({
      title: z.string().min(1),
      content: z.string().optional(),
      section: z.string().uuid(),
      priority: z.string().default("Normal"),
      dueDateAt: z.string().datetime().optional(),
    }),
    async handler(
      args: { title: string; content?: string; section: string; priority: string; dueDateAt?: string },
      userId: string
    ) {
      const sec = await prismadb.sections.findUnique({ where: { id: args.section } });
      if (!sec) notFound("Section");
      const maxPos = await prismadb.tasks.aggregate({
        where: { section: args.section },
        _max: { position: true },
      });
      const task = await prismadb.tasks.create({
        data: {
          v: 0,
          title: args.title,
          content: args.content,
          section: args.section,
          priority: args.priority,
          position: (maxPos._max.position ?? BigInt(0)) + BigInt(1000),
          user: userId,
          createdBy: userId,
          updatedBy: userId,
          ...(args.dueDateAt && { dueDateAt: new Date(args.dueDateAt) }),
        },
      });
      return itemResponse(task);
    },
  },
  {
    name: "projects_update_task",
    description: "Update a task by ID",
    schema: z.object({
      id: z.string().uuid(),
      title: z.string().min(1).optional(),
      content: z.string().optional(),
      priority: z.string().optional(),
      dueDateAt: z.string().datetime().optional(),
      taskStatus: z.enum(["ACTIVE", "PENDING", "COMPLETE"]).optional(),
    }),
    async handler(args: Record<string, any>, userId: string) {
      const existing = await prismadb.tasks.findUnique({ where: { id: args.id } });
      if (!existing) notFound("Task");
      const { id, dueDateAt, ...rest } = args;
      const task = await prismadb.tasks.update({
        where: { id },
        data: {
          ...rest,
          ...(dueDateAt !== undefined && { dueDateAt: new Date(dueDateAt) }),
          updatedBy: userId,
        },
      });
      return itemResponse(task);
    },
  },
  {
    name: "projects_move_task",
    description: "Move a task to a different section and/or position",
    schema: z.object({
      id: z.string().uuid(),
      section: z.string().uuid(),
      position: z.number().int().optional(),
    }),
    async handler(args: { id: string; section: string; position?: number }, userId: string) {
      const existing = await prismadb.tasks.findUnique({ where: { id: args.id } });
      if (!existing) notFound("Task");
      const sec = await prismadb.sections.findUnique({ where: { id: args.section } });
      if (!sec) notFound("Section");
      const task = await prismadb.tasks.update({
        where: { id: args.id },
        data: {
          section: args.section,
          ...(args.position !== undefined && { position: BigInt(args.position) }),
          updatedBy: userId,
        },
      });
      return itemResponse(task);
    },
  },
  {
    name: "projects_delete_task",
    description: "Soft-delete a task (sets status to COMPLETE)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const existing = await prismadb.tasks.findUnique({ where: { id: args.id } });
      if (!existing) notFound("Task");
      const task = await prismadb.tasks.update({
        where: { id: args.id },
        data: { taskStatus: "COMPLETE", updatedBy: userId },
      });
      return itemResponse({ id: task.id, status: "COMPLETE" });
    },
  },

  // ── Comments ──────────────────────────────────────────
  {
    name: "projects_add_comment",
    description: "Add a comment to a task",
    schema: z.object({
      task: z.string().uuid(),
      comment: z.string().min(1),
    }),
    async handler(args: { task: string; comment: string }, userId: string) {
      const existing = await prismadb.tasks.findUnique({ where: { id: args.task } });
      if (!existing) notFound("Task");
      const tc = await prismadb.tasksComments.create({
        data: { v: 0, task: args.task, comment: args.comment, user: userId },
      });
      return itemResponse(tc);
    },
  },
  {
    name: "projects_list_comments",
    description: "List comments on a task",
    schema: z.object({
      task: z.string().uuid(),
      ...paginationSchema,
    }),
    async handler(args: { task: string; limit: number; offset: number }, _userId: string) {
      const where = { task: args.task };
      const [data, total] = await Promise.all([
        prismadb.tasksComments.findMany({
          where,
          ...paginationArgs(args),
          orderBy: { createdAt: "desc" },
          include: { assigned_user: { select: { id: true, name: true } } },
        }),
        prismadb.tasksComments.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },

  // ── Document Link ─────────────────────────────────────
  {
    name: "projects_assign_document",
    description: "Link a document to a task",
    schema: z.object({
      task_id: z.string().uuid(),
      document_id: z.string().uuid(),
    }),
    async handler(args: { task_id: string; document_id: string }, _userId: string) {
      await prismadb.documentsToTasks.create({
        data: { task_id: args.task_id, document_id: args.document_id },
      });
      return itemResponse({ task_id: args.task_id, document_id: args.document_id });
    },
  },

  // ── Watchers ──────────────────────────────────────────
  {
    name: "projects_watch_board",
    description: "Watch or unwatch a project board",
    schema: z.object({
      board_id: z.string().uuid(),
      watch: z.boolean().default(true),
    }),
    async handler(args: { board_id: string; watch: boolean }, userId: string) {
      if (args.watch) {
        await prismadb.boardWatchers.create({
          data: { board_id: args.board_id, user_id: userId },
        }).catch(() => {}); // Already watching — ignore duplicate
      } else {
        await prismadb.boardWatchers.delete({
          where: { board_id_user_id: { board_id: args.board_id, user_id: userId } },
        }).catch(() => {}); // Not watching — ignore
      }
      return itemResponse({ board_id: args.board_id, watching: args.watch });
    },
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add lib/mcp/tools/projects.ts
git commit -m "feat(mcp): add projects tools (18 tools, boards/sections/tasks/comments/watchers)"
```

---

## Task 12: Create Reports & Email Accounts Tools

**Files:**
- Create: `lib/mcp/tools/reports.ts`
- Create: `lib/mcp/tools/crm-email-accounts.ts`

- [ ] **Step 1: Create `lib/mcp/tools/reports.ts`**

Read-only. List report configs and trigger export.

```typescript
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import { paginationSchema, paginationArgs, listResponse, itemResponse, notFound } from "../helpers";

export const reportTools = [
  {
    name: "reports_list",
    description: "List available report configurations",
    schema: z.object({
      category: z.enum(["sales", "leads", "accounts", "activity", "campaigns", "users"]).optional(),
      ...paginationSchema,
    }),
    async handler(args: { category?: string; limit: number; offset: number }, _userId: string) {
      const where = {
        ...(args.category && { category: args.category }),
      };
      const [data, total] = await Promise.all([
        prismadb.crm_Report_Config.findMany({
          where,
          ...paginationArgs(args),
          orderBy: { createdAt: "desc" },
        }),
        prismadb.crm_Report_Config.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "reports_run",
    description: "Run a report by category and get the data. Returns raw report data (use format param for CSV/PDF via the /api/reports/export endpoint).",
    schema: z.object({
      category: z.enum(["sales", "leads", "accounts", "activity", "campaigns", "users"]),
      dateFrom: z.string().datetime().optional(),
      dateTo: z.string().datetime().optional(),
    }),
    async handler(
      args: { category: string; dateFrom?: string; dateTo?: string },
      _userId: string
    ) {
      // Dynamic import to avoid circular deps
      const salesActions = await import("@/actions/reports/sales");
      const leadsActions = await import("@/actions/reports/leads");
      const accountsActions = await import("@/actions/reports/accounts");
      const activityActions = await import("@/actions/reports/activity");
      const campaignsActions = await import("@/actions/reports/campaigns");
      const usersActions = await import("@/actions/reports/users");

      const filters = {
        dateFrom: args.dateFrom ? new Date(args.dateFrom) : undefined,
        dateTo: args.dateTo ? new Date(args.dateTo) : undefined,
      };

      let data: any;
      switch (args.category) {
        case "sales":
          data = await salesActions.getOppsByMonth(filters);
          break;
        case "leads":
          data = await leadsActions.getNewLeads(filters);
          break;
        case "accounts":
          data = await accountsActions.getNewAccounts(filters);
          break;
        case "activity":
          data = await activityActions.getTasksByAssignee(filters);
          break;
        case "campaigns":
          data = await campaignsActions.getCampaignPerformance(filters);
          break;
        case "users":
          data = await usersActions.getUserGrowth(filters);
          break;
      }

      return itemResponse({ category: args.category, data });
    },
  },
];
```

- [ ] **Step 2: Create `lib/mcp/tools/crm-email-accounts.ts`**

```typescript
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import { paginationSchema, paginationArgs, listResponse } from "../helpers";

export const crmEmailAccountTools = [
  {
    name: "crm_list_email_accounts",
    description: "List the authenticated user's connected email accounts",
    schema: z.object({ ...paginationSchema }),
    async handler(args: { limit: number; offset: number }, userId: string) {
      const where = { userId, isActive: true };
      const [data, total] = await Promise.all([
        prismadb.emailAccount.findMany({
          where,
          ...paginationArgs(args),
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            label: true,
            imapHost: true,
            smtpHost: true,
            username: true,
            isActive: true,
            lastSyncedAt: true,
            createdAt: true,
            // Exclude passwordEncrypted for security
          },
        }),
        prismadb.emailAccount.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
];
```

- [ ] **Step 3: Commit**

```bash
git add lib/mcp/tools/reports.ts lib/mcp/tools/crm-email-accounts.ts
git commit -m "feat(mcp): add reports tools (2) and email accounts tool (1)"
```

---

## Task 13: Create Barrel Export & Update Route Handler

**Files:**
- Create: `lib/mcp/tools/index.ts`
- Modify: `app/api/mcp/[transport]/route.ts`

- [ ] **Step 1: Create `lib/mcp/tools/index.ts`**

```typescript
export { crmAccountTools } from "./crm-accounts";
export { crmContactTools } from "./crm-contacts";
export { crmLeadTools } from "./crm-leads";
export { crmOpportunityTools } from "./crm-opportunities";
export { crmTargetTools } from "./crm-targets";
export { crmProductTools } from "./crm-products";
export { crmContractTools } from "./crm-contracts";
export { crmActivityTools } from "./crm-activities";
export { crmDocumentTools } from "./crm-documents";
export { crmTargetListTools } from "./crm-target-lists";
export { crmEnrichmentTools } from "./crm-enrichment";
export { crmEmailAccountTools } from "./crm-email-accounts";
export { campaignTools } from "./campaigns";
export { projectTools } from "./projects";
export { reportTools } from "./reports";

import { crmAccountTools } from "./crm-accounts";
import { crmContactTools } from "./crm-contacts";
import { crmLeadTools } from "./crm-leads";
import { crmOpportunityTools } from "./crm-opportunities";
import { crmTargetTools } from "./crm-targets";
import { crmProductTools } from "./crm-products";
import { crmContractTools } from "./crm-contracts";
import { crmActivityTools } from "./crm-activities";
import { crmDocumentTools } from "./crm-documents";
import { crmTargetListTools } from "./crm-target-lists";
import { crmEnrichmentTools } from "./crm-enrichment";
import { crmEmailAccountTools } from "./crm-email-accounts";
import { campaignTools } from "./campaigns";
import { projectTools } from "./projects";
import { reportTools } from "./reports";

export const allTools = [
  ...crmAccountTools,
  ...crmContactTools,
  ...crmLeadTools,
  ...crmOpportunityTools,
  ...crmTargetTools,
  ...crmProductTools,
  ...crmContractTools,
  ...crmActivityTools,
  ...crmDocumentTools,
  ...crmTargetListTools,
  ...crmEnrichmentTools,
  ...crmEmailAccountTools,
  ...campaignTools,
  ...projectTools,
  ...reportTools,
];
```

- [ ] **Step 2: Update `app/api/mcp/[transport]/route.ts`**

Replace the entire file:

```typescript
import { createMcpHandler } from "mcp-handler";
import { getMcpUser } from "@/lib/mcp/auth";
import { allTools } from "@/lib/mcp/tools";

const handler = createMcpHandler(
  (server) => {
    for (const tool of allTools) {
      server.tool(tool.name, tool.description, tool.schema.shape, async (args: Record<string, unknown>) => {
        try {
          const mcpUser = await getMcpUser();
          const result = await tool.handler(args as any, mcpUser.id);
          return {
            content: [{ type: "text" as const, text: JSON.stringify(result) }],
          };
        } catch (err: any) {
          const msg: string = err.message ?? "Unknown error";
          const code = msg === "NOT_FOUND" ? "NOT_FOUND"
            : msg === "Unauthorized" ? "UNAUTHORIZED"
            : msg.startsWith("CONFLICT:") ? "INVALID_REQUEST"
            : msg.startsWith("VALIDATION_ERROR:") ? "INVALID_PARAMS"
            : msg.startsWith("EXTERNAL_ERROR:") ? "INTERNAL_ERROR"
            : "INTERNAL_ERROR";
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ error: msg, code }) }],
            isError: true,
          };
        }
      });
    }
  },
  {
    capabilities: { tools: {} },
  }
);

export { handler as GET, handler as POST };
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `pnpm exec tsc --noEmit 2>&1 | head -30`

Fix any type errors before proceeding.

- [ ] **Step 4: Commit**

```bash
git add lib/mcp/tools/index.ts app/api/mcp/\[transport\]/route.ts
git commit -m "feat(mcp): add barrel export and update route handler with new error codes"
```

---

## Task 14: Generate Soft-Delete Gaps Report

**Files:**
- Create: `docs/soft-delete-gaps.md`

- [ ] **Step 1: Create `docs/soft-delete-gaps.md`**

```markdown
# Soft-Delete Gaps Report

Generated: 2026-04-06

This documents which Prisma models can support soft delete today and which need schema migrations.

## Ready (have status/deletedAt field)

| Model | Field | Current Values | Soft Delete Value |
|-------|-------|----------------|-------------------|
| `crm_Accounts` | `status` (String) | "Active", etc. | "DELETED" |
| `crm_Opportunities` | `status` (enum) | ACTIVE, INACTIVE, PENDING, CLOSED | Add DELETED to enum |
| `crm_Products` | `status` (enum) + `deletedAt` | DRAFT, ACTIVE, ARCHIVED | ARCHIVED + deletedAt |
| `crm_Contracts` | `status` (enum) + `deletedAt` | NOTSTARTED, INPROGRESS, SIGNED | deletedAt timestamp |
| `crm_campaigns` | `status` (String) | draft, scheduled, sending, sent, paused, deleted | "deleted" (already exists) |
| `Documents` | `status` (String) | various | "DELETED" |
| `Tasks` | `taskStatus` (enum) | ACTIVE, PENDING, COMPLETE | Using COMPLETE as soft delete |
| `crm_TargetLists` | `status` (Boolean) | true/false | false = deleted |

## Gaps (need schema migration)

| Model | Recommended Change | MCP Behavior Today |
|-------|-------------------|--------------------|
| `crm_Contacts` | Add `status` String field with default "Active" | `crm_delete_contact` throws CONFLICT |
| `crm_Leads` | Add `status` String field with default "Active" | `crm_delete_lead` throws CONFLICT |
| `crm_Targets` | Add `status` String field with default "Active" | `crm_delete_target` throws CONFLICT |
| `crm_Activities` | Add `deletedAt` DateTime field | `crm_delete_activity` throws CONFLICT |
| `crm_campaign_templates` | Add `deletedAt` DateTime field | `campaigns_delete_template` throws CONFLICT |
| `Boards` | Add `deletedAt` DateTime field | `projects_delete_board` throws CONFLICT |
| `Sections` | No soft delete needed (hard delete if empty) | Hard delete (checks for tasks first) |
| `tasksComments` | No soft delete needed | Not exposed for deletion |
| `crm_campaign_steps` | No soft delete needed (hard delete, cascade) | Hard delete |

## Migration Priority

1. **crm_Contacts** — most commonly used entity
2. **crm_Leads** — part of core sales flow
3. **crm_Targets** — needed for campaign management
4. **crm_Activities** — activity logs should never be hard deleted
5. **crm_campaign_templates** — useful but lower priority
6. **Boards** — project management
```

- [ ] **Step 2: Commit**

```bash
git add docs/soft-delete-gaps.md
git commit -m "docs: add soft-delete gaps report for MCP entities"
```

---

## Task 15: TypeScript Verification & Final Cleanup

- [ ] **Step 1: Run full TypeScript check**

Run: `pnpm exec tsc --noEmit 2>&1 | head -50`

- [ ] **Step 2: Fix any type errors**

Common issues to check:
- Prisma model names (casing: `prismadb.documents` vs `prismadb.Documents`)
- Junction table compound key names (e.g., `document_id_account_id` vs `document_id_contact_id`)
- Inngest event name typos
- Import path issues

- [ ] **Step 3: Verify tool count**

Run a quick count:
```bash
grep -r '"crm_\|"campaigns_\|"projects_\|"reports_' lib/mcp/tools/ | grep 'name:' | wc -l
```

Expected: ~95 tools.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "fix(mcp): resolve type errors from full parity implementation"
```

---

## Summary

| Task | Tools Added | Files |
|------|------------|-------|
| 1. Shared Helpers | 0 | `helpers.ts` |
| 2. Accounts | 6 (rename + delete) | `crm-accounts.ts` |
| 3. Contacts/Leads/Opps/Targets | 24 (rename + delete) | 4 files |
| 4. Products | 5 | `crm-products.ts` |
| 5. Contracts | 5 | `crm-contracts.ts` |
| 6. Activities | 5 | `crm-activities.ts` |
| 7. Documents | 8 | `crm-documents.ts` |
| 8. Target Lists | 7 | `crm-target-lists.ts` |
| 9. Enrichment | 4 | `crm-enrichment.ts` |
| 10. Campaigns | 19 | `campaigns.ts` |
| 11. Projects | 18 | `projects.ts` |
| 12. Reports + Email | 3 | `reports.ts`, `crm-email-accounts.ts` |
| 13. Barrel + Route | 0 | `index.ts`, `route.ts` |
| 14. Soft-Delete Report | 0 | `soft-delete-gaps.md` |
| 15. Verification | 0 | fixes |
| **Total** | **~104** | **18 files** |
