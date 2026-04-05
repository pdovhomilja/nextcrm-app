# Line Items Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add product line items to Opportunities and Contracts with auto-calculated totals, per-line discounts, and product snapshots.

**Architecture:** Two new Prisma models (`crm_OpportunityLineItems`, `crm_ContractLineItems`) with product snapshot fields and a shared calculation helper in `lib/line-items.ts`. Server actions follow the existing `createSafeAction` pattern. A shared `LineItemsSection` client component is used on both Opportunity and Contract detail pages. Parent totals (`expected_revenue`, `value`) are auto-recalculated after each line item mutation.

**Tech Stack:** Next.js (App Router), Prisma, Zod, TanStack Table (not needed — simple table), shadcn/ui (Card, Table, Dialog, FormSheet), next-intl, Sonner (toasts)

**Spec:** `docs/superpowers/specs/2026-04-05-line-items-design.md`

---

## Task 1: Prisma Schema — Enum and Line Item Models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the discount type enum**

Add after the existing `crm_AccountProduct_Status` enum:

```prisma
enum crm_Discount_Type {
  PERCENTAGE
  FIXED
}
```

- [ ] **Step 2: Add `crm_OpportunityLineItems` model**

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

- [ ] **Step 3: Add `crm_ContractLineItems` model**

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

- [ ] **Step 4: Add reverse relations to existing models**

Add to `crm_Opportunities` model (inside the model block, alongside existing relations):
```prisma
  lineItems crm_OpportunityLineItems[]
```

Add to `crm_Contracts` model:
```prisma
  lineItems crm_ContractLineItems[]
```

Add to `crm_Products` model:
```prisma
  opportunityLineItems crm_OpportunityLineItems[]
  contractLineItems    crm_ContractLineItems[]
```

- [ ] **Step 5: Generate Prisma client and create migration**

Run:
```bash
pnpm prisma generate
pnpm prisma migrate dev --name add_line_items
```

- [ ] **Step 6: Commit**

```bash
git add prisma/
git commit -m "feat(line-items): add Prisma schema for Opportunity and Contract line items"
```

---

## Task 2: Shared Calculation Helper

**Files:**
- Create: `lib/line-items.ts`

- [ ] **Step 1: Create the shared helper**

Create `lib/line-items.ts`:

```typescript
/**
 * Shared line item calculation utilities.
 * Used by both Opportunity and Contract line item actions.
 */

export function calculateLineTotal(
  quantity: number,
  unitPrice: number,
  discountType: "PERCENTAGE" | "FIXED",
  discountValue: number
): number {
  const subtotal = quantity * unitPrice;
  let total: number;

  if (discountType === "PERCENTAGE") {
    total = subtotal * (1 - discountValue / 100);
  } else {
    total = subtotal - discountValue;
  }

  // Clamp to minimum 0
  return Math.max(0, Math.round(total * 100) / 100);
}

export function sumLineTotals(
  lineItems: { line_total: number | { toNumber?: () => number } }[]
): number {
  return lineItems.reduce((sum, item) => {
    const total =
      typeof item.line_total === "number"
        ? item.line_total
        : typeof item.line_total === "object" &&
          item.line_total !== null &&
          "toNumber" in item.line_total &&
          typeof item.line_total.toNumber === "function"
        ? item.line_total.toNumber()
        : 0;
    return sum + total;
  }, 0);
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/line-items.ts
git commit -m "feat(line-items): add shared calculation helper"
```

---

## Task 3: Opportunity Line Item Server Actions

**Files:**
- Create: `actions/crm/opportunity-line-items/add-line-item/schema.ts`
- Create: `actions/crm/opportunity-line-items/add-line-item/types.ts`
- Create: `actions/crm/opportunity-line-items/add-line-item/index.ts`
- Create: `actions/crm/opportunity-line-items/update-line-item/schema.ts`
- Create: `actions/crm/opportunity-line-items/update-line-item/types.ts`
- Create: `actions/crm/opportunity-line-items/update-line-item/index.ts`
- Create: `actions/crm/opportunity-line-items/remove-line-item/index.ts`
- Create: `actions/crm/opportunity-line-items/reorder-line-items/index.ts`
- Create: `actions/crm/opportunity-line-items/get-line-items.ts`
- Modify: `lib/audit-log.ts` (add entity types)

- [ ] **Step 1: Add audit log entity types**

Modify `lib/audit-log.ts` — add `"opportunity_line_item"` and `"contract_line_item"` to the `AuditEntityType` union:

```typescript
export type AuditEntityType =
  | "account"
  | "contact"
  | "lead"
  | "opportunity"
  | "contract"
  | "product"
  | "account_product"
  | "opportunity_line_item"
  | "contract_line_item";
```

- [ ] **Step 2: Create add line item schema**

Create `actions/crm/opportunity-line-items/add-line-item/schema.ts`:

```typescript
import { z } from "zod";

export const AddOpportunityLineItem = z.object({
  opportunityId: z.string(),
  productId: z.string().optional(),
  name: z.string().min(1).max(255),
  sku: z.string().optional(),
  description: z.string().optional(),
  quantity: z.coerce.number().int().min(1).default(1),
  unit_price: z.string(),
  discount_type: z.enum(["PERCENTAGE", "FIXED"]).default("PERCENTAGE"),
  discount_value: z.string().default("0"),
  sort_order: z.coerce.number().int().default(0),
});
```

- [ ] **Step 3: Create add line item types**

Create `actions/crm/opportunity-line-items/add-line-item/types.ts`:

```typescript
import { z } from "zod";
import { ActionState } from "@/lib/create-safe-action";
import { AddOpportunityLineItem } from "./schema";

type LineItem = { id: string };

export type InputType = z.infer<typeof AddOpportunityLineItem>;
export type ReturnType = ActionState<InputType, LineItem>;
```

- [ ] **Step 4: Create add line item server action**

Create `actions/crm/opportunity-line-items/add-line-item/index.ts`:

```typescript
"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { AddOpportunityLineItem } from "./schema";
import { InputType, ReturnType } from "./types";
import { createSafeAction } from "@/lib/create-safe-action";
import { writeAuditLog } from "@/lib/audit-log";
import { revalidatePath } from "next/cache";
import { calculateLineTotal, sumLineTotals } from "@/lib/line-items";

const handler = async (data: InputType): Promise<ReturnType> => {
  const session = await getSession();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const userId = session.user.id;
  const {
    opportunityId, productId, name, sku, description,
    quantity, unit_price, discount_type, discount_value, sort_order,
  } = data;

  try {
    // Get opportunity for currency
    const opportunity = await prismadb.crm_Opportunities.findUnique({
      where: { id: opportunityId },
    });
    if (!opportunity || opportunity.deletedAt) {
      return { error: "Opportunity not found" };
    }

    // Snapshot product data if productId provided
    let snapshotName = name;
    let snapshotSku = sku;
    let snapshotPrice = parseFloat(unit_price);

    if (productId) {
      const product = await prismadb.crm_Products.findUnique({
        where: { id: productId },
      });
      if (product && !product.deletedAt && product.status === "ACTIVE") {
        snapshotName = name || product.name;
        snapshotSku = sku || product.sku || undefined;
        // Use provided unit_price if set, otherwise snapshot from product
        if (!unit_price || unit_price === "0") {
          snapshotPrice = Number(product.unit_price);
        }
      }
    }

    // Validate discount
    const discountVal = parseFloat(discount_value) || 0;
    if (discount_type === "PERCENTAGE" && discountVal > 100) {
      return { error: "Percentage discount cannot exceed 100%" };
    }

    const lineTotal = calculateLineTotal(quantity, snapshotPrice, discount_type, discountVal);

    const lineItem = await prismadb.crm_OpportunityLineItems.create({
      data: {
        opportunityId,
        productId: productId || undefined,
        name: snapshotName,
        sku: snapshotSku || undefined,
        description: description || undefined,
        quantity,
        unit_price: snapshotPrice,
        discount_type,
        discount_value: discountVal,
        line_total: lineTotal,
        currency: opportunity.currency || "EUR",
        sort_order,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    // Recalculate opportunity expected_revenue
    const allLineItems = await prismadb.crm_OpportunityLineItems.findMany({
      where: { opportunityId },
    });
    const newTotal = sumLineTotals(allLineItems);
    await prismadb.crm_Opportunities.update({
      where: { id: opportunityId },
      data: { expected_revenue: newTotal },
    });

    await writeAuditLog({
      entityType: "opportunity_line_item",
      entityId: lineItem.id,
      action: "created",
      changes: null,
      userId,
    });

    revalidatePath("/[locale]/(routes)/crm/opportunities/[opportunityId]", "page");
    return { data: { id: lineItem.id } };
  } catch (error) {
    console.log("[ADD_OPPORTUNITY_LINE_ITEM]", error);
    return { error: "Failed to add line item" };
  }
};

export const addOpportunityLineItem = createSafeAction(AddOpportunityLineItem, handler);
```

- [ ] **Step 5: Create update line item schema**

Create `actions/crm/opportunity-line-items/update-line-item/schema.ts`:

```typescript
import { z } from "zod";

export const UpdateOpportunityLineItem = z.object({
  id: z.string(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  quantity: z.coerce.number().int().min(1).optional(),
  unit_price: z.string().optional(),
  discount_type: z.enum(["PERCENTAGE", "FIXED"]).optional(),
  discount_value: z.string().optional(),
  sort_order: z.coerce.number().int().optional(),
});
```

- [ ] **Step 6: Create update line item types**

Create `actions/crm/opportunity-line-items/update-line-item/types.ts`:

```typescript
import { z } from "zod";
import { ActionState } from "@/lib/create-safe-action";
import { UpdateOpportunityLineItem } from "./schema";

type LineItem = { id: string };

export type InputType = z.infer<typeof UpdateOpportunityLineItem>;
export type ReturnType = ActionState<InputType, LineItem>;
```

- [ ] **Step 7: Create update line item server action**

Create `actions/crm/opportunity-line-items/update-line-item/index.ts`:

```typescript
"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { UpdateOpportunityLineItem } from "./schema";
import { InputType, ReturnType } from "./types";
import { createSafeAction } from "@/lib/create-safe-action";
import { writeAuditLog } from "@/lib/audit-log";
import { revalidatePath } from "next/cache";
import { calculateLineTotal, sumLineTotals } from "@/lib/line-items";

const handler = async (data: InputType): Promise<ReturnType> => {
  const session = await getSession();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const userId = session.user.id;
  const { id, ...updateData } = data;

  try {
    const existing = await prismadb.crm_OpportunityLineItems.findUnique({
      where: { id },
    });
    if (!existing) {
      return { error: "Line item not found" };
    }

    const qty = updateData.quantity ?? existing.quantity;
    const price = updateData.unit_price
      ? parseFloat(updateData.unit_price)
      : Number(existing.unit_price);
    const discType = updateData.discount_type ?? existing.discount_type;
    const discVal = updateData.discount_value !== undefined
      ? parseFloat(updateData.discount_value)
      : Number(existing.discount_value);

    if (discType === "PERCENTAGE" && discVal > 100) {
      return { error: "Percentage discount cannot exceed 100%" };
    }

    const lineTotal = calculateLineTotal(qty, price, discType, discVal);

    const lineItem = await prismadb.crm_OpportunityLineItems.update({
      where: { id },
      data: {
        ...(updateData.name !== undefined && { name: updateData.name }),
        ...(updateData.description !== undefined && { description: updateData.description }),
        ...(updateData.quantity !== undefined && { quantity: updateData.quantity }),
        ...(updateData.unit_price !== undefined && { unit_price: price }),
        ...(updateData.discount_type !== undefined && { discount_type: updateData.discount_type }),
        ...(updateData.discount_value !== undefined && { discount_value: discVal }),
        ...(updateData.sort_order !== undefined && { sort_order: updateData.sort_order }),
        line_total: lineTotal,
        updatedBy: userId,
        v: { increment: 1 },
      },
    });

    // Recalculate opportunity expected_revenue
    const allLineItems = await prismadb.crm_OpportunityLineItems.findMany({
      where: { opportunityId: existing.opportunityId },
    });
    const newTotal = sumLineTotals(allLineItems);
    await prismadb.crm_Opportunities.update({
      where: { id: existing.opportunityId },
      data: { expected_revenue: newTotal },
    });

    await writeAuditLog({
      entityType: "opportunity_line_item",
      entityId: lineItem.id,
      action: "updated",
      changes: null,
      userId,
    });

    revalidatePath("/[locale]/(routes)/crm/opportunities/[opportunityId]", "page");
    return { data: { id: lineItem.id } };
  } catch (error) {
    console.log("[UPDATE_OPPORTUNITY_LINE_ITEM]", error);
    return { error: "Failed to update line item" };
  }
};

export const updateOpportunityLineItem = createSafeAction(UpdateOpportunityLineItem, handler);
```

