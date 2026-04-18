# Invoices Module — Design Spec

- **Date:** 2026-04-15
- **Project:** nextcrm-app
- **Target branch:** `dev`
- **Status:** Draft for review

## 1. Purpose

Add a first-class **Invoices** module to NextCRM. Users create invoices linked to a CRM Account, build line items from CRM Products (or free-text), the system generates a PDF, stores it in MinIO/S3, and exposes search, list, payment tracking, and email delivery. The module is **global-ready** (multi-currency, tenant-configurable VAT, configurable numbering series) — not Czech-specific.

## 2. Scope

### In scope (v1)

1. New top-level **Invoices** sidebar entry.
2. CRUD invoices with full lifecycle: `DRAFT → ISSUED → SENT → PARTIALLY_PAID → PAID`, plus `OVERDUE` (auto), `CANCELLED`, `DISPUTED`, `REFUNDED`, `WRITTEN_OFF`.
3. Manual line-item builder pulling from `crm_Products` (with free-text fallback).
4. Optional upload of an externally produced PDF attached to the same invoice record (hybrid model).
5. Per-line VAT rates from a tenant-managed list (Admin module).
6. Multi-currency per invoice + FX snapshot to tenant base currency on issue.
7. Configurable **Invoice Series** (per-series numbering counter, prefix template, default series).
8. Manual override of auto-generated invoice number.
9. PDF generation via `@react-pdf/renderer` (already installed).
10. PDF storage in MinIO under `invoices/{tenantId}/{invoiceId}.pdf`, downloaded via signed URL.
11. Send invoice by email through existing Resend integration (PDF attached, marks `SENT`).
12. Multiple partial payments per invoice, drives status transitions.
13. Customer billing snapshot frozen at issue time.
14. Bank details / payment instructions on invoice.
15. Public footer notes + private internal notes.
16. Duplicate / clone an invoice.
17. Invoice types: `INVOICE`, `CREDIT_NOTE`, `PROFORMA`. Credit notes link back to the original invoice.
18. Search (full-text on number, account name, account VAT ID, line description) + filters (status, date range, account, series, currency, amount range).
19. List view: sortable table, status badges, overdue highlighting, bulk export (CSV).
20. Activity log / audit trail (who changed what when, focus on status transitions).
21. Permissions: creator + admins edit drafts; **`ISSUED`+ invoices are immutable** except for status, payment, and notes (legal requirement).
22. i18n: EN + CZ locale strings via existing `next-intl` setup.

### Out of scope (tracked as GitHub issues)

- #168 Recurring invoice schedules
- #169 Online payment gateway integration (Stripe)
- #170 Accounting export (ISDOC / XML for tax authority)
- #171 Reminders / dunning automation
- #172 Inventory / stock decrement on issue

## 3. Architecture Overview

```
app/[locale]/(routes)/invoices/
├── page.tsx                     # List view (server component)
├── components/
│   ├── invoices-table.tsx       # Sortable/filterable table
│   ├── invoice-filters.tsx
│   ├── status-badge.tsx
│   └── overdue-indicator.tsx
├── new/page.tsx                 # Create form
├── [invoiceId]/
│   ├── page.tsx                 # Detail view (read-only post-issue)
│   ├── edit/page.tsx            # Edit form (drafts only)
│   ├── components/
│   │   ├── invoice-form.tsx     # Builder: header + line items
│   │   ├── line-items-editor.tsx
│   │   ├── totals-panel.tsx     # Subtotal, VAT breakdown, total
│   │   ├── payment-list.tsx
│   │   ├── add-payment-dialog.tsx
│   │   ├── activity-log.tsx
│   │   └── send-email-dialog.tsx
│   └── pdf/route.ts             # Stream / signed-URL redirect
└── data/
    └── get-invoice.ts           # Server data fetchers

app/api/invoices/
├── route.ts                          # GET list, POST create
├── [invoiceId]/route.ts              # GET / PATCH / DELETE
├── [invoiceId]/issue/route.ts        # POST: DRAFT → ISSUED (locks, generates PDF, snapshots customer + FX)
├── [invoiceId]/cancel/route.ts
├── [invoiceId]/duplicate/route.ts
├── [invoiceId]/send/route.ts         # POST: email via Resend
├── [invoiceId]/pdf/route.ts          # GET: signed URL or stream
├── [invoiceId]/payments/route.ts     # POST add payment
├── [invoiceId]/payments/[paymentId]/route.ts  # DELETE / PATCH
└── search/route.ts                   # Full-text + filters

app/[locale]/(routes)/admin/invoices/
├── tax-rates/page.tsx
├── series/page.tsx
├── currencies/page.tsx
└── settings/page.tsx                 # Base currency, default series, default tax rate

lib/invoices/
├── numbering.ts            # Atomic next-number for a series (DB transaction + row lock)
├── totals.ts               # Pure functions: line total, vat breakdown, grand total
├── fx.ts                   # Fetch + cache exchange rate at issue time
├── pdf/
│   ├── render.ts           # @react-pdf/renderer entry
│   ├── templates/
│   │   └── default-invoice.tsx
│   └── i18n.ts             # EN/CZ strings for the PDF
├── storage.ts              # MinIO put/get/signed URL wrapper around lib/minio.ts
├── search.ts               # Postgres full-text query builder
└── permissions.ts          # canEdit / canIssue / canCancel guards

actions/invoices/
├── create-invoice.ts
├── update-invoice.ts
├── issue-invoice.ts
├── add-payment.ts
└── send-invoice-email.ts

emails/
└── invoice-email.tsx       # React Email template for send-by-email

prisma/schema.prisma        # New models (see §4)
```

