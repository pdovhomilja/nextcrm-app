# Permission-Driven Authorization — Phase B2 (Invoices) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Close the remaining invoice-related authorization gaps the audit found: PDF download IDOR, unauthenticated `duplicateInvoice`, missing account-write check on `createInvoice` and `updateInvoice`, plus role-aware refactor of `lib/invoices/permissions.ts` (currently boolean `isAdmin`-only) so manager and admin both pass invoice gates.

**Architecture:**
1. Refactor `lib/invoices/permissions.ts`: `UserCtx` becomes `{ id: string, role: AppRole }`. Add `canReadInvoice` (creator OR manager OR admin). All helpers use `isManagerOrAdmin || createdBy === user.id`.
2. Add `assertCanWriteAccount(user, accountId)` to `lib/authz/scopes/crm.ts` — used to validate that a user can bill against the referenced CRM account on `createInvoice`/`updateInvoice`. User scope = `assigned_to=user.id OR createdBy=user.id OR watcher`. Manager/admin = bare lookup.
3. Patch the PDF route, `duplicateInvoice`, and the unguarded action call sites. `delete-payment.ts` switches from `user.is_admin` to `requireRole(["admin"])`.

**Out of scope:** Read-side scoping for invoice list/detail (user-scoped invoice list is Phase D / E). PDF generation pipeline. Currency/tax-rate config (admin-only already covered by Phase A).

**Spec source:** §6.11, §7.6, §8.13, §12 Phase 2.
**Audit source:** "Invoice PDF IDOR", "Duplicate Invoice IDOR", "Cross-object Invoice Account Binding".

---

## File Structure

**New files:**
- `app/api/invoices/[invoiceId]/pdf/__tests__/route.test.ts`
- `actions/invoices/__tests__/duplicate-invoice.test.ts`
- `actions/invoices/__tests__/create-invoice-account-scope.test.ts`
- `lib/authz/__tests__/scopes-crm-account.test.ts`

**Modified files:**
- `lib/invoices/permissions.ts` — UserCtx role-aware, add `canReadInvoice`
- `__tests__/lib/invoices/permissions.test.ts` — update fixtures from `isAdmin:bool` → `role:AppRole`
- `lib/authz/scopes/crm.ts` — add `assertCanWriteAccount`
- `lib/authz/index.ts` — re-export
- `app/api/invoices/[invoiceId]/pdf/route.ts` — read scope check
- `actions/invoices/create-invoice.ts` — `assertCanWriteAccount`
- `actions/invoices/update-invoice.ts` — `assertCanWriteAccount` on accountId reassignment + role-aware permissions call
- `actions/invoices/duplicate-invoice.ts` — `assertCanReadInvoice` on source + `assertCanWriteAccount` on copy
- `actions/invoices/cancel-invoice.ts`, `issue-invoice.ts`, `add-payment.ts`, `send-invoice-email.ts`, `regenerate-pdf.ts` — adapt to role-aware UserCtx
- `actions/invoices/delete-payment.ts` — `requireRole(["admin"])` instead of `user.is_admin`

---

## Task 1: Account write-scope helper

**Files:**
- Modify: `lib/authz/scopes/crm.ts`
- Create: `lib/authz/__tests__/scopes-crm-account.test.ts`
- Modify: `lib/authz/index.ts`

`assertCanWriteAccount(user, accountId)` throws `AuthorizationError` if the user cannot operate on the account. User scope: `assigned_to = user.id OR createdBy = user.id OR exists in AccountWatchers`. Manager/admin: bare lookup.

- [ ] **Step 1: Write failing test**

