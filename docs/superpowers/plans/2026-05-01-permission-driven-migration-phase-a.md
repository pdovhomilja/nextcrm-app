# Permission-Driven Authorization Migration — Phase A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close `GHSA-mg5f-m89f-4gmc` (BOLA/IDOR in CRM contact and target PATCH routes) and establish reusable authorization primitives — canonical `user|manager|admin` roles, a centralized `lib/authz/` helper layer, scope helpers for contacts and targets, and admin guards on the two unauthenticated admin action files.

**Architecture:** Introduce `lib/authz/` as the single source of authorization logic. `Users.role` becomes canonical (string-validated, not a Prisma enum yet — Phase A keeps schema changes minimal). Legacy roles (`admin|member|viewer`) are migrated via a one-time data migration to `admin|manager|user`. Better Auth admin plugin role names are renamed to match. `is_admin` is kept in sync as a compatibility column but is no longer used for authorization decisions (admin layout switches to `role === "admin"`). Two vulnerable PATCH routes use atomic scoped `updateMany` for IDOR-safe mutations.

**Tech Stack:** Next.js 16, Prisma 7, Better Auth 1.5, Jest 30 + ts-jest, PostgreSQL, TypeScript.

**Spec source:** `docs/specs/2026-05-01-permission-driven-migration-design.md` Section 18 (Recommended First Implementation Slice).
**Audit source:** `docs/2026-05-01-bola-idor-security-audit.md`.

**Open product decisions deferred (not blocking Phase A):** 15.1 (member→manager mapping is used per spec default), 15.2/15.3 (products/campaigns policies — not touched in Phase A).

---

## File Structure

**New files:**
- `lib/authz/roles.ts` — `AppRole` type, `APP_ROLES` constant, `LEGACY_ROLE_MAP`, `parseRole()`
- `lib/authz/errors.ts` — `AuthorizationError`, `AuthenticationError`
- `lib/authz/route.ts` — `unauthorizedResponse()`, `forbiddenResponse()`, `notFoundOrForbiddenResponse()`
- `lib/authz/session.ts` — `AuthzUser` interface, `requireAuthenticated()`, `requireRole()`, `isAdmin()`, `isManagerOrAdmin()`
- `lib/authz/scopes/crm.ts` — `assertCanWriteContact()`, `assertCanWriteTarget()`, `tryScopedUpdateContact()`, `tryScopedUpdateTarget()`
- `lib/authz/index.ts` — barrel
- `lib/authz/__tests__/roles.test.ts`
- `lib/authz/__tests__/route.test.ts`
- `lib/authz/__tests__/session.test.ts`
- `lib/authz/__tests__/scopes-crm.test.ts`
- `app/api/crm/contacts/[id]/__tests__/route.test.ts`
- `app/api/crm/targets/[id]/__tests__/route.test.ts`
- `prisma/migrations/<timestamp>_canonical_roles_backfill/migration.sql`

**Modified files:**
- `lib/auth-permissions.ts` — rename role exports `member`→`manager`, `viewer`→`user`
- `lib/auth.ts` — admin plugin `roles` and `defaultRole`
- `actions/admin/users/set-role.ts` — accept new role names
- `app/[locale]/(routes)/admin/layout.tsx` — gate by `role === "admin"` instead of `is_admin`
- `app/api/crm/contacts/[id]/route.ts` — atomic scoped update
- `app/api/crm/targets/[id]/route.ts` — atomic scoped update (auto-fixes `app/api/campaigns/targets/[id]/route.ts` re-export)
- `app/[locale]/(routes)/admin/crm-settings/_actions/crm-settings.ts` — `requireRole(["admin"])` per export
- `app/[locale]/(routes)/admin/currencies/_actions/currencies.ts` — `requireRole(["admin"])` per export

---

## Task 1: Role types, constants, and legacy mapper

**Files:**
- Create: `lib/authz/roles.ts`
- Create: `lib/authz/__tests__/roles.test.ts`

- [ ] **Step 1: Write the failing test**

`lib/authz/__tests__/roles.test.ts`:
```ts
import { APP_ROLES, parseRole, mapLegacyRole } from "../roles";

describe("APP_ROLES", () => {
  it("contains exactly user, manager, admin", () => {
    expect([...APP_ROLES].sort()).toEqual(["admin", "manager", "user"]);
  });
});

describe("parseRole", () => {
  it("returns the role for canonical values", () => {
    expect(parseRole("user")).toBe("user");
    expect(parseRole("manager")).toBe("manager");
    expect(parseRole("admin")).toBe("admin");
  });

  it("returns null for unknown values", () => {
    expect(parseRole("member")).toBeNull();
    expect(parseRole("viewer")).toBeNull();
    expect(parseRole("")).toBeNull();
    expect(parseRole(null)).toBeNull();
    expect(parseRole(undefined)).toBeNull();
  });
});

describe("mapLegacyRole", () => {
  it("maps admin -> admin, member -> manager, viewer -> user", () => {
    expect(mapLegacyRole("admin")).toBe("admin");
    expect(mapLegacyRole("member")).toBe("manager");
    expect(mapLegacyRole("viewer")).toBe("user");
  });

  it("returns user for unknown legacy values", () => {
    expect(mapLegacyRole("foo")).toBe("user");
    expect(mapLegacyRole(null)).toBe("user");
    expect(mapLegacyRole(undefined)).toBe("user");
  });

  it("passes canonical values through unchanged", () => {
    expect(mapLegacyRole("user")).toBe("user");
    expect(mapLegacyRole("manager")).toBe("manager");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm jest lib/authz/__tests__/roles.test.ts
```
Expected: FAIL — `Cannot find module '../roles'`.

