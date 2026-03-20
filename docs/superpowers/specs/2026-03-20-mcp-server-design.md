# NextCRM MCP Server — Design Spec

**Date:** 2026-03-20
**Status:** Approved
**Branch:** `feature/mcp-server`

---

## Overview

Add an MCP (Model Context Protocol) server to NextCRM so AI agents can operate on CRM data (Accounts, Leads, Opportunities, Contacts, Targets) via natural language. Users generate Bearer tokens in their profile page to authenticate MCP clients.

---

## Architecture

Single Next.js API route using `@vercel/mcp-adapter`, supporting both SSE and HTTP transports.

```
nextcrm-app/
├── app/api/mcp/[transport]/route.ts       # Single MCP endpoint
├── lib/mcp/
│   ├── auth.ts                             # Token validation + session fallback (dev only)
│   └── tools/
│       ├── accounts.ts                     # list, get, search, create, update
│       ├── contacts.ts
│       ├── leads.ts
│       ├── opportunities.ts
│       └── targets.ts
├── lib/api-tokens.ts                       # generateToken, validateToken, revokeToken
├── actions/api-tokens.ts                   # Server actions wrapping lib/api-tokens.ts
├── prisma/schema.prisma                    # + ApiToken model + Users back-relation
└── app/[locale]/(routes)/profile/
    └── components/ApiTokens.tsx            # Token management UI
```

**Data flow:**
1. MCP client connects to `/api/mcp/sse` or `/api/mcp/http`
2. `lib/mcp/auth.ts` extracts `Bearer nxtc__...` from `Authorization` header
3. Hashes token, validates against DB (not revoked, not expired)
4. Resolves `userId` → all tools execute scoped to that user's data
5. Tools interact with Prisma directly (consistent with existing server actions)

**New dependency:** `pnpm add @vercel/mcp-adapter`

---

## ApiToken Model

Add to `prisma/schema.prisma`:

```prisma
model ApiToken {
  id          String    @id @default(uuid()) @db.Uuid
  name        String
  tokenHash   String    @unique
  tokenPrefix String    @db.VarChar(8)        // first 8 chars after "nxtc__", shown in UI
  userId      String    @db.Uuid
  user        Users     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt   DateTime?
  revokedAt   DateTime?
  lastUsedAt  DateTime?
  createdAt   DateTime  @default(now())
}
```

Also add the back-relation on the `Users` model:
```prisma
// Inside existing Users model:
apiTokens   ApiToken[]
```

**Migration:** Run `pnpm prisma migrate dev --name add-api-tokens` after schema changes.

**Token format:** `nxtc__` + 48 random hex chars (e.g. `nxtc__a1b2c3d4e5f6...`)

**Security:** Raw token is never stored — only SHA-256 hash. If lost, user must generate a new one.

**Token limit:** Max 10 active (non-revoked, non-expired) tokens per user, enforced in `generateApiToken()`.

---

## Token Service (`lib/api-tokens.ts`)

| Function | Description |
|----------|-------------|
| `generateApiToken(userId, name, expiresAt?)` | Creates raw token, stores hash + prefix only, returns raw token **once**. Throws if user already has 10 active tokens. |
| `validateApiToken(rawToken)` | Hashes token, checks DB: exists + not revoked + not expired → returns `userId`. Throws 401 on any failure. |
| `revokeApiToken(tokenId, userId)` | Sets `revokedAt`, verifies ownership before revoking. |

**Server actions** (`actions/api-tokens.ts`): thin wrappers around the above, using `getServerSession(authOptions)` to verify the calling user before delegating to the token service.

---

## MCP Tools (25 total)

All tools are scoped to the authenticated user. No delete operations.

**Data scoping:** All list/get/search tools filter by `assigned_to` field matching the authenticated `userId`. The `create_*` tools set `assigned_to` from the token's `userId`.

**Success response shape** (all tools return this structure):
```json
{
  "data": { ... } | [ ... ],
  "total": 42,        // present on list/search only
  "offset": 0         // present on list/search only
}
```

**Error response shape:**
```json
{ "error": "Record not found", "code": "NOT_FOUND" }
```