`lib/authz/__tests__/scopes-crm-account.test.ts`:
```ts
import { AuthorizationError } from "../errors";

jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Accounts: { findFirst: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { assertCanWriteAccount } from "../scopes/crm";

const find = prismadb.crm_Accounts.findFirst as jest.MockedFunction<
  typeof prismadb.crm_Accounts.findFirst
>;

beforeEach(() => jest.clearAllMocks());

describe("assertCanWriteAccount", () => {
  it("admin: bare where", async () => {
    find.mockResolvedValue({ id: "a1" } as any);
    await assertCanWriteAccount({ id: "u", role: "admin" }, "a1");
    expect(find).toHaveBeenCalledWith({
      where: { id: "a1" },
      select: { id: true },
    });
  });

  it("manager: bare where", async () => {
    find.mockResolvedValue({ id: "a1" } as any);
    await assertCanWriteAccount({ id: "u", role: "manager" }, "a1");
    expect(find).toHaveBeenCalledWith({
      where: { id: "a1" },
      select: { id: true },
    });
  });

  it("user: scoped with assigned/creator/watcher OR clauses", async () => {
    find.mockResolvedValue({ id: "a1" } as any);
    await assertCanWriteAccount({ id: "u3", role: "user" }, "a1");
    const arg = find.mock.calls[0][0]!;
    expect(arg.where).toMatchObject({
      id: "a1",
      OR: expect.arrayContaining([
        { assigned_to: "u3" },
        { createdBy: "u3" },
        { watchers: { some: { user_id: "u3" } } },
      ]),
    });
  });

  it("throws AuthorizationError when not in scope", async () => {
    find.mockResolvedValue(null);
    await expect(
      assertCanWriteAccount({ id: "u3", role: "user" }, "a1"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});
```

- [ ] **Step 2: Failing test**

```bash
pnpm jest lib/authz/__tests__/scopes-crm-account.test.ts
```

- [ ] **Step 3: Implement in `lib/authz/scopes/crm.ts`**

Append:
```ts
export async function assertCanWriteAccount(
  user: AuthzUser,
  accountId: string,
): Promise<void> {
  const where =
    user.role === "admin" || user.role === "manager"
      ? { id: accountId }
      : {
          id: accountId,
          OR: [
            { assigned_to: user.id },
            { createdBy: user.id },
            { watchers: { some: { user_id: user.id } } },
          ],
        };
  const row = await prismadb.crm_Accounts.findFirst({
    where,
    select: { id: true },
  });
  if (!row) throw new AuthorizationError();
}
```

- [ ] **Step 4: Add to barrel**

```ts
export { assertCanWriteAccount } from "./scopes/crm";
```

- [ ] **Step 5: Test → PASS, commit**

```bash
git add lib/authz/scopes/crm.ts lib/authz/__tests__/scopes-crm-account.test.ts lib/authz/index.ts
git commit -m "feat(authz): add account write-scope assertion helper"
```

---

## Task 2: Role-aware invoice permissions

**Files:**
- Modify: `lib/invoices/permissions.ts`
- Modify: `__tests__/lib/invoices/permissions.test.ts`

Replace `UserCtx { id, isAdmin }` with `UserCtx { id, role: AppRole }`. Add `canReadInvoice`. Manager and admin pass every gate that previously required admin.

- [ ] **Step 1: Update the permissions module**

Replace `lib/invoices/permissions.ts` content with:
```ts
import type { AppRole } from "@/lib/authz";

export type InvoiceStatus =
  | "DRAFT" | "ISSUED" | "SENT" | "PARTIALLY_PAID" | "PAID"
  | "OVERDUE" | "CANCELLED" | "DISPUTED" | "REFUNDED" | "WRITTEN_OFF";

export interface UserCtx { id: string; role: AppRole; }
export interface InvoiceCtx { status: InvoiceStatus; createdBy: string; }

export function isInvoiceImmutable(status: InvoiceStatus): boolean {
  return status !== "DRAFT";
}

function isManagerOrAdmin(user: UserCtx): boolean {
  return user.role === "manager" || user.role === "admin";
}

function isOwnerOrPrivileged(invoice: InvoiceCtx, user: UserCtx): boolean {
  return isManagerOrAdmin(user) || invoice.createdBy === user.id;
}

export function canReadInvoice(invoice: InvoiceCtx, user: UserCtx): boolean {
  return isOwnerOrPrivileged(invoice, user);
}

export function canEditInvoice(invoice: InvoiceCtx, user: UserCtx): boolean {
  if (isInvoiceImmutable(invoice.status)) return false;
  return isOwnerOrPrivileged(invoice, user);
}

export function canIssueInvoice(invoice: InvoiceCtx, user: UserCtx): boolean {
  if (invoice.status !== "DRAFT") return false;
  return isOwnerOrPrivileged(invoice, user);
}

export function canCancelInvoice(invoice: InvoiceCtx, user: UserCtx): boolean {
  if (invoice.status !== "DRAFT") return false;
  return isOwnerOrPrivileged(invoice, user);
}

const PAYMENT_ALLOWED: ReadonlySet<InvoiceStatus> = new Set<InvoiceStatus>([
  "ISSUED", "SENT", "PARTIALLY_PAID", "OVERDUE",
]);

export function canAddPayment(invoice: InvoiceCtx, user: UserCtx): boolean {
  if (!PAYMENT_ALLOWED.has(invoice.status)) return false;
  return isOwnerOrPrivileged(invoice, user);
}
```