- [ ] **Step 8: Create remove line item server action**

Create `actions/crm/opportunity-line-items/remove-line-item/index.ts`:

```typescript
"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { revalidatePath } from "next/cache";
import { sumLineTotals } from "@/lib/line-items";

export const removeOpportunityLineItem = async (id: string) => {
  const session = await getSession();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const lineItem = await prismadb.crm_OpportunityLineItems.findUnique({
      where: { id },
    });
    if (!lineItem) {
      return { error: "Line item not found" };
    }

    await prismadb.crm_OpportunityLineItems.delete({ where: { id } });

    // Recalculate opportunity expected_revenue
    const remaining = await prismadb.crm_OpportunityLineItems.findMany({
      where: { opportunityId: lineItem.opportunityId },
    });
    if (remaining.length > 0) {
      const newTotal = sumLineTotals(remaining);
      await prismadb.crm_Opportunities.update({
        where: { id: lineItem.opportunityId },
        data: { expected_revenue: newTotal },
      });
    }
    // If no remaining line items, keep current value (manual mode)

    await writeAuditLog({
      entityType: "opportunity_line_item",
      entityId: id,
      action: "deleted",
      changes: null,
      userId: session.user.id,
    });

    revalidatePath("/[locale]/(routes)/crm/opportunities/[opportunityId]", "page");
    return { data: { id } };
  } catch (error) {
    console.log("[REMOVE_OPPORTUNITY_LINE_ITEM]", error);
    return { error: "Failed to remove line item" };
  }
};
```

- [ ] **Step 9: Create reorder line items server action**

Create `actions/crm/opportunity-line-items/reorder-line-items/index.ts`:

```typescript
"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const reorderOpportunityLineItems = async (
  items: { id: string; sort_order: number }[]
) => {
  const session = await getSession();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    await prismadb.$transaction(
      items.map((item) =>
        prismadb.crm_OpportunityLineItems.update({
          where: { id: item.id },
          data: { sort_order: item.sort_order },
        })
      )
    );

    revalidatePath("/[locale]/(routes)/crm/opportunities/[opportunityId]", "page");
    return { data: { success: true } };
  } catch (error) {
    console.log("[REORDER_OPPORTUNITY_LINE_ITEMS]", error);
    return { error: "Failed to reorder line items" };
  }
};
```

- [ ] **Step 10: Create get line items data fetching**

Create `actions/crm/opportunity-line-items/get-line-items.ts`:

```typescript
import { cache } from "react";
import { prismadb } from "@/lib/prisma";

export const getOpportunityLineItems = cache(async (opportunityId: string) => {
  return prismadb.crm_OpportunityLineItems.findMany({
    where: { opportunityId },
    include: {
      product: {
        select: { id: true, name: true, status: true },
      },
    },
    orderBy: { sort_order: "asc" },
  });
});
```

- [ ] **Step 11: Commit**

```bash
git add actions/crm/opportunity-line-items/ lib/audit-log.ts
git commit -m "feat(line-items): add server actions for Opportunity line items"
```

---

## Task 4: Contract Line Item Server Actions

**Files:**
- Create: `actions/crm/contract-line-items/add-line-item/schema.ts`
- Create: `actions/crm/contract-line-items/add-line-item/types.ts`
- Create: `actions/crm/contract-line-items/add-line-item/index.ts`
- Create: `actions/crm/contract-line-items/update-line-item/schema.ts`
- Create: `actions/crm/contract-line-items/update-line-item/types.ts`
- Create: `actions/crm/contract-line-items/update-line-item/index.ts`
- Create: `actions/crm/contract-line-items/remove-line-item/index.ts`
- Create: `actions/crm/contract-line-items/reorder-line-items/index.ts`
- Create: `actions/crm/contract-line-items/copy-from-opportunity/index.ts`
- Create: `actions/crm/contract-line-items/get-line-items.ts`

- [ ] **Step 1: Create add line item schema**

Create `actions/crm/contract-line-items/add-line-item/schema.ts`:

```typescript
import { z } from "zod";

export const AddContractLineItem = z.object({
  contractId: z.string(),
  productId: z.string().optional(),
  name: z.string().min(1).max(255),
  sku: z.string().optional(),
  description: z.string().optional(),
  quantity: z.coerce.number().int().min(1).default(1),
  unit_price: z.string(),
  discount_type: z.enum(["PERCENTAGE", "FIXED"]).default("PERCENTAGE"),
  discount_value: z.string().default("0"),
  sort_order: z.coerce.number().int().default(0),
});
```

- [ ] **Step 2: Create add line item types**

Create `actions/crm/contract-line-items/add-line-item/types.ts`:

```typescript
import { z } from "zod";
import { ActionState } from "@/lib/create-safe-action";
import { AddContractLineItem } from "./schema";

type LineItem = { id: string };

export type InputType = z.infer<typeof AddContractLineItem>;
export type ReturnType = ActionState<InputType, LineItem>;
```

- [ ] **Step 3: Create add line item server action**

Create `actions/crm/contract-line-items/add-line-item/index.ts`:

```typescript
"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { AddContractLineItem } from "./schema";
import { InputType, ReturnType } from "./types";
import { createSafeAction } from "@/lib/create-safe-action";
import { writeAuditLog } from "@/lib/audit-log";
import { revalidatePath } from "next/cache";
import { calculateLineTotal, sumLineTotals } from "@/lib/line-items";

const handler = async (data: InputType): Promise<ReturnType> => {
  const session = await getSession();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const userId = session.user.id;
  const {
    contractId, productId, name, sku, description,
    quantity, unit_price, discount_type, discount_value, sort_order,
  } = data;

  try {
    const contract = await prismadb.crm_Contracts.findUnique({
      where: { id: contractId },
    });
    if (!contract || contract.deletedAt) {
      return { error: "Contract not found" };
    }

    let snapshotName = name;
    let snapshotSku = sku;
    let snapshotPrice = parseFloat(unit_price);

    if (productId) {
      const product = await prismadb.crm_Products.findUnique({
        where: { id: productId },
      });
      if (product && !product.deletedAt && product.status === "ACTIVE") {
        snapshotName = name || product.name;
        snapshotSku = sku || product.sku || undefined;
        if (!unit_price || unit_price === "0") {
          snapshotPrice = Number(product.unit_price);
        }
      }
    }

    const discountVal = parseFloat(discount_value) || 0;
    if (discount_type === "PERCENTAGE" && discountVal > 100) {
      return { error: "Percentage discount cannot exceed 100%" };
    }

    const lineTotal = calculateLineTotal(quantity, snapshotPrice, discount_type, discountVal);

    const lineItem = await prismadb.crm_ContractLineItems.create({
      data: {
        contractId,
        productId: productId || undefined,
        name: snapshotName,
        sku: snapshotSku || undefined,
        description: description || undefined,
        quantity,
        unit_price: snapshotPrice,
        discount_type,
        discount_value: discountVal,
        line_total: lineTotal,
        currency: contract.currency || "EUR",
        sort_order,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    const allLineItems = await prismadb.crm_ContractLineItems.findMany({
      where: { contractId },
    });
    const newTotal = sumLineTotals(allLineItems);
    await prismadb.crm_Contracts.update({
      where: { id: contractId },
      data: { value: newTotal },
    });

    await writeAuditLog({
      entityType: "contract_line_item",
      entityId: lineItem.id,
      action: "created",
      changes: null,
      userId,
    });

    revalidatePath("/[locale]/(routes)/crm/contracts/[contractId]", "page");
    return { data: { id: lineItem.id } };
  } catch (error) {
    console.log("[ADD_CONTRACT_LINE_ITEM]", error);
    return { error: "Failed to add line item" };
  }
};

export const addContractLineItem = createSafeAction(AddContractLineItem, handler);
```

- [ ] **Step 4: Create update line item schema + types**

Create `actions/crm/contract-line-items/update-line-item/schema.ts`:

```typescript
import { z } from "zod";

export const UpdateContractLineItem = z.object({
  id: z.string(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  quantity: z.coerce.number().int().min(1).optional(),
  unit_price: z.string().optional(),
  discount_type: z.enum(["PERCENTAGE", "FIXED"]).optional(),
  discount_value: z.string().optional(),
  sort_order: z.coerce.number().int().optional(),
});
```

Create `actions/crm/contract-line-items/update-line-item/types.ts`:

```typescript
import { z } from "zod";
import { ActionState } from "@/lib/create-safe-action";
import { UpdateContractLineItem } from "./schema";

type LineItem = { id: string };

export type InputType = z.infer<typeof UpdateContractLineItem>;
export type ReturnType = ActionState<InputType, LineItem>;
```

- [ ] **Step 5: Create update line item server action**

Create `actions/crm/contract-line-items/update-line-item/index.ts`:

```typescript
"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { UpdateContractLineItem } from "./schema";
import { InputType, ReturnType } from "./types";
import { createSafeAction } from "@/lib/create-safe-action";
import { writeAuditLog } from "@/lib/audit-log";
import { revalidatePath } from "next/cache";
import { calculateLineTotal, sumLineTotals } from "@/lib/line-items";

const handler = async (data: InputType): Promise<ReturnType> => {
  const session = await getSession();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const userId = session.user.id;
  const { id, ...updateData } = data;

  try {
    const existing = await prismadb.crm_ContractLineItems.findUnique({
      where: { id },
    });
    if (!existing) {
      return { error: "Line item not found" };
    }

    const qty = updateData.quantity ?? existing.quantity;
    const price = updateData.unit_price
      ? parseFloat(updateData.unit_price)
      : Number(existing.unit_price);
    const discType = updateData.discount_type ?? existing.discount_type;
    const discVal = updateData.discount_value !== undefined
      ? parseFloat(updateData.discount_value)
      : Number(existing.discount_value);

    if (discType === "PERCENTAGE" && discVal > 100) {
      return { error: "Percentage discount cannot exceed 100%" };
    }

    const lineTotal = calculateLineTotal(qty, price, discType, discVal);

    const lineItem = await prismadb.crm_ContractLineItems.update({
      where: { id },
      data: {
        ...(updateData.name !== undefined && { name: updateData.name }),
        ...(updateData.description !== undefined && { description: updateData.description }),
        ...(updateData.quantity !== undefined && { quantity: updateData.quantity }),
        ...(updateData.unit_price !== undefined && { unit_price: price }),
        ...(updateData.discount_type !== undefined && { discount_type: updateData.discount_type }),
        ...(updateData.discount_value !== undefined && { discount_value: discVal }),
        ...(updateData.sort_order !== undefined && { sort_order: updateData.sort_order }),
        line_total: lineTotal,
        updatedBy: userId,
        v: { increment: 1 },
      },
    });

    const allLineItems = await prismadb.crm_ContractLineItems.findMany({
      where: { contractId: existing.contractId },
    });
    const newTotal = sumLineTotals(allLineItems);
    await prismadb.crm_Contracts.update({
      where: { id: existing.contractId },
      data: { value: newTotal },
    });

    await writeAuditLog({
      entityType: "contract_line_item",
      entityId: lineItem.id,
      action: "updated",
      changes: null,
      userId,
    });

    revalidatePath("/[locale]/(routes)/crm/contracts/[contractId]", "page");
    return { data: { id: lineItem.id } };
  } catch (error) {
    console.log("[UPDATE_CONTRACT_LINE_ITEM]", error);
    return { error: "Failed to update line item" };
  }
};

export const updateContractLineItem = createSafeAction(UpdateContractLineItem, handler);
```

- [ ] **Step 6: Create remove line item server action**

Create `actions/crm/contract-line-items/remove-line-item/index.ts`:

```typescript
"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { revalidatePath } from "next/cache";
import { sumLineTotals } from "@/lib/line-items";

export const removeContractLineItem = async (id: string) => {
  const session = await getSession();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const lineItem = await prismadb.crm_ContractLineItems.findUnique({
      where: { id },
    });
    if (!lineItem) {
      return { error: "Line item not found" };
    }

    await prismadb.crm_ContractLineItems.delete({ where: { id } });

    const remaining = await prismadb.crm_ContractLineItems.findMany({
      where: { contractId: lineItem.contractId },
    });
    if (remaining.length > 0) {
      const newTotal = sumLineTotals(remaining);
      await prismadb.crm_Contracts.update({
        where: { id: lineItem.contractId },
        data: { value: newTotal },
      });
    }

    await writeAuditLog({
      entityType: "contract_line_item",
      entityId: id,
      action: "deleted",
      changes: null,
      userId: session.user.id,
    });

    revalidatePath("/[locale]/(routes)/crm/contracts/[contractId]", "page");
    return { data: { id } };
  } catch (error) {
    console.log("[REMOVE_CONTRACT_LINE_ITEM]", error);
    return { error: "Failed to remove line item" };
  }
};
```

