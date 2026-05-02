# Permission-Driven Authorization — Phase B1 (Enrichment Routes) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining BOLA/IDOR findings on every enrichment-related API route (CRM contacts + targets, bulk variants, target sub-routes, campaign re-exports). After B1 lands, no authenticated user can read, enrich, or cancel an enrichment for a record they don't own — and the spec's "verify scope before queueing Inngest events" rule is enforced at the route boundary.

**Architecture:** Extend `lib/authz/scopes/crm.ts` with read-side and bulk-filter helpers + enrichment cancel helpers. Apply them as the first authorization step in every enrichment route. For cancels, use **approach (b)**: look up the in-flight `enrichmentId` from the existing in-memory `activeSessions` map, load the enrichment row, and check `triggeredBy === user.id` (manager/admin pass through). Bulk routes fail-closed: if any requested ID isn't authorized, return 403 — do not silently filter.

**Out of scope:** Inngest worker re-validation (workers will keep trusting `triggeredBy` from event payload — Phase B addresses route boundary; worker hardening is a separate follow-up). Read-side scoping for non-enrichment routes (Phase D). Invoice PDF (B2). Reports export (B3).

**Tech Stack:** Next.js 16, Prisma 7, Better Auth 1.5, Jest 30 + ts-jest. Same as Phase A.

**Spec source:** `docs/specs/2026-05-01-permission-driven-migration-design.md` §7.4–7.5, §12 Phase 2.
**Audit source:** `docs/2026-05-01-bola-idor-security-audit.md` "Target Enrichment Surfaces", "Bulk Contact Enrichment for Arbitrary IDs", "Contact Enrichment for Arbitrary Contact", "Unauthenticated Contact Enrichment Cancel".

---

## File Structure

**New files:**
- `lib/authz/__tests__/scopes-crm-read.test.ts` — tests for new read/write/filter assertions
- `lib/authz/__tests__/scopes-crm-enrichment.test.ts` — tests for cancel-permission helpers
- `app/api/crm/contacts/enrich/__tests__/route.test.ts`
- `app/api/crm/contacts/enrich-bulk/__tests__/route.test.ts`
- `app/api/crm/targets/enrich/__tests__/route.test.ts`
- `app/api/crm/targets/enrich-bulk/__tests__/route.test.ts`
- `app/api/crm/targets/[id]/enrich/__tests__/route.test.ts`
- `app/api/crm/targets/[id]/contacts/__tests__/route.test.ts`
- `app/api/crm/targets/[id]/contacts/[contactId]/enrich/__tests__/route.test.ts`

**Modified files:**
- `lib/authz/scopes/crm.ts` — add `assertCanReadContact`, `assertCanWriteContact`, `assertCanReadTarget`, `assertCanWriteTarget`, `filterAuthorizedContactIds`, `filterAuthorizedTargetIds`, `assertCanCancelContactEnrichment`, `assertCanCancelTargetEnrichment`
- `lib/authz/index.ts` — barrel re-exports
- `app/api/crm/contacts/enrich/route.ts` — POST + DELETE
- `app/api/crm/contacts/enrich-bulk/route.ts` — POST
- `app/api/crm/targets/enrich/route.ts` — POST + DELETE
- `app/api/crm/targets/enrich-bulk/route.ts` — POST
- `app/api/crm/targets/[id]/enrich/route.ts` — POST
- `app/api/crm/targets/[id]/contacts/route.ts` — POST
- `app/api/crm/targets/[id]/contacts/[contactId]/enrich/route.ts` — POST

Campaign re-exports (`app/api/campaigns/targets/[id]/enrich`, `enrich`, `enrich-bulk`) require no source change — fixed by source.

---

## Task 1: Read/write assertion helpers (contact + target)

**Files:**
- Modify: `lib/authz/scopes/crm.ts`
- Create: `lib/authz/__tests__/scopes-crm-read.test.ts`

Add four assertion helpers. They throw `AuthorizationError` if the user can't access the row, or `Error("not found")` if the row doesn't exist. Manager/admin always pass.

- [ ] **Step 1: Write the failing test**