- [ ] **Step 3: Implement `lib/authz/roles.ts`**

```ts
export type AppRole = "user" | "manager" | "admin";

export const APP_ROLES: readonly AppRole[] = ["user", "manager", "admin"] as const;

const APP_ROLE_SET = new Set<string>(APP_ROLES);

export function parseRole(value: unknown): AppRole | null {
  if (typeof value !== "string") return null;
  return APP_ROLE_SET.has(value) ? (value as AppRole) : null;
}

const LEGACY_MAP: Record<string, AppRole> = {
  admin: "admin",
  member: "manager",
  viewer: "user",
  user: "user",
  manager: "manager",
};

export function mapLegacyRole(value: unknown): AppRole {
  if (typeof value !== "string") return "user";
  return LEGACY_MAP[value] ?? "user";
}
```

- [ ] **Step 4: Run test**

```bash
pnpm jest lib/authz/__tests__/roles.test.ts
```
Expected: PASS, 3 suites.

- [ ] **Step 5: Commit**

```bash
git add lib/authz/roles.ts lib/authz/__tests__/roles.test.ts
git commit -m "feat(authz): add canonical AppRole type and legacy role mapper"
```

---

## Task 2: Authorization error types

**Files:**
- Create: `lib/authz/errors.ts`

- [ ] **Step 1: Implement (no test — pure type/class definitions)**

`lib/authz/errors.ts`:
```ts
export class AuthenticationError extends Error {
  readonly code = "UNAUTHENTICATED";
  constructor(message = "Unauthenticated") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  readonly code = "FORBIDDEN";
  constructor(message = "Forbidden") {
    super(message);
    this.name = "AuthorizationError";
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/authz/errors.ts
git commit -m "feat(authz): add AuthenticationError and AuthorizationError"
```

---

## Task 3: Route response helpers

**Files:**
- Create: `lib/authz/route.ts`
- Create: `lib/authz/__tests__/route.test.ts`

- [ ] **Step 1: Write the failing test**

`lib/authz/__tests__/route.test.ts`:
```ts
import { unauthorizedResponse, forbiddenResponse, notFoundOrForbiddenResponse } from "../route";

describe("response helpers", () => {
  it("unauthorizedResponse returns 401 with consistent body", async () => {
    const res = unauthorizedResponse();
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("forbiddenResponse returns 403", async () => {
    const res = forbiddenResponse();
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("notFoundOrForbiddenResponse returns 404 to avoid IDOR existence leaks", async () => {
    const res = notFoundOrForbiddenResponse();
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: "Not found" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm jest lib/authz/__tests__/route.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/authz/route.ts`**

```ts
import { NextResponse } from "next/server";

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbiddenResponse(): NextResponse {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export function notFoundOrForbiddenResponse(): NextResponse {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
```

- [ ] **Step 4: Run test**

```bash
pnpm jest lib/authz/__tests__/route.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/authz/route.ts lib/authz/__tests__/route.test.ts
git commit -m "feat(authz): add route response helpers (401/403/404)"
```

---

## Task 4: Session and role guards

**Files:**
- Create: `lib/authz/session.ts`
- Create: `lib/authz/__tests__/session.test.ts`

Reads the canonical role from the database on every call (DB role strategy per spec §4.4) so a role change takes effect without a session refresh.

- [ ] **Step 1: Write the failing test**

`lib/authz/__tests__/session.test.ts`:
```ts
import { AuthenticationError, AuthorizationError } from "../errors";

jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: { users: { findUnique: jest.fn() } },
}));

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  requireRole,
  isAdmin,
  isManagerOrAdmin,
} from "../session";

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockedFindUnique = prismadb.users.findUnique as jest.MockedFunction<
  typeof prismadb.users.findUnique
>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("requireAuthenticated", () => {
  it("throws AuthenticationError when no session", async () => {
    mockedGetSession.mockResolvedValue(null as any);
    await expect(requireAuthenticated()).rejects.toBeInstanceOf(AuthenticationError);
  });

  it("throws AuthenticationError when DB user missing", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1" } } as any);
    mockedFindUnique.mockResolvedValue(null as any);
    await expect(requireAuthenticated()).rejects.toBeInstanceOf(AuthenticationError);
  });

  it("returns AuthzUser from DB role", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1" } } as any);
    mockedFindUnique.mockResolvedValue({ id: "u1", role: "manager" } as any);
    await expect(requireAuthenticated()).resolves.toEqual({ id: "u1", role: "manager" });
  });

  it("falls back to user when DB role is unrecognized", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1" } } as any);
    mockedFindUnique.mockResolvedValue({ id: "u1", role: "garbage" } as any);
    await expect(requireAuthenticated()).resolves.toEqual({ id: "u1", role: "user" });
  });
});

describe("requireRole", () => {
  it("throws AuthorizationError when role not allowed", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1" } } as any);
    mockedFindUnique.mockResolvedValue({ id: "u1", role: "user" } as any);
    await expect(requireRole(["admin"])).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("returns the user when role is allowed", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1" } } as any);
    mockedFindUnique.mockResolvedValue({ id: "u1", role: "admin" } as any);
    await expect(requireRole(["admin"])).resolves.toEqual({ id: "u1", role: "admin" });
  });

  it("admin satisfies any allowed list (when explicitly listed)", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1" } } as any);
    mockedFindUnique.mockResolvedValue({ id: "u1", role: "admin" } as any);
    await expect(requireRole(["manager", "admin"])).resolves.toEqual({ id: "u1", role: "admin" });
  });
});

describe("role predicates", () => {
  it("isAdmin only true for admin", () => {
    expect(isAdmin({ id: "1", role: "admin" })).toBe(true);
    expect(isAdmin({ id: "1", role: "manager" })).toBe(false);
    expect(isAdmin({ id: "1", role: "user" })).toBe(false);
  });

  it("isManagerOrAdmin true for manager and admin", () => {
    expect(isManagerOrAdmin({ id: "1", role: "manager" })).toBe(true);
    expect(isManagerOrAdmin({ id: "1", role: "admin" })).toBe(true);
    expect(isManagerOrAdmin({ id: "1", role: "user" })).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm jest lib/authz/__tests__/session.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/authz/session.ts`**