### Accounts
- `list_accounts` — paginated list (limit/offset), filtered by `assigned_to`
- `get_account` — single record by ID, 404 if not found or not assigned to user
- `search_accounts` — substring match (LIKE) on name, website, industry fields
- `create_account` — validated input, sets `assigned_to` from userId
- `update_account` — partial update by ID, verifies `assigned_to` before update

### Contacts
- `list_contacts` — paginated list, filtered by `assigned_to`
- `get_contact` — single record by ID, ownership verified
- `search_contacts` — substring match on name, email, phone
- `create_contact` — validated input, sets `assigned_to` from userId
- `update_contact` — partial update by ID, verifies `assigned_to` before update

### Leads
- `list_leads` — paginated list, filtered by `assigned_to`
- `get_lead` — single record by ID, ownership verified
- `search_leads` — substring match on name, company, email
- `create_lead` — validated input, sets `assigned_to` from userId
- `update_lead` — partial update by ID, verifies `assigned_to` before update

### Opportunities
- `list_opportunities` — paginated list, filtered by `assigned_to`
- `get_opportunity` — single record by ID, ownership verified
- `search_opportunities` — substring match on name, account name
- `create_opportunity` — validated input, sets `assigned_to` from userId
- `update_opportunity` — partial update by ID, verifies `assigned_to` before update

### Targets
- `list_targets` — paginated list, filtered by `created_by` (Targets model uses `created_by`, not `assigned_to`)
- `get_target` — single record by ID, ownership verified via `created_by`
- `search_targets` — substring match on name
- `create_target` — validated input, sets `created_by` from userId
- `update_target` — partial update by ID, verifies `created_by` before update

**Common input patterns:**
- All inputs validated with Zod schemas
- `list_*` accepts `limit` (default 20, max 100) and `offset` (default 0)
- `search_*` accepts `query` string, uses Prisma `contains` mode `insensitive` (LIKE query, not full-text)
- `update_*` accepts `id` + partial fields; only provided fields are changed

---

## MCP Auth (`lib/mcp/auth.ts`)

1. Check `Authorization: Bearer nxtc__...` header → call `validateApiToken()`
2. **Development only fallback:** If `NODE_ENV === 'development'` and no Bearer token, try NextAuth session via `getServerSession(authOptions)`. This fallback does **not** apply in production to prevent revoked tokens being bypassed via session cookie.
3. If neither → return 401
4. On success → return `{ userId }`
5. Fire-and-forget: update `lastUsedAt` asynchronously. Failures are silently ignored — this field is informational only and must not block the response.

---

## Token Management UI

**Location:** New card section on existing profile page
**Component:** `app/[locale]/(routes)/profile/components/ApiTokens.tsx`

**Generate flow:**
- Name input (required) + optional expiry date picker
- Server action (`actions/api-tokens.ts`) calls `generateApiToken()`
- Raw token shown **once** in modal with copy button + "Save this now, it won't be shown again" warning
- If user already has 10 active tokens, show error before opening modal

**Token list:**
- Columns: Name | Prefix (`nxtc__a1b2c3...`) | Created | Expires | Revoke
- Revoke triggers confirmation prompt → server action calls `revokeApiToken()`

---

## Out of Scope

- Delete operations (by design — read + write only)
- Per-module token scoping (flat access — all tokens access all modules)
- Usage analytics / request logging
- Rate limiting on the MCP endpoint (no infrastructure in place; accept risk for v1)
- Token rotation / automatic background expiry cleanup

---

## Decisions Log

| Decision | Rationale |
|----------|-----------|
| Single MCP route | Flat access makes per-module routes unnecessary overhead |
| No delete tools | Prevents destructive agent actions on production CRM data |
| Optional expiry | Balances flexibility with security; permanent tokens need manual revocation |
| SHA-256 hash storage | Raw token never persisted; DB breach doesn't expose tokens |
| `nxtc__` prefix | Visually distinct, easy to identify in logs and configs |
| Session fallback dev-only | Production revocation must be absolute; session bypass would undermine it |
| `assigned_to` for scoping | Primary user association field in 4 CRM models; Targets uses `created_by` |
| Max 10 tokens per user | Prevents table flooding; sufficient for all practical agent configurations |
| `lastUsedAt` silently fails | Informational field; blocking on audit update would degrade performance |
