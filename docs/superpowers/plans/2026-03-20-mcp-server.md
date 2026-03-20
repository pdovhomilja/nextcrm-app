# NextCRM MCP Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an MCP server to NextCRM so AI agents can list, search, get, create, and update Accounts, Leads, Opportunities, Contacts, and Targets using Bearer API tokens.

**Architecture:** Single `/api/mcp/[transport]/route.ts` endpoint using `@vercel/mcp-adapter`. Token auth via SHA-256-hashed `nxtc__` tokens stored in a new `ApiToken` Prisma model. Token management UI added to the existing profile page.

**Tech Stack:** `@vercel/mcp-adapter`, Next.js 15 App Router, Prisma (PostgreSQL), NextAuth v4, Zod, `crypto` (Node.js built-in)

---

## Codebase Notes (Read Before Starting)

- **Prisma client:** imported as `prismadb` from `@/lib/prisma`
- **Auth:** `getServerSession(authOptions)` where `authOptions` is from `@/lib/auth`; session gives `session.user.id`
- **Server actions:** `"use server"` + try/catch + return `{ data }` or `{ error }`
- **Profile page:** `app/[locale]/(routes)/profile/page.tsx` — server component using `<Container>` + card components
- **User association on CRM records:**
  - `crm_Accounts`, `crm_Contacts`, `crm_Leads`, `crm_Opportunities` → filter/set via `assigned_to` field
  - `crm_Targets` → uses `created_by` field (no `assigned_to` on this model — the spec's decisions log incorrectly lists `assigned_to` for all models; the plan is correct)
- **Existing MCP reference:** `/Users/pdovhomilja/development/Next.js/taskhq.app/app/api/mcp/[transport]/route.ts`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `prisma/schema.prisma` | Modify | Add `ApiToken` model + `apiTokens` back-relation on `Users` |
| `lib/api-tokens.ts` | Create | `generateApiToken`, `validateApiToken`, `revokeApiToken` |
| `actions/api-tokens.ts` | Create | Server actions: `createToken`, `listTokens`, `deleteToken` |
| `lib/mcp/auth.ts` | Create | `getMcpUser()` — Bearer token → session fallback (dev only) |
| `lib/mcp/tools/accounts.ts` | Create | 5 account tools |
| `lib/mcp/tools/contacts.ts` | Create | 5 contact tools |
| `lib/mcp/tools/leads.ts` | Create | 5 lead tools |
| `lib/mcp/tools/opportunities.ts` | Create | 5 opportunity tools |
| `lib/mcp/tools/targets.ts` | Create | 5 target tools |
| `app/api/mcp/[transport]/route.ts` | Create | MCP route handler — registers all 25 tools |
| `app/[locale]/(routes)/profile/components/ApiTokens.tsx` | Create | Token management card UI |
| `app/[locale]/(routes)/profile/page.tsx` | Modify | Import and render `<ApiTokens>` |

---

## Task 1: Create Feature Branch

- [ ] **Step 1: Create and switch to feature branch**

```bash
cd /Users/pdovhomilja/development/Next.js/nextcrm-app
git checkout -b feature/mcp-server
```

- [ ] **Step 2: Verify branch**

```bash
git branch --show-current
```
Expected: `feature/mcp-server`

---

## Task 2: Add Dependency

- [ ] **Step 1: Install @vercel/mcp-adapter**

```bash
cd /Users/pdovhomilja/development/Next.js/nextcrm-app
pnpm add @vercel/mcp-adapter
```

- [ ] **Step 2: Verify installation**

```bash
node -e "require('@vercel/mcp-adapter'); console.log('ok')"
```
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add @vercel/mcp-adapter dependency"
```

---

## Task 3: Add ApiToken Prisma Model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add ApiToken model to schema**

Open `prisma/schema.prisma`. Add this model at the end of the file:

```prisma
model ApiToken {
  id          String    @id @default(uuid()) @db.Uuid
  name        String
  tokenHash   String    @unique
  tokenPrefix String    @db.VarChar(8)
  userId      String    @db.Uuid
  user        Users     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt   DateTime?
  revokedAt   DateTime?
  lastUsedAt  DateTime?
  createdAt   DateTime  @default(now())
}
```

Also add the back-relation inside the existing `Users` model (find the model and add one line):

```prisma
// Inside Users model, alongside other relations:
apiTokens   ApiToken[]
```

- [ ] **Step 2: Run migration**

```bash
cd /Users/pdovhomilja/development/Next.js/nextcrm-app
pnpm prisma migrate dev --name add-api-tokens
```
Expected: Migration created and applied successfully. Prisma client regenerated.

- [ ] **Step 3: Verify migration**

```bash
pnpm prisma studio
```
Open in browser and confirm `ApiToken` table exists. Then close Studio (Ctrl+C).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add ApiToken model to prisma schema"
```

---

## Task 4: Token Service

**Files:**
- Create: `lib/api-tokens.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/api-tokens.test.ts`:

```typescript
import { generateApiToken, validateApiToken, revokeApiToken } from "@/lib/api-tokens";
import { prismadb } from "@/lib/prisma";

// Mock prisma
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    apiToken: {
      count: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockPrisma = prismadb as jest.Mocked<typeof prismadb>;

describe("generateApiToken", () => {
  it("returns a token starting with nxtc__", async () => {
    (mockPrisma.apiToken.count as jest.Mock).mockResolvedValue(0);
    (mockPrisma.apiToken.create as jest.Mock).mockResolvedValue({ id: "1" });

    const result = await generateApiToken("user-id", "My Token");
    expect(result.rawToken).toMatch(/^nxtc__[a-f0-9]{48}$/);
  });

  it("throws if user has 10 active tokens", async () => {
    (mockPrisma.apiToken.count as jest.Mock).mockResolvedValue(10);

    await expect(generateApiToken("user-id", "My Token")).rejects.toThrow(
      "Maximum 10 active tokens allowed per user"
    );
  });
});

describe("revokeApiToken", () => {
  it("revokes a token owned by the user", async () => {
    (mockPrisma.apiToken.findUnique as jest.Mock).mockResolvedValue({
      id: "token-id",
      userId: "user-123",
    });
    (mockPrisma.apiToken.update as jest.Mock).mockResolvedValue({});

    await expect(revokeApiToken("token-id", "user-123")).resolves.toBeUndefined();
    expect(mockPrisma.apiToken.update).toHaveBeenCalledWith({
      where: { id: "token-id" },
      data: expect.objectContaining({ revokedAt: expect.any(Date) }),
    });
  });

  it("throws if token belongs to a different user", async () => {
    (mockPrisma.apiToken.findUnique as jest.Mock).mockResolvedValue({
      id: "token-id",
      userId: "other-user",
    });

    await expect(revokeApiToken("token-id", "user-123")).rejects.toThrow("Not found");
  });

  it("throws if token does not exist", async () => {
    (mockPrisma.apiToken.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(revokeApiToken("token-id", "user-123")).rejects.toThrow("Not found");
  });
});

describe("validateApiToken", () => {
  it("returns userId for valid token", async () => {
    const token = "nxtc__" + "a".repeat(48);
    (mockPrisma.apiToken.findUnique as jest.Mock).mockResolvedValue({
      id: "token-id",
      userId: "user-123",
      revokedAt: null,
      expiresAt: null,
    });

    const result = await validateApiToken(token);
    expect(result).toBe("user-123");
  });

  it("throws for revoked token", async () => {
    (mockPrisma.apiToken.findUnique as jest.Mock).mockResolvedValue({
      id: "token-id",
      userId: "user-123",
      revokedAt: new Date(),
      expiresAt: null,
    });

    await expect(validateApiToken("nxtc__" + "a".repeat(48))).rejects.toThrow(
      "Invalid token"
    );
  });

  it("throws for expired token", async () => {
    (mockPrisma.apiToken.findUnique as jest.Mock).mockResolvedValue({
      id: "token-id",
      userId: "user-123",
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(validateApiToken("nxtc__" + "a".repeat(48))).rejects.toThrow(
      "Invalid token"
    );
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/pdovhomilja/development/Next.js/nextcrm-app
pnpm test __tests__/lib/api-tokens.test.ts
```
Expected: FAIL — `Cannot find module '@/lib/api-tokens'`

- [ ] **Step 3: Implement the token service**

Create `lib/api-tokens.ts`:

```typescript
import crypto from "crypto";
import { prismadb } from "@/lib/prisma";

const TOKEN_PREFIX = "nxtc__";
const TOKEN_BYTES = 24; // 48 hex chars
const MAX_TOKENS_PER_USER = 10;

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export async function generateApiToken(
  userId: string,
  name: string,
  expiresAt?: Date
): Promise<{ rawToken: string; tokenId: string }> {
  const activeCount = await prismadb.apiToken.count({
    where: {
      userId,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });

  if (activeCount >= MAX_TOKENS_PER_USER) {
    throw new Error("Maximum 10 active tokens allowed per user");
  }

  const rawSuffix = crypto.randomBytes(TOKEN_BYTES).toString("hex");
  const rawToken = TOKEN_PREFIX + rawSuffix;
  const tokenHash = hashToken(rawToken);
  const tokenPrefix = rawSuffix.slice(0, 8);

  const created = await prismadb.apiToken.create({
    data: {
      name,
      tokenHash,
      tokenPrefix,
      userId,
      expiresAt: expiresAt ?? null,
    },
  });

  return { rawToken, tokenId: created.id };
}

export async function validateApiToken(rawToken: string): Promise<string> {
  const tokenHash = hashToken(rawToken);

  const token = await prismadb.apiToken.findUnique({
    where: { tokenHash },
  });

  if (!token) throw new Error("Invalid token");
  if (token.revokedAt) throw new Error("Invalid token");
  if (token.expiresAt && token.expiresAt < new Date()) throw new Error("Invalid token");

  // Fire-and-forget lastUsedAt update — failures are intentionally silenced
  prismadb.apiToken
    .update({ where: { id: token.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return token.userId;
}

export async function revokeApiToken(
  tokenId: string,
  userId: string
): Promise<void> {
  const token = await prismadb.apiToken.findUnique({ where: { id: tokenId } });
  if (!token || token.userId !== userId) throw new Error("Not found");

  await prismadb.apiToken.update({
    where: { id: tokenId },
    data: { revokedAt: new Date() },
  });
}

export async function listApiTokens(userId: string) {
  return prismadb.apiToken.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      tokenPrefix: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
      lastUsedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm test __tests__/lib/api-tokens.test.ts
```
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/api-tokens.ts __tests__/lib/api-tokens.test.ts
git commit -m "feat: add api token service with generate/validate/revoke"
```

---

## Task 5: Token Server Actions

**Files:**
- Create: `actions/api-tokens.ts`

- [ ] **Step 1: Create server actions**

Create `actions/api-tokens.ts`:

```typescript
"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  generateApiToken,
  listApiTokens,
  revokeApiToken,
} from "@/lib/api-tokens";