```ts
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { AppRole, mapLegacyRole } from "./roles";
import { AuthenticationError, AuthorizationError } from "./errors";

export interface AuthzUser {
  id: string;
  role: AppRole;
}

export async function requireAuthenticated(): Promise<AuthzUser> {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) throw new AuthenticationError();

  const dbUser = await prismadb.users.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!dbUser) throw new AuthenticationError();

  return { id: dbUser.id, role: mapLegacyRole(dbUser.role) };
}

export async function requireRole(
  allowedRoles: ReadonlyArray<AppRole>
): Promise<AuthzUser> {
  const user = await requireAuthenticated();
  if (!allowedRoles.includes(user.role)) {
    throw new AuthorizationError();
  }
  return user;
}

export function isAdmin(user: AuthzUser): boolean {
  return user.role === "admin";
}

export function isManagerOrAdmin(user: AuthzUser): boolean {
  return user.role === "manager" || user.role === "admin";
}
```

- [ ] **Step 4: Run test**

```bash
pnpm jest lib/authz/__tests__/session.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/authz/session.ts lib/authz/__tests__/session.test.ts
git commit -m "feat(authz): add requireAuthenticated, requireRole, role predicates"
```

---

## Task 5: Barrel export

**Files:**
- Create: `lib/authz/index.ts`

- [ ] **Step 1: Implement**

```ts
export type { AppRole } from "./roles";
export { APP_ROLES, parseRole, mapLegacyRole } from "./roles";
export { AuthenticationError, AuthorizationError } from "./errors";
export {
  unauthorizedResponse,
  forbiddenResponse,
  notFoundOrForbiddenResponse,
} from "./route";
export type { AuthzUser } from "./session";
export {
  requireAuthenticated,
  requireRole,
  isAdmin,
  isManagerOrAdmin,
} from "./session";
```

- [ ] **Step 2: Commit**

```bash
git add lib/authz/index.ts
git commit -m "feat(authz): add barrel export"
```

---

## Task 6: Prisma migration — backfill canonical roles and sync `is_admin`

**Files:**
- Create: `prisma/migrations/<timestamp>_canonical_roles_backfill/migration.sql`

This is a data migration only — no schema changes (`role` stays `String`, `is_admin` stays Boolean). Schema changes (enum) are deferred to Phase 6.

- [ ] **Step 1: Generate the migration directory**

```bash
mkdir -p prisma/migrations
TS=$(date -u +%Y%m%d%H%M%S)
mkdir "prisma/migrations/${TS}_canonical_roles_backfill"
echo "$TS"
```
Expected: prints a timestamp like `20260501120000`. Use that as the directory.

- [ ] **Step 2: Write `migration.sql`**

`prisma/migrations/<timestamp>_canonical_roles_backfill/migration.sql`:
```sql
-- Canonical role backfill (phase A, no schema change).
-- Map legacy values:
--   admin  -> admin
--   member -> manager
--   viewer -> user
--   anything else (incl. NULL) -> user

UPDATE "Users"
SET "role" = CASE
  WHEN "role" = 'admin'  THEN 'admin'
  WHEN "role" = 'member' THEN 'manager'
  WHEN "role" = 'viewer' THEN 'user'
  WHEN "role" IN ('user','manager') THEN "role"
  ELSE 'user'
END;

-- Keep is_admin in sync with role for the migration window.
UPDATE "Users"
SET "is_admin" = ("role" = 'admin');
```

- [ ] **Step 3: Update Prisma `Users.role` default to `"user"` so newly created rows are least-privilege**

`prisma/schema.prisma` — change:
```prisma
role             String       @default("member")
```
to:
```prisma
role             String       @default("user")
```

- [ ] **Step 4: Generate Prisma client and apply migration to local DB**

```bash
pnpm prisma migrate dev --name canonical_roles_backfill
```
Expected: Migration applied; Prisma client regenerated. Manually verify on a dev DB:
```bash
pnpm prisma studio   # spot-check Users.role values
```

- [ ] **Step 5: Commit**

```bash
git add prisma/migrations prisma/schema.prisma
git commit -m "feat(db): backfill canonical roles (admin/manager/user) and sync is_admin"
```

---

## Task 7: Rename Better Auth role definitions

**Files:**
- Modify: `lib/auth-permissions.ts`

Rename exports `member` → `manager` and `viewer` → `user`. Keep capability statements identical for now (capability tightening per spec §6 is Phase 4+, out of Phase A scope).