`lib/authz/__tests__/scopes-crm-read.test.ts`:
```ts
import { AuthorizationError } from "../errors";

jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Contacts: { findFirst: jest.fn() },
    crm_Targets: { findFirst: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import {
  assertCanReadContact,
  assertCanWriteContact,
  assertCanReadTarget,
  assertCanWriteTarget,
} from "../scopes/crm";

const findContact = prismadb.crm_Contacts.findFirst as jest.MockedFunction<
  typeof prismadb.crm_Contacts.findFirst
>;
const findTarget = prismadb.crm_Targets.findFirst as jest.MockedFunction<
  typeof prismadb.crm_Targets.findFirst
>;

beforeEach(() => jest.clearAllMocks());

describe("assertCanReadContact", () => {
  it("admin: bare where, resolves on hit", async () => {
    findContact.mockResolvedValue({ id: "c1" } as any);
    await expect(
      assertCanReadContact({ id: "u", role: "admin" }, "c1"),
    ).resolves.toBeUndefined();
    expect(findContact).toHaveBeenCalledWith({
      where: { id: "c1" },
      select: { id: true },
    });
  });

  it("manager: bare where, resolves on hit", async () => {
    findContact.mockResolvedValue({ id: "c1" } as any);
    await assertCanReadContact({ id: "u", role: "manager" }, "c1");
    expect(findContact).toHaveBeenCalledWith({
      where: { id: "c1" },
      select: { id: true },
    });
  });

  it("user: scoped where with ownership OR clauses", async () => {
    findContact.mockResolvedValue({ id: "c1" } as any);
    await assertCanReadContact({ id: "u3", role: "user" }, "c1");
    const arg = findContact.mock.calls[0][0]!;
    expect(arg.where).toMatchObject({
      id: "c1",
      OR: expect.arrayContaining([
        { assigned_to: "u3" },
        { created_by: "u3" },
        { createdBy: "u3" },
      ]),
    });
  });

  it("throws AuthorizationError when no row", async () => {
    findContact.mockResolvedValue(null);
    await expect(
      assertCanReadContact({ id: "u3", role: "user" }, "c1"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("assertCanWriteContact", () => {
  it("user: same scope as read for now (Phase D may diverge)", async () => {
    findContact.mockResolvedValue({ id: "c1" } as any);
    await assertCanWriteContact({ id: "u3", role: "user" }, "c1");
    const arg = findContact.mock.calls[0][0]!;
    expect(arg.where).toMatchObject({
      id: "c1",
      OR: expect.arrayContaining([
        { assigned_to: "u3" },
        { created_by: "u3" },
        { createdBy: "u3" },
      ]),
    });
  });

  it("throws AuthorizationError when no row", async () => {
    findContact.mockResolvedValue(null);
    await expect(
      assertCanWriteContact({ id: "u3", role: "user" }, "c1"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("assertCanReadTarget", () => {
  it("admin: bare where", async () => {
    findTarget.mockResolvedValue({ id: "t1" } as any);
    await assertCanReadTarget({ id: "u", role: "admin" }, "t1");
    expect(findTarget).toHaveBeenCalledWith({
      where: { id: "t1" },
      select: { id: true },
    });
  });

  it("user: scoped to created_by", async () => {
    findTarget.mockResolvedValue({ id: "t1" } as any);
    await assertCanReadTarget({ id: "u3", role: "user" }, "t1");
    expect(findTarget).toHaveBeenCalledWith({
      where: { id: "t1", created_by: "u3" },
      select: { id: true },
    });
  });

  it("throws AuthorizationError on miss", async () => {
    findTarget.mockResolvedValue(null);
    await expect(
      assertCanReadTarget({ id: "u3", role: "user" }, "t1"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("assertCanWriteTarget", () => {
  it("user: scoped to created_by", async () => {
    findTarget.mockResolvedValue({ id: "t1" } as any);
    await assertCanWriteTarget({ id: "u3", role: "user" }, "t1");
    expect(findTarget).toHaveBeenCalledWith({
      where: { id: "t1", created_by: "u3" },
      select: { id: true },
    });
  });

  it("throws on miss", async () => {
    findTarget.mockResolvedValue(null);
    await expect(
      assertCanWriteTarget({ id: "u3", role: "user" }, "t1"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm jest lib/authz/__tests__/scopes-crm-read.test.ts
```
Expected: FAIL — helpers don't exist yet.

- [ ] **Step 3: Extend `lib/authz/scopes/crm.ts`**

Append to the file (before any existing exports if exports are at the bottom — otherwise just append at the end):

```ts
import { AuthorizationError } from "../errors";

// Read scope mirrors write scope in Phase B1.
// Phase D may add separate read-only ownership rules (e.g., watchers).
async function findContactInScope(user: AuthzUser, contactId: string) {
  if (user.role === "admin" || user.role === "manager") {
    return prismadb.crm_Contacts.findFirst({
      where: { id: contactId },
      select: { id: true },
    });
  }
  return prismadb.crm_Contacts.findFirst({
    where: {
      id: contactId,
      OR: [
        { assigned_to: user.id },
        { created_by: user.id },
        { createdBy: user.id },
      ],
    },
    select: { id: true },
  });
}

async function findTargetInScope(user: AuthzUser, targetId: string) {
  if (user.role === "admin" || user.role === "manager") {
    return prismadb.crm_Targets.findFirst({
      where: { id: targetId },
      select: { id: true },
    });
  }
  return prismadb.crm_Targets.findFirst({
    where: { id: targetId, created_by: user.id },
    select: { id: true },
  });
}

export async function assertCanReadContact(
  user: AuthzUser,
  contactId: string,
): Promise<void> {
  const row = await findContactInScope(user, contactId);
  if (!row) throw new AuthorizationError();
}

export async function assertCanWriteContact(
  user: AuthzUser,
  contactId: string,
): Promise<void> {
  const row = await findContactInScope(user, contactId);
  if (!row) throw new AuthorizationError();
}

export async function assertCanReadTarget(
  user: AuthzUser,
  targetId: string,
): Promise<void> {
  const row = await findTargetInScope(user, targetId);
  if (!row) throw new AuthorizationError();
}

export async function assertCanWriteTarget(
  user: AuthzUser,
  targetId: string,
): Promise<void> {
  const row = await findTargetInScope(user, targetId);
  if (!row) throw new AuthorizationError();
}
```

- [ ] **Step 4: Run test**

```bash
pnpm jest lib/authz/__tests__/scopes-crm-read.test.ts
```
Expected: PASS.

- [ ] **Step 5: Re-export from barrel**

Add to `lib/authz/index.ts`:
```ts
export {
  assertCanReadContact,
  assertCanWriteContact,
  assertCanReadTarget,
  assertCanWriteTarget,
} from "./scopes/crm";
```

- [ ] **Step 6: Commit**

```bash
git add lib/authz/scopes/crm.ts lib/authz/__tests__/scopes-crm-read.test.ts lib/authz/index.ts
git commit -m "feat(authz): add read/write assertion helpers for contacts and targets"
```

---

## Task 2: Bulk filter helpers

