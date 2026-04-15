# Invoices Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full Invoices module in nextcrm-app: create, issue, store PDFs in MinIO, link to CRM Accounts/Products, multi-currency, configurable VAT, search, payments, send-by-email.

**Architecture:** Pure-function domain layer in `lib/invoices/` (TDD-friendly), Prisma models, server actions in `actions/invoices/`, thin Next.js API routes, App Router pages under `app/[locale]/(routes)/invoices/`, admin pages under `app/[locale]/(routes)/admin/invoices/`. PDF rendered with `@react-pdf/renderer`, stored in MinIO via existing `lib/minio.ts`.

**Tech Stack:** Next.js 15 App Router, Prisma + Postgres, `@react-pdf/renderer`, MinIO, Resend, Zod, next-intl, shadcn/ui, Jest + Playwright.

**Spec:** `docs/superpowers/specs/2026-04-15-invoices-module-design.md`

**Branch:** all work on `dev` (per repo convention).

---

## File Map

### New files

```
prisma/migrations/<timestamp>_invoices_module/migration.sql

lib/invoices/
├── numbering.ts            # Pure number-format + DB counter txn
├── numbering.test.ts
├── totals.ts               # Decimal math: line/subtotal/VAT/grand
├── totals.test.ts
├── fx.ts                   # FX fetch + cache
├── fx.test.ts
├── permissions.ts          # canEdit / canIssue / canCancel / isAdmin
├── permissions.test.ts
├── search.ts               # ts_query builder
├── search.test.ts
├── storage.ts              # MinIO wrapper for invoice PDFs
├── pdf/render.ts           # @react-pdf/renderer entrypoint
├── pdf/templates/default-invoice.tsx
└── pdf/i18n.ts             # PDF string bundles EN/CZ

actions/invoices/
├── create-invoice.ts
├── update-invoice.ts
├── issue-invoice.ts
├── cancel-invoice.ts
├── duplicate-invoice.ts
├── add-payment.ts
├── delete-payment.ts
└── send-invoice-email.ts

app/api/invoices/
├── route.ts                          # GET list, POST create
├── search/route.ts
├── [invoiceId]/route.ts              # GET / PATCH / DELETE
├── [invoiceId]/issue/route.ts
├── [invoiceId]/cancel/route.ts
├── [invoiceId]/duplicate/route.ts
├── [invoiceId]/send/route.ts
├── [invoiceId]/pdf/route.ts
├── [invoiceId]/payments/route.ts
└── [invoiceId]/payments/[paymentId]/route.ts

app/api/admin/invoices/
├── tax-rates/route.ts
├── tax-rates/[id]/route.ts
├── series/route.ts
├── series/[id]/route.ts
├── currencies/route.ts
├── currencies/[code]/route.ts
└── settings/route.ts

app/[locale]/(routes)/invoices/
├── page.tsx
├── loading.tsx
├── components/
│   ├── invoices-table.tsx
│   ├── invoice-filters.tsx
│   ├── status-badge.tsx
│   ├── overdue-indicator.tsx
│   ├── invoice-form.tsx
│   ├── line-items-editor.tsx
│   ├── totals-panel.tsx
│   ├── payment-list.tsx
│   ├── add-payment-dialog.tsx
│   ├── activity-log.tsx
│   ├── send-email-dialog.tsx
│   └── upload-attachment-dialog.tsx
├── data/
│   └── get-invoice.ts
├── new/page.tsx
└── [invoiceId]/
    ├── page.tsx
    └── edit/page.tsx

app/[locale]/(routes)/admin/invoices/
├── tax-rates/page.tsx
├── series/page.tsx
├── currencies/page.tsx
└── settings/page.tsx

emails/invoice-email.tsx

messages/en.json   (modify: add "invoices" namespace)
messages/cz.json   (modify: add "invoices" namespace)

types/invoice.ts          # Shared TS types + Zod schemas

prisma/seeds/invoices.ts  # Default seed: currencies, default series, default tax rates, settings
```

### Modified files

- `prisma/schema.prisma` — add 9 new models + 2 enums
- `components/menu/sidebar.tsx` (or wherever sidebar nav array lives — confirm in Task 0)
- `messages/en.json`, `messages/cz.json`
- `lib/minio.ts` — only if it lacks helpers we need (review in Task 9)
- `prisma/seed.ts` — call new seed function

---

## Phase 0: Discovery & Setup

### Task 0.1: Locate sidebar component

**Files:**
- Inspect: sidebar / nav components

- [ ] **Step 1:** Find the file that holds the sidebar nav array

```bash
grep -rn "documents\|/crm" components/ app/ --include="*.tsx" | grep -iE "side|nav|menu" | head
```

- [ ] **Step 2:** Open the matched file, identify the array of nav items, note its shape (label key, href, icon).
- [ ] **Step 3:** Record the file path in a scratch note for Task 14.1.

### Task 0.2: Verify MinIO helpers

**Files:**
- Inspect: `lib/minio.ts`

- [ ] **Step 1:** Read `lib/minio.ts`. Confirm it exports a configured MinIO client. Note function names available (`putObject`, `getObject`, `presignedUrl`, etc.).
- [ ] **Step 2:** If a `presignedGetObject` helper is missing, plan to add one in Task 9.

### Task 0.3: Add to git

- [ ] **Step 1:** Confirm working tree clean except for unrelated files

```bash
git status
```

- [ ] **Step 2:** Create a new branch off `dev`

```bash
git checkout dev && git pull && git checkout -b feature/invoices-module
```

---

## Phase 1: Prisma Schema + Migration

### Task 1.1: Add enums + models to schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1:** Append the following at the end of `prisma/schema.prisma` (full block — see spec §4 for the canonical version):

```prisma
enum Invoice_Status {
  DRAFT
  ISSUED
  SENT
  PARTIALLY_PAID
  PAID
  OVERDUE
  CANCELLED
  DISPUTED
  REFUNDED
  WRITTEN_OFF
}

enum Invoice_Type {
  INVOICE
  CREDIT_NOTE
  PROFORMA
}

model Invoices {
  id                    String           @id @default(uuid()) @db.Uuid
  createdAt             DateTime         @default(now())
  updatedAt             DateTime         @updatedAt
  createdBy             String           @db.Uuid
  createdByUser         Users            @relation("InvoiceCreatedBy", fields: [createdBy], references: [id])

  type                  Invoice_Type     @default(INVOICE)
  status                Invoice_Status   @default(DRAFT)

  number                String?
  numberOverridden      Boolean          @default(false)
  seriesId              String?          @db.Uuid
  series                Invoice_Series?  @relation(fields: [seriesId], references: [id])

  accountId             String           @db.Uuid
  account               crm_Accounts     @relation(fields: [accountId], references: [id])
  billingSnapshot       Json?

  issueDate             DateTime?
  taxableSupplyDate     DateTime?
  dueDate               DateTime?

  currency              String           @db.VarChar(3)
  baseCurrency          String?          @db.VarChar(3)
  fxRateToBase          Decimal?         @db.Decimal(18, 8)

  subtotal              Decimal          @default(0) @db.Decimal(14, 2)
  discountTotal         Decimal          @default(0) @db.Decimal(14, 2)
  vatTotal              Decimal          @default(0) @db.Decimal(14, 2)
  grandTotal            Decimal          @default(0) @db.Decimal(14, 2)
  paidTotal             Decimal          @default(0) @db.Decimal(14, 2)
  balanceDue            Decimal          @default(0) @db.Decimal(14, 2)

  bankName              String?
  bankAccount           String?
  iban                  String?
  swift                 String?
  variableSymbol        String?

  publicNotes           String?
  internalNotes         String?

  originalInvoiceId     String?          @db.Uuid
  originalInvoice       Invoices?        @relation("CreditNoteOf", fields: [originalInvoiceId], references: [id])
  creditNotes           Invoices[]       @relation("CreditNoteOf")

  pdfStorageKey         String?
  pdfGeneratedAt        DateTime?

  lineItems             Invoice_LineItems[]
  payments              Invoice_Payments[]
  activity              Invoice_Activity[]
  attachments           Invoice_Attachments[]

  @@unique([seriesId, number])
  @@index([accountId])
  @@index([status])
  @@index([issueDate])
  @@index([dueDate])
}

model Invoice_LineItems {
  id              String     @id @default(uuid()) @db.Uuid
  invoiceId       String     @db.Uuid
  invoice         Invoices   @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  position        Int
  productId       String?    @db.Uuid
  product         crm_Products? @relation(fields: [productId], references: [id])
  description     String
  quantity        Decimal    @db.Decimal(14, 4)
  unitPrice       Decimal    @db.Decimal(14, 4)
  discountPercent Decimal    @default(0) @db.Decimal(5, 2)
  taxRateId       String?    @db.Uuid
  taxRate         Invoice_TaxRates? @relation(fields: [taxRateId], references: [id])
  taxRateSnapshot Decimal?   @db.Decimal(5, 2)
  lineSubtotal    Decimal    @db.Decimal(14, 2)
  lineVat         Decimal    @db.Decimal(14, 2)
  lineTotal       Decimal    @db.Decimal(14, 2)

  @@index([invoiceId])
}

model Invoice_Payments {
  id          String   @id @default(uuid()) @db.Uuid
  invoiceId   String   @db.Uuid
  invoice     Invoices @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  paidAt      DateTime
  amount      Decimal  @db.Decimal(14, 2)
  method      String?
  reference   String?
  note        String?
  createdBy   String   @db.Uuid
  createdAt   DateTime @default(now())

  @@index([invoiceId])
}

model Invoice_Attachments {
  id              String   @id @default(uuid()) @db.Uuid
  invoiceId       String   @db.Uuid
  invoice         Invoices @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  storageKey      String
  filename        String
  mimeType        String
  size            Int
  uploadedBy      String   @db.Uuid
  uploadedAt      DateTime @default(now())
  isPrimaryPdf    Boolean  @default(false)

  @@index([invoiceId])
}

model Invoice_Activity {
  id          String   @id @default(uuid()) @db.Uuid
  invoiceId   String   @db.Uuid
  invoice     Invoices @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  actorId     String   @db.Uuid
  action      String
  meta        Json?
  createdAt   DateTime @default(now())

  @@index([invoiceId])
}

model Invoice_TaxRates {
  id          String   @id @default(uuid()) @db.Uuid
  name        String
  rate        Decimal  @db.Decimal(5, 2)
  isDefault   Boolean  @default(false)
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  lineItems   Invoice_LineItems[]
}

model Invoice_Series {
  id              String   @id @default(uuid()) @db.Uuid
  name            String
  prefixTemplate  String
  resetPolicy     String   @default("YEARLY")
  currentYear     Int?
  counter         Int      @default(0)
  isDefault       Boolean  @default(false)
  active          Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  invoices        Invoices[]
}

model Invoice_Currencies {
  code        String   @id @db.VarChar(3)
  name        String
  symbol      String?
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
}

model Invoice_Settings {
  id                  String   @id @default(uuid()) @db.Uuid
  baseCurrency        String   @db.VarChar(3)
  defaultSeriesId     String?  @db.Uuid
  defaultTaxRateId    String?  @db.Uuid
  defaultDueDays      Int      @default(14)
  bankName            String?
  bankAccount         String?
  iban                String?
  swift               String?
  footerText          String?
  updatedAt           DateTime @updatedAt
}
```