- [ ] **Step 1: Read `lib/auth-permissions.ts`**

```bash
sed -n '1,200p' lib/auth-permissions.ts
```

- [ ] **Step 2: Apply rename**

In `lib/auth-permissions.ts`:
- Rename `export const member = ac.newRole({...})` to `export const manager = ac.newRole({...})` (body unchanged).
- Rename `export const viewer = ac.newRole({...})` to `export const user = ac.newRole({...})` (body unchanged).
- Keep `export const admin = ...` unchanged.

- [ ] **Step 3: Commit**

```bash
git add lib/auth-permissions.ts
git commit -m "refactor(auth): rename Better Auth roles member->manager, viewer->user"
```

---

## Task 8: Update Better Auth admin plugin config

**Files:**
- Modify: `lib/auth.ts`

- [ ] **Step 1: Read the admin plugin block**

```bash
grep -n "adminPlugin\|defaultRole\|roles:" lib/auth.ts
```

- [ ] **Step 2: Update the import and the plugin call**

Find the import of role objects (likely `import { ac, admin, member, viewer } from "./auth-permissions"`). Change to:
```ts
import { ac, admin, manager, user } from "./auth-permissions";
```

Find the `adminPlugin({...})` call and replace:
```ts
adminPlugin({
  ac,
  roles: { admin, member, viewer },
  defaultRole: "member",
}),
```
with:
```ts
adminPlugin({
  ac,
  roles: { admin, manager, user },
  defaultRole: "user",
}),
```

Also find the `additionalFields.role.defaultValue` (currently `"member"`) and change to `"user"`:
```ts
role: { type: "string", defaultValue: "user", input: false },
```

- [ ] **Step 3: Run typecheck**

```bash
pnpm tsc --noEmit
```
Expected: PASS (no type errors from the rename).

- [ ] **Step 4: Commit**

```bash
git add lib/auth.ts
git commit -m "refactor(auth): switch admin plugin to canonical user/manager/admin roles"
```

---

## Task 9: Update `setUserRole` validator

**Files:**
- Modify: `actions/admin/users/set-role.ts`

- [ ] **Step 1: Read current file**

```bash
cat actions/admin/users/set-role.ts
```

- [ ] **Step 2: Replace `VALID_ROLES` and the admin-check using the new helper**

Replace the existing `VALID_ROLES` constant and the inline session/admin check with:
```ts
"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { APP_ROLES, AppRole, requireRole, AuthorizationError } from "@/lib/authz";

export const setUserRole = async (userId: string, role: AppRole) => {
  let actor;
  try {
    actor = await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    return { error: "Unauthorized" };
  }

  if (!userId) return { error: "userId is required" };
  if (!APP_ROLES.includes(role)) return { error: "Invalid role" };

  if (userId === actor.id && role !== "admin") {
    return { error: "Cannot remove your own admin role" };
  }

  try {
    const user = await prismadb.users.update({
      where: { id: userId },
      data: { role, is_admin: role === "admin" },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        userLanguage: true,
        userStatus: true,
        lastLoginAt: true,
      },
    });
    revalidatePath("/[locale]/(routes)/admin", "page");
    return { data: user };
  } catch (error) {
    console.log("[SET_USER_ROLE]", error);
    return { error: "Failed to update user role" };
  }
};
```

Note: `is_admin` is kept in sync here so admin layout's legacy check keeps working until Task 10 lands.

- [ ] **Step 3: Run typecheck**

```bash
pnpm tsc --noEmit
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add actions/admin/users/set-role.ts
git commit -m "feat(authz): validate setUserRole against canonical AppRole"
```

---

## Task 10: Switch admin layout to role-based gate

**Files:**
- Modify: `app/[locale]/(routes)/admin/layout.tsx`

- [ ] **Step 1: Read current file**

```bash
cat 'app/[locale]/(routes)/admin/layout.tsx'
```

- [ ] **Step 2: Replace `is_admin` check with canonical role check**