- [ ] **Step 2: Update existing tests**

Edit `__tests__/lib/invoices/permissions.test.ts`. Change every test fixture from `{ id, isAdmin: false/true }` to `{ id, role: "user"/"admin" }`. Add coverage for `manager`:

```ts
const u  = { id: "u1", role: "user" as const };
const mg = { id: "m",  role: "manager" as const };
const ad = { id: "a",  role: "admin" as const };

// ... existing tests ...

describe("canReadInvoice", () => {
  it("creator can read", () => expect(canReadInvoice({ status: "DRAFT", createdBy: "u1" }, u)).toBe(true));
  it("non-creator user cannot read", () => expect(canReadInvoice({ status: "DRAFT", createdBy: "u2" }, u)).toBe(false));
  it("manager can read any", () => expect(canReadInvoice({ status: "DRAFT", createdBy: "u2" }, mg)).toBe(true));
  it("admin can read any", () => expect(canReadInvoice({ status: "PAID", createdBy: "u2" }, ad)).toBe(true));
});

// add a manager case to canEditInvoice / canIssueInvoice / canAddPayment / canCancelInvoice
it("manager can edit any DRAFT", () => expect(canEditInvoice({ status: "DRAFT", createdBy: "u2" }, mg)).toBe(true));
```

- [ ] **Step 3: Run tests → PASS**

```bash
pnpm jest __tests__/lib/invoices/permissions.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add lib/invoices/permissions.ts __tests__/lib/invoices/permissions.test.ts
git commit -m "refactor(invoices): role-aware permissions (user/manager/admin); add canReadInvoice"
```

---

## Task 3: Update invoice action call sites

**Files:**
- Modify: `actions/invoices/update-invoice.ts`
- Modify: `actions/invoices/cancel-invoice.ts`
- Modify: `actions/invoices/issue-invoice.ts`
- Modify: `actions/invoices/add-payment.ts`
- Modify: `actions/invoices/send-invoice-email.ts`
- Modify: `actions/invoices/regenerate-pdf.ts`

Each action constructs a `UserCtx` from `getUser()` and passes it to `lib/invoices/permissions.ts`. After Task 2 the shape changed — switch every call site from `{ id: user.id, isAdmin: user.is_admin }` to `{ id: user.id, role: mapLegacyRole(user.role) }` (use the existing `mapLegacyRole` for safety, since `getUser()` returns the raw DB string).

- [ ] **Step 1: Apply rewrites**

In each file listed above, change:
```ts
{ id: user.id, isAdmin: user.is_admin }
```
to:
```ts
{ id: user.id, role: mapLegacyRole(user.role) }
```

Add the import in each file:
```ts
import { mapLegacyRole } from "@/lib/authz";
```

For the inline manual checks in `send-invoice-email.ts` and `regenerate-pdf.ts` — these currently do `if (invoice.createdBy !== user.id && !user.is_admin)`. Replace with `canReadInvoice` (since both effectively need read-or-edit access on a non-draft invoice):

In `send-invoice-email.ts`, replace the manual check with:
```ts
import { canReadInvoice, type InvoiceStatus } from "@/lib/invoices/permissions";
import { mapLegacyRole } from "@/lib/authz";

if (
  !canReadInvoice(
    { status: invoice.status as InvoiceStatus, createdBy: invoice.createdBy },
    { id: user.id, role: mapLegacyRole(user.role) },
  )
) {
  throw new Error("Forbidden");
}
```

Same shape in `regenerate-pdf.ts`.

- [ ] **Step 2: Run typecheck**

```bash
pnpm tsc --noEmit 2>&1 | grep -E "actions/invoices" | head
```
Expected: no errors in `actions/invoices/*`.

- [ ] **Step 3: Run existing invoice tests**

```bash
pnpm jest invoices 2>&1 | tail -10
```
Expected: same baseline (or better — pre-existing `lifecycle.test.ts` failures may now pass if they were caused by the boolean shape).