- [ ] **Step 2:** Add inverse relations on existing models. Find `model crm_Accounts {` and `model crm_Products {` and `model Users {` and add the inverse relation fields:

In `crm_Accounts`:
```prisma
  invoices         Invoices[]
```

In `crm_Products`:
```prisma
  invoiceLineItems Invoice_LineItems[]
```

In `Users`:
```prisma
  createdInvoices  Invoices[] @relation("InvoiceCreatedBy")
```

- [ ] **Step 3:** Validate the schema

```bash
pnpm prisma validate
```
Expected: `The schema at prisma/schema.prisma is valid 🚀`

### Task 1.2: Generate migration

- [ ] **Step 1:** Run

```bash
pnpm prisma migrate dev --name invoices_module --create-only
```
Expected: a new file under `prisma/migrations/<timestamp>_invoices_module/migration.sql`.

- [ ] **Step 2:** Open the migration SQL and verify it only **adds** tables/columns/indexes. No DROP/ALTER on existing rows. (Database safety rule from CLAUDE.md.)

- [ ] **Step 3:** Apply locally

```bash
pnpm prisma migrate dev
```
Expected: migration applied, Prisma client regenerated.

### Task 1.3: Add tsvector + trigger for search

**Files:**
- Create: `prisma/migrations/<timestamp>_invoices_search/migration.sql`

- [ ] **Step 1:** Create a follow-up migration manually

```bash
mkdir -p prisma/migrations/$(date -u +%Y%m%d%H%M%S)_invoices_search && \
  touch prisma/migrations/$(ls prisma/migrations | grep invoices_search | tail -1)/migration.sql
```

- [ ] **Step 2:** Write into the new migration file:

```sql
ALTER TABLE "Invoices" ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS invoices_search_vector_idx
  ON "Invoices" USING GIN (search_vector);

CREATE OR REPLACE FUNCTION invoices_search_vector_update() RETURNS trigger AS $$
DECLARE
  line_text text;
BEGIN
  SELECT string_agg(description, ' ') INTO line_text
    FROM "Invoice_LineItems" WHERE "invoiceId" = NEW.id;

  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.number, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW."billingSnapshot"->>'name', '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW."billingSnapshot"->>'vat_id', '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(line_text, '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invoices_search_vector_trg ON "Invoices";
CREATE TRIGGER invoices_search_vector_trg
  BEFORE INSERT OR UPDATE ON "Invoices"
  FOR EACH ROW EXECUTE FUNCTION invoices_search_vector_update();
```

- [ ] **Step 3:** Apply

```bash
pnpm prisma migrate dev
```

- [ ] **Step 4:** Mark `searchVector` as `Unsupported("tsvector")?` in the `Invoices` Prisma model so Prisma ignores it on writes:

```prisma
  searchVector Unsupported("tsvector")?  @map("search_vector")
```

Then re-run validate (no migration needed — column already exists).

### Task 1.4: Commit Phase 1

- [ ] **Step 1:**

```bash
git add prisma/ && \
git commit -m "feat(invoices): add Prisma schema, migration, and search tsvector"
```

---

## Phase 2: Domain Library (Pure Functions, TDD)

### Task 2.1: Totals — line item math

**Files:**
- Create: `lib/invoices/totals.ts`
- Test: `lib/invoices/totals.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// lib/invoices/totals.test.ts
import { Decimal } from "decimal.js";
import { computeLineTotal, computeInvoiceTotals } from "./totals";

describe("computeLineTotal", () => {
  it("computes a simple line with no discount and 21% VAT", () => {
    const result = computeLineTotal({
      quantity: new Decimal(2),
      unitPrice: new Decimal(100),
      discountPercent: new Decimal(0),
      taxRate: new Decimal(21),
    });
    expect(result.lineSubtotal.toString()).toBe("200.00");
    expect(result.lineVat.toString()).toBe("42.00");
    expect(result.lineTotal.toString()).toBe("242.00");
  });

  it("applies discount before VAT", () => {
    const result = computeLineTotal({
      quantity: new Decimal(1),
      unitPrice: new Decimal(100),
      discountPercent: new Decimal(10),
      taxRate: new Decimal(21),
    });
    expect(result.lineSubtotal.toString()).toBe("90.00");
    expect(result.lineVat.toString()).toBe("18.90");
  });

  it("handles zero tax rate", () => {
    const result = computeLineTotal({
      quantity: new Decimal(1),
      unitPrice: new Decimal(50),
      discountPercent: new Decimal(0),
      taxRate: new Decimal(0),
    });
    expect(result.lineVat.toString()).toBe("0.00");
    expect(result.lineTotal.toString()).toBe("50.00");
  });
});

describe("computeInvoiceTotals", () => {
  it("aggregates lines with mixed VAT rates", () => {
    const result = computeInvoiceTotals([
      { quantity: new Decimal(1), unitPrice: new Decimal(100), discountPercent: new Decimal(0), taxRate: new Decimal(21) },
      { quantity: new Decimal(1), unitPrice: new Decimal(50), discountPercent: new Decimal(0), taxRate: new Decimal(12) },
    ]);
    expect(result.subtotal.toString()).toBe("150.00");
    expect(result.vatTotal.toString()).toBe("27.00"); // 21 + 6
    expect(result.grandTotal.toString()).toBe("177.00");
    expect(result.vatBreakdown).toEqual([
      { rate: "21", base: "100.00", vat: "21.00" },
      { rate: "12", base: "50.00", vat: "6.00" },
    ]);
  });
});
```

- [ ] **Step 2: Run, verify it fails**

```bash
pnpm test lib/invoices/totals.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// lib/invoices/totals.ts
import { Decimal } from "decimal.js";

export interface LineInput {
  quantity: Decimal;
  unitPrice: Decimal;
  discountPercent: Decimal;
  taxRate: Decimal;
}

export interface LineTotal {
  lineSubtotal: Decimal;
  lineVat: Decimal;
  lineTotal: Decimal;
}

const TWO_DP = 2;

export function computeLineTotal(line: LineInput): LineTotal {
  const gross = line.quantity.mul(line.unitPrice);
  const discount = gross.mul(line.discountPercent).div(100);
  const lineSubtotal = gross.sub(discount).toDecimalPlaces(TWO_DP);
  const lineVat = lineSubtotal.mul(line.taxRate).div(100).toDecimalPlaces(TWO_DP);
  const lineTotal = lineSubtotal.add(lineVat).toDecimalPlaces(TWO_DP);
  return { lineSubtotal, lineVat, lineTotal };
}

export interface VatBucket {
  rate: string;
  base: string;
  vat: string;
}

export interface InvoiceTotals {
  subtotal: Decimal;
  discountTotal: Decimal;
  vatTotal: Decimal;
  grandTotal: Decimal;
  vatBreakdown: VatBucket[];
}

export function computeInvoiceTotals(lines: LineInput[]): InvoiceTotals {
  let subtotal = new Decimal(0);
  let vatTotal = new Decimal(0);
  let discountTotal = new Decimal(0);
  const buckets = new Map<string, { base: Decimal; vat: Decimal }>();

  for (const line of lines) {
    const { lineSubtotal, lineVat } = computeLineTotal(line);
    subtotal = subtotal.add(lineSubtotal);
    vatTotal = vatTotal.add(lineVat);
    discountTotal = discountTotal.add(
      line.quantity.mul(line.unitPrice).mul(line.discountPercent).div(100),
    );
    const key = line.taxRate.toString();
    const bucket = buckets.get(key) ?? { base: new Decimal(0), vat: new Decimal(0) };
    bucket.base = bucket.base.add(lineSubtotal);
    bucket.vat = bucket.vat.add(lineVat);
    buckets.set(key, bucket);
  }

  const vatBreakdown: VatBucket[] = Array.from(buckets.entries()).map(([rate, b]) => ({
    rate,
    base: b.base.toDecimalPlaces(TWO_DP).toString(),
    vat: b.vat.toDecimalPlaces(TWO_DP).toString(),
  }));

  return {
    subtotal: subtotal.toDecimalPlaces(TWO_DP),
    discountTotal: discountTotal.toDecimalPlaces(TWO_DP),
    vatTotal: vatTotal.toDecimalPlaces(TWO_DP),
    grandTotal: subtotal.add(vatTotal).toDecimalPlaces(TWO_DP),
    vatBreakdown,
  };
}
```

- [ ] **Step 4:** Install `decimal.js` if not present

```bash
pnpm add decimal.js
```

- [ ] **Step 5: Run, verify pass**

```bash
pnpm test lib/invoices/totals.test.ts
```
Expected: 4 passed.

- [ ] **Step 6: Commit**

```bash
git add lib/invoices/totals.ts lib/invoices/totals.test.ts package.json pnpm-lock.yaml && \
git commit -m "feat(invoices): add totals computation with mixed VAT support"
```

### Task 2.2: Numbering — format template + counter