**Files:**
- Modify: `lib/authz/scopes/crm.ts`
- Modify: `lib/authz/__tests__/scopes-crm-read.test.ts` (or new file — implementer's choice)

`filterAuthorizedContactIds(user, ids)` and `filterAuthorizedTargetIds(user, ids)` return the **subset** of input ids that the user is authorized to read/enrich. Routes will compare `result.length === input.length` and reject the whole request if any id is unauthorized (fail-closed per spec §7.5).

- [ ] **Step 1: Write the failing test (append to scopes-crm-read.test.ts)**

```ts
describe("filterAuthorizedContactIds", () => {
  it("admin: returns all input ids that exist (queries with bare where)", async () => {
    (prismadb.crm_Contacts.findMany as jest.Mock) =
      jest.fn().mockResolvedValue([{ id: "a" }, { id: "b" }]);
    const out = await filterAuthorizedContactIds(
      { id: "u", role: "admin" },
      ["a", "b", "c"],
    );
    expect(out).toEqual(["a", "b"]);
    expect(prismadb.crm_Contacts.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["a", "b", "c"] } },
      select: { id: true },
    });
  });

  it("user: scoped where with OR clauses", async () => {
    (prismadb.crm_Contacts.findMany as jest.Mock) =
      jest.fn().mockResolvedValue([{ id: "a" }]);
    await filterAuthorizedContactIds(
      { id: "u3", role: "user" },
      ["a", "b"],
    );
    const arg = (prismadb.crm_Contacts.findMany as jest.Mock).mock.calls[0][0];
    expect(arg.where).toMatchObject({
      id: { in: ["a", "b"] },
      OR: expect.arrayContaining([
        { assigned_to: "u3" },
        { created_by: "u3" },
        { createdBy: "u3" },
      ]),
    });
  });

  it("returns empty array when input is empty (no DB call)", async () => {
    const fn = jest.fn();
    (prismadb.crm_Contacts.findMany as jest.Mock) = fn;
    const out = await filterAuthorizedContactIds(
      { id: "u", role: "user" },
      [],
    );
    expect(out).toEqual([]);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("filterAuthorizedTargetIds", () => {
  it("user: scoped to created_by", async () => {
    (prismadb.crm_Targets.findMany as jest.Mock) =
      jest.fn().mockResolvedValue([{ id: "t1" }]);
    await filterAuthorizedTargetIds({ id: "u3", role: "user" }, ["t1", "t2"]);
    expect(prismadb.crm_Targets.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["t1", "t2"] }, created_by: "u3" },
      select: { id: true },
    });
  });
});
```

Also add to the imports at the top of the test file:
```ts
import {
  // existing imports...
  filterAuthorizedContactIds,
  filterAuthorizedTargetIds,
} from "../scopes/crm";
```

And to the prisma mock at the top:
```ts
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Contacts: { findFirst: jest.fn(), findMany: jest.fn() },
    crm_Targets: { findFirst: jest.fn(), findMany: jest.fn() },
  },
}));
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm jest lib/authz/__tests__/scopes-crm-read.test.ts
```
Expected: FAIL — helpers don't exist.

- [ ] **Step 3: Implement in `lib/authz/scopes/crm.ts`**

Append:
```ts
export async function filterAuthorizedContactIds(
  user: AuthzUser,
  contactIds: string[],
): Promise<string[]> {
  if (contactIds.length === 0) return [];
  const baseWhere =
    user.role === "admin" || user.role === "manager"
      ? { id: { in: contactIds } }
      : {
          id: { in: contactIds },
          OR: [
            { assigned_to: user.id },
            { created_by: user.id },
            { createdBy: user.id },
          ],
        };
  const rows = await prismadb.crm_Contacts.findMany({
    where: baseWhere,
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

export async function filterAuthorizedTargetIds(
  user: AuthzUser,
  targetIds: string[],
): Promise<string[]> {
  if (targetIds.length === 0) return [];
  const baseWhere =
    user.role === "admin" || user.role === "manager"
      ? { id: { in: targetIds } }
      : { id: { in: targetIds }, created_by: user.id };
  const rows = await prismadb.crm_Targets.findMany({
    where: baseWhere,
    select: { id: true },
  });
  return rows.map((r) => r.id);
}
```

- [ ] **Step 4: Run test**

```bash
pnpm jest lib/authz/__tests__/scopes-crm-read.test.ts
```
Expected: PASS.

- [ ] **Step 5: Add to barrel**

Append to `lib/authz/index.ts`:
```ts
export {
  filterAuthorizedContactIds,
  filterAuthorizedTargetIds,
} from "./scopes/crm";
```

- [ ] **Step 6: Commit**

```bash
git add lib/authz/scopes/crm.ts lib/authz/__tests__/scopes-crm-read.test.ts lib/authz/index.ts
git commit -m "feat(authz): add bulk-id authorization filters for contacts and targets"
```

---

## Task 3: Enrichment cancel helpers

**Files:**
- Modify: `lib/authz/scopes/crm.ts`
- Create: `lib/authz/__tests__/scopes-crm-enrichment.test.ts`

`assertCanCancelContactEnrichment(user, enrichmentId)` and `assertCanCancelTargetEnrichment(user, enrichmentId)` load the enrichment row, check it exists, and check `triggeredBy === user.id` OR user is manager/admin. Throw `AuthorizationError` otherwise.

- [ ] **Step 1: Write the failing test**

`lib/authz/__tests__/scopes-crm-enrichment.test.ts`:
```ts
import { AuthorizationError } from "../errors";

jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Contact_Enrichment: { findUnique: jest.fn() },
    crm_Target_Enrichment: { findUnique: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import {
  assertCanCancelContactEnrichment,
  assertCanCancelTargetEnrichment,
} from "../scopes/crm";

const findContactE = prismadb.crm_Contact_Enrichment.findUnique as jest.MockedFunction<
  typeof prismadb.crm_Contact_Enrichment.findUnique
>;
const findTargetE = prismadb.crm_Target_Enrichment.findUnique as jest.MockedFunction<
  typeof prismadb.crm_Target_Enrichment.findUnique
>;

beforeEach(() => jest.clearAllMocks());

describe("assertCanCancelContactEnrichment", () => {
  it("throws when enrichment not found", async () => {
    findContactE.mockResolvedValue(null);
    await expect(
      assertCanCancelContactEnrichment({ id: "u", role: "user" }, "e1"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("user: passes when triggeredBy matches", async () => {
    findContactE.mockResolvedValue({ id: "e1", triggeredBy: "u1" } as any);
    await expect(
      assertCanCancelContactEnrichment({ id: "u1", role: "user" }, "e1"),
    ).resolves.toBeUndefined();
  });

  it("user: throws when triggeredBy is someone else", async () => {
    findContactE.mockResolvedValue({ id: "e1", triggeredBy: "other" } as any);
    await expect(
      assertCanCancelContactEnrichment({ id: "u1", role: "user" }, "e1"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("manager: passes regardless of triggeredBy", async () => {
    findContactE.mockResolvedValue({ id: "e1", triggeredBy: "other" } as any);
    await expect(
      assertCanCancelContactEnrichment({ id: "m1", role: "manager" }, "e1"),
    ).resolves.toBeUndefined();
  });

  it("admin: passes regardless of triggeredBy", async () => {
    findContactE.mockResolvedValue({ id: "e1", triggeredBy: null } as any);
    await expect(
      assertCanCancelContactEnrichment({ id: "a1", role: "admin" }, "e1"),
    ).resolves.toBeUndefined();
  });
});

describe("assertCanCancelTargetEnrichment", () => {
  it("user: passes when triggeredBy matches", async () => {
    findTargetE.mockResolvedValue({ id: "e1", triggeredBy: "u1" } as any);
    await expect(
      assertCanCancelTargetEnrichment({ id: "u1", role: "user" }, "e1"),
    ).resolves.toBeUndefined();
  });

  it("user: throws when triggeredBy is someone else", async () => {
    findTargetE.mockResolvedValue({ id: "e1", triggeredBy: "other" } as any);
    await expect(
      assertCanCancelTargetEnrichment({ id: "u1", role: "user" }, "e1"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("throws when not found", async () => {
    findTargetE.mockResolvedValue(null);
    await expect(
      assertCanCancelTargetEnrichment({ id: "u1", role: "user" }, "e1"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});
```

- [ ] **Step 2: Run failing test**

```bash
pnpm jest lib/authz/__tests__/scopes-crm-enrichment.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Implement in `lib/authz/scopes/crm.ts`**

Append:
```ts
export async function assertCanCancelContactEnrichment(
  user: AuthzUser,
  enrichmentId: string,
): Promise<void> {
  const row = await prismadb.crm_Contact_Enrichment.findUnique({
    where: { id: enrichmentId },
    select: { id: true, triggeredBy: true },
  });
  if (!row) throw new AuthorizationError();
  if (user.role === "admin" || user.role === "manager") return;
  if (row.triggeredBy !== user.id) throw new AuthorizationError();
}

export async function assertCanCancelTargetEnrichment(
  user: AuthzUser,
  enrichmentId: string,
): Promise<void> {
  const row = await prismadb.crm_Target_Enrichment.findUnique({
    where: { id: enrichmentId },
    select: { id: true, triggeredBy: true },
  });
  if (!row) throw new AuthorizationError();
  if (user.role === "admin" || user.role === "manager") return;
  if (row.triggeredBy !== user.id) throw new AuthorizationError();
}
```

- [ ] **Step 4: Run test**

```bash
pnpm jest lib/authz/__tests__/scopes-crm-enrichment.test.ts
```
Expected: PASS.

- [ ] **Step 5: Add to barrel**

Append to `lib/authz/index.ts`:
```ts
export {
  assertCanCancelContactEnrichment,
  assertCanCancelTargetEnrichment,
} from "./scopes/crm";
```

- [ ] **Step 6: Commit**

```bash
git add lib/authz/scopes/crm.ts lib/authz/__tests__/scopes-crm-enrichment.test.ts lib/authz/index.ts
git commit -m "feat(authz): add enrichment cancel permission helpers"
```

---

## Task 4: Patch contact stream enrichment route (POST + DELETE)

**Files:**
- Modify: `app/api/crm/contacts/enrich/route.ts`
- Create: `app/api/crm/contacts/enrich/__tests__/route.test.ts`

The current POST creates a `crm_Contact_Enrichment` row for any session user against any contact id. Add `assertCanWriteContact` BEFORE both the contact lookup and the enrichment-row create. The current DELETE has no auth at all — add `requireAuthenticated` + `assertCanCancelContactEnrichment` against the enrichmentId from `activeSessions`.

The route exports `runtime = "nodejs"` and a streaming POST. Keep all existing streaming behavior unchanged — only add authorization gates before any side-effect.

- [ ] **Step 1: Write the failing tests**

`app/api/crm/contacts/enrich/__tests__/route.test.ts`:
```ts
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Contacts: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    crm_Contact_Enrichment: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));
jest.mock("@/lib/api-keys", () => ({
  getApiKey: jest.fn().mockResolvedValue("sk-test"),
}));

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { POST, DELETE } from "../route";

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockedFindUser = prismadb.users.findUnique as jest.MockedFunction<
  typeof prismadb.users.findUnique