export async function createApiToken(data: {
  name: string;
  expiresAt?: Date;
}) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  try {
    const result = await generateApiToken(
      session.user.id,
      data.name,
      data.expiresAt
    );
    return { data: result };
  } catch (error: any) {
    return { error: error.message ?? "Failed to create token" };
  }
}

export async function getApiTokens() {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  try {
    const tokens = await listApiTokens(session.user.id);
    return { data: tokens };
  } catch {
    return { error: "Failed to fetch tokens" };
  }
}

export async function deleteApiToken(tokenId: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  try {
    await revokeApiToken(tokenId, session.user.id);
    return { data: "ok" };
  } catch {
    return { error: "Not found or unauthorized" };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add actions/api-tokens.ts
git commit -m "feat: add server actions for api token management"
```

---

## Task 6: MCP Auth Helper

**Files:**
- Create: `lib/mcp/auth.ts`

- [ ] **Step 1: Create MCP auth helper**

Create `lib/mcp/auth.ts`:

```typescript
import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { validateApiToken } from "@/lib/api-tokens";

export interface McpUser {
  id: string;
}

export async function getMcpUser(): Promise<McpUser> {
  const hdrs = await headers();
  const authHeader = hdrs.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (bearer?.startsWith("nxtc__")) {
    const userId = await validateApiToken(bearer);
    return { id: userId };
  }

  // Development-only fallback: NextAuth session cookie
  // Not used in production — session cannot substitute for token revocation
  if (process.env.NODE_ENV === "development") {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      return { id: session.user.id };
    }
  }

  throw new Error("Unauthorized");
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/mcp/auth.ts
git commit -m "feat: add MCP auth helper with bearer token + dev session fallback"
```

---

## Task 7: Account Tools

**Files:**
- Create: `lib/mcp/tools/accounts.ts`

- [ ] **Step 1: Create account tools**

Create `lib/mcp/tools/accounts.ts`:

```typescript
import { z } from "zod";
import { prismadb } from "@/lib/prisma";

export const accountTools = [
  {
    name: "list_accounts",
    description: "List CRM accounts assigned to the authenticated user",
    schema: z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }),
    async handler(args: { limit: number; offset: number }, userId: string) {
      const [data, total] = await Promise.all([
        prismadb.crm_Accounts.findMany({
          where: { assigned_to: userId },
          take: args.limit,
          skip: args.offset,
          orderBy: { createdAt: "desc" },
        }),
        prismadb.crm_Accounts.count({ where: { assigned_to: userId } }),
      ]);
      return { data, total, offset: args.offset };
    },
  },
  {
    name: "get_account",
    description: "Get a single CRM account by ID",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const account = await prismadb.crm_Accounts.findFirst({
        where: { id: args.id, assigned_to: userId },
      });
      if (!account) throw new Error("NOT_FOUND");
      return { data: account };
    },
  },
  {
    name: "search_accounts",
    description: "Search accounts by name, website, or industry (substring match)",
    schema: z.object({
      query: z.string().min(1),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }),
    async handler(args: { query: string; limit: number; offset: number }, userId: string) {
      const where = {
        assigned_to: userId,
        OR: [
          { name: { contains: args.query, mode: "insensitive" as const } },
          { website: { contains: args.query, mode: "insensitive" as const } },
          { industry: { contains: args.query, mode: "insensitive" as const } },
        ],
      };
      const [data, total] = await Promise.all([
        prismadb.crm_Accounts.findMany({ where, take: args.limit, skip: args.offset }),
        prismadb.crm_Accounts.count({ where }),
      ]);
      return { data, total, offset: args.offset };
    },
  },
  {
    name: "create_account",
    description: "Create a new CRM account",
    schema: z.object({
      name: z.string().min(1),
      email: z.string().email().optional(),
      description: z.string().optional(),
      phone: z.string().optional(),
      website: z.string().optional(),
      industry: z.string().optional(),
    }),
    async handler(args: Record<string, any>, userId: string) {
      const account = await prismadb.crm_Accounts.create({
        data: {
          v: 0,
          ...args,
          assigned_to: userId,
          createdBy: userId,
          updatedBy: userId,
          status: "Active",
        },
      });
      return { data: account };
    },
  },
  {
    name: "update_account",
    description: "Update an existing CRM account by ID",
    schema: z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      description: z.string().optional(),
      phone: z.string().optional(),
      website: z.string().optional(),
      industry: z.string().optional(),
    }),
    async handler(args: { id: string; [key: string]: any }, userId: string) {
      const existing = await prismadb.crm_Accounts.findFirst({
        where: { id: args.id, assigned_to: userId },
      });
      if (!existing) throw new Error("NOT_FOUND");

      const { id, ...updateData } = args;
      const account = await prismadb.crm_Accounts.update({
        where: { id },
        data: { ...updateData, updatedBy: userId },
      });
      return { data: account };
    },
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add lib/mcp/tools/accounts.ts
git commit -m "feat: add MCP account tools (list/get/search/create/update)"
```

---

## Task 8: Contact Tools

**Files:**
- Create: `lib/mcp/tools/contacts.ts`

- [ ] **Step 1: Create contact tools**

Create `lib/mcp/tools/contacts.ts`:

```typescript
import { z } from "zod";
import { prismadb } from "@/lib/prisma";