Replace:
```tsx
import { redirect } from "next/navigation";
import { getUser } from "@/actions/get-user";
import { AdminSidebarNav } from "./_components/AdminSidebarNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let user;
  try {
    user = await getUser();
  } catch {
    redirect("/sign-in");
  }
  if (!user.is_admin) redirect("/");
  // ...
}
```
with:
```tsx
import { redirect } from "next/navigation";
import { requireRole, AuthorizationError, AuthenticationError } from "@/lib/authz";
import { AdminSidebarNav } from "./_components/AdminSidebarNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthenticationError) redirect("/sign-in");
    if (e instanceof AuthorizationError) redirect("/");
    throw e;
  }

  return (
    <div className="flex h-full w-full min-h-0">
      <aside className="w-56 shrink-0 border-r bg-card flex flex-col py-4 px-2">
        <AdminSidebarNav />
      </aside>
      <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Run typecheck**

```bash
pnpm tsc --noEmit
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add 'app/[locale]/(routes)/admin/layout.tsx'
git commit -m "refactor(authz): gate admin layout on canonical role, drop is_admin check"
```

---

## Task 11: CRM contact scope helper

**Files:**
- Create: `lib/authz/scopes/crm.ts`
- Create: `lib/authz/__tests__/scopes-crm.test.ts`

Per spec §6.3: a `user` may write a contact when `assigned_to`, `created_by`, or `createdBy` matches them, or when the linked `account` is in their account scope (assigned/creator/watcher). For Phase A we approximate **account access** as: the account's `assigned_to` or `createdBy` matches the user, or the user is in `AccountWatchers`. (Watcher table referenced — verify shape during implementation.) Manager and admin always pass.

Phase A only delivers contact + target write helpers; read scope is Phase 4.

- [ ] **Step 1: Inspect Prisma models for fields used by the scope query**

```bash
grep -n -A 10 "^model crm_Contacts " prisma/schema.prisma
grep -n -A 10 "^model crm_Accounts " prisma/schema.prisma
grep -n -A 5  "^model AccountWatchers " prisma/schema.prisma
```
Confirm field names: `crm_Contacts.assigned_to`, `created_by`, `createdBy`, `account`; `crm_Accounts.assigned_to`, `createdBy`; `AccountWatchers.userId`, `accountId` (or whatever the codebase actually uses). If `AccountWatchers` does not exist or uses different field names, omit the watcher branch and add a TODO comment referencing the spec §6.1 watcher rule.

- [ ] **Step 2: Write the failing test**

`lib/authz/__tests__/scopes-crm.test.ts`:
```ts
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Contacts: { updateMany: jest.fn() },
    crm_Targets: { updateMany: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { tryScopedUpdateContact, tryScopedUpdateTarget } from "../scopes/crm";

const updateManyContact = prismadb.crm_Contacts.updateMany as jest.MockedFunction<
  typeof prismadb.crm_Contacts.updateMany
>;
const updateManyTarget = prismadb.crm_Targets.updateMany as jest.MockedFunction<
  typeof prismadb.crm_Targets.updateMany
>;

beforeEach(() => jest.clearAllMocks());

describe("tryScopedUpdateContact", () => {
  it("admin: bare where on contact id, returns true on count > 0", async () => {
    updateManyContact.mockResolvedValue({ count: 1 } as any);
    const ok = await tryScopedUpdateContact(
      { id: "u1", role: "admin" },
      "c1",
      { website: "x" },
    );
    expect(ok).toBe(true);
    expect(updateManyContact).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { website: "x", updatedBy: "u1" },
    });
  });

  it("manager: bare where on contact id", async () => {
    updateManyContact.mockResolvedValue({ count: 1 } as any);
    await tryScopedUpdateContact({ id: "u2", role: "manager" }, "c1", { website: "x" });
    expect(updateManyContact).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { website: "x", updatedBy: "u2" },
    });
  });

  it("user: scoped where with ownership OR clauses", async () => {
    updateManyContact.mockResolvedValue({ count: 1 } as any);
    await tryScopedUpdateContact({ id: "u3", role: "user" }, "c1", { website: "x" });
    const arg = updateManyContact.mock.calls[0][0]!;
    expect(arg.where).toMatchObject({
      id: "c1",
      OR: expect.arrayContaining([
        { assigned_to: "u3" },
        { created_by: "u3" },
        { createdBy: "u3" },
      ]),
    });
  });

  it("returns false when count is 0", async () => {
    updateManyContact.mockResolvedValue({ count: 0 } as any);
    const ok = await tryScopedUpdateContact(
      { id: "u3", role: "user" },
      "c1",
      { website: "x" },
    );
    expect(ok).toBe(false);
  });
});