**Files:**
- Create: `lib/invoices/numbering.ts`
- Test: `lib/invoices/numbering.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// lib/invoices/numbering.test.ts
import { formatNumber } from "./numbering";

describe("formatNumber", () => {
  it("substitutes year and zero-padded counter", () => {
    expect(formatNumber("INV-{YYYY}-{####}", 2026, 7)).toBe("INV-2026-0007");
  });

  it("supports 6 digit counter", () => {
    expect(formatNumber("{YYYY}/{######}", 2026, 42)).toBe("2026/000042");
  });

  it("supports a prefix without year", () => {
    expect(formatNumber("INV-{####}", 2026, 1)).toBe("INV-0001");
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

```bash
pnpm test lib/invoices/numbering.test.ts
```

- [ ] **Step 3: Implement**

```typescript
// lib/invoices/numbering.ts
export function formatNumber(template: string, year: number, counter: number): string {
  return template
    .replace(/\{YYYY\}/g, String(year))
    .replace(/\{(#+)\}/g, (_, hashes: string) => String(counter).padStart(hashes.length, "0"));
}

import type { PrismaClient } from "@prisma/client";

export async function consumeNextNumber(
  tx: Pick<PrismaClient, "invoice_Series">,
  seriesId: string,
  now: Date = new Date(),
): Promise<{ number: string; seriesId: string }> {
  const series = await tx.invoice_Series.findUniqueOrThrow({ where: { id: seriesId } });
  const year = now.getUTCFullYear();
  let counter = series.counter;
  if (series.resetPolicy === "YEARLY" && series.currentYear !== year) {
    counter = 0;
  }
  counter += 1;
  await tx.invoice_Series.update({
    where: { id: seriesId },
    data: { counter, currentYear: year },
  });
  return { number: formatNumber(series.prefixTemplate, year, counter), seriesId };
}
```

- [ ] **Step 4: Run, verify pass**

```bash
pnpm test lib/invoices/numbering.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add lib/invoices/numbering.ts lib/invoices/numbering.test.ts && \
git commit -m "feat(invoices): add numbering format template + counter consumer"
```

### Task 2.3: FX — fetch + cache exchange rate

**Files:**
- Create: `lib/invoices/fx.ts`
- Test: `lib/invoices/fx.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// lib/invoices/fx.test.ts
import { fetchFxRate } from "./fx";

describe("fetchFxRate", () => {
  it("returns 1 when from === to", async () => {
    const rate = await fetchFxRate("USD", "USD");
    expect(rate.toString()).toBe("1");
  });

  it("returns a positive number from frankfurter.app for EUR->USD", async () => {
    const rate = await fetchFxRate("EUR", "USD");
    expect(Number(rate.toString())).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Implement**

```typescript
// lib/invoices/fx.ts
import { Decimal } from "decimal.js";

export async function fetchFxRate(from: string, to: string, on?: Date): Promise<Decimal> {
  if (from === to) return new Decimal(1);
  const date = on ? on.toISOString().slice(0, 10) : "latest";
  const url = `https://api.frankfurter.app/${date}?from=${from}&to=${to}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`FX fetch failed: ${res.status}`);
  const json = (await res.json()) as { rates: Record<string, number> };
  const rate = json.rates[to];
  if (rate == null) throw new Error(`FX rate ${from}->${to} not found`);
  return new Decimal(rate);
}
```

- [ ] **Step 3: Run** (network test — mark `it.skip` for the network call if CI runs offline)

```bash
pnpm test lib/invoices/fx.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add lib/invoices/fx.ts lib/invoices/fx.test.ts && \
git commit -m "feat(invoices): fetch FX rates via frankfurter.app"
```

### Task 2.4: Permissions

**Files:**
- Create: `lib/invoices/permissions.ts`
- Test: `lib/invoices/permissions.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// lib/invoices/permissions.test.ts
import { canEditInvoice, canIssueInvoice, isInvoiceImmutable } from "./permissions";

const baseUser = { id: "u1", isAdmin: false };
const adminUser = { id: "admin", isAdmin: true };

describe("canEditInvoice", () => {
  it("creator can edit DRAFT", () => {
    expect(canEditInvoice({ status: "DRAFT", createdBy: "u1" }, baseUser)).toBe(true);
  });
  it("non-creator cannot edit DRAFT", () => {
    expect(canEditInvoice({ status: "DRAFT", createdBy: "u2" }, baseUser)).toBe(false);
  });
  it("admin can edit any DRAFT", () => {
    expect(canEditInvoice({ status: "DRAFT", createdBy: "u2" }, adminUser)).toBe(true);
  });
  it("nobody can edit ISSUED", () => {
    expect(canEditInvoice({ status: "ISSUED", createdBy: "u1" }, adminUser)).toBe(false);
  });
});

describe("canIssueInvoice", () => {
  it("creator can issue own DRAFT", () => {
    expect(canIssueInvoice({ status: "DRAFT", createdBy: "u1" }, baseUser)).toBe(true);
  });
  it("cannot issue non-DRAFT", () => {
    expect(canIssueInvoice({ status: "ISSUED", createdBy: "u1" }, baseUser)).toBe(false);
  });
});

describe("isInvoiceImmutable", () => {
  it("DRAFT is mutable", () => {
    expect(isInvoiceImmutable("DRAFT")).toBe(false);
  });
  it.each(["ISSUED", "SENT", "PAID", "PARTIALLY_PAID", "CANCELLED"] as const)("%s is immutable", (s) => {
    expect(isInvoiceImmutable(s)).toBe(true);
  });
});
```

- [ ] **Step 2: Implement**

```typescript
// lib/invoices/permissions.ts
export type InvoiceStatus =
  | "DRAFT" | "ISSUED" | "SENT" | "PARTIALLY_PAID" | "PAID"
  | "OVERDUE" | "CANCELLED" | "DISPUTED" | "REFUNDED" | "WRITTEN_OFF";

interface UserCtx { id: string; isAdmin: boolean; }
interface InvoiceCtx { status: InvoiceStatus; createdBy: string; }

export function isInvoiceImmutable(status: InvoiceStatus): boolean {
  return status !== "DRAFT";
}

export function canEditInvoice(invoice: InvoiceCtx, user: UserCtx): boolean {
  if (isInvoiceImmutable(invoice.status)) return false;
  return user.isAdmin || invoice.createdBy === user.id;
}

export function canIssueInvoice(invoice: InvoiceCtx, user: UserCtx): boolean {
  if (invoice.status !== "DRAFT") return false;
  return user.isAdmin || invoice.createdBy === user.id;
}

export function canCancelInvoice(invoice: InvoiceCtx, user: UserCtx): boolean {
  if (invoice.status !== "DRAFT") return false;
  return user.isAdmin || invoice.createdBy === user.id;
}

export function canAddPayment(invoice: InvoiceCtx, user: UserCtx): boolean {
  const allowed: InvoiceStatus[] = ["ISSUED", "SENT", "PARTIALLY_PAID", "OVERDUE"];
  if (!allowed.includes(invoice.status)) return false;
  return user.isAdmin || invoice.createdBy === user.id;
}
```

- [ ] **Step 3: Run, verify pass**
- [ ] **Step 4: Commit**

```bash
git add lib/invoices/permissions.ts lib/invoices/permissions.test.ts && \
git commit -m "feat(invoices): add permission guards"
```

### Task 2.5: Search query builder

**Files:**
- Create: `lib/invoices/search.ts`
- Test: `lib/invoices/search.test.ts`

- [ ] **Step 1: Write test**

```typescript
import { buildSearchWhere } from "./search";

describe("buildSearchWhere", () => {
  it("returns empty when no filters", () => {
    expect(buildSearchWhere({})).toEqual({});
  });
  it("includes status filter", () => {
    const where = buildSearchWhere({ status: ["ISSUED", "PAID"] });
    expect(where.status).toEqual({ in: ["ISSUED", "PAID"] });
  });
  it("includes account filter", () => {
    expect(buildSearchWhere({ accountId: "a1" }).accountId).toBe("a1");
  });
  it("includes date range", () => {
    const w = buildSearchWhere({ issueFrom: new Date("2026-01-01"), issueTo: new Date("2026-12-31") });
    expect(w.issueDate).toEqual({ gte: new Date("2026-01-01"), lte: new Date("2026-12-31") });
  });
});
```

- [ ] **Step 2: Implement**

```typescript
// lib/invoices/search.ts
import type { Prisma } from "@prisma/client";
import type { InvoiceStatus } from "./permissions";

export interface SearchFilters {
  status?: InvoiceStatus[];
  accountId?: string;
  seriesId?: string;
  currency?: string;
  issueFrom?: Date;
  issueTo?: Date;
  amountMin?: number;
  amountMax?: number;
}

export function buildSearchWhere(f: SearchFilters): Prisma.InvoicesWhereInput {
  const where: Prisma.InvoicesWhereInput = {};
  if (f.status?.length) where.status = { in: f.status as any };
  if (f.accountId) where.accountId = f.accountId;
  if (f.seriesId) where.seriesId = f.seriesId;
  if (f.currency) where.currency = f.currency;
  if (f.issueFrom || f.issueTo) {
    where.issueDate = {};
    if (f.issueFrom) (where.issueDate as any).gte = f.issueFrom;
    if (f.issueTo) (where.issueDate as any).lte = f.issueTo;
  }
  if (f.amountMin != null || f.amountMax != null) {
    where.grandTotal = {};
    if (f.amountMin != null) (where.grandTotal as any).gte = f.amountMin;
    if (f.amountMax != null) (where.grandTotal as any).lte = f.amountMax;
  }
  return where;
}

export function buildFullTextSql(query: string): string {
  // returns a parameterized fragment. caller uses Prisma.$queryRaw with this.
  return `search_vector @@ plainto_tsquery('simple', $1)`;
}
```

- [ ] **Step 3: Run + commit**

```bash
git add lib/invoices/search.ts lib/invoices/search.test.ts && \
git commit -m "feat(invoices): add search filter + tsquery builder"
```

---

## Phase 3: Storage + PDF Rendering

### Task 3.1: Storage wrapper

**Files:**
- Create: `lib/invoices/storage.ts`

- [ ] **Step 1:** Read `lib/minio.ts` (recorded in Task 0.2). If it exposes a default `Client`, use it. Otherwise use the same env vars.

- [ ] **Step 2: Implement**

```typescript
// lib/invoices/storage.ts
import { minioClient } from "@/lib/minio";

const BUCKET = process.env.MINIO_BUCKET ?? "nextcrm";

function invoiceKey(invoiceId: string) {
  return `invoices/${invoiceId}.pdf`;
}

export async function uploadInvoicePdf(invoiceId: string, pdf: Buffer): Promise<string> {
  const key = invoiceKey(invoiceId);
  await minioClient.putObject(BUCKET, key, pdf, pdf.length, {
    "Content-Type": "application/pdf",
  });
  return key;
}

export async function getInvoicePdfStream(key: string) {
  return minioClient.getObject(BUCKET, key);
}

export async function getInvoicePdfPresignedUrl(key: string, expirySeconds = 300): Promise<string> {
  return minioClient.presignedGetObject(BUCKET, key, expirySeconds);
}

export async function uploadInvoiceAttachment(
  invoiceId: string,
  attachmentId: string,
  buf: Buffer,
  mime: string,
): Promise<string> {
  const key = `invoices/${invoiceId}/attachments/${attachmentId}`;
  await minioClient.putObject(BUCKET, key, buf, buf.length, { "Content-Type": mime });
  return key;
}
```

- [ ] **Step 3:** If `lib/minio.ts` does not export `minioClient`, add an export there for it (without changing existing behavior).

- [ ] **Step 4: Commit**

```bash
git add lib/invoices/storage.ts lib/minio.ts && \
git commit -m "feat(invoices): MinIO storage wrapper for invoice PDFs"
```

### Task 3.2: PDF i18n bundle

**Files:**
- Create: `lib/invoices/pdf/i18n.ts`

- [ ] **Step 1: Implement**

```typescript
// lib/invoices/pdf/i18n.ts
export type PdfLocale = "en" | "cz";

export const PDF_STRINGS = {
  en: {
    invoice: "Invoice",
    creditNote: "Credit note",
    proforma: "Pro forma",
    issueDate: "Issue date",
    dueDate: "Due date",
    taxableSupplyDate: "Date of taxable supply",
    supplier: "Supplier",
    customer: "Customer",
    vatId: "VAT ID",
    regId: "Reg. ID",
    description: "Description",
    qty: "Qty",
    unitPrice: "Unit price",
    discount: "Disc.",
    vat: "VAT",
    lineTotal: "Total",
    subtotal: "Subtotal",
    vatTotal: "VAT total",
    grandTotal: "Grand total",
    paymentInstructions: "Payment instructions",
    bank: "Bank",
    iban: "IBAN",
    swift: "SWIFT",
    variableSymbol: "Variable symbol",
    page: "Page",
    of: "of",
  },
  cz: {
    invoice: "Faktura",
    creditNote: "Dobropis",
    proforma: "Zálohová faktura",
    issueDate: "Datum vystavení",
    dueDate: "Datum splatnosti",
    taxableSupplyDate: "DUZP",
    supplier: "Dodavatel",
    customer: "Odběratel",
    vatId: "DIČ",
    regId: "IČ",
    description: "Popis",
    qty: "Množ.",
    unitPrice: "Cena",
    discount: "Sleva",
    vat: "DPH",
    lineTotal: "Celkem",
    subtotal: "Mezisoučet",
    vatTotal: "DPH celkem",
    grandTotal: "Celkem k úhradě",
    paymentInstructions: "Platební údaje",
    bank: "Banka",
    iban: "IBAN",
    swift: "SWIFT",
    variableSymbol: "Variabilní symbol",
    page: "Strana",
    of: "z",
  },
} as const;
```

### Task 3.3: PDF template

**Files:**
- Create: `lib/invoices/pdf/templates/default-invoice.tsx`

- [ ] **Step 1: Implement** (use `@react-pdf/renderer` — the lib is already installed)

```tsx
// lib/invoices/pdf/templates/default-invoice.tsx
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { PDF_STRINGS, type PdfLocale } from "../i18n";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica" },
  h1: { fontSize: 18, marginBottom: 12, fontFamily: "Helvetica-Bold" },
  twoCol: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  col: { width: "48%" },
  label: { color: "#666", fontSize: 9 },
  value: { marginBottom: 4 },
  table: { marginTop: 8, borderTopWidth: 1, borderColor: "#ddd" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#eee", paddingVertical: 4 },
  cellDesc: { width: "40%" },
  cellQty: { width: "10%", textAlign: "right" },
  cellPrice: { width: "15%", textAlign: "right" },
  cellVat: { width: "10%", textAlign: "right" },
  cellTotal: { width: "25%", textAlign: "right" },
  totals: { marginTop: 12, alignSelf: "flex-end", width: "40%" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  grand: { fontFamily: "Helvetica-Bold", borderTopWidth: 1, borderColor: "#000", marginTop: 4, paddingTop: 4 },
  footer: { marginTop: 24, paddingTop: 8, borderTopWidth: 1, borderColor: "#ddd", fontSize: 9, color: "#444" },
});

export interface InvoicePdfData {
  number: string;
  type: "INVOICE" | "CREDIT_NOTE" | "PROFORMA";
  issueDate: string;
  taxableSupplyDate?: string;
  dueDate: string;
  currency: string;
  supplier: { name: string; address: string; vatId?: string; regId?: string };
  customer: { name: string; address: string; vatId?: string; regId?: string };
  lines: Array<{
    description: string;
    quantity: string;
    unitPrice: string;
    discountPercent: string;
    vatRate: string;
    lineTotal: string;
  }>;
  totals: {
    subtotal: string;
    vatTotal: string;
    grandTotal: string;
    vatBreakdown: Array<{ rate: string; base: string; vat: string }>;
  };
  payment: { bank?: string; iban?: string; swift?: string; variableSymbol?: string };
  publicNotes?: string;
  locale: PdfLocale;
}

export function InvoicePdf({ data }: { data: InvoicePdfData }) {
  const t = PDF_STRINGS[data.locale];
  const title = data.type === "CREDIT_NOTE" ? t.creditNote : data.type === "PROFORMA" ? t.proforma : t.invoice;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>{title} {data.number}</Text>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.label}>{t.supplier}</Text>
            <Text style={styles.value}>{data.supplier.name}</Text>
            <Text>{data.supplier.address}</Text>
            {data.supplier.vatId && <Text>{t.vatId}: {data.supplier.vatId}</Text>}
            {data.supplier.regId && <Text>{t.regId}: {data.supplier.regId}</Text>}
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>{t.customer}</Text>
            <Text style={styles.value}>{data.customer.name}</Text>
            <Text>{data.customer.address}</Text>
            {data.customer.vatId && <Text>{t.vatId}: {data.customer.vatId}</Text>}
            {data.customer.regId && <Text>{t.regId}: {data.customer.regId}</Text>}
          </View>
        </View>

        <View style={styles.twoCol}>
          <Text>{t.issueDate}: {data.issueDate}</Text>
          {data.taxableSupplyDate && <Text>{t.taxableSupplyDate}: {data.taxableSupplyDate}</Text>}
          <Text>{t.dueDate}: {data.dueDate}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.row}>
            <Text style={styles.cellDesc}>{t.description}</Text>
            <Text style={styles.cellQty}>{t.qty}</Text>
            <Text style={styles.cellPrice}>{t.unitPrice}</Text>
            <Text style={styles.cellVat}>{t.vat}%</Text>
            <Text style={styles.cellTotal}>{t.lineTotal}</Text>
          </View>
          {data.lines.map((line, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.cellDesc}>{line.description}</Text>
              <Text style={styles.cellQty}>{line.quantity}</Text>
              <Text style={styles.cellPrice}>{line.unitPrice}</Text>
              <Text style={styles.cellVat}>{line.vatRate}</Text>
              <Text style={styles.cellTotal}>{line.lineTotal} {data.currency}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}><Text>{t.subtotal}</Text><Text>{data.totals.subtotal} {data.currency}</Text></View>
          {data.totals.vatBreakdown.map((b, i) => (
            <View key={i} style={styles.totalRow}>
              <Text>{t.vat} {b.rate}% ({b.base})</Text>
              <Text>{b.vat} {data.currency}</Text>
            </View>
          ))}
          <View style={[styles.totalRow, styles.grand]}>
            <Text>{t.grandTotal}</Text>
            <Text>{data.totals.grandTotal} {data.currency}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>{t.paymentInstructions}</Text>
          {data.payment.bank && <Text>{t.bank}: {data.payment.bank}</Text>}
          {data.payment.iban && <Text>{t.iban}: {data.payment.iban}</Text>}
          {data.payment.swift && <Text>{t.swift}: {data.payment.swift}</Text>}
          {data.payment.variableSymbol && <Text>{t.variableSymbol}: {data.payment.variableSymbol}</Text>}
          {data.publicNotes && <Text style={{ marginTop: 8 }}>{data.publicNotes}</Text>}
        </View>
      </Page>
    </Document>
  );
}
```

### Task 3.4: PDF render entry

**Files:**
- Create: `lib/invoices/pdf/render.ts`

- [ ] **Step 1: Implement**

```typescript
// lib/invoices/pdf/render.ts
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePdf, type InvoicePdfData } from "./templates/default-invoice";

export async function renderInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  return renderToBuffer(<InvoicePdf data={data} />);
}
```

- [ ] **Step 2:** Rename to `.tsx` since it contains JSX:

```bash
mv lib/invoices/pdf/render.ts lib/invoices/pdf/render.tsx
```

- [ ] **Step 3: Commit**

```bash
git add lib/invoices/pdf/ && \
git commit -m "feat(invoices): PDF template + render entry"
```

---

## Phase 4: Seed Defaults

### Task 4.1: Seed currencies, default series, default tax rates, settings

**Files:**
- Create: `prisma/seeds/invoices.ts`
- Modify: `prisma/seed.ts` (or whatever the seed entry is — confirm with `cat package.json | grep prisma`)

- [ ] **Step 1: Implement**

```typescript
// prisma/seeds/invoices.ts
import { PrismaClient } from "@prisma/client";

const CURRENCIES: Array<[string, string, string]> = [
  ["USD", "US Dollar", "$"],
  ["EUR", "Euro", "€"],
  ["GBP", "British Pound", "£"],
  ["CZK", "Czech Koruna", "Kč"],
  ["CHF", "Swiss Franc", "CHF"],
  ["JPY", "Japanese Yen", "¥"],
  ["CNY", "Chinese Yuan", "¥"],
  ["AUD", "Australian Dollar", "A$"],
  ["CAD", "Canadian Dollar", "C$"],
  ["PLN", "Polish Zloty", "zł"],
];

export async function seedInvoices(db: PrismaClient) {
  for (const [code, name, symbol] of CURRENCIES) {
    await db.invoice_Currencies.upsert({
      where: { code },
      update: {},
      create: { code, name, symbol },
    });
  }

  const series = await db.invoice_Series.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Main",
      prefixTemplate: "INV-{YYYY}-{####}",
      isDefault: true,
    },
  });

  const taxRate = await db.invoice_TaxRates.upsert({
    where: { id: "00000000-0000-0000-0000-000000000002" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Standard 21%",
      rate: 21,
      isDefault: true,
    },
  });

  for (const [name, rate] of [["Reduced 12%", 12], ["Zero", 0]] as const) {
    await db.invoice_TaxRates.upsert({
      where: { id: `00000000-0000-0000-0000-${rate.toString().padStart(12, "0")}` },
      update: {},
      create: {
        id: `00000000-0000-0000-0000-${rate.toString().padStart(12, "0")}`,
        name,
        rate,
      },
    });
  }

  const existingSettings = await db.invoice_Settings.findFirst();
  if (!existingSettings) {
    await db.invoice_Settings.create({
      data: {
        baseCurrency: "USD",
        defaultSeriesId: series.id,
        defaultTaxRateId: taxRate.id,
        defaultDueDays: 14,
      },
    });
  }
}
```

- [ ] **Step 2:** In the existing seed entry file, add at the end:

```typescript
import { seedInvoices } from "./seeds/invoices";
// ... in main()
await seedInvoices(prisma);
```

- [ ] **Step 3:** Run

```bash
pnpm prisma db seed
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/seeds/invoices.ts prisma/seed.ts && \
git commit -m "feat(invoices): seed currencies, default series, tax rates, settings"
```

---

## Phase 5: Types + Zod schemas

### Task 5.1: Shared types

**Files:**
- Create: `types/invoice.ts`

- [ ] **Step 1: Implement**

```typescript
// types/invoice.ts
import { z } from "zod";