export const contactTools = [
  {
    name: "list_contacts",
    description: "List CRM contacts assigned to the authenticated user",
    schema: z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }),
    async handler(args: { limit: number; offset: number }, userId: string) {
      const [data, total] = await Promise.all([
        prismadb.crm_Contacts.findMany({
          where: { assigned_to: userId },
          take: args.limit,
          skip: args.offset,
          orderBy: { createdAt: "desc" },
        }),
        prismadb.crm_Contacts.count({ where: { assigned_to: userId } }),
      ]);
      return { data, total, offset: args.offset };
    },
  },
  {
    name: "get_contact",
    description: "Get a single CRM contact by ID",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const contact = await prismadb.crm_Contacts.findFirst({
        where: { id: args.id, assigned_to: userId },
      });
      if (!contact) throw new Error("NOT_FOUND");
      return { data: contact };
    },
  },
  {
    name: "search_contacts",
    description: "Search contacts by name, email, or phone (substring match)",
    schema: z.object({
      query: z.string().min(1),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }),
    async handler(args: { query: string; limit: number; offset: number }, userId: string) {
      const where = {
        assigned_to: userId,
        OR: [
          { first_name: { contains: args.query, mode: "insensitive" as const } },
          { last_name: { contains: args.query, mode: "insensitive" as const } },
          { email: { contains: args.query, mode: "insensitive" as const } },
          { phone: { contains: args.query, mode: "insensitive" as const } },
        ],
      };
      const [data, total] = await Promise.all([
        prismadb.crm_Contacts.findMany({ where, take: args.limit, skip: args.offset }),
        prismadb.crm_Contacts.count({ where }),
      ]);
      return { data, total, offset: args.offset };
    },
  },
  {
    name: "create_contact",
    description: "Create a new CRM contact",
    schema: z.object({
      first_name: z.string().min(1),
      last_name: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      position: z.string().optional(),
    }),
    async handler(args: Record<string, any>, userId: string) {
      const contact = await prismadb.crm_Contacts.create({
        data: {
          ...args,
          assigned_to: userId,
          createdBy: userId,
        },
      });
      return { data: contact };
    },
  },
  {
    name: "update_contact",
    description: "Update an existing CRM contact by ID",
    schema: z.object({
      id: z.string().uuid(),
      first_name: z.string().min(1).optional(),
      last_name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      position: z.string().optional(),
    }),
    async handler(args: { id: string; [key: string]: any }, userId: string) {
      const existing = await prismadb.crm_Contacts.findFirst({
        where: { id: args.id, assigned_to: userId },
      });
      if (!existing) throw new Error("NOT_FOUND");

      const { id, ...updateData } = args;
      const contact = await prismadb.crm_Contacts.update({
        where: { id },
        data: updateData,
      });
      return { data: contact };
    },
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add lib/mcp/tools/contacts.ts
git commit -m "feat: add MCP contact tools (list/get/search/create/update)"
```

---

## Task 9: Lead Tools

**Files:**
- Create: `lib/mcp/tools/leads.ts`

- [ ] **Step 1: Create lead tools**

Create `lib/mcp/tools/leads.ts`:

```typescript
import { z } from "zod";
import { prismadb } from "@/lib/prisma";

export const leadTools = [
  {
    name: "list_leads",
    description: "List CRM leads assigned to the authenticated user",
    schema: z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }),
    async handler(args: { limit: number; offset: number }, userId: string) {
      const [data, total] = await Promise.all([
        prismadb.crm_Leads.findMany({
          where: { assigned_to: userId },
          take: args.limit,
          skip: args.offset,
          orderBy: { createdAt: "desc" },
        }),
        prismadb.crm_Leads.count({ where: { assigned_to: userId } }),
      ]);
      return { data, total, offset: args.offset };
    },
  },
  {
    name: "get_lead",
    description: "Get a single CRM lead by ID",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const lead = await prismadb.crm_Leads.findFirst({
        where: { id: args.id, assigned_to: userId },
      });
      if (!lead) throw new Error("NOT_FOUND");
      return { data: lead };
    },
  },
  {
    name: "search_leads",
    description: "Search leads by name, company, or email (substring match)",
    schema: z.object({
      query: z.string().min(1),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }),
    async handler(args: { query: string; limit: number; offset: number }, userId: string) {
      const where = {
        assigned_to: userId,
        OR: [
          { firstName: { contains: args.query, mode: "insensitive" as const } },
          { lastName: { contains: args.query, mode: "insensitive" as const } },
          { email: { contains: args.query, mode: "insensitive" as const } },
          { company: { contains: args.query, mode: "insensitive" as const } },
        ],
      };
      const [data, total] = await Promise.all([
        prismadb.crm_Leads.findMany({ where, take: args.limit, skip: args.offset }),
        prismadb.crm_Leads.count({ where }),
      ]);
      return { data, total, offset: args.offset };
    },
  },
  {
    name: "create_lead",
    description: "Create a new CRM lead",
    schema: z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email().optional(),
      company: z.string().optional(),
      phone: z.string().optional(),
    }),
    async handler(args: Record<string, any>, userId: string) {
      const lead = await prismadb.crm_Leads.create({
        data: {
          ...args,
          assigned_to: userId,
          createdBy: userId,
        },
      });
      return { data: lead };
    },
  },
  {
    name: "update_lead",
    description: "Update an existing CRM lead by ID",
    schema: z.object({
      id: z.string().uuid(),
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      email: z.string().email().optional(),
      company: z.string().optional(),
      phone: z.string().optional(),
    }),
    async handler(args: { id: string; [key: string]: any }, userId: string) {
      const existing = await prismadb.crm_Leads.findFirst({
        where: { id: args.id, assigned_to: userId },
      });
      if (!existing) throw new Error("NOT_FOUND");

      const { id, ...updateData } = args;
      const lead = await prismadb.crm_Leads.update({
        where: { id },
        data: { ...updateData, updatedBy: userId },
      });
      return { data: lead };
    },
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add lib/mcp/tools/leads.ts
git commit -m "feat: add MCP lead tools (list/get/search/create/update)"
```

---

## Task 10: Opportunity Tools

**Files:**
- Create: `lib/mcp/tools/opportunities.ts`

- [ ] **Step 1: Create opportunity tools**

Create `lib/mcp/tools/opportunities.ts`:

```typescript
import { z } from "zod";
import { prismadb } from "@/lib/prisma";

export const opportunityTools = [
  {
    name: "list_opportunities",
    description: "List CRM opportunities assigned to the authenticated user",
    schema: z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }),
    async handler(args: { limit: number; offset: number }, userId: string) {
      const [data, total] = await Promise.all([
        prismadb.crm_Opportunities.findMany({
          where: { assigned_to: userId },
          take: args.limit,
          skip: args.offset,
          orderBy: { createdAt: "desc" },
        }),
        prismadb.crm_Opportunities.count({ where: { assigned_to: userId } }),
      ]);
      return { data, total, offset: args.offset };
    },
  },
  {
    name: "get_opportunity",
    description: "Get a single CRM opportunity by ID",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const opp = await prismadb.crm_Opportunities.findFirst({
        where: { id: args.id, assigned_to: userId },
      });
      if (!opp) throw new Error("NOT_FOUND");
      return { data: opp };
    },
  },
  {
    name: "search_opportunities",
    description: "Search opportunities by name or description (substring match)",
    schema: z.object({
      query: z.string().min(1),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }),
    async handler(args: { query: string; limit: number; offset: number }, userId: string) {
      // Note: crm_Opportunities has no denormalized account name field.
      // We search name + description; to search by account name would require a join.
      const where = {
        assigned_to: userId,
        OR: [
          { name: { contains: args.query, mode: "insensitive" as const } },
          { description: { contains: args.query, mode: "insensitive" as const } },
        ],
      };
      const [data, total] = await Promise.all([
        prismadb.crm_Opportunities.findMany({ where, take: args.limit, skip: args.offset }),
        prismadb.crm_Opportunities.count({ where }),
      ]);
      return { data, total, offset: args.offset };
    },
  },
  {
    name: "create_opportunity",
    description: "Create a new CRM opportunity",
    schema: z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      close_date: z.string().optional(),
      amount: z.number().optional(),
      stage: z.string().optional(),
    }),
    async handler(args: Record<string, any>, userId: string) {
      const opp = await prismadb.crm_Opportunities.create({
        data: {
          v: 0,
          ...args,
          assigned_to: userId,
          createdBy: userId,
          updatedBy: userId,
          status: "Prospecting",
        },
      });
      return { data: opp };
    },
  },
  {
    name: "update_opportunity",
    description: "Update an existing CRM opportunity by ID",
    schema: z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      close_date: z.string().optional(),
      amount: z.number().optional(),
      stage: z.string().optional(),
    }),
    async handler(args: { id: string; [key: string]: any }, userId: string) {
      const existing = await prismadb.crm_Opportunities.findFirst({
        where: { id: args.id, assigned_to: userId },
      });
      if (!existing) throw new Error("NOT_FOUND");

      const { id, ...updateData } = args;
      const opp = await prismadb.crm_Opportunities.update({
        where: { id },
        data: { ...updateData, updatedBy: userId },
      });
      return { data: opp };
    },
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add lib/mcp/tools/opportunities.ts
git commit -m "feat: add MCP opportunity tools (list/get/search/create/update)"
```

---

## Task 11: Target Tools

**Files:**
- Create: `lib/mcp/tools/targets.ts`

> **Note:** `crm_Targets` uses `created_by` (not `assigned_to`) for user association. Data scoping is done via this field.

- [ ] **Step 1: Create target tools**

Create `lib/mcp/tools/targets.ts`:

```typescript
import { z } from "zod";
import { prismadb } from "@/lib/prisma";