>;
const mockedFindContactScope = prismadb.crm_Contacts.findFirst as jest.MockedFunction<
  typeof prismadb.crm_Contacts.findFirst
>;
const mockedFindContact = prismadb.crm_Contacts.findUnique as jest.MockedFunction<
  typeof prismadb.crm_Contacts.findUnique
>;
const mockedFindEnrichment = prismadb.crm_Contact_Enrichment.findUnique as jest.MockedFunction<
  typeof prismadb.crm_Contact_Enrichment.findUnique
>;
const mockedCreateEnrichment = prismadb.crm_Contact_Enrichment.create as jest.MockedFunction<
  typeof prismadb.crm_Contact_Enrichment.create
>;

function makePostReq(body: unknown) {
  return new NextRequest("http://localhost/api/crm/contacts/enrich", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => jest.clearAllMocks());

describe("POST /api/crm/contacts/enrich", () => {
  it("returns 401 when unauthenticated", async () => {
    mockedGetSession.mockResolvedValue(null as any);
    const res = await POST(
      makePostReq({ contactId: "c1", fields: [{ name: "website" }] }),
    );
    expect(res.status).toBe(401);
    expect(mockedFindContact).not.toHaveBeenCalled();
    expect(mockedCreateEnrichment).not.toHaveBeenCalled();
  });

  it("returns 403/404 when user does not own the contact (no DB write)", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "victim" } } as any);
    mockedFindUser.mockResolvedValue({ id: "victim", role: "user" } as any);
    mockedFindContactScope.mockResolvedValue(null); // assertCanWriteContact throws
    const res = await POST(
      makePostReq({ contactId: "c1", fields: [{ name: "website" }] }),
    );
    expect([403, 404]).toContain(res.status);
    expect(mockedFindContact).not.toHaveBeenCalled();
    expect(mockedCreateEnrichment).not.toHaveBeenCalled();
  });

  it("manager can enrich any contact", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "m1" } } as any);
    mockedFindUser.mockResolvedValue({ id: "m1", role: "manager" } as any);
    mockedFindContactScope.mockResolvedValue({ id: "c1" } as any);
    mockedFindContact.mockResolvedValue({ id: "c1", email: "x@y.com" } as any);
    mockedCreateEnrichment.mockResolvedValue({ id: "e1" } as any);

    const res = await POST(
      makePostReq({ contactId: "c1", fields: [{ name: "website" }] }),
    );
    expect(res.status).toBe(200);
    expect(mockedCreateEnrichment).toHaveBeenCalledTimes(1);
  });
});