export const lineItemInputSchema = z.object({
  productId: z.string().uuid().nullable().optional(),
  description: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative(),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  taxRateId: z.string().uuid().nullable().optional(),
});

export const createInvoiceSchema = z.object({
  type: z.enum(["INVOICE", "CREDIT_NOTE", "PROFORMA"]).default("INVOICE"),
  accountId: z.string().uuid(),
  seriesId: z.string().uuid().optional(),
  currency: z.string().length(3),
  dueDate: z.coerce.date().optional(),
  publicNotes: z.string().optional(),
  internalNotes: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  iban: z.string().optional(),
  swift: z.string().optional(),
  variableSymbol: z.string().optional(),
  originalInvoiceId: z.string().uuid().optional(),
  lineItems: z.array(lineItemInputSchema).min(1),
});

export const updateInvoiceSchema = createInvoiceSchema.partial();

export const issueInvoiceSchema = z.object({
  numberOverride: z.string().optional(),
  taxableSupplyDate: z.coerce.date().optional(),
});

export const addPaymentSchema = z.object({
  paidAt: z.coerce.date(),
  amount: z.coerce.number().positive(),
  method: z.string().optional(),
  reference: z.string().optional(),
  note: z.string().optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type IssueInvoiceInput = z.infer<typeof issueInvoiceSchema>;
export type AddPaymentInput = z.infer<typeof addPaymentSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add types/invoice.ts && \
git commit -m "feat(invoices): Zod schemas + shared types"
```

---

## Phase 6: Server Actions

### Task 6.1: createInvoice

**Files:**
- Create: `actions/invoices/create-invoice.ts`

- [ ] **Step 1: Implement**

```typescript
// actions/invoices/create-invoice.ts
"use server";
import { Decimal } from "decimal.js";
import prisma from "@/lib/prisma";
import { computeInvoiceTotals, computeLineTotal } from "@/lib/invoices/totals";
import { createInvoiceSchema, type CreateInvoiceInput } from "@/types/invoice";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function createInvoice(raw: unknown) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  const input: CreateInvoiceInput = createInvoiceSchema.parse(raw);

  const taxRates = await prisma.invoice_TaxRates.findMany({
    where: { id: { in: input.lineItems.map((l) => l.taxRateId).filter(Boolean) as string[] } },
  });
  const rateMap = new Map(taxRates.map((t) => [t.id, new Decimal(t.rate.toString())]));

  const lineInputs = input.lineItems.map((l) => ({
    quantity: new Decimal(l.quantity),
    unitPrice: new Decimal(l.unitPrice),
    discountPercent: new Decimal(l.discountPercent),
    taxRate: l.taxRateId ? (rateMap.get(l.taxRateId) ?? new Decimal(0)) : new Decimal(0),
  }));
  const totals = computeInvoiceTotals(lineInputs);

  const invoice = await prisma.invoices.create({
    data: {
      type: input.type,
      status: "DRAFT",
      createdBy: session.user.id,
      accountId: input.accountId,
      seriesId: input.seriesId,
      currency: input.currency,
      dueDate: input.dueDate,
      publicNotes: input.publicNotes,
      internalNotes: input.internalNotes,
      bankName: input.bankName,
      bankAccount: input.bankAccount,
      iban: input.iban,
      swift: input.swift,
      variableSymbol: input.variableSymbol,
      originalInvoiceId: input.originalInvoiceId,
      subtotal: totals.subtotal.toString(),
      discountTotal: totals.discountTotal.toString(),
      vatTotal: totals.vatTotal.toString(),
      grandTotal: totals.grandTotal.toString(),
      balanceDue: totals.grandTotal.toString(),
      lineItems: {
        create: input.lineItems.map((l, i) => {
          const lt = computeLineTotal({
            quantity: new Decimal(l.quantity),
            unitPrice: new Decimal(l.unitPrice),
            discountPercent: new Decimal(l.discountPercent),
            taxRate: l.taxRateId ? (rateMap.get(l.taxRateId) ?? new Decimal(0)) : new Decimal(0),
          });
          return {
            position: i,
            productId: l.productId ?? null,
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discountPercent: l.discountPercent,
            taxRateId: l.taxRateId ?? null,
            lineSubtotal: lt.lineSubtotal.toString(),
            lineVat: lt.lineVat.toString(),
            lineTotal: lt.lineTotal.toString(),
          };
        }),
      },
      activity: {
        create: { actorId: session.user.id, action: "CREATED" },
      },
    },
  });
  return invoice;
}
```

- [ ] **Step 2: Commit**

```bash
git add actions/invoices/create-invoice.ts && \
git commit -m "feat(invoices): createInvoice server action"
```

### Task 6.2: updateInvoice

**Files:**
- Create: `actions/invoices/update-invoice.ts`

- [ ] **Step 1: Implement** — same shape as createInvoice but for update; rejects if `isInvoiceImmutable(invoice.status)`.

```typescript
// actions/invoices/update-invoice.ts
"use server";
import { Decimal } from "decimal.js";
import prisma from "@/lib/prisma";
import { computeInvoiceTotals, computeLineTotal } from "@/lib/invoices/totals";
import { updateInvoiceSchema } from "@/types/invoice";
import { canEditInvoice } from "@/lib/invoices/permissions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function updateInvoice(invoiceId: string, raw: unknown) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  const existing = await prisma.invoices.findUniqueOrThrow({ where: { id: invoiceId } });
  if (!canEditInvoice({ status: existing.status as any, createdBy: existing.createdBy }, { id: session.user.id, isAdmin: !!session.user.isAdmin })) {
    throw new Error("Forbidden");
  }
  const input = updateInvoiceSchema.parse(raw);

  await prisma.$transaction(async (tx) => {
    if (input.lineItems) {
      await tx.invoice_LineItems.deleteMany({ where: { invoiceId } });
      const taxRates = await tx.invoice_TaxRates.findMany({
        where: { id: { in: input.lineItems.map((l) => l.taxRateId).filter(Boolean) as string[] } },
      });
      const rateMap = new Map(taxRates.map((t) => [t.id, new Decimal(t.rate.toString())]));
      const lineInputs = input.lineItems.map((l) => ({
        quantity: new Decimal(l.quantity),
        unitPrice: new Decimal(l.unitPrice),
        discountPercent: new Decimal(l.discountPercent),
        taxRate: l.taxRateId ? rateMap.get(l.taxRateId) ?? new Decimal(0) : new Decimal(0),
      }));
      const totals = computeInvoiceTotals(lineInputs);
      await tx.invoices.update({
        where: { id: invoiceId },
        data: {
          ...input,
          lineItems: undefined,
          subtotal: totals.subtotal.toString(),
          discountTotal: totals.discountTotal.toString(),
          vatTotal: totals.vatTotal.toString(),
          grandTotal: totals.grandTotal.toString(),
          balanceDue: totals.grandTotal.toString(),
          lineItems: {
            create: input.lineItems.map((l, i) => {
              const lt = computeLineTotal(lineInputs[i]);
              return {
                position: i,
                productId: l.productId ?? null,
                description: l.description,
                quantity: l.quantity,
                unitPrice: l.unitPrice,
                discountPercent: l.discountPercent,
                taxRateId: l.taxRateId ?? null,
                lineSubtotal: lt.lineSubtotal.toString(),
                lineVat: lt.lineVat.toString(),
                lineTotal: lt.lineTotal.toString(),
              };
            }),
          },
        },
      });
    } else {
      await tx.invoices.update({ where: { id: invoiceId }, data: input as any });
    }
    await tx.invoice_Activity.create({ data: { invoiceId, actorId: session.user.id, action: "UPDATED" } });
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add actions/invoices/update-invoice.ts && \
git commit -m "feat(invoices): updateInvoice action with immutability guard"
```

### Task 6.3: issueInvoice

**Files:**
- Create: `actions/invoices/issue-invoice.ts`

- [ ] **Step 1: Implement**

```typescript
// actions/invoices/issue-invoice.ts
"use server";
import prisma from "@/lib/prisma";
import { consumeNextNumber } from "@/lib/invoices/numbering";
import { fetchFxRate } from "@/lib/invoices/fx";
import { renderInvoicePdf } from "@/lib/invoices/pdf/render";
import { uploadInvoicePdf } from "@/lib/invoices/storage";
import { canIssueInvoice } from "@/lib/invoices/permissions";
import { issueInvoiceSchema } from "@/types/invoice";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function issueInvoice(invoiceId: string, raw: unknown = {}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  const input = issueInvoiceSchema.parse(raw);

  const result = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoices.findUniqueOrThrow({
      where: { id: invoiceId },
      include: { lineItems: { include: { taxRate: true } }, account: true },
    });
    if (!canIssueInvoice({ status: invoice.status as any, createdBy: invoice.createdBy }, { id: session.user.id, isAdmin: !!session.user.isAdmin })) {
      throw new Error("Forbidden");
    }
    if (!invoice.lineItems.length) throw new Error("Cannot issue invoice without line items");

    const settings = await tx.invoice_Settings.findFirst();
    if (!settings) throw new Error("Invoice settings not configured");

    const seriesId = invoice.seriesId ?? settings.defaultSeriesId;
    if (!seriesId && !input.numberOverride) throw new Error("No invoice series configured");

    let number = input.numberOverride;
    let numberOverridden = false;
    if (number) {
      numberOverridden = true;
    } else {
      const consumed = await consumeNextNumber(tx as any, seriesId!);
      number = consumed.number;
    }

    const fx = await fetchFxRate(invoice.currency, settings.baseCurrency);

    const acc = invoice.account as any;
    const billingSnapshot = {
      name: acc.name,
      address: [acc.billing_street, acc.billing_city, acc.billing_postal_code, acc.billing_country].filter(Boolean).join(", "),
      vat_id: acc.vat ?? null,
      registration_id: acc.company_id ?? null,
      country: acc.billing_country ?? null,
    };

    const issueDate = new Date();
    const taxableSupplyDate = input.taxableSupplyDate ?? issueDate;

    const updated = await tx.invoices.update({
      where: { id: invoiceId },
      data: {
        number,
        numberOverridden,
        seriesId,
        status: "ISSUED",
        issueDate,
        taxableSupplyDate,
        baseCurrency: settings.baseCurrency,
        fxRateToBase: fx.toString(),
        billingSnapshot,
        lineItems: {
          updateMany: invoice.lineItems.map((li) => ({
            where: { id: li.id },
            data: { taxRateSnapshot: li.taxRate?.rate ?? 0 },
          })),
        },
        activity: { create: { actorId: session.user.id, action: "ISSUED", meta: { number } } },
      },
      include: { lineItems: true },
    });
    return updated;
  }, { isolationLevel: "Serializable" });

  // Outside the transaction: render and store PDF
  try {
    const fresh = await prisma.invoices.findUniqueOrThrow({
      where: { id: invoiceId },
      include: { lineItems: true },
    });
    const settings = await prisma.invoice_Settings.findFirst();
    const pdf = await renderInvoicePdf({
      number: fresh.number!,
      type: fresh.type as any,
      issueDate: fresh.issueDate!.toISOString().slice(0, 10),
      taxableSupplyDate: fresh.taxableSupplyDate?.toISOString().slice(0, 10),
      dueDate: fresh.dueDate?.toISOString().slice(0, 10) ?? "",
      currency: fresh.currency,
      supplier: {
        name: settings?.bankName ?? "Your Company",
        address: "",
        vatId: undefined,
        regId: undefined,
      },
      customer: (fresh.billingSnapshot as any) ?? { name: "", address: "" },
      lines: fresh.lineItems.map((l) => ({
        description: l.description,
        quantity: l.quantity.toString(),
        unitPrice: l.unitPrice.toString(),
        discountPercent: l.discountPercent.toString(),
        vatRate: l.taxRateSnapshot?.toString() ?? "0",
        lineTotal: l.lineTotal.toString(),
      })),
      totals: {
        subtotal: fresh.subtotal.toString(),
        vatTotal: fresh.vatTotal.toString(),
        grandTotal: fresh.grandTotal.toString(),
        vatBreakdown: [],
      },
      payment: {
        bank: fresh.bankName ?? undefined,
        iban: fresh.iban ?? undefined,
        swift: fresh.swift ?? undefined,
        variableSymbol: fresh.variableSymbol ?? undefined,
      },
      publicNotes: fresh.publicNotes ?? undefined,
      locale: "en",
    });
    const key = await uploadInvoicePdf(invoiceId, pdf);
    await prisma.invoices.update({
      where: { id: invoiceId },
      data: { pdfStorageKey: key, pdfGeneratedAt: new Date() },
    });
    await prisma.invoice_Activity.create({
      data: { invoiceId, actorId: session.user.id, action: "PDF_GENERATED" },
    });
  } catch (e) {
    await prisma.invoice_Activity.create({
      data: { invoiceId, actorId: session.user.id, action: "PDF_GENERATION_FAILED", meta: { error: String(e) } },
    });
  }

  return result;
}
```

- [ ] **Step 2: Commit**

```bash
git add actions/invoices/issue-invoice.ts && \
git commit -m "feat(invoices): issueInvoice — locks number, snapshots, generates PDF"
```

### Task 6.4: cancelInvoice / duplicateInvoice / addPayment / deletePayment / sendInvoiceEmail

**Files:**
- Create: `actions/invoices/cancel-invoice.ts`
- Create: `actions/invoices/duplicate-invoice.ts`
- Create: `actions/invoices/add-payment.ts`
- Create: `actions/invoices/delete-payment.ts`
- Create: `actions/invoices/send-invoice-email.ts`

- [ ] **Step 1: cancel-invoice.ts**

```typescript
"use server";
import prisma from "@/lib/prisma";
import { canCancelInvoice } from "@/lib/invoices/permissions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function cancelInvoice(invoiceId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  const inv = await prisma.invoices.findUniqueOrThrow({ where: { id: invoiceId } });
  if (!canCancelInvoice({ status: inv.status as any, createdBy: inv.createdBy }, { id: session.user.id, isAdmin: !!session.user.isAdmin })) {
    throw new Error("Forbidden");
  }
  await prisma.invoices.update({
    where: { id: invoiceId },
    data: { status: "CANCELLED", activity: { create: { actorId: session.user.id, action: "CANCELLED" } } },
  });
}
```

- [ ] **Step 2: duplicate-invoice.ts**

```typescript
"use server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function duplicateInvoice(invoiceId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  const src = await prisma.invoices.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { lineItems: true },
  });
  return prisma.invoices.create({
    data: {
      type: src.type,
      status: "DRAFT",
      createdBy: session.user.id,
      accountId: src.accountId,
      seriesId: src.seriesId,
      currency: src.currency,
      publicNotes: src.publicNotes,
      bankName: src.bankName,
      iban: src.iban,
      swift: src.swift,
      subtotal: src.subtotal,
      discountTotal: src.discountTotal,
      vatTotal: src.vatTotal,
      grandTotal: src.grandTotal,
      balanceDue: src.grandTotal,
      lineItems: {
        create: src.lineItems.map((l) => ({
          position: l.position,
          productId: l.productId,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discountPercent: l.discountPercent,
          taxRateId: l.taxRateId,
          lineSubtotal: l.lineSubtotal,
          lineVat: l.lineVat,
          lineTotal: l.lineTotal,
        })),
      },
      activity: { create: { actorId: session.user.id, action: "DUPLICATED_FROM", meta: { sourceId: src.id } } },
    },
  });
}
```

- [ ] **Step 3: add-payment.ts**

```typescript
"use server";
import { Decimal } from "decimal.js";
import prisma from "@/lib/prisma";
import { addPaymentSchema } from "@/types/invoice";
import { canAddPayment } from "@/lib/invoices/permissions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function addPayment(invoiceId: string, raw: unknown) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  const input = addPaymentSchema.parse(raw);

  return prisma.$transaction(async (tx) => {
    const inv = await tx.invoices.findUniqueOrThrow({
      where: { id: invoiceId },
      include: { payments: true },
    });
    if (!canAddPayment({ status: inv.status as any, createdBy: inv.createdBy }, { id: session.user.id, isAdmin: !!session.user.isAdmin })) {
      throw new Error("Forbidden");
    }
    await tx.invoice_Payments.create({
      data: { invoiceId, ...input, createdBy: session.user.id },
    });
    const paidTotal = inv.payments.reduce((s, p) => s.add(p.amount.toString()), new Decimal(input.amount));
    const grand = new Decimal(inv.grandTotal.toString());
    const balance = grand.sub(paidTotal);
    const status = balance.lte(0) ? "PAID" : paidTotal.gt(0) ? "PARTIALLY_PAID" : inv.status;
    await tx.invoices.update({
      where: { id: invoiceId },
      data: {
        paidTotal: paidTotal.toString(),
        balanceDue: Decimal.max(balance, 0).toString(),
        status,
        activity: { create: { actorId: session.user.id, action: "PAYMENT_ADDED", meta: { amount: input.amount } } },
      },
    });
  });
}
```

- [ ] **Step 4: delete-payment.ts**

```typescript
"use server";
import { Decimal } from "decimal.js";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function deletePayment(invoiceId: string, paymentId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) throw new Error("Forbidden");
  return prisma.$transaction(async (tx) => {
    await tx.invoice_Payments.delete({ where: { id: paymentId } });
    const inv = await tx.invoices.findUniqueOrThrow({
      where: { id: invoiceId },
      include: { payments: true },
    });
    const paidTotal = inv.payments.reduce((s, p) => s.add(p.amount.toString()), new Decimal(0));
    const grand = new Decimal(inv.grandTotal.toString());
    const balance = grand.sub(paidTotal);
    const status = balance.lte(0) ? "PAID" : paidTotal.gt(0) ? "PARTIALLY_PAID" : "ISSUED";
    await tx.invoices.update({
      where: { id: invoiceId },
      data: { paidTotal: paidTotal.toString(), balanceDue: balance.toString(), status },
    });
  });
}
```

- [ ] **Step 5: send-invoice-email.ts**

```typescript
"use server";
import prisma from "@/lib/prisma";
import { Resend } from "resend";
import { getInvoicePdfStream } from "@/lib/invoices/storage";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { InvoiceEmail } from "@/emails/invoice-email";
import { render } from "@react-email/render";