export const targetTools = [
  {
    name: "list_targets",
    description: "List CRM targets created by the authenticated user",
    schema: z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }),
    async handler(args: { limit: number; offset: number }, userId: string) {
      const [data, total] = await Promise.all([
        prismadb.crm_Targets.findMany({
          where: { created_by: userId },
          take: args.limit,
          skip: args.offset,
          orderBy: { createdAt: "desc" },
        }),
        prismadb.crm_Targets.count({ where: { created_by: userId } }),
      ]);
      return { data, total, offset: args.offset };
    },
  },
  {
    name: "get_target",
    description: "Get a single CRM target by ID",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const target = await prismadb.crm_Targets.findFirst({
        where: { id: args.id, created_by: userId },
      });
      if (!target) throw new Error("NOT_FOUND");
      return { data: target };
    },
  },
  {
    name: "search_targets",
    description: "Search targets by name or email (substring match)",
    schema: z.object({
      query: z.string().min(1),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }),
    async handler(args: { query: string; limit: number; offset: number }, userId: string) {
      const where = {
        created_by: userId,
        OR: [
          { first_name: { contains: args.query, mode: "insensitive" as const } },
          { last_name: { contains: args.query, mode: "insensitive" as const } },
          { email: { contains: args.query, mode: "insensitive" as const } },
        ],
      };
      const [data, total] = await Promise.all([
        prismadb.crm_Targets.findMany({ where, take: args.limit, skip: args.offset }),
        prismadb.crm_Targets.count({ where }),
      ]);
      return { data, total, offset: args.offset };
    },
  },
  {
    name: "create_target",
    description: "Create a new CRM target",
    schema: z.object({
      first_name: z.string().min(1),
      last_name: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().optional(),
    }),
    async handler(args: Record<string, any>, userId: string) {
      const target = await prismadb.crm_Targets.create({
        data: {
          ...args,
          created_by: userId,
        },
      });
      return { data: target };
    },
  },
  {
    name: "update_target",
    description: "Update an existing CRM target by ID",
    schema: z.object({
      id: z.string().uuid(),
      first_name: z.string().min(1).optional(),
      last_name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
    }),
    async handler(args: { id: string; [key: string]: any }, userId: string) {
      const existing = await prismadb.crm_Targets.findFirst({
        where: { id: args.id, created_by: userId },
      });
      if (!existing) throw new Error("NOT_FOUND");

      const { id, ...updateData } = args;
      const target = await prismadb.crm_Targets.update({
        where: { id },
        data: updateData,
      });
      return { data: target };
    },
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add lib/mcp/tools/targets.ts
git commit -m "feat: add MCP target tools (list/get/search/create/update)"
```

---

## Task 12: MCP Route Handler

**Files:**
- Create: `app/api/mcp/[transport]/route.ts`

- [ ] **Step 1: Create the MCP route**

Create `app/api/mcp/[transport]/route.ts`:

```typescript
import { createMcpHandler } from "@vercel/mcp-adapter";
import { getMcpUser } from "@/lib/mcp/auth";
import { accountTools } from "@/lib/mcp/tools/accounts";
import { contactTools } from "@/lib/mcp/tools/contacts";
import { leadTools } from "@/lib/mcp/tools/leads";
import { opportunityTools } from "@/lib/mcp/tools/opportunities";
import { targetTools } from "@/lib/mcp/tools/targets";

const allTools = [
  ...accountTools,
  ...contactTools,
  ...leadTools,
  ...opportunityTools,
  ...targetTools,
];

const handler = createMcpHandler(
  (server) => {
    for (const tool of allTools) {
      server.tool(tool.name, tool.description, tool.schema.shape, async (args) => {
        try {
          const mcpUser = await getMcpUser();
          const result = await tool.handler(args as any, mcpUser.id);
          return {
            content: [{ type: "text", text: JSON.stringify(result) }],
          };
        } catch (err: any) {
          const code = err.message === "NOT_FOUND" ? "NOT_FOUND"
            : err.message === "Unauthorized" ? "UNAUTHORIZED"
            : "INTERNAL_ERROR";
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ error: err.message ?? "Unknown error", code }),
              },
            ],
            isError: true,
          };
        }
      });
    }
  },
  {
    capabilities: {
      tools: Object.fromEntries(
        allTools.map((t) => [t.name, { description: t.description }])
      ),
    },
  },
  {
    redactSensitiveHeaders: true,
  }
);