- [ ] **Step 4: Commit**

```bash
git add actions/invoices/
git commit -m "refactor(invoices): pass role-aware UserCtx to permission helpers"
```

---

## Task 4: Patch invoice PDF route

**Files:**
- Modify: `app/api/invoices/[invoiceId]/pdf/route.ts`
- Create: `app/api/invoices/[invoiceId]/pdf/__tests__/route.test.ts`

- [ ] **Step 1: Failing test**

```ts
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    invoices: { findUnique: jest.fn() },
  },
}));
jest.mock("@/lib/invoices/storage", () => ({
  getInvoicePdfPresignedUrl: jest.fn().mockResolvedValue("https://s3.example/x"),
}));

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { GET } from "../route";

const gs = getSession as jest.MockedFunction<typeof getSession>;
const fu = prismadb.users.findUnique as jest.MockedFunction<typeof prismadb.users.findUnique>;
const fi = prismadb.invoices.findUnique as jest.MockedFunction<typeof prismadb.invoices.findUnique>;

function req() {
  return new NextRequest("http://localhost/api/invoices/i1/pdf");
}

beforeEach(() => jest.clearAllMocks());

describe("GET /api/invoices/[invoiceId]/pdf", () => {
  it("401 unauth", async () => {
    gs.mockResolvedValue(null as any);
    const res = await GET(req(), { params: Promise.resolve({ invoiceId: "i1" }) });
    expect(res.status).toBe(401);
  });

  it("404 when user does not own the invoice", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    fi.mockResolvedValue({ createdBy: "other", status: "ISSUED", pdfStorageKey: "k" } as any);
    const res = await GET(req(), { params: Promise.resolve({ invoiceId: "i1" }) });
    expect(res.status).toBe(404);
  });

  it("404 when invoice not found", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    fi.mockResolvedValue(null);
    const res = await GET(req(), { params: Promise.resolve({ invoiceId: "i1" }) });
    expect(res.status).toBe(404);
  });

  it("creator gets redirect to presigned URL", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    fi.mockResolvedValue({ createdBy: "u", status: "ISSUED", pdfStorageKey: "k" } as any);
    const res = await GET(req(), { params: Promise.resolve({ invoiceId: "i1" }) });
    expect([302, 307]).toContain(res.status);
  });

  it("manager gets redirect for any invoice", async () => {
    gs.mockResolvedValue({ user: { id: "m" } } as any);
    fu.mockResolvedValue({ id: "m", role: "manager" } as any);
    fi.mockResolvedValue({ createdBy: "other", status: "ISSUED", pdfStorageKey: "k" } as any);
    const res = await GET(req(), { params: Promise.resolve({ invoiceId: "i1" }) });
    expect([302, 307]).toContain(res.status);
  });
});
```

- [ ] **Step 2: Run failing test**

- [ ] **Step 3: Patch route**

```ts
import { NextRequest, NextResponse } from "next/server";
import {
  requireAuthenticated,
  unauthorizedResponse,
  notFoundOrForbiddenResponse,
  AuthenticationError,
} from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { canReadInvoice, type InvoiceStatus } from "@/lib/invoices/permissions";
import { getInvoicePdfPresignedUrl } from "@/lib/invoices/storage";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await params;
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return unauthorizedResponse();
    throw e;
  }

  const invoice = await prismadb.invoices.findUnique({
    where: { id: invoiceId },
    select: { createdBy: true, status: true, pdfStorageKey: true },
  });
  if (!invoice) return notFoundOrForbiddenResponse();

  if (
    !canReadInvoice(
      { status: invoice.status as InvoiceStatus, createdBy: invoice.createdBy },
      { id: user.id, role: user.role },
    )
  ) {
    return notFoundOrForbiddenResponse();
  }

  if (!invoice.pdfStorageKey) {
    return NextResponse.json(
      { error: "PDF not yet generated. Issue the invoice first." },
      { status: 404 },
    );
  }

  const url = await getInvoicePdfPresignedUrl(invoice.pdfStorageKey);
  return NextResponse.redirect(url);
}
```

- [ ] **Step 4: Test → PASS, commit**

```bash
git add 'app/api/invoices/[invoiceId]/pdf/route.ts' 'app/api/invoices/[invoiceId]/pdf/__tests__/route.test.ts'
git commit -m "fix(api): require invoice read scope on PDF route"
```