### Module isolation

- **`lib/invoices/`** is a self-contained domain layer. Pure functions for totals/FX/numbering — fully unit-testable without the DB.
- **API routes** are thin: validate input (Zod), call action, return JSON.
- **`actions/invoices/`** orchestrate transactions + permissions + side-effects (PDF, email, audit).
- **UI components** never call Prisma directly — only via server actions or API routes.

## 4. Data Model

All new tables. None of the existing schema is modified except for inverse relations on `crm_Accounts`, `crm_Products`, and `Users`.

```prisma
enum Invoice_Status {
  DRAFT
  ISSUED
  SENT
  PARTIALLY_PAID
  PAID
  OVERDUE          // computed view-state, also persisted on cron sweep
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

  // Numbering
  number                String?          // null while DRAFT, assigned on issue (or manually overridden)
  numberOverridden      Boolean          @default(false)
  seriesId              String?          @db.Uuid
  series                Invoice_Series?  @relation(fields: [seriesId], references: [id])

  // Account + frozen snapshot
  accountId             String           @db.Uuid
  account               crm_Accounts     @relation(fields: [accountId], references: [id])
  billingSnapshot       Json?            // { name, address, vat_id, registration_id, country, ... } captured on issue

  // Dates
  issueDate             DateTime?        // set on issue
  taxableSupplyDate     DateTime?        // DUZP — set on issue, defaults to issueDate
  dueDate               DateTime?

  // Money
  currency              String           @db.VarChar(3)   // ISO 4217
  baseCurrency          String?          @db.VarChar(3)   // tenant base currency at issue time
  fxRateToBase          Decimal?         @db.Decimal(18, 8) // captured on issue

  subtotal              Decimal          @default(0) @db.Decimal(14, 2)
  discountTotal         Decimal          @default(0) @db.Decimal(14, 2)
  vatTotal              Decimal          @default(0) @db.Decimal(14, 2)
  grandTotal            Decimal          @default(0) @db.Decimal(14, 2)
  paidTotal             Decimal          @default(0) @db.Decimal(14, 2)
  balanceDue            Decimal          @default(0) @db.Decimal(14, 2)

  // Bank details (denormalized at issue so changes to tenant settings don't affect old invoices)
  bankName              String?
  bankAccount           String?
  iban                  String?
  swift                 String?
  variableSymbol        String?

  // Notes
  publicNotes           String?          // printed on PDF
  internalNotes         String?          // never printed

  // Credit-note linkage
  originalInvoiceId     String?          @db.Uuid
  originalInvoice       Invoices?        @relation("CreditNoteOf", fields: [originalInvoiceId], references: [id])
  creditNotes           Invoices[]       @relation("CreditNoteOf")

  // PDF storage
  pdfStorageKey         String?          // MinIO key
  pdfGeneratedAt        DateTime?

  // Search
  searchVector          Unsupported("tsvector")?  // populated by trigger

  // Relations
  lineItems             Invoice_LineItems[]
  payments              Invoice_Payments[]
  activity              Invoice_Activity[]
  attachments           Invoice_Attachments[]    // for hybrid uploaded PDFs

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

  position        Int        // ordering within invoice
  productId       String?    @db.Uuid
  product         crm_Products? @relation(fields: [productId], references: [id])

  description     String     // editable; defaults from product.name
  quantity        Decimal    @db.Decimal(14, 4)
  unitPrice       Decimal    @db.Decimal(14, 4)
  discountPercent Decimal    @default(0) @db.Decimal(5, 2)

  taxRateId       String?    @db.Uuid
  taxRate         Invoice_TaxRates? @relation(fields: [taxRateId], references: [id])
  taxRateSnapshot Decimal?   @db.Decimal(5, 2)  // frozen on issue

  lineSubtotal    Decimal    @db.Decimal(14, 2) // (qty * unitPrice) - discount
  lineVat         Decimal    @db.Decimal(14, 2)
  lineTotal       Decimal    @db.Decimal(14, 2) // lineSubtotal + lineVat

  @@index([invoiceId])
}

model Invoice_Payments {
  id          String   @id @default(uuid()) @db.Uuid
  invoiceId   String   @db.Uuid
  invoice     Invoices @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  paidAt      DateTime
  amount      Decimal  @db.Decimal(14, 2)
  method      String?  // free-text or enum later
  reference   String?  // bank reference / transaction id
  note        String?
  createdBy   String   @db.Uuid
  createdAt   DateTime @default(now())

  @@index([invoiceId])
}

model Invoice_Attachments {
  id              String   @id @default(uuid()) @db.Uuid
  invoiceId       String   @db.Uuid
  invoice         Invoices @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  storageKey      String   // MinIO key
  filename        String
  mimeType        String
  size            Int
  uploadedBy      String   @db.Uuid
  uploadedAt      DateTime @default(now())
  isPrimaryPdf    Boolean  @default(false) // true if this is the externally uploaded invoice PDF

  @@index([invoiceId])
}

model Invoice_Activity {
  id          String   @id @default(uuid()) @db.Uuid
  invoiceId   String   @db.Uuid
  invoice     Invoices @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  actorId     String   @db.Uuid
  action      String   // e.g. "STATUS_CHANGED", "PAYMENT_ADDED", "EMAIL_SENT", "PDF_GENERATED"
  meta        Json?
  createdAt   DateTime @default(now())

  @@index([invoiceId])
}

// ===== Admin-managed configuration =====

model Invoice_TaxRates {
  id          String   @id @default(uuid()) @db.Uuid
  name        String   // e.g. "Standard VAT", "Reduced VAT", "Zero"
  rate        Decimal  @db.Decimal(5, 2) // percent: 21.00, 12.00, 0.00
  isDefault   Boolean  @default(false)
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  lineItems   Invoice_LineItems[]
}

model Invoice_Series {
  id              String   @id @default(uuid()) @db.Uuid
  name            String   // e.g. "Main", "EUR Branch", "USD Branch"
  prefixTemplate  String   // e.g. "INV-{YYYY}-{####}"
  resetPolicy     String   @default("YEARLY") // YEARLY | NEVER
  currentYear     Int?
  counter         Int      @default(0)
  isDefault       Boolean  @default(false)
  active          Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  invoices        Invoices[]
}

model Invoice_Currencies {
  code        String   @id @db.VarChar(3) // ISO 4217
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
  swift                String?
  footerText          String?
  updatedAt           DateTime @updatedAt
}
```

