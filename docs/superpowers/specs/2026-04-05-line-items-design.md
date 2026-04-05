# Line Items on Opportunities & Contracts Design (Phase 2)

**Date:** 2026-04-05
**Status:** Approved
**Scope:** Add product line items to Opportunities and Contracts with auto-calculated totals, per-line discounts, and product snapshots

## Overview

Extend the Opportunities and Contracts modules to support product line items. When line items are present, the parent entity's total (`expected_revenue` for Opportunities, `value` for Contracts) is auto-calculated as the sum of all line item totals. Line items store a snapshot of product data at creation time for historical accuracy.

### Out of Scope

- Price books / tier pricing
- Invoicing/quoting integration
- Hierarchical categories
- Drag-and-drop reordering (sort_order is set via form)
- Cross-currency line item copying

## Prisma Schema

### Enum

```prisma
enum crm_Discount_Type {
  PERCENTAGE
  FIXED
}
```

### `crm_OpportunityLineItems`

```prisma
model crm_OpportunityLineItems {
  id             String            @id @default(uuid()) @db.Uuid
  opportunityId  String            @db.Uuid
  productId      String?           @db.Uuid

  name           String
  sku            String?
  description    String?           @db.Text
  quantity       Int               @default(1)
  unit_price     Decimal           @db.Decimal(18, 2)
  discount_type  crm_Discount_Type @default(PERCENTAGE)
  discount_value Decimal           @default(0) @db.Decimal(18, 2)
  line_total     Decimal           @db.Decimal(18, 2)
  currency       String            @db.VarChar(3)
  sort_order     Int               @default(0)

  v         Int       @default(0) @map("__v")
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  createdBy String    @db.Uuid
  updatedBy String?   @db.Uuid

  opportunity crm_Opportunities @relation(fields: [opportunityId], references: [id])
  product     crm_Products?     @relation(fields: [productId], references: [id])

  @@index([opportunityId])
  @@index([productId])
}
```

### `crm_ContractLineItems`

```prisma
model crm_ContractLineItems {
  id          String            @id @default(uuid()) @db.Uuid
  contractId  String            @db.Uuid
  productId   String?           @db.Uuid

  name           String
  sku            String?
  description    String?           @db.Text
  quantity       Int               @default(1)
  unit_price     Decimal           @db.Decimal(18, 2)
  discount_type  crm_Discount_Type @default(PERCENTAGE)
  discount_value Decimal           @default(0) @db.Decimal(18, 2)
  line_total     Decimal           @db.Decimal(18, 2)
  currency       String            @db.VarChar(3)
  sort_order     Int               @default(0)

  v         Int       @default(0) @map("__v")
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  createdBy String    @db.Uuid
  updatedBy String?   @db.Uuid

  contract crm_Contracts @relation(fields: [contractId], references: [id])
  product  crm_Products? @relation(fields: [productId], references: [id])

  @@index([contractId])
  @@index([productId])
}
```

### Reverse Relations

Add to `crm_Opportunities`:
```prisma
lineItems crm_OpportunityLineItems[]
```

Add to `crm_Contracts`:
```prisma
lineItems crm_ContractLineItems[]
```

Add to `crm_Products`:
```prisma
opportunityLineItems crm_OpportunityLineItems[]
contractLineItems    crm_ContractLineItems[]
```

## Line Total Calculation

Stored as a denormalized field, calculated server-side on create/update:

- `PERCENTAGE`: `line_total = (quantity * unit_price) * (1 - discount_value / 100)`
- `FIXED`: `line_total = (quantity * unit_price) - discount_value`
- `line_total` is clamped to a minimum of 0 (never negative)

### Parent Total Auto-Calculation

- When line items exist: parent `expected_revenue` (Opportunity) or `value` (Contract) = SUM of all `line_total` values
- When no line items exist: parent total stays at its current value and is manually editable
- Recalculation happens in the same server action as the line item mutation

## Module Structure

### File Layout

```
actions/crm/opportunity-line-items/
├── add-line-item/
│   ├── schema.ts
│   ├── types.ts
│   └── index.ts
├── update-line-item/
│   ├── schema.ts
│   ├── types.ts
│   └── index.ts
├── remove-line-item/index.ts
├── reorder-line-items/index.ts
└── get-line-items.ts

actions/crm/contract-line-items/
├── add-line-item/
│   ├── schema.ts
│   ├── types.ts
│   └── index.ts
├── update-line-item/
│   ├── schema.ts
│   ├── types.ts
│   └── index.ts
├── remove-line-item/index.ts
├── reorder-line-items/index.ts
├── copy-from-opportunity/index.ts
└── get-line-items.ts

lib/line-items.ts                     # Shared calculation helper
```

### Shared Helper: `lib/line-items.ts`

```typescript
calculateLineTotal(quantity: number, unit_price: number, discount_type: string, discount_value: number): number
recalculateParentTotal(lineItems: { line_total: number }[]): number
```

### UI Components

```
app/[locale]/(routes)/crm/components/line-items/
├── LineItemsTable.tsx                # Shared table component
├── AddLineItemForm.tsx               # FormSheet for adding line items
└── EditLineItemForm.tsx              # FormSheet for editing line items
```