---

## Task 5: Patch `duplicateInvoice`

**Files:**
- Modify: `actions/invoices/duplicate-invoice.ts`
- Create: `actions/invoices/__tests__/duplicate-invoice.test.ts`

`duplicateInvoice` currently has zero auth check. Add: `requireAuthenticated` + `canReadInvoice` on source + `assertCanWriteAccount` on the target accountId (since the duplicate copies `accountId` from source — user must still be authorized on it).

- [ ] **Step 1: Failing test**

```ts
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    invoices: { findUniqueOrThrow: jest.fn(), create: jest.fn() },
    crm_Accounts: { findFirst: jest.fn() },
  },
}));

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { duplicateInvoice } from "../duplicate-invoice";

const gs = getSession as jest.MockedFunction<typeof getSession>;
const fu = prismadb.users.findUnique as jest.MockedFunction<typeof prismadb.users.findUnique>;
const fi = prismadb.invoices.findUniqueOrThrow as jest.MockedFunction<typeof prismadb.invoices.findUniqueOrThrow>;
const fa = prismadb.crm_Accounts.findFirst as jest.MockedFunction<typeof prismadb.crm_Accounts.findFirst>;
const ci = prismadb.invoices.create as jest.MockedFunction<typeof prismadb.invoices.create>;

beforeEach(() => jest.clearAllMocks());

describe("duplicateInvoice", () => {
  it("throws when unauthenticated", async () => {
    gs.mockResolvedValue(null as any);
    await expect(duplicateInvoice("i1")).rejects.toThrow();
    expect(ci).not.toHaveBeenCalled();
  });

  it("throws when user cannot read source invoice", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    fi.mockResolvedValue({ id: "src", createdBy: "other", status: "ISSUED", accountId: "a1", lineItems: [] } as any);
    await expect(duplicateInvoice("i1")).rejects.toThrow(/forbidden/i);
    expect(ci).not.toHaveBeenCalled();
  });

  it("throws when user cannot write the copied accountId", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    fi.mockResolvedValue({ id: "src", createdBy: "u", status: "ISSUED", accountId: "a1", lineItems: [] } as any);
    fa.mockResolvedValue(null);
    await expect(duplicateInvoice("i1")).rejects.toThrow(/forbidden/i);
    expect(ci).not.toHaveBeenCalled();
  });

  it("succeeds when both checks pass", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    fi.mockResolvedValue({ id: "src", createdBy: "u", status: "ISSUED", accountId: "a1", lineItems: [], type: "INVOICE", currency: "USD", subtotal: "0", discountTotal: "0", vatTotal: "0", grandTotal: "0" } as any);
    fa.mockResolvedValue({ id: "a1" } as any);
    ci.mockResolvedValue({ id: "new" } as any);
    await duplicateInvoice("i1");
    expect(ci).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Failing test**

- [ ] **Step 3: Patch action**

`actions/invoices/duplicate-invoice.ts`:
```ts
"use server";
import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  assertCanWriteAccount,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import { canReadInvoice, type InvoiceStatus } from "@/lib/invoices/permissions";
import { serializeDecimals } from "@/lib/serialize-decimals";