export { handler as GET, handler as POST };
```

- [ ] **Step 2: Test the endpoint manually**

> **Note:** The token management UI is built in Tasks 13–14. For this step you have two options:
> - **Option A (recommended):** Skip this test now and proceed to Task 13. Return here after Task 14 with a real generated token.
> - **Option B:** Generate a token directly via `pnpm prisma studio` — create an `ApiToken` row manually with a known `tokenHash` (SHA-256 of your test token string) to test immediately.

Start the dev server:
```bash
pnpm dev
```

In a separate terminal, test with a valid token (replace `TOKEN`):
```bash
curl -X POST http://localhost:3000/api/mcp/http \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```
Expected: JSON response listing all 25 tools.

Test with invalid token:
```bash
curl -X POST http://localhost:3000/api/mcp/http \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer nxtc__invalid" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```
Expected: 401 or error response.

- [ ] **Step 3: Commit**

```bash
git add app/api/mcp/
git commit -m "feat: add MCP route handler with 25 CRM tools"
```

---

## Task 13: Token Management UI

**Files:**
- Create: `app/[locale]/(routes)/profile/components/ApiTokens.tsx`

- [ ] **Step 1: Create the ApiTokens component**

Create `app/[locale]/(routes)/profile/components/ApiTokens.tsx`:

```typescript
"use client";
import { useState, useEffect } from "react";
import { createApiToken, getApiTokens, deleteApiToken } from "@/actions/api-tokens";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type TokenRow = {
  id: string;
  name: string;
  tokenPrefix: string;
  createdAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
};

export function ApiTokens() {
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [name, setName] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function load() {
    const res = await getApiTokens();
    if (res.data) setTokens(res.data as TokenRow[]);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    const res = await createApiToken({
      name: name.trim(),
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setNewToken(res.data!.rawToken);
    setName("");
    setExpiresAt("");
    await load();
  }

  async function handleRevoke(tokenId: string) {
    if (!confirm("Revoke this token? This cannot be undone.")) return;
    await deleteApiToken(tokenId);
    await load();
  }

  function handleCopy() {
    if (!newToken) return;
    navigator.clipboard.writeText(newToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const active = tokens.filter(
    (t) => !t.revokedAt && (!t.expiresAt || new Date(t.expiresAt) > new Date())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Tokens</CardTitle>
        <CardDescription>
          Generate tokens to connect AI agents via MCP. Token prefix: <code>nxtc__</code>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Generate form */}
        <div className="flex gap-2">
          <Input
            placeholder="Token name (e.g. Claude Desktop)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-xs"
          />
          <Input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="max-w-[160px]"
            title="Optional expiry date"
          />
          <Button onClick={handleCreate} disabled={loading || !name.trim()}>
            {loading ? "Generating…" : "Generate"}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Token list */}
        {active.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Prefix</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {active.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{t.name}</TableCell>
                  <TableCell className="font-mono text-sm">
                    nxtc__{t.tokenPrefix}…
                  </TableCell>
                  <TableCell>{new Date(t.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {t.expiresAt ? new Date(t.expiresAt).toLocaleDateString() : "Never"}
                  </TableCell>
                  <TableCell>
                    <Button variant="destructive" size="sm" onClick={() => handleRevoke(t.id)}>
                      Revoke
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* New token reveal modal */}
        <Dialog open={!!newToken} onOpenChange={() => setNewToken(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Token Created</DialogTitle>
              <DialogDescription>
                Copy this token now. It will not be shown again.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <code className="block break-all rounded bg-muted p-3 text-sm">
                {newToken}
              </code>
              <Button onClick={handleCopy} className="w-full">
                {copied ? "Copied!" : "Copy to clipboard"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/[locale]/\(routes\)/profile/components/ApiTokens.tsx
git commit -m "feat: add ApiTokens component for token management UI"
```