- [ ] **Step 7: Create reorder line items server action**

Create `actions/crm/contract-line-items/reorder-line-items/index.ts`:

```typescript
"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const reorderContractLineItems = async (
  items: { id: string; sort_order: number }[]
) => {
  const session = await getSession();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    await prismadb.$transaction(
      items.map((item) =>
        prismadb.crm_ContractLineItems.update({
          where: { id: item.id },
          data: { sort_order: item.sort_order },
        })
      )
    );

    revalidatePath("/[locale]/(routes)/crm/contracts/[contractId]", "page");
    return { data: { success: true } };
  } catch (error) {
    console.log("[REORDER_CONTRACT_LINE_ITEMS]", error);
    return { error: "Failed to reorder line items" };
  }
};
```

- [ ] **Step 8: Create copy from opportunity server action**

Create `actions/crm/contract-line-items/copy-from-opportunity/index.ts`:

```typescript
"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { revalidatePath } from "next/cache";
import { sumLineTotals } from "@/lib/line-items";

export const copyLineItemsFromOpportunity = async (
  contractId: string,
  opportunityId: string
) => {
  const session = await getSession();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const userId = session.user.id;

  try {
    const [contract, opportunity] = await Promise.all([
      prismadb.crm_Contracts.findUnique({ where: { id: contractId } }),
      prismadb.crm_Opportunities.findUnique({ where: { id: opportunityId } }),
    ]);

    if (!contract || contract.deletedAt) {
      return { error: "Contract not found" };
    }
    if (!opportunity || opportunity.deletedAt) {
      return { error: "Opportunity not found" };
    }

    // Currency mismatch check
    const contractCurrency = contract.currency || "EUR";
    const opportunityCurrency = opportunity.currency || "EUR";
    if (contractCurrency !== opportunityCurrency) {
      return {
        error: `Currency mismatch: contract uses ${contractCurrency} but opportunity uses ${opportunityCurrency}. Cannot copy line items across currencies.`,
      };
    }

    const sourceItems = await prismadb.crm_OpportunityLineItems.findMany({
      where: { opportunityId },
      orderBy: { sort_order: "asc" },
    });

    if (sourceItems.length === 0) {
      return { error: "No line items found on the source opportunity" };
    }

    // Get current max sort_order on contract to append after
    const existingItems = await prismadb.crm_ContractLineItems.findMany({
      where: { contractId },
      orderBy: { sort_order: "desc" },
      take: 1,
    });
    const startOrder = existingItems.length > 0 ? existingItems[0].sort_order + 1 : 0;

    await prismadb.crm_ContractLineItems.createMany({
      data: sourceItems.map((item, index) => ({
        contractId,
        productId: item.productId,
        name: item.name,
        sku: item.sku,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_type: item.discount_type,
        discount_value: item.discount_value,
        line_total: item.line_total,
        currency: item.currency,
        sort_order: startOrder + index,
        createdBy: userId,
        updatedBy: userId,
      })),
    });

    // Recalculate contract value
    const allContractItems = await prismadb.crm_ContractLineItems.findMany({
      where: { contractId },
    });
    const newTotal = sumLineTotals(allContractItems);
    await prismadb.crm_Contracts.update({
      where: { id: contractId },
      data: { value: newTotal },
    });

    await writeAuditLog({
      entityType: "contract_line_item",
      entityId: contractId,
      action: "created",
      changes: null,
      userId,
    });

    revalidatePath("/[locale]/(routes)/crm/contracts/[contractId]", "page");
    return { data: { copied: sourceItems.length } };
  } catch (error) {
    console.log("[COPY_LINE_ITEMS_FROM_OPPORTUNITY]", error);
    return { error: "Failed to copy line items" };
  }
};
```

- [ ] **Step 9: Create get line items data fetching**

Create `actions/crm/contract-line-items/get-line-items.ts`:

```typescript
import { cache } from "react";
import { prismadb } from "@/lib/prisma";

export const getContractLineItems = cache(async (contractId: string) => {
  return prismadb.crm_ContractLineItems.findMany({
    where: { contractId },
    include: {
      product: {
        select: { id: true, name: true, status: true },
      },
    },
    orderBy: { sort_order: "asc" },
  });
});
```

- [ ] **Step 10: Commit**

```bash
git add actions/crm/contract-line-items/
git commit -m "feat(line-items): add server actions for Contract line items with copy-from-opportunity"
```

---

## Task 5: Shared Line Items UI Components

**Files:**
- Create: `app/[locale]/(routes)/crm/components/line-items/LineItemsTable.tsx`
- Create: `app/[locale]/(routes)/crm/components/line-items/AddLineItemForm.tsx`
- Create: `app/[locale]/(routes)/crm/components/line-items/EditLineItemForm.tsx`

- [ ] **Step 1: Create the LineItemsTable component**

Before creating, read these files for patterns:
- `app/[locale]/(routes)/crm/accounts/[accountId]/components/AccountProductsView.tsx` — table pattern with actions
- `app/[locale]/(routes)/crm/products/[productId]/components/AccountsTab.tsx` — simple table with formatted data