export async function duplicateInvoice(invoiceId: string) {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) throw new Error("Unauthorized");
    throw e;
  }

  const source = await prismadb.invoices.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { lineItems: { orderBy: { position: "asc" } } },
  });

  if (
    !canReadInvoice(
      { status: source.status as InvoiceStatus, createdBy: source.createdBy },
      { id: user.id, role: user.role },
    )
  ) {
    throw new Error("Forbidden");
  }

  try {
    await assertCanWriteAccount(user, source.accountId);
  } catch (e) {
    if (e instanceof AuthorizationError) throw new Error("Forbidden");
    throw e;
  }

  const invoice = await prismadb.invoices.create({
    // ... same body as before, but createdBy = user.id
    data: {
      type: source.type,
      status: "DRAFT",
      createdBy: user.id,
      accountId: source.accountId,
      // ... rest unchanged from current implementation
      seriesId: source.seriesId,
      currency: source.currency,
      dueDate: source.dueDate,
      publicNotes: source.publicNotes,
      internalNotes: source.internalNotes,
      bankName: source.bankName,
      bankAccount: source.bankAccount,
      iban: source.iban,
      swift: source.swift,
      variableSymbol: source.variableSymbol,
      originalInvoiceId: source.id,
      subtotal: source.subtotal,
      discountTotal: source.discountTotal,
      vatTotal: source.vatTotal,
      grandTotal: source.grandTotal,
      balanceDue: source.grandTotal,
      lineItems: {
        create: source.lineItems.map((li) => ({
          position: li.position,
          productId: li.productId,
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          discountPercent: li.discountPercent,
          taxRateId: li.taxRateId,
          lineSubtotal: li.lineSubtotal,
          lineVat: li.lineVat,
          lineTotal: li.lineTotal,
        })),
      },
      activity: {
        create: { actorId: user.id, action: "DUPLICATED", meta: { sourceInvoiceId: invoiceId } },
      },
    },
  });

  return serializeDecimals(invoice);
}
```

- [ ] **Step 4: Test → PASS, commit**

```bash
git add actions/invoices/duplicate-invoice.ts actions/invoices/__tests__/duplicate-invoice.test.ts
git commit -m "fix(invoices): require read scope on source and write scope on accountId for duplicateInvoice"
```

---

## Task 6: Account-scope check on `createInvoice` and `updateInvoice`

**Files:**
- Modify: `actions/invoices/create-invoice.ts`
- Modify: `actions/invoices/update-invoice.ts`
- Create: `actions/invoices/__tests__/create-invoice-account-scope.test.ts`

- [ ] **Step 1: Failing test**

`actions/invoices/__tests__/create-invoice-account-scope.test.ts`:
```ts
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Accounts: { findFirst: jest.fn() },
    invoice_TaxRates: { findMany: jest.fn().mockResolvedValue([]) },
    invoices: { create: jest.fn() },
  },
}));

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { createInvoice } from "../create-invoice";

const gs = getSession as jest.MockedFunction<typeof getSession>;
const fu = prismadb.users.findUnique as jest.MockedFunction<typeof prismadb.users.findUnique>;
const fa = prismadb.crm_Accounts.findFirst as jest.MockedFunction<typeof prismadb.crm_Accounts.findFirst>;
const ci = prismadb.invoices.create as jest.MockedFunction<typeof prismadb.invoices.create>;

const validInput = {
  type: "INVOICE",
  accountId: "a1",
  currency: "USD",
  lineItems: [{ description: "x", quantity: 1, unitPrice: 100, discountPercent: 0 }],
};

beforeEach(() => jest.clearAllMocks());