These shared components are used by both Opportunity and Contract detail pages.

## Server Action Behavior

### Add Line Item

1. Look up product by ID (if provided), snapshot `name`, `sku`, `unit_price`
2. Allow overriding `unit_price` (custom pricing) and `name`/`description`
3. Calculate `line_total` using shared helper
4. Create line item record
5. Recalculate parent's `expected_revenue` or `value` (SUM of all line_totals)
6. Audit log + revalidate path

### Update Line Item

1. Update quantity, unit_price, discount, description, sort_order
2. Recalculate `line_total`
3. Recalculate parent total
4. Audit log + revalidate

### Remove Line Item

1. Hard delete (line items are part of the parent entity, not standalone)
2. Recalculate parent total
3. Audit log + revalidate

### Reorder Line Items

1. Accept array of `{ id, sort_order }` pairs
2. Batch update sort_order values in a transaction
3. Revalidate

### Copy from Opportunity (Contract only)

1. Accept `opportunityId` as source
2. Validate: contract and opportunity must have the same currency (block if mismatch)
3. Fetch all opportunity line items
4. Create matching contract line items (new IDs, same snapshot data)
5. Appends to existing contract line items (does not replace)
6. Recalculate contract `value`

## Zod Validation Schemas

### Add Line Item

```typescript
{
  parentId: z.string(),              // opportunityId or contractId
  productId: z.string().optional(),  // null for custom line items
  name: z.string().min(1).max(255),
  sku: z.string().optional(),
  description: z.string().optional(),
  quantity: z.coerce.number().int().min(1).default(1),
  unit_price: z.string(),            // parsed as Decimal
  discount_type: z.enum(["PERCENTAGE", "FIXED"]).default("PERCENTAGE"),
  discount_value: z.string().default("0"),
  sort_order: z.coerce.number().int().default(0),
}
```

### Update Line Item

Same fields as add, all optional except `id`. `productId` is not updatable.

### Reorder Line Items

```typescript
{
  items: z.array(z.object({
    id: z.string(),
    sort_order: z.coerce.number().int(),
  })),
}
```

### Copy from Opportunity

```typescript
{
  contractId: z.string(),
  opportunityId: z.string(),
}
```

## UI Integration

### LineItemsTable Component

| Column | Content |
|--------|---------|
| # | sort_order |
| Product | name (SKU in smaller text below if present) |
| Qty | quantity |
| Unit Price | formatted with currency |
| Discount | formatted as "10%" or "$50" depending on type |
| Line Total | formatted with currency, bold |
| Actions | Edit / Remove buttons |

**Footer row:** Subtotal (sum of all line totals)

### Add Line Item Form

- Product select (searchable dropdown, ACTIVE products only). On selection: auto-fills name, SKU, unit_price from product
- Name (pre-filled, editable)
- Description (optional)
- Quantity (number, default 1)
- Unit Price (pre-filled from product, editable)
- Discount Type (select: None / Percentage / Fixed). "None" maps to PERCENTAGE with value 0
- Discount Value (shown when discount type is not None)
- Computed line total preview at bottom of form

### Edit Line Item Form

Same fields, pre-populated. Product select is read-only.

### Opportunity Detail Page

New "Line Items" section added in the Overview tab, after BasicView and before ActivitiesSection:
- LineItemsTable + "+" Add button
- BasicView's `expected_revenue` display gets "(auto)" label when line items exist

### Contract Detail Page

Same pattern:
- LineItemsTable + "+" Add button + "Copy from Opportunity" button
- BasicView's `value` display gets "(auto)" label when line items exist

## Business Rules

### Line Item Validation

| Rule | Detail |
|------|--------|
| `name` | Required, max 255 chars |
| `quantity` | Required, >= 1 |
| `unit_price` | Required, >= 0 |
| `discount_type` | Defaults to PERCENTAGE with discount_value 0 |
| `discount_value` | >= 0. When PERCENTAGE, must be <= 100 |
| `line_total` | Server-calculated, clamped to min 0 |
| `productId` | Optional (allows custom line items not backed by a product) |
| `currency` | Inherited from parent entity, not user-selectable per line |

### Parent Total Rules

| Rule | Detail |
|------|--------|
| No line items | Total stays at current value, manually editable |
| Has line items | Total = SUM(line_totals), read-only in UI |
| Line item mutated | Parent total recalculated immediately in same server action |

### Copy from Opportunity Rules

| Rule | Detail |
|------|--------|
| Currency mismatch | Block copy, show error |
| Existing line items | Appends (does not replace) |
| Snapshots | Copied as-is (original quoted prices, not current product prices) |

### Edge Cases

| Case | Behavior |
|------|----------|
| Product deleted after line item created | Line item unaffected, uses snapshot. Nullable FK. |
| Product price changed | No effect, snapshot is immutable |
| All line items removed | Parent total keeps last value, reverts to manual mode |
| 100% discount | Allowed, line_total = 0 |
| FIXED discount > line value | line_total clamped to 0 |