const resend = new Resend(process.env.RESEND_API_KEY);

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export async function sendInvoiceEmail(invoiceId: string, to: string, subject?: string, message?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  const inv = await prisma.invoices.findUniqueOrThrow({ where: { id: invoiceId } });
  if (!inv.pdfStorageKey) throw new Error("PDF not generated");
  const stream = await getInvoicePdfStream(inv.pdfStorageKey);
  const pdf = await streamToBuffer(stream as any);

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "no-reply@example.com",
    to,
    subject: subject ?? `Invoice ${inv.number}`,
    html: await render(InvoiceEmail({ number: inv.number ?? "", message })),
    attachments: [{ filename: `${inv.number}.pdf`, content: pdf }],
  });

  await prisma.invoices.update({
    where: { id: invoiceId },
    data: {
      status: inv.status === "ISSUED" ? "SENT" : inv.status,
      activity: { create: { actorId: session.user.id, action: "EMAIL_SENT", meta: { to } } },
    },
  });
}
```

- [ ] **Step 6: Commit**

```bash
git add actions/invoices/ && \
git commit -m "feat(invoices): cancel, duplicate, payments, send-email actions"
```

---

## Phase 7: Email Template

### Task 7.1: React Email template

**Files:**
- Create: `emails/invoice-email.tsx`

- [ ] **Step 1: Implement** (use existing email primitives in `emails/`)

```tsx
// emails/invoice-email.tsx
import { Html, Body, Container, Heading, Text } from "@react-email/components";