---

## Task 14: Wire into Profile Page

**Files:**
- Modify: `app/[locale]/(routes)/profile/page.tsx`

- [ ] **Step 1: Read the current profile page**

Read `app/[locale]/(routes)/profile/page.tsx` to see the current structure.

- [ ] **Step 2: Add ApiTokens import and render**

In `app/[locale]/(routes)/profile/page.tsx`, add the import and render `<ApiTokens>` after the existing components:

```typescript
import { ApiTokens } from "./components/ApiTokens";

// Inside the JSX, after the last existing component (e.g., <OpenAiForm>):
<ApiTokens />
```

- [ ] **Step 3: Verify profile page loads**

```bash
pnpm dev
```
Open `http://localhost:3000/en/profile` — confirm the API Tokens card appears below the existing profile sections.

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/\(routes\)/profile/page.tsx
git commit -m "feat: add API tokens section to profile page"
```

---

## Task 15: End-to-End Verification

- [ ] **Step 1: Generate a real token via the UI**

1. Open `http://localhost:3000/en/profile`
2. Enter a token name, click Generate
3. Copy the `nxtc__...` token from the modal

- [ ] **Step 2: Test the MCP endpoint with real token**

```bash
# Replace TOKEN with the generated token
curl -X POST http://localhost:3000/api/mcp/http \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```
Expected: JSON with `tools` array listing all 25 tool names.

```bash
curl -X POST http://localhost:3000/api/mcp/http \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"list_accounts","arguments":{"limit":5,"offset":0}},"id":2}'
```
Expected: JSON with `content[0].text` containing `{ "data": [...], "total": N, "offset": 0 }`.

- [ ] **Step 3: Test revocation**

1. Revoke the token in the UI
2. Repeat the curl from Step 2
3. Expected: 401 or error response (token no longer valid)

- [ ] **Step 4: Run all tests**

```bash
pnpm test
```
Expected: All tests pass.

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat: complete MCP server implementation for NextCRM CRM modules"
```

---

## MCP Client Config (for README / docs)

Once deployed, users connect Claude Desktop with:

```json
{
  "mcpServers": {
    "nextcrm": {
      "url": "https://your-domain.com/api/mcp/sse",
      "headers": {
        "Authorization": "Bearer nxtc__your_token_here"
      }
    }
  }
}
```