describe("tryScopedUpdateTarget", () => {
  it("admin: bare where", async () => {
    updateManyTarget.mockResolvedValue({ count: 1 } as any);
    await tryScopedUpdateTarget({ id: "u1", role: "admin" }, "t1", { website: "x" });
    expect(updateManyTarget).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { website: "x", updatedBy: "u1" },
    });
  });

  it("user: scoped to created_by only (targets have no assigned_to)", async () => {
    updateManyTarget.mockResolvedValue({ count: 1 } as any);
    await tryScopedUpdateTarget({ id: "u3", role: "user" }, "t1", { website: "x" });
    expect(updateManyTarget).toHaveBeenCalledWith({
      where: { id: "t1", created_by: "u3" },
      data: { website: "x", updatedBy: "u3" },
    });
  });

  it("returns false when count is 0", async () => {
    updateManyTarget.mockResolvedValue({ count: 0 } as any);
    const ok = await tryScopedUpdateTarget(
      { id: "u3", role: "user" },
      "t1",
      { website: "x" },
    );
    expect(ok).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm jest lib/authz/__tests__/scopes-crm.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `lib/authz/scopes/crm.ts`**

```ts
import { prismadb } from "@/lib/prisma";
import { AuthzUser } from "../session";

type ContactWhere = NonNullable<
  Parameters<typeof prismadb.crm_Contacts.updateMany>[0]
>["where"];
type TargetWhere = NonNullable<
  Parameters<typeof prismadb.crm_Targets.updateMany>[0]
>["where"];

function contactScopedWhere(user: AuthzUser, contactId: string): ContactWhere {
  if (user.role === "admin" || user.role === "manager") {
    return { id: contactId };
  }
  // user role: own or linked-account ownership.
  // TODO(phase-4): include linked account scope (assigned/creator/watcher).
  return {
    id: contactId,
    OR: [
      { assigned_to: user.id },
      { created_by: user.id },
      { createdBy: user.id },
    ],
  };
}

function targetScopedWhere(user: AuthzUser, targetId: string): TargetWhere {
  if (user.role === "admin" || user.role === "manager") {
    return { id: targetId };
  }
  return { id: targetId, created_by: user.id };
}

export async function tryScopedUpdateContact(
  user: AuthzUser,
  contactId: string,
  data: Record<string, string>,
): Promise<boolean> {
  const result = await prismadb.crm_Contacts.updateMany({
    where: contactScopedWhere(user, contactId),
    data: { ...data, updatedBy: user.id },
  });
  return result.count > 0;
}

export async function tryScopedUpdateTarget(
  user: AuthzUser,
  targetId: string,
  data: Record<string, string>,
): Promise<boolean> {
  const result = await prismadb.crm_Targets.updateMany({
    where: targetScopedWhere(user, targetId),
    data: { ...data, updatedBy: user.id },
  });
  return result.count > 0;
}
```

- [ ] **Step 5: Run test**

```bash
pnpm jest lib/authz/__tests__/scopes-crm.test.ts
```
Expected: PASS.

- [ ] **Step 6: Re-export from barrel**

Append to `lib/authz/index.ts`:
```ts
export {
  tryScopedUpdateContact,
  tryScopedUpdateTarget,
} from "./scopes/crm";
```

- [ ] **Step 7: Commit**

```bash
git add lib/authz/scopes/crm.ts lib/authz/__tests__/scopes-crm.test.ts lib/authz/index.ts
git commit -m "feat(authz): add scoped contact and target update helpers"
```

---

## Task 12: Patch CRM contact PATCH route + regression test

**Files:**
- Modify: `app/api/crm/contacts/[id]/route.ts`
- Create: `app/api/crm/contacts/[id]/__tests__/route.test.ts`

- [ ] **Step 1: Write the failing test**

`app/api/crm/contacts/[id]/__tests__/route.test.ts`:
```ts
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Contacts: { updateMany: jest.fn() },
  },
}));

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { PATCH } from "../route";

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockedFindUnique = prismadb.users.findUnique as jest.MockedFunction<
  typeof prismadb.users.findUnique
>;
const mockedUpdateMany = prismadb.crm_Contacts.updateMany as jest.MockedFunction<
  typeof prismadb.crm_Contacts.updateMany
>;

function makeReq(body: unknown) {
  return new NextRequest("http://localhost/api/crm/contacts/c1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => jest.clearAllMocks());

describe("PATCH /api/crm/contacts/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockedGetSession.mockResolvedValue(null as any);
    const res = await PATCH(makeReq({ enrichmentFields: { website: "x" } }), {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(res.status).toBe(401);
    expect(mockedUpdateMany).not.toHaveBeenCalled();
  });

  it("returns 404 when user is not allowed to write the contact (count 0)", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "victim" } } as any);
    mockedFindUnique.mockResolvedValue({ id: "victim", role: "user" } as any);
    mockedUpdateMany.mockResolvedValue({ count: 0 } as any);

    const res = await PATCH(makeReq({ enrichmentFields: { website: "x" } }), {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(res.status).toBe(404);
  });

  it("succeeds when scoped update affects a row (user owns contact)", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1" } } as any);
    mockedFindUnique.mockResolvedValue({ id: "u1", role: "user" } as any);
    mockedUpdateMany.mockResolvedValue({ count: 1 } as any);

    const res = await PATCH(makeReq({ enrichmentFields: { website: "x" } }), {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ success: true, id: "c1" });
  });

  it("manager can write any contact", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "m1" } } as any);
    mockedFindUnique.mockResolvedValue({ id: "m1", role: "manager" } as any);
    mockedUpdateMany.mockResolvedValue({ count: 1 } as any);

    const res = await PATCH(makeReq({ enrichmentFields: { website: "x" } }), {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run test to verify it fails (route still uses unscoped update)**

```bash
pnpm jest app/api/crm/contacts/[id]/__tests__/route.test.ts
```
Expected: FAIL — IDOR test fails because the route currently calls `update`, not `updateMany`.

- [ ] **Step 3: Replace the PATCH route with scoped update**

`app/api/crm/contacts/[id]/route.ts`:
```ts
import { NextRequest } from "next/server";
import {
  requireAuthenticated,
  unauthorizedResponse,
  notFoundOrForbiddenResponse,
  AuthenticationError,
  tryScopedUpdateContact,
} from "@/lib/authz";
import { NextResponse } from "next/server";

const FIELD_MAP: Record<string, string> = {
  position:         "position",
  website:          "website",
  social_linkedin:  "social_linkedin",
  social_twitter:   "social_twitter",
  social_facebook:  "social_facebook",
  social_instagram: "social_instagram",
  description:      "description",
  office_phone:     "office_phone",
  mobile_phone:     "mobile_phone",
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return unauthorizedResponse();
    throw e;
  }

  const { enrichmentFields } = await request.json();
  if (!enrichmentFields || typeof enrichmentFields !== "object") {
    return NextResponse.json({ error: "enrichmentFields required" }, { status: 400 });
  }

  const updates: Record<string, string> = {};
  for (const [key, value] of Object.entries(enrichmentFields)) {
    const column = FIELD_MAP[key];
    if (column) updates[column] = String(value);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const ok = await tryScopedUpdateContact(user, id, updates);
  if (!ok) return notFoundOrForbiddenResponse();

  return NextResponse.json({ success: true, id });
}
```

- [ ] **Step 4: Run test**

```bash
pnpm jest app/api/crm/contacts/[id]/__tests__/route.test.ts
```
Expected: PASS, all 4 cases.

- [ ] **Step 5: Commit**

```bash
git add app/api/crm/contacts/[id]/route.ts app/api/crm/contacts/[id]/__tests__/route.test.ts
git commit -m "fix(api): scoped contact PATCH closes BOLA/IDOR (GHSA-mg5f-m89f-4gmc)"
```

---

## Task 13: Patch CRM target PATCH route + regression test

**Files:**
- Modify: `app/api/crm/targets/[id]/route.ts`
- Create: `app/api/crm/targets/[id]/__tests__/route.test.ts`

The campaign re-export at `app/api/campaigns/targets/[id]/route.ts` is automatically fixed because it `export { PATCH } from ...`.

- [ ] **Step 1: Write the failing test**

`app/api/crm/targets/[id]/__tests__/route.test.ts`:
```ts
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Targets: { updateMany: jest.fn() },
  },
}));
jest.mock("@/lib/enrichment/presets/target-fields", () => ({
  FIELD_MAP: { website: "website" },
}));

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { PATCH } from "../route";

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockedFindUnique = prismadb.users.findUnique as jest.MockedFunction<
  typeof prismadb.users.findUnique