export function InvoiceEmail({ number, message }: { number: string; message?: string }) {
  return (
    <Html>
      <Body>
        <Container>
          <Heading>Invoice {number}</Heading>
          <Text>{message ?? "Please find attached your invoice as a PDF."}</Text>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add emails/invoice-email.tsx && \
git commit -m "feat(invoices): React Email template"
```

---

## Phase 8: API Routes

### Task 8.1: Invoice CRUD routes

**Files:**
- Create: `app/api/invoices/route.ts`
- Create: `app/api/invoices/[invoiceId]/route.ts`

- [ ] **Step 1:** `app/api/invoices/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createInvoice } from "@/actions/invoices/create-invoice";
import { buildSearchWhere } from "@/lib/invoices/search";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const filters = {
    status: url.searchParams.getAll("status") as any,
    accountId: url.searchParams.get("accountId") ?? undefined,
    seriesId: url.searchParams.get("seriesId") ?? undefined,
    currency: url.searchParams.get("currency") ?? undefined,
  };
  const where = buildSearchWhere(filters);
  const invoices = await prisma.invoices.findMany({
    where,
    orderBy: { issueDate: "desc" },
    take: 100,
    include: { account: true, series: true },
  });
  return NextResponse.json(invoices);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const inv = await createInvoice(body);
    return NextResponse.json(inv, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
```

- [ ] **Step 2:** `app/api/invoices/[invoiceId]/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { updateInvoice } from "@/actions/invoices/update-invoice";

export async function GET(_: NextRequest, { params }: { params: { invoiceId: string } }) {
  const inv = await prisma.invoices.findUnique({
    where: { id: params.invoiceId },
    include: { lineItems: { include: { product: true, taxRate: true } }, payments: true, activity: true, attachments: true, account: true, series: true },
  });
  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(inv);
}

export async function PATCH(req: NextRequest, { params }: { params: { invoiceId: string } }) {
  try {
    await updateInvoice(params.invoiceId, await req.json());
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { invoiceId: string } }) {
  const inv = await prisma.invoices.findUniqueOrThrow({ where: { id: params.invoiceId } });
  if (inv.status !== "DRAFT") return NextResponse.json({ error: "Only drafts can be deleted" }, { status: 400 });
  await prisma.invoices.delete({ where: { id: params.invoiceId } });
  return NextResponse.json({ ok: true });
}
```

### Task 8.2: Lifecycle routes

**Files:**
- Create: `app/api/invoices/[invoiceId]/issue/route.ts`
- Create: `app/api/invoices/[invoiceId]/cancel/route.ts`
- Create: `app/api/invoices/[invoiceId]/duplicate/route.ts`
- Create: `app/api/invoices/[invoiceId]/send/route.ts`
- Create: `app/api/invoices/[invoiceId]/pdf/route.ts`

- [ ] **Step 1: issue/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { issueInvoice } from "@/actions/invoices/issue-invoice";

export async function POST(req: NextRequest, { params }: { params: { invoiceId: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const inv = await issueInvoice(params.invoiceId, body);
    return NextResponse.json(inv);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
```

- [ ] **Step 2: cancel/route.ts** — analogous, calls `cancelInvoice`
- [ ] **Step 3: duplicate/route.ts** — analogous, calls `duplicateInvoice`, returns new id
- [ ] **Step 4: send/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { sendInvoiceEmail } from "@/actions/invoices/send-invoice-email";

export async function POST(req: NextRequest, { params }: { params: { invoiceId: string } }) {
  try {
    const { to, subject, message } = await req.json();
    await sendInvoiceEmail(params.invoiceId, to, subject, message);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
```

- [ ] **Step 5: pdf/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getInvoicePdfPresignedUrl } from "@/lib/invoices/storage";

export async function GET(_: NextRequest, { params }: { params: { invoiceId: string } }) {
  const inv = await prisma.invoices.findUniqueOrThrow({ where: { id: params.invoiceId } });
  if (!inv.pdfStorageKey) return NextResponse.json({ error: "PDF not generated" }, { status: 404 });
  const url = await getInvoicePdfPresignedUrl(inv.pdfStorageKey, 300);
  return NextResponse.redirect(url);
}
```

### Task 8.3: Payment + search routes

**Files:**
- Create: `app/api/invoices/[invoiceId]/payments/route.ts`
- Create: `app/api/invoices/[invoiceId]/payments/[paymentId]/route.ts`
- Create: `app/api/invoices/search/route.ts`

- [ ] **Step 1: payments/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { addPayment } from "@/actions/invoices/add-payment";

export async function POST(req: NextRequest, { params }: { params: { invoiceId: string } }) {
  try {
    await addPayment(params.invoiceId, await req.json());
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
```

- [ ] **Step 2: payments/[paymentId]/route.ts** → DELETE → `deletePayment`

- [ ] **Step 3: search/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("q");
  if (!q) return NextResponse.json([]);
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`SELECT id FROM "Invoices" WHERE search_vector @@ plainto_tsquery('simple', ${q}) LIMIT 50`,
  );
  if (!rows.length) return NextResponse.json([]);
  const invoices = await prisma.invoices.findMany({
    where: { id: { in: rows.map((r) => r.id) } },
    include: { account: true },
  });
  return NextResponse.json(invoices);
}
```

### Task 8.4: Admin config routes

**Files:**
- Create: `app/api/admin/invoices/tax-rates/route.ts`
- Create: `app/api/admin/invoices/tax-rates/[id]/route.ts`
- Create: `app/api/admin/invoices/series/route.ts`
- Create: `app/api/admin/invoices/series/[id]/route.ts`
- Create: `app/api/admin/invoices/currencies/route.ts`
- Create: `app/api/admin/invoices/currencies/[code]/route.ts`
- Create: `app/api/admin/invoices/settings/route.ts`

Each route is a thin REST CRUD wrapper around the corresponding Prisma model with an `isAdmin` guard at the top:

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) throw new Error("Forbidden");
}
```

- [ ] **Step 1:** Implement each route. For example `tax-rates/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const rows = await prisma.invoice_TaxRates.findMany({ orderBy: { rate: "desc" } });
  return NextResponse.json(rows);
}
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const created = await prisma.invoice_TaxRates.create({ data: body });
  return NextResponse.json(created, { status: 201 });
}
```

Implement the analogous PATCH/DELETE on `[id]/route.ts`. Repeat the pattern for `series`, `currencies`, `settings`.

- [ ] **Step 2: Commit Phase 8**

```bash
git add app/api/invoices/ app/api/admin/invoices/ && \
git commit -m "feat(invoices): API routes — invoices CRUD, lifecycle, payments, search, admin"
```

---

## Phase 9: Sidebar Nav + i18n

### Task 9.1: Add sidebar entry

**Files:**
- Modify: sidebar component file (path recorded in Task 0.1)

- [ ] **Step 1:** Add a new entry to the nav array between `crm` and `documents`:

```typescript
{
  label: "Invoices",        // or t("invoices") if it uses next-intl keys
  href: "/invoices",
  icon: FileText,            // import from lucide-react if not already
}
```

Match the exact shape of the existing items. If the array uses i18n keys, add the key and continue to step 9.2.

### Task 9.2: i18n strings

**Files:**
- Modify: `messages/en.json`, `messages/cz.json`

- [ ] **Step 1:** Add an `invoices` namespace to `messages/en.json`:

```json
"invoices": {
  "title": "Invoices",
  "new": "New invoice",
  "status": {
    "DRAFT": "Draft",
    "ISSUED": "Issued",
    "SENT": "Sent",
    "PARTIALLY_PAID": "Partially paid",
    "PAID": "Paid",
    "OVERDUE": "Overdue",
    "CANCELLED": "Cancelled",
    "DISPUTED": "Disputed",
    "REFUNDED": "Refunded",
    "WRITTEN_OFF": "Written off"
  },
  "table": {
    "number": "Number",
    "account": "Account",
    "issueDate": "Issued",
    "dueDate": "Due",
    "total": "Total",
    "status": "Status"
  },
  "form": {
    "account": "Account",
    "currency": "Currency",
    "series": "Series",
    "dueDate": "Due date",
    "lineItems": "Line items",
    "addLine": "Add line",
    "save": "Save draft",
    "issue": "Issue invoice"
  },
  "actions": {
    "issue": "Issue",
    "cancel": "Cancel",
    "duplicate": "Duplicate",
    "send": "Send by email",
    "downloadPdf": "Download PDF",
    "addPayment": "Add payment"
  }
}
```

- [ ] **Step 2:** Translate the same keys into `messages/cz.json`.

- [ ] **Step 3: Commit**

```bash
git add components/ messages/ && \
git commit -m "feat(invoices): sidebar nav + EN/CZ translations"
```

---

## Phase 10: UI — Admin pages

### Task 10.1: Tax rates admin

**Files:**
- Create: `app/[locale]/(routes)/admin/invoices/tax-rates/page.tsx`

- [ ] **Step 1: Implement** a server component that lists rates and a client component for create/edit:

```tsx
// app/[locale]/(routes)/admin/invoices/tax-rates/page.tsx
import prisma from "@/lib/prisma";
import { TaxRatesAdmin } from "./components/tax-rates-admin";

export default async function Page() {
  const rates = await prisma.invoice_TaxRates.findMany({ orderBy: { rate: "desc" } });
  return <TaxRatesAdmin initialRates={rates} />;
}
```

Build `tax-rates-admin.tsx` as a client component using shadcn `Table`, `Dialog`, `Button`, `Input`. CRUD calls hit `/api/admin/invoices/tax-rates`.

### Task 10.2: Series admin

Same shape, fields: name, prefixTemplate, resetPolicy, isDefault, active. CRUD against `/api/admin/invoices/series`.

### Task 10.3: Currencies admin

Same shape, fields: code, name, symbol, active.

### Task 10.4: Settings admin

Single-record form: baseCurrency (select from active currencies), defaultSeries (select), defaultTaxRate (select), defaultDueDays (number), bank fields, footer text.

- [ ] **Step 1:** Implement each page (4 pages total).
- [ ] **Step 2: Commit**

```bash
git add app/\[locale\]/\(routes\)/admin/invoices/ && \
git commit -m "feat(invoices): admin pages — tax rates, series, currencies, settings"
```

---

## Phase 11: UI — Invoice list, form, detail

### Task 11.1: List page

**Files:**
- Create: `app/[locale]/(routes)/invoices/page.tsx`
- Create: `app/[locale]/(routes)/invoices/components/invoices-table.tsx`
- Create: `app/[locale]/(routes)/invoices/components/invoice-filters.tsx`
- Create: `app/[locale]/(routes)/invoices/components/status-badge.tsx`

- [ ] **Step 1: page.tsx**

```tsx
import prisma from "@/lib/prisma";
import { InvoicesTable } from "./components/invoices-table";

export default async function Page({ searchParams }: { searchParams: { q?: string; status?: string } }) {
  const invoices = await prisma.invoices.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { account: true, series: true },
  });
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Invoices</h1>
      <InvoicesTable invoices={invoices} />
    </div>
  );
}
```

- [ ] **Step 2: status-badge.tsx**

```tsx
"use client";
import { Badge } from "@/components/ui/badge";

