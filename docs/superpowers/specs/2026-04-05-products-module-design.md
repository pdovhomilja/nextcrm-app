# Products Module Design (Phase 1)

**Date:** 2026-04-05
**Status:** Approved
**Scope:** Phase 1 -- Standalone product/service catalog with account assignments and bulk import

## Overview

Add a Products module to the CRM that serves as a master catalog of products and services the company offers. Members can create, manage, and categorize items; assign them to Accounts with lifecycle tracking; and bulk-import via CSV.

### Out of Scope (Phase 2)

- Line items on Opportunities/Contracts
- Price books / tier pricing
- Invoicing/quoting integration
- Hierarchical categories

## Prisma Schema

### Enums

```prisma
enum crm_Product_Type {
  PRODUCT
  SERVICE
}

enum crm_Product_Status {
  DRAFT
  ACTIVE
  ARCHIVED
}

enum crm_Billing_Period {
  MONTHLY
  QUARTERLY
  ANNUALLY
  ONE_TIME
}

enum crm_AccountProduct_Status {
  ACTIVE
  EXPIRED
  CANCELLED
  PENDING
}
```

### `crm_ProductCategories`

```prisma
model crm_ProductCategories {
  id          String   @id @default(cuid())
  name        String
  description String?
  order       Int      @default(0)
  isActive    Boolean  @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  createdBy String
  updatedBy String?

  products crm_Products[]

  @@index([isActive])
}
```

### `crm_Products`

```prisma
model crm_Products {
  id          String              @id @default(cuid())
  name        String
  description String?             @db.Text
  sku         String?             @unique
  type        crm_Product_Type
  status      crm_Product_Status  @default(DRAFT)

  unit_price  Decimal             @db.Decimal(18, 2)
  unit_cost   Decimal?            @db.Decimal(18, 2)
  currency    String              @db.VarChar(3)
  tax_rate    Decimal?            @db.Decimal(5, 2)
  unit        String?             // e.g., "per hour", "per license", "per unit"

  is_recurring    Boolean              @default(false)
  billing_period  crm_Billing_Period?

  categoryId String?

  v         Int       @default(0) @map("__v")
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  createdBy String
  updatedBy String?
  deletedAt DateTime?
  deletedBy String?

  // Relations
  category       crm_ProductCategories? @relation(fields: [categoryId], references: [id])
  currencyRef    currency               @relation(fields: [currency], references: [code])
  createdByUser  users                  @relation("ProductCreatedBy", fields: [createdBy], references: [id])
  accountProducts crm_AccountProducts[]

  @@index([status])
  @@index([type])
  @@index([categoryId])
  @@index([createdBy])
  @@index([deletedAt])
}
```

### `crm_AccountProducts`

```prisma
model crm_AccountProducts {
  id          String                    @id @default(cuid())
  accountId   String
  productId   String
  quantity    Int                        @default(1)

  custom_price  Decimal?               @db.Decimal(18, 2)
  currency      String                 @db.VarChar(3)
  snapshot_rate Decimal?               @db.Decimal(18, 8)

  status      crm_AccountProduct_Status @default(ACTIVE)
  start_date  DateTime
  end_date    DateTime?
  renewal_date DateTime?
  notes       String?                   @db.Text

  v         Int       @default(0) @map("__v")
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  createdBy String
  updatedBy String?

  // Relations
  account     crm_Accounts  @relation(fields: [accountId], references: [id])
  product     crm_Products  @relation(fields: [productId], references: [id])
  currencyRef currency      @relation(fields: [currency], references: [code])

  @@index([accountId])
  @@index([productId])
  @@index([status])
  @@index([accountId, productId])
}
```

## Module Structure

### File Layout

```
app/[locale]/(routes)/crm/products/
├── page.tsx                          # List view with data-table
├── [productId]/
│   └── page.tsx                      # Detail view with tabs
├── components/
│   ├── NewProductForm.tsx
│   └── UpdateProductForm.tsx
└── table-components/
    ├── data-table.tsx
    ├── columns.tsx
    ├── data-table-toolbar.tsx
    └── data-table-row-actions.tsx

actions/crm/products/
├── create-product.ts
├── update-product.ts
├── delete-product.ts
├── get-products.ts
└── import-products.ts

actions/crm/account-products/
├── assign-product.ts
├── update-assignment.ts
├── remove-assignment.ts
└── get-account-products.ts
```

### Product Detail Page Tabs

| Tab | Content |
|-----|---------|
| **Basic** | Product info, pricing, category, type, billing |
| **Accounts** | Which accounts have this product assigned (with status, dates) |
| **Activity** | Audit log of changes |