>;
const mockedUpdateMany = prismadb.crm_Targets.updateMany as jest.MockedFunction<
  typeof prismadb.crm_Targets.updateMany
>;

function makeReq(body: unknown) {
  return new NextRequest("http://localhost/api/crm/targets/t1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => jest.clearAllMocks());

describe("PATCH /api/crm/targets/[id]", () => {
  it("401 when unauthenticated", async () => {
    mockedGetSession.mockResolvedValue(null as any);
    const res = await PATCH(makeReq({ enrichmentFields: { website: "x" } }), {
      params: Promise.resolve({ id: "t1" }),
    });
    expect(res.status).toBe(401);
  });

  it("404 when user does not own the target", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1" } } as any);
    mockedFindUnique.mockResolvedValue({ id: "u1", role: "user" } as any);
    mockedUpdateMany.mockResolvedValue({ count: 0 } as any);

    const res = await PATCH(makeReq({ enrichmentFields: { website: "x" } }), {
      params: Promise.resolve({ id: "t1" }),
    });
    expect(res.status).toBe(404);
  });

  it("user owning the target succeeds", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1" } } as any);
    mockedFindUnique.mockResolvedValue({ id: "u1", role: "user" } as any);
    mockedUpdateMany.mockResolvedValue({ count: 1 } as any);

    const res = await PATCH(makeReq({ enrichmentFields: { website: "x" } }), {
      params: Promise.resolve({ id: "t1" }),
    });
    expect(res.status).toBe(200);
  });

  it("manager succeeds on any target", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "m1" } } as any);
    mockedFindUnique.mockResolvedValue({ id: "m1", role: "manager" } as any);
    mockedUpdateMany.mockResolvedValue({ count: 1 } as any);

    const res = await PATCH(makeReq({ enrichmentFields: { website: "x" } }), {
      params: Promise.resolve({ id: "t1" }),
    });
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm jest app/api/crm/targets/[id]/__tests__/route.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Replace the PATCH route**

`app/api/crm/targets/[id]/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { FIELD_MAP } from "@/lib/enrichment/presets/target-fields";
import {
  requireAuthenticated,
  unauthorizedResponse,
  notFoundOrForbiddenResponse,
  AuthenticationError,
  tryScopedUpdateTarget,
} from "@/lib/authz";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return unauthorizedResponse();
    throw e;
  }

  const { enrichmentFields } = await request.json();
  if (!enrichmentFields || typeof enrichmentFields !== "object") {
    return NextResponse.json({ error: "enrichmentFields required" }, { status: 400 });
  }

  const updates: Record<string, string> = {};
  for (const [key, value] of Object.entries(enrichmentFields)) {
    const column = FIELD_MAP[key];
    if (column) updates[column] = String(value);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const ok = await tryScopedUpdateTarget(user, id, updates);
  if (!ok) return notFoundOrForbiddenResponse();

  return NextResponse.json({ success: true, id });
}
```

- [ ] **Step 4: Run test**

```bash
pnpm jest app/api/crm/targets/[id]/__tests__/route.test.ts
```
Expected: PASS.

- [ ] **Step 5: Verify campaign re-export still works**

```bash
cat 'app/api/campaigns/targets/[id]/route.ts'
```
Expected: still `export { PATCH } from "@/app/api/crm/targets/[id]/route";` — unchanged, now points to the patched handler.

- [ ] **Step 6: Commit**

```bash
git add app/api/crm/targets/[id]/route.ts app/api/crm/targets/[id]/__tests__/route.test.ts
git commit -m "fix(api): scoped target PATCH closes BOLA/IDOR (auto-fixes campaign re-export)"
```

---

## Task 14: Admin guard on CRM-settings actions

**Files:**
- Modify: `app/[locale]/(routes)/admin/crm-settings/_actions/crm-settings.ts`

Per audit: every export in this file is currently callable without auth.

- [ ] **Step 1: List exports**

```bash
grep -n "^export " 'app/[locale]/(routes)/admin/crm-settings/_actions/crm-settings.ts'
```
Expected exports include `getConfigValues`, `createConfigValue`, `updateConfigValue`, `deleteConfigValue` (and possibly more).

- [ ] **Step 2: Add a private guard helper at the top of the file (after imports) and call it as the first line of every exported async function**

In `app/[locale]/(routes)/admin/crm-settings/_actions/crm-settings.ts`:

Add the import:
```ts
import { requireRole, AuthenticationError, AuthorizationError } from "@/lib/authz";
```