describe("DELETE /api/crm/contacts/enrich", () => {
  it("returns 401 when unauthenticated", async () => {
    mockedGetSession.mockResolvedValue(null as any);
    const req = new NextRequest(
      "http://localhost/api/crm/contacts/enrich?sessionId=missing",
      { method: "DELETE" },
    );
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it("returns 404 when sessionId not in activeSessions", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u" } } as any);
    mockedFindUser.mockResolvedValue({ id: "u", role: "user" } as any);
    const req = new NextRequest(
      "http://localhost/api/crm/contacts/enrich?sessionId=ghost",
      { method: "DELETE" },
    );
    const res = await DELETE(req);
    expect(res.status).toBe(404);
  });

  // Note: positive-path cancel tests would require seeding activeSessions
  // (module-internal). For coverage, the unit tests here verify the auth
  // gates; an integration test in __tests__/enrichment/ would cover the
  // full flow. That's out of B1 scope.
});
```

- [ ] **Step 2: Run failing test**

```bash
pnpm jest 'app/api/crm/contacts/enrich/__tests__/route.test.ts'
```
Expected: FAIL.

- [ ] **Step 3: Patch the route**

`app/api/crm/contacts/enrich/route.ts` — replace the auth section of POST and add a real DELETE guard. Pseudocode for the changes (apply to actual file structure):

POST:
1. After `getSession()` 401 check, call `requireAuthenticated()` from `@/lib/authz`.
2. Replace direct `getSession()` with the result of `requireAuthenticated()` for `triggeredBy`. (Or call both — `requireAuthenticated` already calls `getSession`.)
3. **Before** the `prismadb.crm_Contacts.findUnique` lookup that reads `email`, call `assertCanWriteContact(user, contactId)`. If it throws `AuthorizationError`, return `notFoundOrForbiddenResponse()`.
4. Pass `user.id` as `triggeredBy` (not `session.user.id`).

DELETE:
1. Call `requireAuthenticated()`. On `AuthenticationError`, return `unauthorizedResponse()`.
2. Look up `sessionId` from query, then look up `activeSessions.get(sessionId)`. If not found, return 404 (`notFoundOrForbiddenResponse`).
3. Call `assertCanCancelContactEnrichment(user, entry.enrichmentId)`. On `AuthorizationError`, return `notFoundOrForbiddenResponse()`.
4. Then proceed with the existing update-and-abort logic.

Concrete handler header (replace the current POST opener):
```ts
import {
  requireAuthenticated,
  assertCanWriteContact,
  assertCanCancelContactEnrichment,
  unauthorizedResponse,
  notFoundOrForbiddenResponse,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return unauthorizedResponse();
    throw e;
  }

  const body = await request.json();
  const { contactId, fields } = body;
  if (!validateEnrichRequest({ contactId, fields })) {
    return NextResponse.json({ error: "contactId and fields required" }, { status: 400 });
  }

  try {
    await assertCanWriteContact(user, contactId);
  } catch (e) {
    if (e instanceof AuthorizationError) return notFoundOrForbiddenResponse();
    throw e;
  }

  // existing API key checks below (unchanged) — but pass user.id instead of session.user.id
  const firecrawl = await getApiKey("FIRECRAWL", user.id);
  // ...
  const contact = await prismadb.crm_Contacts.findUnique({
    where: { id: contactId },
    select: { id: true, email: true },
  });
  if (!contact || !contact.email) {
    return NextResponse.json({ error: "Contact not found or has no email" }, { status: 404 });
  }
  const enrichment = await prismadb.crm_Contact_Enrichment.create({
    data: {
      contactId,
      status: "RUNNING",
      fields: fields.map((f) => f.name),
      triggeredBy: user.id,
    },
  });
  // ... rest of streaming setup unchanged
}
```

DELETE:
```ts
export async function DELETE(request: NextRequest) {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return unauthorizedResponse();
    throw e;
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }
  const entry = activeSessions.get(sessionId);
  if (!entry) return notFoundOrForbiddenResponse();

  try {
    await assertCanCancelContactEnrichment(user, entry.enrichmentId);
  } catch (e) {
    if (e instanceof AuthorizationError) return notFoundOrForbiddenResponse();
    throw e;
  }

  entry.controller.abort();
  await prismadb.crm_Contact_Enrichment.update({
    where: { id: entry.enrichmentId },
    data: { status: "FAILED", error: "Cancelled by user" },
  });
  activeSessions.delete(sessionId);
  return NextResponse.json({ success: true });
}
```

Preserve every other line of the streaming POST (SSE setup, AbortController, Inngest invoke, etc.). Only the auth opening and DELETE handler change.

- [ ] **Step 4: Run tests**

```bash
pnpm jest 'app/api/crm/contacts/enrich/__tests__/route.test.ts'
```
Expected: PASS, 5 cases.

Then re-run the existing test:
```bash
pnpm jest __tests__/enrichment/enrich-route.test.ts 2>&1 | tail -10
```
Expected: same baseline as before this PR (the existing test may have been passing or broken pre-existing — note the delta).

- [ ] **Step 5: Commit**

```bash
git add app/api/crm/contacts/enrich/route.ts app/api/crm/contacts/enrich/__tests__/route.test.ts
git commit -m "fix(api): require contact write scope on enrich POST/DELETE"
```

---

## Task 5: Patch contact bulk enrichment route

**Files:**
- Modify: `app/api/crm/contacts/enrich-bulk/route.ts`
- Create: `app/api/crm/contacts/enrich-bulk/__tests__/route.test.ts`

Current behavior: any authenticated user can queue Inngest events for arbitrary contact IDs. Fix: filter the input ids through `filterAuthorizedContactIds`. If the filtered set is smaller than input, return 403 (some IDs unauthorized) — fail-closed per spec.

- [ ] **Step 1: Write failing test**

`app/api/crm/contacts/enrich-bulk/__tests__/route.test.ts`:
```ts
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Contacts: { findMany: jest.fn() },
  },
}));
jest.mock("@/lib/api-keys", () => ({
  getApiKey: jest.fn().mockResolvedValue("sk-test"),
}));
jest.mock("@/inngest/client", () => ({
  inngest: { send: jest.fn().mockResolvedValue({ ids: ["1"] }) },
}));

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { POST } from "../route";

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockedUser = prismadb.users.findUnique as jest.MockedFunction<
  typeof prismadb.users.findUnique