### Account Detail Page (existing module, new tab)

A new **Products** tab is added to the Account detail page showing assigned products with assign/remove actions.

### CRM Sidebar

Add "Products" entry to CRM sidebar navigation.

## Zod Validation Schemas

### Product Create

```typescript
{
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  sku: z.string().max(100).optional(),
  type: z.nativeEnum(crm_Product_Type),
  status: z.nativeEnum(crm_Product_Status),
  unit_price: z.coerce.number().min(0),
  unit_cost: z.coerce.number().min(0).optional(),
  currency: z.string().length(3),
  tax_rate: z.coerce.number().min(0).max(100).optional(),
  unit: z.string().max(50).optional(),
  is_recurring: z.boolean().default(false),
  billing_period: z.nativeEnum(crm_Billing_Period).optional(),
  categoryId: z.string().cuid().optional(),
}
```

### Product Update

Same fields as create, all optional except `id`.

### Account Assignment Create

```typescript
{
  accountId: z.string().cuid(),
  productId: z.string().cuid(),
  quantity: z.coerce.number().int().min(1).default(1),
  custom_price: z.coerce.number().min(0).optional(),
  currency: z.string().length(3),
  status: z.nativeEnum(crm_AccountProduct_Status),
  start_date: z.coerce.date(),
  end_date: z.coerce.date().optional(),
  renewal_date: z.coerce.date().optional(),
  notes: z.string().max(1000).optional(),
}
```

### Account Assignment Update

Same fields as create, all optional except `id`.

### Account Assignment Remove

Sets status to `CANCELLED` (not hard delete).

## Business Rules

### Product Validation

| Rule | Detail |
|------|--------|
| `name` | Required, min 1 char, max 255 |
| `sku` | Optional but unique across all products (case-insensitive) |
| `unit_price` | Required, >= 0 |
| `unit_cost` | Optional, >= 0 when provided |
| `type` | Required, must be `PRODUCT` or `SERVICE` |
| `status` | Defaults to `DRAFT` on create. Only `ACTIVE` products can be assigned to accounts |
| `billing_period` | Required when `is_recurring` is true, null when false |
| `currency` | Required, must reference an enabled currency |

### Account Assignment Validation

| Rule | Detail |
|------|--------|
| Duplicate check | Same product cannot be assigned to same account twice with `ACTIVE` or `PENDING` status |
| `start_date` | Required |
| `end_date` | Must be after `start_date` when provided |
| `renewal_date` | Must be after `start_date` when provided |
| `quantity` | Required, >= 1 |
| `custom_price` | Optional, >= 0 when provided |
| Product status | Only `ACTIVE` products can be assigned |
| Currency | Defaults to product's currency; snapshot rate captured at assignment time |

### Soft Delete

- Deleting a product sets `deletedAt` + `deletedBy` (not hard delete)
- Deleted products are hidden from catalog and import but remain visible on existing account assignments
- Bulk import skips rows where SKU matches a soft-deleted product

## Bulk Import

### Flow

1. User clicks "Import Products" button on the products list page
2. User downloads CSV template (pre-filled headers + 2 example rows)
3. User uploads filled CSV
4. App parses, validates, shows preview table with row-level error highlighting
5. User confirms -- server action creates products in a single transaction
6. Summary shown: X created, Y skipped (with reasons)

### CSV Template Columns

`name, sku, type, category, description, unit_price, unit_cost, currency, tax_rate, unit, is_recurring, billing_period`

### Import Rules

| Rule | Detail |
|------|--------|
| Duplicate SKU in file | Reject the duplicate row, keep the first |
| SKU already exists in DB | Skip row, report as "already exists" |
| Missing required fields | Skip row, report which fields are missing |
| Invalid category name | Skip row, report "unknown category" |
| Invalid currency code | Skip row, report "unknown currency" |
| Transaction | All valid rows inserted in a single transaction |
| Limit | Max 500 rows per import |

## Server Actions Pattern

Following existing codebase conventions:

- Each action uses `getServerSession` for auth
- Validates input with Zod `.safeParse()`
- Captures `snapshot_rate` via existing `getSnapshotRate()` on assignment
- Calls `revalidatePath` on mutations
- Returns `{ success, message }` or `{ error, message }`
- Emits Inngest events for async processing

## Data Fetching

- `get-products.ts` returns products with category included, filtered by `deletedAt === null`. Supports filters: `status`, `type`, `categoryId`, search by `name`/`sku`.
- `get-account-products.ts` returns assignments for a given account with product details included.