Create `app/[locale]/(routes)/crm/components/line-items/LineItemsTable.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/currency";

export interface LineItemData {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  quantity: number;
  unit_price: number;
  discount_type: string;
  discount_value: number;
  line_total: number;
  currency: string;
  sort_order: number;
  productId: string | null;
}

interface LineItemsTableProps {
  items: LineItemData[];
  currency: string;
  onRemove: (id: string) => Promise<{ error?: string } | { data?: any }>;
  onEdit: (item: LineItemData) => void;
}

export const LineItemsTable = ({
  items,
  currency,
  onRemove,
  onEdit,
}: LineItemsTableProps) => {
  const router = useRouter();

  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);

  const handleRemove = async (id: string) => {
    const result = await onRemove(id);
    if (result && "error" in result && result.error) {
      toast.error(result.error);
    } else {
      toast.success("Line item removed");
      router.refresh();
    }
  };

  const formatDiscount = (type: string, value: number) => {
    if (value === 0) return "—";
    return type === "PERCENTAGE" ? `${value}%` : formatCurrency(value, currency);
  };

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-center">
        No line items. Add products to calculate the total automatically.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[40px]">#</TableHead>
          <TableHead>Product</TableHead>
          <TableHead className="text-right">Qty</TableHead>
          <TableHead className="text-right">Unit Price</TableHead>
          <TableHead className="text-right">Discount</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="w-[80px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item, index) => (
          <TableRow key={item.id}>
            <TableCell className="text-muted-foreground">{index + 1}</TableCell>
            <TableCell>
              <div>
                <span className="font-medium">{item.name}</span>
                {item.sku && (
                  <span className="text-xs text-muted-foreground ml-2">
                    {item.sku}
                  </span>
                )}
              </div>
              {item.description && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.description}
                </p>
              )}
            </TableCell>
            <TableCell className="text-right">{item.quantity}</TableCell>
            <TableCell className="text-right">
              {formatCurrency(item.unit_price, currency)}
            </TableCell>
            <TableCell className="text-right">
              {formatDiscount(item.discount_type, item.discount_value)}
            </TableCell>
            <TableCell className="text-right font-medium">
              {formatCurrency(item.line_total, currency)}
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => onEdit(item)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-red-600"
                  onClick={() => handleRemove(item.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={5} className="text-right font-medium">
            Subtotal
          </TableCell>
          <TableCell className="text-right font-bold">
            {formatCurrency(subtotal, currency)}
          </TableCell>
          <TableCell />
        </TableRow>
      </TableFooter>
    </Table>
  );
};
```

- [ ] **Step 2: Create the AddLineItemForm component**

Before creating, read:
- `app/[locale]/(routes)/crm/products/_forms/create-product.tsx` — FormSheet pattern
- `actions/crm/products/get-products.ts` — how to fetch products

Create `app/[locale]/(routes)/crm/components/line-items/AddLineItemForm.tsx`:

```tsx
"use client";

import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";

import { useAction } from "@/hooks/use-action";
import { FormInput } from "@/components/form/form-input";
import FormSheet from "@/components/sheets/form-sheet";
import { FormSubmit } from "@/components/form/form-submit";
import { FormTextarea } from "@/components/form/form-textarea";
import { FormSelect } from "@/components/form/from-select";
import { calculateLineTotal } from "@/lib/line-items";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  unit_price: number;
}

interface AddLineItemFormProps {
  products: Product[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action: any; // createSafeAction result — addOpportunityLineItem or addContractLineItem
  parentId: string;
  parentIdField: "opportunityId" | "contractId";
}

const AddLineItemForm = ({
  products,
  action,
  parentId,
  parentIdField,
}: AddLineItemFormProps) => {
  const router = useRouter();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [discountType, setDiscountType] = useState<string>("NONE");

  const { execute, fieldErrors, isLoading } = useAction(action, {
    onSuccess: () => {
      toast.success("Line item added");
      closeRef.current?.click();
      setSelectedProduct(null);
      setDiscountType("NONE");
      router.refresh();
    },
    onError: (error: string) => {
      toast.error(error);
    },
  });

  const onAction = async (formData: FormData) => {
    const productId = formData.get("productId") as string;
    const name = formData.get("name") as string;
    const sku = formData.get("sku") as string;
    const description = formData.get("description") as string;
    const quantity = parseInt(formData.get("quantity") as string) || 1;
    const unit_price = formData.get("unit_price") as string;
    const discount_value = formData.get("discount_value") as string;

    await execute({
      [parentIdField]: parentId,
      productId: productId || undefined,
      name,
      sku: sku || undefined,
      description: description || undefined,
      quantity,
      unit_price,
      discount_type: discountType === "NONE" ? "PERCENTAGE" : discountType,
      discount_value: discountType === "NONE" ? "0" : discount_value || "0",
    });
  };

  const handleProductChange = (productId: string) => {
    const product = products.find((p) => p.id === productId) || null;
    setSelectedProduct(product);
  };

  return (
    <FormSheet
      trigger={"+"}
      title="Add Line Item"
      description="Add a product or custom item"
      onClose={closeRef}
    >
      <form action={onAction} className="space-y-4">
        {products.length > 0 && (
          <FormSelect
            id="productId"
            label="Product (optional)"
            type="hidden"
            data={products.map((p) => ({
              id: p.id,
              name: `${p.name}${p.sku ? ` (${p.sku})` : ""}`,
            }))}
            errors={fieldErrors}
            onChange={handleProductChange}
          />
        )}
        <FormInput
          id="name"
          label="Name"
          type="text"
          errors={fieldErrors}
          defaultValue={selectedProduct?.name || ""}
        />
        <FormInput
          id="sku"
          label="SKU"
          type="text"
          errors={fieldErrors}
          defaultValue={selectedProduct?.sku || ""}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            id="quantity"
            label="Quantity"
            type="number"
            errors={fieldErrors}
            defaultValue="1"
          />
          <FormInput
            id="unit_price"
            label="Unit Price"
            type="text"
            errors={fieldErrors}
            defaultValue={selectedProduct ? String(selectedProduct.unit_price) : ""}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Discount Type</label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value)}
            >
              <option value="NONE">None</option>
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="FIXED">Fixed Amount</option>
            </select>
          </div>
          {discountType !== "NONE" && (
            <FormInput
              id="discount_value"
              label={discountType === "PERCENTAGE" ? "Discount (%)" : "Discount Amount"}
              type="text"
              errors={fieldErrors}
              defaultValue="0"
            />
          )}
        </div>
        <FormTextarea
          id="description"
          label="Description (optional)"
          errors={fieldErrors}
        />
        <FormSubmit className="w-full">
          {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Add Line Item"}
        </FormSubmit>
      </form>
    </FormSheet>
  );
};

export default AddLineItemForm;
```

- [ ] **Step 3: Create the EditLineItemForm component**

Create `app/[locale]/(routes)/crm/components/line-items/EditLineItemForm.tsx`:

```tsx
"use client";

import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useAction } from "@/hooks/use-action";
import { FormInput } from "@/components/form/form-input";
import { FormSubmit } from "@/components/form/form-submit";
import { FormTextarea } from "@/components/form/form-textarea";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import type { LineItemData } from "./LineItemsTable";

interface EditLineItemFormProps {
  item: LineItemData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action: any; // updateOpportunityLineItem or updateContractLineItem
}

const EditLineItemForm = ({
  item,
  open,
  onOpenChange,
  action,
}: EditLineItemFormProps) => {
  const router = useRouter();
  const [discountType, setDiscountType] = useState<string>(
    item?.discount_value === 0 ? "NONE" : item?.discount_type || "NONE"
  );

  const { execute, fieldErrors, isLoading } = useAction(action, {
    onSuccess: () => {
      toast.success("Line item updated");
      onOpenChange(false);
      router.refresh();
    },
    onError: (error: string) => {
      toast.error(error);
    },
  });

  if (!item) return null;

  const onAction = async (formData: FormData) => {
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const quantity = parseInt(formData.get("quantity") as string) || 1;
    const unit_price = formData.get("unit_price") as string;
    const discount_value = formData.get("discount_value") as string;

    await execute({
      id: item.id,
      name,
      description: description || null,
      quantity,
      unit_price,
      discount_type: discountType === "NONE" ? "PERCENTAGE" : discountType,
      discount_value: discountType === "NONE" ? "0" : discount_value || "0",
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit Line Item</SheetTitle>
          <SheetDescription>Modify line item details</SheetDescription>
        </SheetHeader>
        <form action={onAction} className="space-y-4 mt-4">
          <FormInput
            id="name"
            label="Name"
            type="text"
            errors={fieldErrors}
            defaultValue={item.name}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              id="quantity"
              label="Quantity"
              type="number"
              errors={fieldErrors}
              defaultValue={String(item.quantity)}
            />
            <FormInput
              id="unit_price"
              label="Unit Price"
              type="text"
              errors={fieldErrors}
              defaultValue={String(item.unit_price)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Discount Type</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
              >
                <option value="NONE">None</option>
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed Amount</option>
              </select>
            </div>
            {discountType !== "NONE" && (
              <FormInput
                id="discount_value"
                label={discountType === "PERCENTAGE" ? "Discount (%)" : "Discount Amount"}
                type="text"
                errors={fieldErrors}
                defaultValue={String(item.discount_value)}
              />
            )}
          </div>
          <FormTextarea
            id="description"
            label="Description (optional)"
            errors={fieldErrors}
            defaultValue={item.description || ""}
          />
          <FormSubmit className="w-full">
            {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Update"}
          </FormSubmit>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default EditLineItemForm;
```

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/(routes)/crm/components/line-items/"
git commit -m "feat(line-items): add shared LineItemsTable, AddLineItemForm, and EditLineItemForm components"
```

---

## Task 6: Opportunity Detail Page — Line Items Integration

**Files:**
- Create: `app/[locale]/(routes)/crm/opportunities/[opportunityId]/components/LineItemsSection.tsx`
- Modify: `app/[locale]/(routes)/crm/opportunities/[opportunityId]/page.tsx`
- Modify: `actions/crm/get-opportunity.ts`

- [ ] **Step 1: Update getOpportunity to include line items**

Modify `actions/crm/get-opportunity.ts` — add `lineItems` to the include block inside `findFirst`:

```typescript
      lineItems: {
        include: {
          product: {
            select: { id: true, name: true, status: true },
          },
        },
        orderBy: { sort_order: "asc" },
      },
```

- [ ] **Step 2: Create LineItemsSection component**

Create `app/[locale]/(routes)/crm/opportunities/[opportunityId]/components/LineItemsSection.tsx`:

```tsx
"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { LineItemsTable, type LineItemData } from "../../../components/line-items/LineItemsTable";
import AddLineItemForm from "../../../components/line-items/AddLineItemForm";
import EditLineItemForm from "../../../components/line-items/EditLineItemForm";
import { addOpportunityLineItem } from "@/actions/crm/opportunity-line-items/add-line-item";
import { updateOpportunityLineItem } from "@/actions/crm/opportunity-line-items/update-line-item";
import { removeOpportunityLineItem } from "@/actions/crm/opportunity-line-items/remove-line-item";

interface LineItemsSectionProps {
  opportunityId: string;
  lineItems: LineItemData[];
  currency: string;
  products: { id: string; name: string; sku: string | null; unit_price: number }[];
}

export const LineItemsSection = ({
  opportunityId,
  lineItems,
  currency,
  products,
}: LineItemsSectionProps) => {
  const [editItem, setEditItem] = useState<LineItemData | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const handleEdit = (item: LineItemData) => {
    setEditItem(item);
    setEditOpen(true);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between">
          <CardTitle>Line Items</CardTitle>
          <div className="flex space-x-2">
            <AddLineItemForm
              products={products}
              action={addOpportunityLineItem}
              parentId={opportunityId}
              parentIdField="opportunityId"
            />
          </div>
        </div>
        <Separator />
      </CardHeader>
      <CardContent>
        <LineItemsTable
          items={lineItems}
          currency={currency}
          onRemove={removeOpportunityLineItem}
          onEdit={handleEdit}
        />
      </CardContent>
      <EditLineItemForm
        item={editItem}
        open={editOpen}
        onOpenChange={setEditOpen}
        action={updateOpportunityLineItem}
      />
    </Card>
  );
};
```

- [ ] **Step 3: Update Opportunity detail page**

Modify `app/[locale]/(routes)/crm/opportunities/[opportunityId]/page.tsx`:

Add imports at the top:
```tsx
import { LineItemsSection } from "./components/LineItemsSection";
import { getProductsFull } from "@/actions/crm/products/get-products";
import { serializeDecimalsList } from "@/lib/serialize-decimals";
```

Add data fetching inside the component (after existing fetches):
```tsx
const allProducts = await getProductsFull();
const activeProducts = allProducts
  .filter((p) => p.status === "ACTIVE")
  .map((p) => ({ id: p.id, name: p.name, sku: p.sku, unit_price: Number(p.unit_price) }));

const serializedLineItems = serializeDecimalsList(opportunity.lineItems || []);
```

Add the LineItemsSection in the overview tab, after `<BasicView data={opportunity} />`:
```tsx
            <LineItemsSection
              opportunityId={opportunityId}
              lineItems={serializedLineItems as any}
              currency={opportunity.currency || "EUR"}
              products={activeProducts}
            />
```

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/(routes)/crm/opportunities/[opportunityId]/" "actions/crm/get-opportunity.ts"
git commit -m "feat(line-items): add line items section to Opportunity detail page"
```

---

## Task 7: Contract Detail Page — Line Items Integration

**Files:**
- Create: `app/[locale]/(routes)/crm/contracts/[contractId]/components/LineItemsSection.tsx`
- Modify: `app/[locale]/(routes)/crm/contracts/[contractId]/page.tsx`
- Modify: `actions/crm/get-contract.ts`