Add at top of file (below imports, above existing exports):
```ts
async function ensureAdmin(): Promise<{ error: string } | null> {
  try {
    await requireRole(["admin"]);
    return null;
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }
}
```

For each exported function (e.g. `getConfigValues`, `createConfigValue`, `updateConfigValue`, `deleteConfigValue`, and any others returned by Step 1), add as the very first statement inside the function body:
```ts
const denied = await ensureAdmin();
if (denied) throw new Error(denied.error);
```

(Functions that already return `{ data | error }` shapes can `return denied;` instead of throwing — preserve the existing return contract per function. If unsure, throw — server actions surface the error to the UI.)

- [ ] **Step 3: Run typecheck**

```bash
pnpm tsc --noEmit
```
Expected: PASS.

- [ ] **Step 4: Smoke-test manually**

Start dev server (`pnpm dev`), sign in as a non-admin, attempt to load `/admin/crm-settings`. Expected: layout already redirects (Task 10), but if you call the action directly (e.g. via a custom fetch in DevTools), it now throws `Forbidden` instead of mutating.

- [ ] **Step 5: Commit**

```bash
git add 'app/[locale]/(routes)/admin/crm-settings/_actions/crm-settings.ts'
git commit -m "fix(admin): require admin role on CRM-settings server actions"
```

---

## Task 15: Admin guard on currencies actions

**Files:**
- Modify: `app/[locale]/(routes)/admin/currencies/_actions/currencies.ts`

Same shape as Task 14.

- [ ] **Step 1: List exports**

```bash
grep -n "^export " 'app/[locale]/(routes)/admin/currencies/_actions/currencies.ts'
```
Expected exports include `getCurrencies`, `getExchangeRatesAdmin`, `createCurrency`, `toggleCurrency`, `setDefaultCurrency`, `updateExchangeRate`, `getEcbAutoUpdate`, `setEcbAutoUpdate`.

- [ ] **Step 2: Apply the same guard helper pattern**

Add import:
```ts
import { requireRole, AuthenticationError, AuthorizationError } from "@/lib/authz";
```

Add helper:
```ts
async function ensureAdmin(): Promise<{ error: string } | null> {
  try {
    await requireRole(["admin"]);
    return null;
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }
}
```

Add to the very first statement of every exported function:
```ts
const denied = await ensureAdmin();
if (denied) throw new Error(denied.error);
```

- [ ] **Step 3: Run typecheck**

```bash
pnpm tsc --noEmit
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add 'app/[locale]/(routes)/admin/currencies/_actions/currencies.ts'
git commit -m "fix(admin): require admin role on currency server actions"
```

---

## Task 16: Final verification

- [ ] **Step 1: Full test suite**

```bash
pnpm test
```
Expected: PASS, including new `lib/authz/__tests__/*` and route handler tests.

- [ ] **Step 2: Typecheck**

```bash
pnpm tsc --noEmit
```
Expected: PASS.

- [ ] **Step 3: Lint**

```bash
pnpm lint
```
Expected: PASS (no new warnings).

- [ ] **Step 4: Manual security check**

In a dev DB:
1. Create two users: `alice` (role=user) and `bob` (role=user).
2. Create a contact owned by `alice`.
3. Sign in as `bob`. Run:
   ```bash
   curl -X PATCH http://localhost:3000/api/crm/contacts/<alice_contact_id> \
     -H "content-type: application/json" \
     -b "<bob_session_cookie>" \
     -d '{"enrichmentFields":{"website":"https://attacker.example"}}'
   ```
   Expected: HTTP 404. The contact in the DB is unchanged.
4. Repeat as `alice` against her own contact. Expected: HTTP 200, `website` is updated.
5. Promote `bob` to `manager`, repeat against `alice`'s contact. Expected: HTTP 200.

Document the manual test outcome in the PR description.

- [ ] **Step 5: PR**

Open a PR `dev` → no, per repo convention commit on `dev` then PR `dev` → `main`. Push to `dev`:

```bash
git push origin dev
```

Then open a PR `dev` → `main` titled `fix(security): close GHSA-mg5f-m89f-4gmc and introduce permission-driven authz foundation` with body referencing the advisory, the spec section 18, and the manual test results from Step 4.

---

## Acceptance Criteria for Phase A

- `lib/authz/` exists with `roles`, `errors`, `route`, `session`, `scopes/crm`, and `index` modules; all unit-tested.
- `Users.role` values in the database are exactly `user`, `manager`, or `admin`.
- Better Auth admin plugin uses `user|manager|admin` role names.
- `setUserRole` rejects any role outside the canonical set and keeps `is_admin` synced.
- Admin layout gates on `role === "admin"`, not `is_admin`.
- `PATCH /api/crm/contacts/[id]` returns 404 to a user who does not own the contact, the contact is unchanged in the DB, and the regression test enforces this.
- `PATCH /api/crm/targets/[id]` (and the campaign re-export) returns 404 to a user who did not create the target, the target is unchanged, regression test enforces this.
- All exports of `crm-settings.ts` and `currencies.ts` admin actions throw `Unauthorized` / `Forbidden` for non-admins.

## Out of Phase A scope

- Read-side scoping (list/detail) for any resource — Phase 4.
- Object-level checks for enrichment routes, bulk endpoints, invoice PDF, reports export — Phase 2.
- All other admin server actions, products, campaigns, documents, projects — Phases 3–5.
- Removing `is_admin` and `is_account_admin` columns — Phase 6.
- Switching `Users.role` to a Prisma enum — Phase 6.