>;
const mockedFindMany = prismadb.crm_Contacts.findMany as jest.MockedFunction<
  typeof prismadb.crm_Contacts.findMany
>;
const mockedSend = inngest.send as jest.MockedFunction<typeof inngest.send>;

function makeReq(body: unknown) {
  return new NextRequest("http://localhost/api/crm/contacts/enrich-bulk", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => jest.clearAllMocks());

describe("POST /api/crm/contacts/enrich-bulk", () => {
  it("401 unauth", async () => {
    mockedGetSession.mockResolvedValue(null as any);
    const res = await POST(makeReq({ contactIds: ["a"], fields: [{ name: "website" }] }));
    expect(res.status).toBe(401);
    expect(mockedSend).not.toHaveBeenCalled();
  });

  it("403 when any contact id is unauthorized (fail-closed)", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u" } } as any);
    mockedUser.mockResolvedValue({ id: "u", role: "user" } as any);
    mockedFindMany.mockResolvedValue([{ id: "a" }] as any); // only "a" authorized; "b" not
    const res = await POST(
      makeReq({ contactIds: ["a", "b"], fields: [{ name: "website" }] }),
    );
    expect(res.status).toBe(403);
    expect(mockedSend).not.toHaveBeenCalled();
  });

  it("succeeds + sends Inngest event when all ids authorized", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "m" } } as any);
    mockedUser.mockResolvedValue({ id: "m", role: "manager" } as any);
    mockedFindMany.mockResolvedValue([{ id: "a" }, { id: "b" }] as any);
    const res = await POST(
      makeReq({ contactIds: ["a", "b"], fields: [{ name: "website" }] }),
    );
    expect(res.status).toBe(200);
    expect(mockedSend).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "enrich/contacts.bulk",
        data: expect.objectContaining({
          contactIds: ["a", "b"],
          triggeredBy: "m",
        }),
      }),
    );
  });
});
```

- [ ] **Step 2: Run failing test**

```bash
pnpm jest 'app/api/crm/contacts/enrich-bulk/__tests__/route.test.ts'
```

- [ ] **Step 3: Patch the route**

`app/api/crm/contacts/enrich-bulk/route.ts` — replace the `getSession()` block with `requireAuthenticated`, then between the input validation and the Inngest send, call `filterAuthorizedContactIds`:

```ts
import {
  requireAuthenticated,
  filterAuthorizedContactIds,
  unauthorizedResponse,
  forbiddenResponse,
  AuthenticationError,
} from "@/lib/authz";

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return unauthorizedResponse();
    throw e;
  }

  // existing input validation: contactIds array len 1-100, fields non-empty,
  // FIELD_MAP allowlist check — keep as-is
  // existing API key checks — keep, pass user.id

  const authorized = await filterAuthorizedContactIds(user, contactIds);
  if (authorized.length !== contactIds.length) {
    return forbiddenResponse();
  }

  await inngest.send({
    name: "enrich/contacts.bulk",
    data: { contactIds, fields, triggeredBy: user.id },
  });
  return NextResponse.json({ success: true, count: contactIds.length });
}
```

- [ ] **Step 4: Run test → PASS**

- [ ] **Step 5: Commit**

```bash
git add app/api/crm/contacts/enrich-bulk/route.ts app/api/crm/contacts/enrich-bulk/__tests__/route.test.ts
git commit -m "fix(api): filter contact bulk enrichment ids by user scope"
```

---

## Task 6: Patch target stream enrichment route (POST + DELETE)

**Files:**
- Modify: `app/api/crm/targets/enrich/route.ts`
- Create: `app/api/crm/targets/enrich/__tests__/route.test.ts`

Same pattern as Task 4, but for targets — use `assertCanWriteTarget` and `assertCanCancelTargetEnrichment`. The campaign re-export at `app/api/campaigns/targets/enrich/route.ts` is auto-fixed.

- [ ] **Step 1: Write the failing test** — clone Task 4 test, swap `crm_Contacts` → `crm_Targets`, `crm_Contact_Enrichment` → `crm_Target_Enrichment`, `contactId` → `targetId`, `assertCanWriteContact` → `assertCanWriteTarget` flow. The mocked target findUnique selects `id, email, company, company_website` (current route behavior).

- [ ] **Step 2: Run failing test**

- [ ] **Step 3: Patch the route** — same replacements as Task 4. POST: `requireAuthenticated` → `assertCanWriteTarget(user, targetId)` → existing target lookup + enrichment create with `triggeredBy: user.id`. DELETE: `requireAuthenticated` → look up `entry.enrichmentId` from `activeSessions` → `assertCanCancelTargetEnrichment(user, entry.enrichmentId)` → existing update.

- [ ] **Step 4: Run test → PASS**

- [ ] **Step 5: Verify campaign re-export unchanged**

```bash
cat 'app/api/campaigns/targets/enrich/route.ts'
```
Expected: still `export { POST, DELETE } from "@/app/api/crm/targets/enrich/route";`. No edit needed.

- [ ] **Step 6: Commit**

```bash
git add app/api/crm/targets/enrich/route.ts app/api/crm/targets/enrich/__tests__/route.test.ts
git commit -m "fix(api): require target write scope on enrich POST/DELETE (auto-fixes campaign re-export)"
```

---

## Task 7: Patch target bulk enrichment route

**Files:**
- Modify: `app/api/crm/targets/enrich-bulk/route.ts`
- Create: `app/api/crm/targets/enrich-bulk/__tests__/route.test.ts`

Same pattern as Task 5 but for targets. Use `filterAuthorizedTargetIds`. Campaign re-export `app/api/campaigns/targets/enrich-bulk/route.ts` auto-fixed.

- [ ] **Step 1: Write failing test** — clone Task 5 test, swap models/fields/event name (`enrich/targets.bulk`).

- [ ] **Step 2: Run failing test**

- [ ] **Step 3: Patch the route** — `requireAuthenticated` → input validation → `filterAuthorizedTargetIds` → length check → Inngest send.

- [ ] **Step 4: Run test → PASS**

- [ ] **Step 5: Commit**

```bash
git add app/api/crm/targets/enrich-bulk/route.ts app/api/crm/targets/enrich-bulk/__tests__/route.test.ts
git commit -m "fix(api): filter target bulk enrichment ids by user scope"
```

---

## Task 8: Patch `targets/[id]/enrich` route

**Files:**
- Modify: `app/api/crm/targets/[id]/enrich/route.ts`
- Create: `app/api/crm/targets/[id]/enrich/__tests__/route.test.ts`

Current: takes `id` from path, calls `inngest.send({ name: "enrich/target.run", data: { targetId: id, triggeredBy: session.user.id, force }})` after only session check. Add `assertCanWriteTarget` before the send.

- [ ] **Step 1: Write failing test**

```ts
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Targets: { findFirst: jest.fn() },
  },
}));
jest.mock("@/inngest/client", () => ({
  inngest: { send: jest.fn().mockResolvedValue({}) },
}));

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { POST } from "../route";