describe("createInvoice account-scope", () => {
  it("throws when user has no access to accountId", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    fa.mockResolvedValue(null);
    await expect(createInvoice(validInput)).rejects.toThrow(/forbidden/i);
    expect(ci).not.toHaveBeenCalled();
  });

  it("succeeds for user owning the account", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    fa.mockResolvedValue({ id: "a1" } as any);
    ci.mockResolvedValue({ id: "new" } as any);
    await createInvoice(validInput);
    expect(ci).toHaveBeenCalledTimes(1);
  });

  it("manager can create against any account", async () => {
    gs.mockResolvedValue({ user: { id: "m" } } as any);
    fu.mockResolvedValue({ id: "m", role: "manager" } as any);
    fa.mockResolvedValue({ id: "a1" } as any);
    ci.mockResolvedValue({ id: "new" } as any);
    await createInvoice(validInput);
    expect(ci).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Failing test**

- [ ] **Step 3: Patch `create-invoice.ts`**

Replace the start of `createInvoice` body. After zod parse, before any DB write:
```ts
import {
  requireAuthenticated,
  assertCanWriteAccount,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export async function createInvoice(raw: unknown) {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) throw new Error("Unauthorized");
    throw e;
  }
  const input = createInvoiceSchema.parse(raw);

  try {
    await assertCanWriteAccount(user, input.accountId);
  } catch (e) {
    if (e instanceof AuthorizationError) throw new Error("Forbidden");
    throw e;
  }

  // ... rest of existing body, replace `user.id` references already done; ok
}
```

Remove the `getUser()` import — replaced by `requireAuthenticated`. Keep the `createdBy: user.id` line (now using AuthzUser's id).

- [ ] **Step 4: Patch `update-invoice.ts`**

In `update-invoice.ts`, after the existing `canEditInvoice` check, if `input.accountId` is present and differs from `existing.accountId` (we're reassigning), call `assertCanWriteAccount(user, input.accountId)`. Add the import. Wrap with the same `AuthorizationError → throw new Error("Forbidden")` shape.

```ts
// after canEditInvoice check:
if ("accountId" in input && input.accountId) {
  try {
    await assertCanWriteAccount(
      { id: user.id, role: mapLegacyRole(user.role) },
      input.accountId,
    );
  } catch (e) {
    if (e instanceof AuthorizationError) throw new Error("Forbidden");
    throw e;
  }
}
```

(`update-invoice.ts` still uses `getUser()` for the full Users row — that's fine; just convert to AuthzUser shape for the helper.)

- [ ] **Step 5: Run tests**

```bash
pnpm jest actions/invoices/__tests__/create-invoice-account-scope.test.ts
pnpm jest invoices 2>&1 | tail -10
```

- [ ] **Step 6: Commit**

```bash
git add actions/invoices/create-invoice.ts actions/invoices/update-invoice.ts actions/invoices/__tests__/create-invoice-account-scope.test.ts
git commit -m "fix(invoices): require account write scope on create and on accountId reassignment"
```

---

## Task 7: Switch `delete-payment` to canonical role

**Files:**
- Modify: `actions/invoices/delete-payment.ts`

Currently: `if (!user.is_admin) throw new Error(...)`. Switch to `requireRole(["admin"])` from `@/lib/authz`.

- [ ] **Step 1: Apply rewrite**

```ts
"use server";
import { prismadb } from "@/lib/prisma";
import {
  requireRole,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import { Decimal } from "decimal.js";

export async function deletePayment(paymentId: string) {
  let user;
  try {
    user = await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthenticationError) throw new Error("Unauthorized");
    if (e instanceof AuthorizationError) throw new Error("Only admins can delete payments");
    throw e;
  }
  // ... rest of existing transaction logic unchanged, using user.id
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm tsc --noEmit 2>&1 | grep delete-payment | head
git add actions/invoices/delete-payment.ts
git commit -m "refactor(invoices): require admin role on delete-payment via canonical helper"
```

---

## Task 8: Final verification

- [ ] **Step 1: Full suite**

```bash
pnpm jest 2>&1 | tail -8
```
Expected: B2 tests pass; existing invoice/lifecycle tests pass (or unchanged if pre-existing failure).

- [ ] **Step 2: Manual checklist on dev**

1. As `bob` (user, not invoice creator), `GET /api/invoices/<alice-invoice>/pdf` → 404
2. As `bob`, call `duplicateInvoice("<alice-invoice-id>")` via server action → throws Forbidden, no new invoice row
3. As `bob`, call `createInvoice({ accountId: "<alice-account>", ... })` → throws Forbidden
4. As `bob`, call `updateInvoice("<bob-invoice>", { accountId: "<alice-account>" })` → throws Forbidden
5. As `manager`, all four → succeed
6. As any non-admin, `deletePayment(...)` → throws "Only admins can delete payments"

- [ ] **Step 3: Push and PR**

```bash
git push -u origin feat/authz-phase-b2
gh pr create --base dev --head feat/authz-phase-b2 --title "fix(security): close invoice IDOR (Phase B2)" --body "..."
```

PR body references: spec §6.11/§7.6/§8.13, audit "Invoice PDF IDOR" / "Duplicate Invoice IDOR" / "Cross-object Invoice Account Binding", manual test results.

---

## Acceptance Criteria

- `lib/invoices/permissions.ts` is role-aware; manager and admin pass every gate.
- PDF route returns 404 to authenticated non-readers; pre-existing 404-when-PDF-not-generated behavior preserved.
- `duplicateInvoice` rejects requests where the user can't read the source OR can't write the copied accountId.
- `createInvoice` and `updateInvoice` reject when `accountId` is outside the user's account scope.
- `deletePayment` uses canonical `requireRole(["admin"])`.
- All invoice action call sites pass `{ id, role }` (no remaining `isAdmin` boolean usage in invoice flow).
- New tests cover the cross-user attack for PDF, duplicate, create-with-foreign-account.

## Out of B2 scope

- Read-side scoping for invoice list/detail (Phase D/E).
- Background workers (none for invoices).
- Removing `Users.is_admin` column (Phase F).