### Search

A Postgres `tsvector` column on `Invoices` populated by a trigger that concatenates `number`, `billingSnapshot->>'name'`, `billingSnapshot->>'vat_id'`, and aggregated line item descriptions. GIN-indexed. The `/api/invoices/search` route uses `plainto_tsquery` against this column.

## 5. Key Flows

### 5.1 Create draft

`POST /api/invoices` → action `createInvoice` → inserts header + items in a transaction. Status `DRAFT`, no number assigned, no PDF.

### 5.2 Issue (lock + number + PDF + FX snapshot)

`POST /api/invoices/{id}/issue` → action `issueInvoice`:

1. Validate the invoice has account, items, dates.
2. **Within a serializable transaction:**
   - Row-lock the chosen `Invoice_Series` (`SELECT ... FOR UPDATE`).
   - Reset counter if `resetPolicy=YEARLY` and year changed.
   - Increment counter, format prefix template, write `Invoices.number`.
   - Snapshot `crm_Accounts` → `Invoices.billingSnapshot`.
   - Snapshot per-line `taxRateSnapshot` from current rate row.
   - Recompute totals (server-side, never trust client).
   - Fetch FX rate (base currency from `Invoice_Settings`) → store in `fxRateToBase`.
   - Set `status=ISSUED`, `issueDate=now`, `taxableSupplyDate=now` if null.