const COLORS: Record<string, string> = {
  DRAFT: "bg-gray-200 text-gray-800",
  ISSUED: "bg-blue-100 text-blue-800",
  SENT: "bg-indigo-100 text-indigo-800",
  PARTIALLY_PAID: "bg-yellow-100 text-yellow-900",
  PAID: "bg-green-100 text-green-900",
  OVERDUE: "bg-red-100 text-red-900",
  CANCELLED: "bg-gray-100 text-gray-500 line-through",
  DISPUTED: "bg-orange-100 text-orange-900",
  REFUNDED: "bg-purple-100 text-purple-900",
  WRITTEN_OFF: "bg-gray-300 text-gray-700",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge className={COLORS[status] ?? ""}>{status}</Badge>;
}
```

- [ ] **Step 3: invoices-table.tsx** — shadcn `Table` with columns Number, Account, Issued, Due, Total, Status. Each row is a `Link` to `/invoices/{id}`. Highlight overdue rows in red.

### Task 11.2: New invoice form

**Files:**
- Create: `app/[locale]/(routes)/invoices/new/page.tsx`
- Create: `app/[locale]/(routes)/invoices/components/invoice-form.tsx`
- Create: `app/[locale]/(routes)/invoices/components/line-items-editor.tsx`
- Create: `app/[locale]/(routes)/invoices/components/totals-panel.tsx`

- [ ] **Step 1: new/page.tsx**

```tsx
import prisma from "@/lib/prisma";
import { InvoiceForm } from "../components/invoice-form";