const gs = getSession as jest.MockedFunction<typeof getSession>;
const fu = prismadb.users.findUnique as jest.MockedFunction<typeof prismadb.users.findUnique>;
const ft = prismadb.crm_Targets.findFirst as jest.MockedFunction<typeof prismadb.crm_Targets.findFirst>;
const send = inngest.send as jest.MockedFunction<typeof inngest.send>;

function makeReq(body: unknown = {}) {
  return new NextRequest("http://localhost/api/crm/targets/t1/enrich", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => jest.clearAllMocks());

describe("POST /api/crm/targets/[id]/enrich", () => {
  it("401 unauth", async () => {
    gs.mockResolvedValue(null as any);
    const res = await POST(makeReq(), { params: Promise.resolve({ id: "t1" }) });
    expect(res.status).toBe(401);
    expect(send).not.toHaveBeenCalled();
  });

  it("404 when user does not own target", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    ft.mockResolvedValue(null);
    const res = await POST(makeReq(), { params: Promise.resolve({ id: "t1" }) });
    expect(res.status).toBe(404);
    expect(send).not.toHaveBeenCalled();
  });

  it("user owning target queues Inngest", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    ft.mockResolvedValue({ id: "t1" } as any);
    const res = await POST(makeReq(), { params: Promise.resolve({ id: "t1" }) });
    expect(res.status).toBe(200);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "enrich/target.run",
        data: expect.objectContaining({ targetId: "t1", triggeredBy: "u" }),
      }),
    );
  });
});
```

- [ ] **Step 2: Failing test**

- [ ] **Step 3: Patch route**

```ts
import {
  requireAuthenticated,
  assertCanWriteTarget,
  unauthorizedResponse,
  notFoundOrForbiddenResponse,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import { inngest } from "@/inngest/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
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
  try {
    await assertCanWriteTarget(user, id);
  } catch (e) {
    if (e instanceof AuthorizationError) return notFoundOrForbiddenResponse();
    throw e;
  }
  const body = await request.json().catch(() => ({}));
  await inngest.send({
    name: "enrich/target.run",
    data: { targetId: id, triggeredBy: user.id, force: body.force ?? false },
  });
  return NextResponse.json({ queued: true });
}
```

Verify the campaign re-export is `export { POST } from "@/app/api/crm/targets/[id]/enrich/route";` — auto-fixed.

- [ ] **Step 4: Test → PASS**

- [ ] **Step 5: Commit**

```bash
git add 'app/api/crm/targets/[id]/enrich/route.ts' 'app/api/crm/targets/[id]/enrich/__tests__/route.test.ts'
git commit -m "fix(api): require target write scope on per-target enrich (auto-fixes campaign re-export)"
```

---

## Task 9: Patch `targets/[id]/contacts` POST

**Files:**
- Modify: `app/api/crm/targets/[id]/contacts/route.ts`
- Create: `app/api/crm/targets/[id]/contacts/__tests__/route.test.ts`

Current: creates a `crm_Target_Contact` for any user against any `targetId`. Fix: assert write scope on the parent target before creating the sub-record.

- [ ] **Step 1: Test** — same pattern. Mock `crm_Target_Contact.create`. Cases: 401, 404 when target not in scope, 200 owner, 200 manager. The 404 case must assert `crm_Target_Contact.create` was NOT called.

- [ ] **Step 2: Failing test**

- [ ] **Step 3: Patch**

```ts
import {
  requireAuthenticated,
  assertCanWriteTarget,
  unauthorizedResponse,
  notFoundOrForbiddenResponse,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: targetId } = await params;
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return unauthorizedResponse();
    throw e;
  }
  try {
    await assertCanWriteTarget(user, targetId);
  } catch (e) {
    if (e instanceof AuthorizationError) return notFoundOrForbiddenResponse();
    throw e;
  }
  // existing body validation + crm_Target_Contact.create unchanged
}
```

- [ ] **Step 4: Test PASS**

- [ ] **Step 5: Commit**

```bash
git add 'app/api/crm/targets/[id]/contacts/route.ts' 'app/api/crm/targets/[id]/contacts/__tests__/route.test.ts'
git commit -m "fix(api): require parent target write scope on target-contact create"
```

---

## Task 10: Patch `targets/[id]/contacts/[contactId]/enrich` POST

**Files:**
- Modify: `app/api/crm/targets/[id]/contacts/[contactId]/enrich/route.ts`
- Create: `app/api/crm/targets/[id]/contacts/[contactId]/enrich/__tests__/route.test.ts`

Current: trusts both `id` (target) and `contactId` (target-contact). Currently the route doesn't even use `id` — it only sends `{ contactId }` to Inngest. Fix: (a) verify the user can write the parent target, (b) verify the target-contact actually belongs to that target (linkage check, not just existence).

- [ ] **Step 1: Test cases**: 401, 404 when target not in scope, 404 when contact exists but its `targetId` ≠ path `id` (linkage check), 200 owner.

- [ ] **Step 2: Failing test**

- [ ] **Step 3: Patch**

```ts
import {
  requireAuthenticated,
  assertCanWriteTarget,
  unauthorizedResponse,
  notFoundOrForbiddenResponse,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import { prismadb } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> },
) {
  const { id: targetId, contactId } = await params;
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return unauthorizedResponse();
    throw e;
  }
  try {
    await assertCanWriteTarget(user, targetId);
  } catch (e) {
    if (e instanceof AuthorizationError) return notFoundOrForbiddenResponse();
    throw e;
  }
  // Linkage check: ensure target-contact actually belongs to this target.
  const tc = await prismadb.crm_Target_Contact.findFirst({
    where: { id: contactId, targetId },
    select: { id: true },
  });
  if (!tc) return notFoundOrForbiddenResponse();

  await inngest.send({
    name: "enrich/target.contact.run",
    data: { contactId, triggeredBy: user.id },
  });
  return NextResponse.json({ queued: true });
}
```

- [ ] **Step 4: Test PASS**

- [ ] **Step 5: Commit**

```bash
git add 'app/api/crm/targets/[id]/contacts/[contactId]/enrich/route.ts' 'app/api/crm/targets/[id]/contacts/[contactId]/enrich/__tests__/route.test.ts'
git commit -m "fix(api): require target write scope and contact linkage on per-target-contact enrich"
```

---

## Task 11: Final verification

- [ ] **Step 1: Full test suite**

```bash
pnpm jest 2>&1 | tail -8
```
Expected: same baseline failure count as before B1, plus the new authz/route tests all passing. Note delta vs. baseline.

- [ ] **Step 2: Typecheck**

```bash
pnpm tsc --noEmit 2>&1 | grep -vE "(invite-user|currencies|auth-permissions|auth\.ts:71)" | head -30
```
Expected: no NEW errors introduced by B1. Pre-existing errors filtered.

- [ ] **Step 3: Lint**

```bash
pnpm lint 2>&1 | tail -10
```

- [ ] **Step 4: Manual security check (run on a deployed dev environment)**

For each route, repeat the cross-user attack:
1. As `bob` (role=user), `POST /api/crm/contacts/enrich` with `alice`'s contactId → expect 404, no `crm_Contact_Enrichment` row created (verify in DB).
2. As `bob`, `DELETE /api/crm/contacts/enrich?sessionId=<alice-active-session>` → expect 404, alice's enrichment unchanged.
3. As `bob`, `POST /api/crm/contacts/enrich-bulk` with `[alice-contact-id, bob-contact-id]` → expect 403, no Inngest event emitted.
4. Same three for targets.
5. As `bob`, `POST /api/crm/targets/<alice-target>/contacts` → expect 404.
6. As `bob`, `POST /api/crm/targets/<alice-target>/contacts/<some>/enrich` → expect 404.
7. As `bob`, hit campaign re-exports with alice's targetId → expect 404 (re-export inherits the fix).

- [ ] **Step 5: Push and PR**

```bash
git push -u origin feat/authz-phase-b1
gh pr create --base dev --head feat/authz-phase-b1 --title "fix(security): close enrichment BOLA/IDOR (Phase B1)" --body "..."
```

PR body should reference: spec §7.4–7.5, audit findings on enrichment, this plan path, manual test results.

---

## Acceptance Criteria

- Every enrichment route (POST, DELETE, bulk, sub-paths) returns 401 to unauthenticated callers and 404/403 to authenticated callers who don't own the resource.
- No `crm_Contact_Enrichment` or `crm_Target_Enrichment` row is created when authorization fails.
- No Inngest event is emitted when authorization fails (bulk routes fail-closed if any id is unauthorized).
- DELETE cancel requires both a valid session and ownership of the in-flight enrichment.
- Campaign re-exports (`/api/campaigns/targets/[id]/enrich`, `/enrich`, `/enrich-bulk`) inherit fixes via `export { ... } from`.
- Phase A authz module is extended with read/write/cancel/filter helpers, all unit-tested.
- Cross-user regression tests (≥3 cases per route) pass in CI/test runs.

## Out of B1 scope

- **Inngest worker re-validation.** Background workers still trust `triggeredBy` and the IDs in event payload. A motivated attacker who somehow forges an Inngest event would bypass these route fixes. Hardening workers is a follow-up.
- **Redis-backed session store.** `activeSessions` is module-local; multi-replica deployments still have stale-session edge cases. Out of scope.
- **Linked-account scope for contacts.** Phase D adds the rule "user can write a contact whose linked account they have access to." For B1 we keep the same scope shape Phase A used (assigned/created_by/createdBy only).
- **B2 (invoice PDF + duplicate-invoice IDOR).**
- **B3 (reports export scoping).**