3. **Outside the transaction:** render PDF via `@react-pdf/renderer`, upload to MinIO, write `pdfStorageKey`/`pdfGeneratedAt`, append `Invoice_Activity` row.

After issue, the invoice is **immutable** except for status transitions, payment additions, and notes.

### 5.3 Send by email

`POST /api/invoices/{id}/send` → fetches PDF from MinIO, sends via Resend with the React Email template, marks `status=SENT`, logs activity.

### 5.4 Add payment

`POST /api/invoices/{id}/payments` → inserts row, recomputes `paidTotal`/`balanceDue`, transitions status to `PARTIALLY_PAID` or `PAID`.

### 5.5 Overdue sweep

A cron job (or computed view) marks `ISSUED`/`SENT`/`PARTIALLY_PAID` invoices with `dueDate < today` as `OVERDUE`. Reversible if a payment lands.

### 5.6 Cancel / credit note

Cancelling an `ISSUED` invoice is **not** allowed in most jurisdictions — the user creates a `CREDIT_NOTE` linked to the original instead. `CANCELLED` status is only valid from `DRAFT`.

### 5.7 Hybrid: upload external PDF

User picks "Upload PDF" in the form → file goes to `Invoice_Attachments` with `isPrimaryPdf=true`. The download endpoint returns the uploaded file instead of the generated one when present.

## 6. Permissions

- **Any authenticated user** can create and view invoices they created.
- **Admins** can view/edit all invoices.
- **Drafts** are editable by creator + admins.
- **Issued+ invoices** are immutable except: status transitions, payment add/remove (admins only for delete), notes editing.
- Admin-managed configuration (`Invoice_TaxRates`, `Invoice_Series`, `Invoice_Currencies`, `Invoice_Settings`) requires admin role.

Guards live in `lib/invoices/permissions.ts` and are called from every action.

## 7. Error Handling

- All numeric math uses `Decimal` (never `number`) to avoid float drift.
- Transaction failures during `issue` roll back number assignment — counter is only consumed on commit.
- PDF generation failures do NOT roll back the issue (the invoice is legally issued); they leave `pdfStorageKey=null`, log to activity, and a "Regenerate PDF" button is exposed in the UI.
- FX fetch failure on issue → fail the issue with a clear error (don't issue without FX rate if `baseCurrency` is set).
- Resend email failures are surfaced to the user but don't change invoice status.

## 8. Testing Strategy

- **Unit tests** (`lib/invoices/totals.ts`, `numbering.ts`, `fx.ts`, `permissions.ts`) — pure functions, deterministic.
- **Integration tests** for actions: `issueInvoice` concurrency (two parallel issues compete for the same number), payment-driven status transitions, immutability guards.
- **API route tests** for happy path + 401/403/422.
- **PDF snapshot test** — render a fixture invoice, compare PDF bytes (or text extraction) to a golden file.
- **E2E (Playwright)**: create draft → add items → issue → download PDF → add payment → mark paid.

## 9. Migration Plan

1. Add Prisma models, run `prisma migrate dev` locally only first.
2. Seed `Invoice_Currencies` with the top ~30 ISO 4217 codes.
3. Seed one default `Invoice_Series` (`Main`, `INV-{YYYY}-{####}`) and three default `Invoice_TaxRates` (0%, 12%, 21%) — admin can rename/disable.
4. Backfill `Invoice_Settings` with `baseCurrency=USD` (admin changes after).
5. No data migration needed (new module, empty tables).

## 10. UX Notes

- Sidebar entry "Invoices" placed between **CRM** and **Documents**, icon `FileText` (lucide).
- List view defaults: filter `status != CANCELLED`, sort by `issueDate desc`, overdue rows highlighted.
- Form is a two-column layout: left = header (account picker, dates, series, currency), right = totals panel that recomputes live as line items change.
- Status transitions are buttons on the detail view, gated by permission + current status.
- Internationalization: all UI strings via `next-intl`; PDF template has its own EN/CZ string bundle (selected per invoice based on customer locale or tenant default).

## 11. Open Questions

None at design time — to be raised during implementation if discovered.

## 12. Follow-Up Issues

Tracked separately:

- #168 Recurring invoice schedules
- #169 Online payment gateway integration (Stripe)
- #170 Accounting export (ISDOC / XML for tax authority)
- #171 Reminders / dunning automation
- #172 Inventory / stock decrement on issue