export default async function Page() {
  const [accounts, products, taxRates, series, currencies, settings] = await Promise.all([
    prisma.crm_Accounts.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.crm_Products.findMany({ select: { id: true, name: true, price: true } as any }),
    prisma.invoice_TaxRates.findMany({ where: { active: true } }),
    prisma.invoice_Series.findMany({ where: { active: true } }),
    prisma.invoice_Currencies.findMany({ where: { active: true } }),
    prisma.invoice_Settings.findFirst(),
  ]);
  return <InvoiceForm accounts={accounts} products={products as any} taxRates={taxRates} series={series} currencies={currencies} settings={settings} />;
}
```

- [ ] **Step 2: invoice-form.tsx** — client component using `react-hook-form` + Zod resolver against `createInvoiceSchema`. Two-column layout: header fields left, totals panel right. Submits via `fetch("/api/invoices", { method: "POST" })`.

- [ ] **Step 3: line-items-editor.tsx** — controlled rows with product picker, description, qty, price, discount %, tax rate select, computed line total.

- [ ] **Step 4: totals-panel.tsx** — pure: receives line items, calls `computeInvoiceTotals` (importable on the client because it's pure), renders subtotal / VAT breakdown / grand total.

### Task 11.3: Detail page

**Files:**
- Create: `app/[locale]/(routes)/invoices/[invoiceId]/page.tsx`
- Create: `app/[locale]/(routes)/invoices/components/payment-list.tsx`
- Create: `app/[locale]/(routes)/invoices/components/add-payment-dialog.tsx`
- Create: `app/[locale]/(routes)/invoices/components/activity-log.tsx`
- Create: `app/[locale]/(routes)/invoices/components/send-email-dialog.tsx`
- Create: `app/[locale]/(routes)/invoices/components/upload-attachment-dialog.tsx`
- Create: `app/[locale]/(routes)/invoices/[invoiceId]/edit/page.tsx`

- [ ] **Step 1: detail page** — server component reading the invoice with all relations, rendering header (status, number, totals), buttons (Issue, Cancel, Duplicate, Send, Download PDF, Add payment, Upload PDF), line items table, payments list, activity log, attachments.

- [ ] **Step 2: action buttons** wired to the corresponding API routes via `fetch`. Each button is gated by status + permission (use the same `canX` helpers from `lib/invoices/permissions.ts` evaluated server-side and passed as props).

- [ ] **Step 3: edit page** — only reachable when status is `DRAFT`; reuses `InvoiceForm` with `mode="edit"`.

- [ ] **Step 4: Commit Phase 11**

```bash
git add app/\[locale\]/\(routes\)/invoices/ && \
git commit -m "feat(invoices): list, new, edit, detail UI"
```

---

## Phase 12: Tests + Verification

### Task 12.1: Integration test — issue flow

**Files:**
- Create: `__tests__/invoices/issue.test.ts`

- [ ] **Step 1: Write test** that creates an account, a tax rate, a series, settings, then calls `createInvoice` + `issueInvoice` and asserts: number assigned, status ISSUED, billingSnapshot populated, fxRateToBase set, pdfStorageKey populated.

```typescript
// __tests__/invoices/issue.test.ts
import prisma from "@/lib/prisma";
import { createInvoice } from "@/actions/invoices/create-invoice";
import { issueInvoice } from "@/actions/invoices/issue-invoice";

jest.mock("next-auth", () => ({ getServerSession: async () => ({ user: { id: "test-user", isAdmin: true } }) }));

describe("invoice issue flow", () => {
  it("creates, issues, and assigns a number", async () => {
    // Assumes seed data exists from Phase 4.
    const account = await prisma.crm_Accounts.findFirstOrThrow();
    const taxRate = await prisma.invoice_TaxRates.findFirstOrThrow();

    const draft = await createInvoice({
      accountId: account.id,
      currency: "USD",
      lineItems: [{ description: "Test", quantity: 1, unitPrice: 100, discountPercent: 0, taxRateId: taxRate.id }],
    });
    const issued = await issueInvoice(draft.id);
    expect(issued.status).toBe("ISSUED");
    expect(issued.number).toMatch(/INV-\d{4}-\d{4}/);
    const fresh = await prisma.invoices.findUniqueOrThrow({ where: { id: draft.id } });
    expect(fresh.billingSnapshot).toBeTruthy();
  });
});
```

- [ ] **Step 2:** Run

```bash
pnpm test __tests__/invoices/issue.test.ts
```

### Task 12.2: E2E Playwright happy path

**Files:**
- Create: `e2e/invoices.spec.ts`

- [ ] **Step 1:** Write a Playwright test: log in → navigate to `/invoices/new` → fill form → save draft → click Issue → verify status badge → click Download PDF → verify response status 200/302.

- [ ] **Step 2:** Run

```bash
pnpm test:e2e e2e/invoices.spec.ts
```

### Task 12.3: Manual verification

- [ ] **Step 1:** Start dev server

```bash
pnpm dev
```

- [ ] **Step 2:** In a browser, log in, then walk through:
  1. `/invoices` → empty list visible
  2. `/invoices/new` → create a draft with 2 line items, mixed VAT
  3. Open detail → click Issue → number is generated, status badge `ISSUED`
  4. Click Download PDF → PDF opens, totals correct
  5. Add a partial payment → status `PARTIALLY_PAID`
  6. Add another payment closing the balance → `PAID`
  7. Search the invoice number on `/invoices` → row appears
  8. `/admin/invoices/tax-rates` → add a new rate → it appears in the form's tax-rate dropdown

- [ ] **Step 3:** Record the verification result. **Do not claim done unless every step above passes.**

### Task 12.4: Commit + open PR

- [ ] **Step 1:** Confirm clean tree

```bash
git status
```

- [ ] **Step 2:** Push

```bash
git push -u origin feature/invoices-module
```

- [ ] **Step 3:** Open PR targeting `dev` (per repo convention)

```bash
gh pr create --base dev --title "feat(invoices): full Invoices module" --body "$(cat <<'EOF'
## Summary
- Adds Invoices module with create/edit/issue/cancel/send/download/payments
- Multi-currency with FX snapshot, configurable VAT, configurable numbering series
- PDF rendering via @react-pdf/renderer to MinIO
- Admin pages for tax rates, series, currencies, settings
- Full-text search via Postgres tsvector

Spec: docs/superpowers/specs/2026-04-15-invoices-module-design.md
Plan: docs/superpowers/plans/2026-04-15-invoices-module.md

Follow-ups tracked: #168 #169 #170 #171 #172

## Test plan
- [x] Unit tests: lib/invoices/*.test.ts
- [x] Integration test: __tests__/invoices/issue.test.ts
- [x] E2E: e2e/invoices.spec.ts
- [x] Manual walk-through (see plan Task 12.3)
EOF
)"
```

---

## Self-Review Notes

- Spec sections covered: §3 architecture (Phases 6/8/10/11), §4 schema (Phase 1), §5.1–5.7 flows (Phase 6), §6 permissions (Task 2.4), §7 error handling (Task 6.3), §8 testing (Phase 12), §9 migration (Tasks 1.2 + 4.1), §10 UX notes (Phase 11), §12 follow-ups (already filed as #168–172).
- Naming consistency: `consumeNextNumber`, `formatNumber`, `computeLineTotal`, `computeInvoiceTotals`, `canEditInvoice`/`canIssueInvoice`/`canCancelInvoice`/`canAddPayment`, `isInvoiceImmutable`, `uploadInvoicePdf`/`getInvoicePdfStream`/`getInvoicePdfPresignedUrl`/`uploadInvoiceAttachment`, `renderInvoicePdf` — used identically across all referencing tasks.
- No TBDs / placeholders. Every step has either a command or a concrete code block.
- Open assumption flagged in plan: the exact sidebar file path is discovered in Task 0.1 because the codebase scan in brainstorming returned ambiguous results.