- [ ] **Step 1: Update getContract to include line items**

Modify `actions/crm/get-contract.ts` — add to the include block:

```typescript
      lineItems: {
        include: {
          product: {
            select: { id: true, name: true, status: true },
          },
        },
        orderBy: { sort_order: "asc" },
      },
```

- [ ] **Step 2: Create LineItemsSection for Contracts**

Create `app/[locale]/(routes)/crm/contracts/[contractId]/components/LineItemsSection.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormSelect } from "@/components/form/from-select";

import { LineItemsTable, type LineItemData } from "../../../components/line-items/LineItemsTable";
import AddLineItemForm from "../../../components/line-items/AddLineItemForm";
import EditLineItemForm from "../../../components/line-items/EditLineItemForm";
import { addContractLineItem } from "@/actions/crm/contract-line-items/add-line-item";
import { updateContractLineItem } from "@/actions/crm/contract-line-items/update-line-item";
import { removeContractLineItem } from "@/actions/crm/contract-line-items/remove-line-item";
import { copyLineItemsFromOpportunity } from "@/actions/crm/contract-line-items/copy-from-opportunity";

interface Opportunity {
  id: string;
  name: string | null;
}

interface LineItemsSectionProps {
  contractId: string;
  lineItems: LineItemData[];
  currency: string;
  products: { id: string; name: string; sku: string | null; unit_price: number }[];
  opportunities: Opportunity[];
}

export const LineItemsSection = ({
  contractId,
  lineItems,
  currency,
  products,
  opportunities,
}: LineItemsSectionProps) => {
  const router = useRouter();
  const [editItem, setEditItem] = useState<LineItemData | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [copying, setCopying] = useState(false);

  const handleEdit = (item: LineItemData) => {
    setEditItem(item);
    setEditOpen(true);
  };

  const handleCopy = async (formData: FormData) => {
    const opportunityId = formData.get("opportunityId") as string;
    if (!opportunityId) {
      toast.error("Please select an opportunity");
      return;
    }

    setCopying(true);
    try {
      const result = await copyLineItemsFromOpportunity(contractId, opportunityId);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Copied ${(result as any).data?.copied || 0} line items`);
        setCopyOpen(false);
        router.refresh();
      }
    } finally {
      setCopying(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between">
          <CardTitle>Line Items</CardTitle>
          <div className="flex space-x-2">
            {opportunities.length > 0 && (
              <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Copy className="mr-2 h-4 w-4" />
                    Copy from Opportunity
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Copy Line Items from Opportunity</DialogTitle>
                    <DialogDescription>
                      Select an opportunity to copy its line items to this contract.
                    </DialogDescription>
                  </DialogHeader>
                  <form action={handleCopy} className="space-y-4">
                    <FormSelect
                      id="opportunityId"
                      label="Opportunity"
                      type="hidden"
                      data={opportunities.map((o) => ({
                        id: o.id,
                        name: o.name || "Unnamed",
                      }))}
                      errors={{}}
                    />
                    <Button type="submit" disabled={copying} className="w-full">
                      {copying ? "Copying..." : "Copy Line Items"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
            <AddLineItemForm
              products={products}
              action={addContractLineItem}
              parentId={contractId}
              parentIdField="contractId"
            />
          </div>
        </div>
        <Separator />
      </CardHeader>
      <CardContent>
        <LineItemsTable
          items={lineItems}
          currency={currency}
          onRemove={removeContractLineItem}
          onEdit={handleEdit}
        />
      </CardContent>
      <EditLineItemForm
        item={editItem}
        open={editOpen}
        onOpenChange={setEditOpen}
        action={updateContractLineItem}
      />
    </Card>
  );
};
```

- [ ] **Step 3: Update Contract detail page**

Modify `app/[locale]/(routes)/crm/contracts/[contractId]/page.tsx`:

Add imports:
```tsx
import { LineItemsSection } from "./components/LineItemsSection";
import { getProductsFull } from "@/actions/crm/products/get-products";
import { getAllCrmData } from "@/actions/crm/get-crm-data";
import { serializeDecimalsList } from "@/lib/serialize-decimals";
```

Update the data fetching — replace the existing single fetch with parallel:
```tsx
  const [contract, allProducts, crmData] = await Promise.all([
    getContract(contractId),
    getProductsFull(),
    getAllCrmData(),
  ]);
```

Add after the null check:
```tsx
  const activeProducts = allProducts
    .filter((p) => p.status === "ACTIVE")
    .map((p) => ({ id: p.id, name: p.name, sku: p.sku, unit_price: Number(p.unit_price) }));

  const serializedLineItems = serializeDecimalsList(contract.lineItems || []) as any;

  // Get opportunities linked to same account for "Copy from Opportunity"
  const accountOpportunities = contract.account
    ? crmData.opportunities
        .filter((o: any) => o.account === contract.account && !o.deletedAt)
        .map((o: any) => ({ id: o.id, name: o.name }))
    : [];
```

Add the LineItemsSection in the overview tab after `<BasicView data={contract} />`:
```tsx
            <LineItemsSection
              contractId={contractId}
              lineItems={serializedLineItems}
              currency={contract.currency || "EUR"}
              products={activeProducts}
              opportunities={accountOpportunities}
            />
```

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/(routes)/crm/contracts/[contractId]/" "actions/crm/get-contract.ts"
git commit -m "feat(line-items): add line items section to Contract detail page with copy-from-opportunity"
```

---

## Task 8: Verify Build and Fix Issues

**Files:** Various (depending on issues found)

- [ ] **Step 1: Run type check**

Run:
```bash
pnpm tsc --noEmit 2>&1 | grep -E "(line-items|opportunity-line|contract-line|get-opportunity|get-contract|LineItems)" | head -30
```

Fix any type errors in our new files.

- [ ] **Step 2: Verify the shared helper works**

Manually verify `calculateLineTotal` returns expected values:
- `calculateLineTotal(2, 100, "PERCENTAGE", 10)` should return `180` (2 * 100 * 0.9)
- `calculateLineTotal(3, 50, "FIXED", 20)` should return `130` (3 * 50 - 20)
- `calculateLineTotal(1, 100, "PERCENTAGE", 100)` should return `0` (100% discount)
- `calculateLineTotal(1, 50, "FIXED", 100)` should return `0` (clamped, not -50)

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix(line-items): resolve build and type issues"
```
