# Products Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Products module to the CRM with a product/service catalog, account assignments with lifecycle tracking, and CSV bulk import.

**Architecture:** Three new Prisma models (`crm_ProductCategories`, `crm_Products`, `crm_AccountProducts`) following existing CRM patterns. Server actions use `createSafeAction` wrapper with Zod schemas. UI follows the Contracts module pattern: `FormSheet` for create/edit, `data-table` for list views, `Card`-based views for embedding in Account detail pages. CSV import follows the existing `import-targets.ts` pattern using PapaParse.

**Tech Stack:** Next.js (App Router), Prisma, Zod, React Hook Form (via FormInput/FormSheet), TanStack Table, PapaParse, Sonner (toasts), next-intl (i18n), Inngest (events), lucide-react (icons)

**Spec:** `docs/superpowers/specs/2026-04-05-products-module-design.md`

---

## Task 1: Prisma Schema — Enums and Models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add enums after existing `crm_Opportunity_Status` enum (line ~253)**

Add after the `crm_Opportunity_Status` enum block:

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

- [ ] **Step 2: Add `crm_ProductCategories` model**

Add after the new enums:

```prisma
model crm_ProductCategories {
  id          String   @id @default(uuid()) @db.Uuid
  name        String
  description String?
  order       Int      @default(0)
  isActive    Boolean  @default(true)

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  createdBy String    @db.Uuid
  updatedBy String?   @db.Uuid

  products crm_Products[]

  @@index([isActive])
}
```

- [ ] **Step 3: Add `crm_Products` model**

```prisma
model crm_Products {
  id          String             @id @default(uuid()) @db.Uuid
  name        String
  description String?            @db.Text
  sku         String?            @unique
  type        crm_Product_Type
  status      crm_Product_Status @default(DRAFT)

  unit_price     Decimal             @db.Decimal(18, 2)
  unit_cost      Decimal?            @db.Decimal(18, 2)
  currency       String              @db.VarChar(3)
  tax_rate       Decimal?            @db.Decimal(5, 2)
  unit           String?
  is_recurring   Boolean             @default(false)
  billing_period crm_Billing_Period?

  categoryId String? @db.Uuid

  v         Int       @default(0) @map("__v")
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  createdBy String    @db.Uuid
  updatedBy String?   @db.Uuid
  deletedAt DateTime?
  deletedBy String?   @db.Uuid

  category        crm_ProductCategories? @relation(fields: [categoryId], references: [id])
  assigned_currency Currency?            @relation(fields: [currency], references: [code])
  created_by_user Users?                 @relation("ProductCreatedBy", fields: [createdBy], references: [id])
  accountProducts crm_AccountProducts[]

  @@index([status])
  @@index([type])
  @@index([categoryId])
  @@index([createdBy])
  @@index([deletedAt])
}
```

- [ ] **Step 4: Add `crm_AccountProducts` model**

```prisma
model crm_AccountProducts {
  id         String                    @id @default(uuid()) @db.Uuid
  accountId  String                    @db.Uuid
  productId  String                    @db.Uuid
  quantity   Int                       @default(1)

  custom_price  Decimal?              @db.Decimal(18, 2)
  currency      String                @db.VarChar(3)
  snapshot_rate Decimal?              @db.Decimal(18, 8)

  status       crm_AccountProduct_Status @default(ACTIVE)
  start_date   DateTime
  end_date     DateTime?
  renewal_date DateTime?
  notes        String?                @db.Text

  v         Int       @default(0) @map("__v")
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  createdBy String    @db.Uuid
  updatedBy String?   @db.Uuid

  account          crm_Accounts  @relation(fields: [accountId], references: [id])
  product          crm_Products  @relation(fields: [productId], references: [id])
  assigned_currency Currency?    @relation(fields: [currency], references: [code])

  @@index([accountId])
  @@index([productId])
  @@index([status])
  @@index([accountId, productId])
}
```

- [ ] **Step 5: Add reverse relations to existing models**

Add to the `Currency` model (at `prisma/schema.prisma` near line ~531, inside the model block alongside existing `opportunities` and `contracts` relations):

```prisma
  products        crm_Products[]
  accountProducts crm_AccountProducts[]
```

Add to the `Users` model (near line ~872, inside the model block):

```prisma
  created_products crm_Products[] @relation("ProductCreatedBy")
```

Add to the `crm_Accounts` model (near line ~12, inside the model block, alongside existing relations like `contracts`):

```prisma
  accountProducts crm_AccountProducts[]
```

- [ ] **Step 6: Generate Prisma client and create migration**

Run:
```bash
pnpm prisma generate
pnpm prisma migrate dev --name add_products_module
```

Expected: Migration created successfully, Prisma client regenerated with new types.

- [ ] **Step 7: Commit**

```bash
git add prisma/
git commit -m "feat(products): add Prisma schema for Products, ProductCategories, AccountProducts"
```

---

## Task 2: Server Actions — Product CRUD

**Files:**
- Create: `actions/crm/products/create-product/schema.ts`
- Create: `actions/crm/products/create-product/types.ts`
- Create: `actions/crm/products/create-product/index.ts`
- Create: `actions/crm/products/update-product/schema.ts`
- Create: `actions/crm/products/update-product/types.ts`
- Create: `actions/crm/products/update-product/index.ts`
- Create: `actions/crm/products/delete-product/index.ts`
- Create: `actions/crm/products/get-products.ts`
- Create: `actions/crm/products/get-product.ts`
- Create: `actions/crm/products/get-product-categories.ts`

- [ ] **Step 1: Create the Zod schema for product creation**

Create `actions/crm/products/create-product/schema.ts`:

```typescript
import { z } from "zod";

export const CreateProduct = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  sku: z.string().max(100).optional(),
  type: z.enum(["PRODUCT", "SERVICE"]),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
  unit_price: z.string(),
  unit_cost: z.string().optional(),
  currency: z.string().length(3),
  tax_rate: z.string().optional(),
  unit: z.string().max(50).optional(),
  is_recurring: z.boolean().default(false),
  billing_period: z.enum(["MONTHLY", "QUARTERLY", "ANNUALLY", "ONE_TIME"]).optional(),
  categoryId: z.string().optional(),
});
```

- [ ] **Step 2: Create types file**

Create `actions/crm/products/create-product/types.ts`:

```typescript
import { z } from "zod";
import { ActionState } from "@/lib/create-safe-action";
import { CreateProduct } from "./schema";

type Product = { id: string; name: string };

export type InputType = z.infer<typeof CreateProduct>;
export type ReturnType = ActionState<InputType, Product>;
```

- [ ] **Step 3: Create the server action handler**

Create `actions/crm/products/create-product/index.ts`:

```typescript
"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { CreateProduct } from "./schema";
import { InputType, ReturnType } from "./types";
import { createSafeAction } from "@/lib/create-safe-action";
import { writeAuditLog } from "@/lib/audit-log";
import { revalidatePath } from "next/cache";

const handler = async (data: InputType): Promise<ReturnType> => {
  const session = await getSession();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const userId = session.user.id;

  const {
    name,
    description,
    sku,
    type,
    status,
    unit_price,
    unit_cost,
    currency,
    tax_rate,
    unit,
    is_recurring,
    billing_period,
    categoryId,
  } = data;

  // Validate billing_period required when is_recurring
  if (is_recurring && !billing_period) {
    return { error: "Billing period is required for recurring products" };
  }

  try {
    // Check SKU uniqueness if provided
    if (sku) {
      const existing = await prismadb.crm_Products.findUnique({
        where: { sku },
      });
      if (existing) {
        return { error: `A product with SKU "${sku}" already exists` };
      }
    }

    const product = await prismadb.crm_Products.create({
      data: {
        name,
        description: description || undefined,
        sku: sku || undefined,
        type,
        status: status || "DRAFT",
        unit_price: parseFloat(unit_price),
        unit_cost: unit_cost ? parseFloat(unit_cost) : undefined,
        currency,
        tax_rate: tax_rate ? parseFloat(tax_rate) : undefined,
        unit: unit || undefined,
        is_recurring: is_recurring || false,
        billing_period: is_recurring ? billing_period : undefined,
        categoryId: categoryId || undefined,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    await writeAuditLog({
      entityType: "product",
      entityId: product.id,
      action: "created",
      changes: null,
      userId,
    });

    revalidatePath("/[locale]/(routes)/crm/products", "page");
    return { data: { id: product.id, name: product.name } };
  } catch (error) {
    console.log("[CREATE_PRODUCT]", error);
    return { error: "Failed to create product" };
  }
};

export const createProduct = createSafeAction(CreateProduct, handler);
```

- [ ] **Step 4: Create update product schema**

Create `actions/crm/products/update-product/schema.ts`:

```typescript
import { z } from "zod";

export const UpdateProduct = z.object({
  id: z.string(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  sku: z.string().max(100).optional(),
  type: z.enum(["PRODUCT", "SERVICE"]).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
  unit_price: z.string().optional(),
  unit_cost: z.string().optional(),
  currency: z.string().length(3).optional(),
  tax_rate: z.string().optional(),
  unit: z.string().max(50).optional(),
  is_recurring: z.boolean().optional(),
  billing_period: z.enum(["MONTHLY", "QUARTERLY", "ANNUALLY", "ONE_TIME"]).optional().nullable(),
  categoryId: z.string().optional().nullable(),
});
```

- [ ] **Step 5: Create update types file**

Create `actions/crm/products/update-product/types.ts`:

```typescript
import { z } from "zod";
import { ActionState } from "@/lib/create-safe-action";
import { UpdateProduct } from "./schema";

type Product = { id: string; name: string };

export type InputType = z.infer<typeof UpdateProduct>;
export type ReturnType = ActionState<InputType, Product>;
```

- [ ] **Step 6: Create update product server action**

Create `actions/crm/products/update-product/index.ts`:

```typescript
"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { UpdateProduct } from "./schema";
import { InputType, ReturnType } from "./types";
import { createSafeAction } from "@/lib/create-safe-action";
import { writeAuditLog } from "@/lib/audit-log";
import { revalidatePath } from "next/cache";

const handler = async (data: InputType): Promise<ReturnType> => {
  const session = await getSession();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const userId = session.user.id;
  const { id, ...updateData } = data;

  try {
    const existing = await prismadb.crm_Products.findUnique({
      where: { id },
    });
    if (!existing || existing.deletedAt) {
      return { error: "Product not found" };
    }

    // Check SKU uniqueness if changing
    if (updateData.sku && updateData.sku !== existing.sku) {
      const skuExists = await prismadb.crm_Products.findUnique({
        where: { sku: updateData.sku },
      });
      if (skuExists) {
        return { error: `A product with SKU "${updateData.sku}" already exists` };
      }
    }

    // Validate billing_period when is_recurring is being set to true
    const willBeRecurring = updateData.is_recurring ?? existing.is_recurring;
    const billingPeriod = updateData.billing_period !== undefined
      ? updateData.billing_period
      : existing.billing_period;
    if (willBeRecurring && !billingPeriod) {
      return { error: "Billing period is required for recurring products" };
    }

    const product = await prismadb.crm_Products.update({
      where: { id },
      data: {
        ...(updateData.name !== undefined && { name: updateData.name }),
        ...(updateData.description !== undefined && { description: updateData.description }),
        ...(updateData.sku !== undefined && { sku: updateData.sku || null }),
        ...(updateData.type !== undefined && { type: updateData.type }),
        ...(updateData.status !== undefined && { status: updateData.status }),
        ...(updateData.unit_price !== undefined && { unit_price: parseFloat(updateData.unit_price) }),
        ...(updateData.unit_cost !== undefined && { unit_cost: updateData.unit_cost ? parseFloat(updateData.unit_cost) : null }),
        ...(updateData.currency !== undefined && { currency: updateData.currency }),
        ...(updateData.tax_rate !== undefined && { tax_rate: updateData.tax_rate ? parseFloat(updateData.tax_rate) : null }),
        ...(updateData.unit !== undefined && { unit: updateData.unit || null }),
        ...(updateData.is_recurring !== undefined && { is_recurring: updateData.is_recurring }),
        ...(updateData.billing_period !== undefined && { billing_period: !willBeRecurring ? null : updateData.billing_period }),
        ...(updateData.categoryId !== undefined && { categoryId: updateData.categoryId || null }),
        updatedBy: userId,
        v: { increment: 1 },
      },
    });

    await writeAuditLog({
      entityType: "product",
      entityId: product.id,
      action: "updated",
      changes: updateData,
      userId,
    });

    revalidatePath("/[locale]/(routes)/crm/products", "page");
    revalidatePath(`/[locale]/(routes)/crm/products/${id}`, "page");
    return { data: { id: product.id, name: product.name } };
  } catch (error) {
    console.log("[UPDATE_PRODUCT]", error);
    return { error: "Failed to update product" };
  }
};

export const updateProduct = createSafeAction(UpdateProduct, handler);
```

- [ ] **Step 7: Create delete product server action**

Create `actions/crm/products/delete-product/index.ts`:

```typescript
"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { revalidatePath } from "next/cache";

export const deleteProduct = async (id: string) => {
  const session = await getSession();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    await prismadb.crm_Products.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: session.user.id,
      },
    });

    await writeAuditLog({
      entityType: "product",
      entityId: id,
      action: "deleted",
      changes: null,
      userId: session.user.id,
    });

    revalidatePath("/[locale]/(routes)/crm/products", "page");
    return { data: { id } };
  } catch (error) {
    console.log("[DELETE_PRODUCT]", error);
    return { error: "Failed to delete product" };
  }
};
```

- [ ] **Step 8: Create get-products data fetching action**

Create `actions/crm/products/get-products.ts`:

```typescript
import { cache } from "react";
import { prismadb } from "@/lib/prisma";

export const getProductsFull = cache(async () => {
  const products = await prismadb.crm_Products.findMany({
    where: { deletedAt: null },
    include: {
      category: true,
      created_by_user: {
        select: { id: true, name: true },
      },
      _count: {
        select: { accountProducts: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return products;
});
```

- [ ] **Step 9: Create get-product (single) data fetching action**

Create `actions/crm/products/get-product.ts`:

```typescript
import { cache } from "react";
import { prismadb } from "@/lib/prisma";

export const getProduct = cache(async (id: string) => {
  const product = await prismadb.crm_Products.findUnique({
    where: { id },
    include: {
      category: true,
      created_by_user: {
        select: { id: true, name: true },
      },
      accountProducts: {
        include: {
          account: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return product;
});
```

- [ ] **Step 10: Create get-product-categories action**

Create `actions/crm/products/get-product-categories.ts`:

```typescript
import { cache } from "react";
import { prismadb } from "@/lib/prisma";

export const getProductCategories = cache(async () => {
  const categories = await prismadb.crm_ProductCategories.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });

  return categories;
});
```

- [ ] **Step 11: Commit**

```bash
git add actions/crm/products/
git commit -m "feat(products): add server actions for Product CRUD and data fetching"
```

---

## Task 3: Server Actions — Account Product Assignments

**Files:**
- Create: `actions/crm/account-products/assign-product/schema.ts`
- Create: `actions/crm/account-products/assign-product/types.ts`
- Create: `actions/crm/account-products/assign-product/index.ts`
- Create: `actions/crm/account-products/update-assignment/schema.ts`
- Create: `actions/crm/account-products/update-assignment/types.ts`
- Create: `actions/crm/account-products/update-assignment/index.ts`
- Create: `actions/crm/account-products/remove-assignment/index.ts`
- Create: `actions/crm/account-products/get-account-products.ts`

- [ ] **Step 1: Create assign product schema**

Create `actions/crm/account-products/assign-product/schema.ts`:

```typescript
import { z } from "zod";

export const AssignProduct = z.object({
  accountId: z.string(),
  productId: z.string(),
  quantity: z.coerce.number().int().min(1).default(1),
  custom_price: z.string().optional(),
  currency: z.string().length(3),
  status: z.enum(["ACTIVE", "PENDING"]).default("ACTIVE"),
  start_date: z.coerce.date(),
  end_date: z.coerce.date().optional(),
  renewal_date: z.coerce.date().optional(),
  notes: z.string().max(1000).optional(),
});
```

- [ ] **Step 2: Create assign product types**

Create `actions/crm/account-products/assign-product/types.ts`:

```typescript
import { z } from "zod";
import { ActionState } from "@/lib/create-safe-action";
import { AssignProduct } from "./schema";

type Assignment = { id: string };

export type InputType = z.infer<typeof AssignProduct>;
export type ReturnType = ActionState<InputType, Assignment>;
```

- [ ] **Step 3: Create assign product server action**

Create `actions/crm/account-products/assign-product/index.ts`:

```typescript
"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { AssignProduct } from "./schema";
import { InputType, ReturnType } from "./types";
import { createSafeAction } from "@/lib/create-safe-action";
import { writeAuditLog } from "@/lib/audit-log";
import { getSnapshotRate, getDefaultCurrency } from "@/lib/currency";
import { revalidatePath } from "next/cache";

const handler = async (data: InputType): Promise<ReturnType> => {
  const session = await getSession();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const userId = session.user.id;
  const {
    accountId,
    productId,
    quantity,
    custom_price,
    currency,
    status,
    start_date,
    end_date,
    renewal_date,
    notes,
  } = data;

  try {
    // Validate product is ACTIVE
    const product = await prismadb.crm_Products.findUnique({
      where: { id: productId },
    });
    if (!product || product.deletedAt) {
      return { error: "Product not found" };
    }
    if (product.status !== "ACTIVE") {
      return { error: "Only active products can be assigned to accounts" };
    }

    // Check for duplicate active/pending assignment
    const existingAssignment = await prismadb.crm_AccountProducts.findFirst({
      where: {
        accountId,
        productId,
        status: { in: ["ACTIVE", "PENDING"] },
      },
    });
    if (existingAssignment) {
      return { error: "This product is already assigned to this account with an active or pending status" };
    }

    // Validate dates
    if (end_date && end_date <= start_date) {
      return { error: "End date must be after start date" };
    }
    if (renewal_date && renewal_date <= start_date) {
      return { error: "Renewal date must be after start date" };
    }

    // Snapshot exchange rate
    const defaultCurrency = await getDefaultCurrency();
    const snapshotRate = currency
      ? await getSnapshotRate(currency, defaultCurrency)
      : null;

    const assignment = await prismadb.crm_AccountProducts.create({
      data: {
        accountId,
        productId,
        quantity,
        custom_price: custom_price ? parseFloat(custom_price) : undefined,
        currency,
        snapshot_rate: snapshotRate ? parseFloat(snapshotRate.toString()) : undefined,
        status: status || "ACTIVE",
        start_date,
        end_date: end_date || undefined,
        renewal_date: renewal_date || undefined,
        notes: notes || undefined,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    await writeAuditLog({
      entityType: "account_product",
      entityId: assignment.id,
      action: "created",
      changes: null,
      userId,
    });

    revalidatePath("/[locale]/(routes)/crm/accounts/[accountId]", "page");
    revalidatePath("/[locale]/(routes)/crm/products/[productId]", "page");
    return { data: { id: assignment.id } };
  } catch (error) {
    console.log("[ASSIGN_PRODUCT]", error);
    return { error: "Failed to assign product to account" };
  }
};

export const assignProduct = createSafeAction(AssignProduct, handler);
```

- [ ] **Step 4: Create update assignment schema**

Create `actions/crm/account-products/update-assignment/schema.ts`:

```typescript
import { z } from "zod";

export const UpdateAssignment = z.object({
  id: z.string(),
  quantity: z.coerce.number().int().min(1).optional(),
  custom_price: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "EXPIRED", "CANCELLED", "PENDING"]).optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional().nullable(),
  renewal_date: z.coerce.date().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});
```

- [ ] **Step 5: Create update assignment types**

Create `actions/crm/account-products/update-assignment/types.ts`:

```typescript
import { z } from "zod";
import { ActionState } from "@/lib/create-safe-action";
import { UpdateAssignment } from "./schema";

type Assignment = { id: string };

export type InputType = z.infer<typeof UpdateAssignment>;
export type ReturnType = ActionState<InputType, Assignment>;
```

- [ ] **Step 6: Create update assignment server action**

Create `actions/crm/account-products/update-assignment/index.ts`:

```typescript
"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { UpdateAssignment } from "./schema";
import { InputType, ReturnType } from "./types";
import { createSafeAction } from "@/lib/create-safe-action";
import { writeAuditLog } from "@/lib/audit-log";
import { revalidatePath } from "next/cache";

const handler = async (data: InputType): Promise<ReturnType> => {
  const session = await getSession();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const userId = session.user.id;
  const { id, ...updateData } = data;

  try {
    const existing = await prismadb.crm_AccountProducts.findUnique({
      where: { id },
    });
    if (!existing) {
      return { error: "Assignment not found" };
    }

    // Validate dates if provided
    const startDate = updateData.start_date ?? existing.start_date;
    if (updateData.end_date && updateData.end_date <= startDate) {
      return { error: "End date must be after start date" };
    }
    if (updateData.renewal_date && updateData.renewal_date <= startDate) {
      return { error: "Renewal date must be after start date" };
    }

    const assignment = await prismadb.crm_AccountProducts.update({
      where: { id },
      data: {
        ...(updateData.quantity !== undefined && { quantity: updateData.quantity }),
        ...(updateData.custom_price !== undefined && {
          custom_price: updateData.custom_price ? parseFloat(updateData.custom_price) : null,
        }),
        ...(updateData.status !== undefined && { status: updateData.status }),
        ...(updateData.start_date !== undefined && { start_date: updateData.start_date }),
        ...(updateData.end_date !== undefined && { end_date: updateData.end_date }),
        ...(updateData.renewal_date !== undefined && { renewal_date: updateData.renewal_date }),
        ...(updateData.notes !== undefined && { notes: updateData.notes }),
        updatedBy: userId,
        v: { increment: 1 },
      },
    });

    await writeAuditLog({
      entityType: "account_product",
      entityId: assignment.id,
      action: "updated",
      changes: updateData,
      userId,
    });

    revalidatePath("/[locale]/(routes)/crm/accounts/[accountId]", "page");
    revalidatePath("/[locale]/(routes)/crm/products/[productId]", "page");
    return { data: { id: assignment.id } };
  } catch (error) {
    console.log("[UPDATE_ASSIGNMENT]", error);
    return { error: "Failed to update assignment" };
  }
};

export const updateAssignment = createSafeAction(UpdateAssignment, handler);
```

- [ ] **Step 7: Create remove assignment server action**

Create `actions/crm/account-products/remove-assignment/index.ts`:

```typescript
"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { revalidatePath } from "next/cache";

export const removeAssignment = async (id: string) => {
  const session = await getSession();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const assignment = await prismadb.crm_AccountProducts.update({
      where: { id },
      data: {
        status: "CANCELLED",
        updatedBy: session.user.id,
        v: { increment: 1 },
      },
    });

    await writeAuditLog({
      entityType: "account_product",
      entityId: id,
      action: "cancelled",
      changes: null,
      userId: session.user.id,
    });

    revalidatePath("/[locale]/(routes)/crm/accounts/[accountId]", "page");
    revalidatePath("/[locale]/(routes)/crm/products/[productId]", "page");
    return { data: { id: assignment.id } };
  } catch (error) {
    console.log("[REMOVE_ASSIGNMENT]", error);
    return { error: "Failed to cancel assignment" };
  }
};
```

- [ ] **Step 8: Create get-account-products data fetching**

Create `actions/crm/account-products/get-account-products.ts`:

```typescript
import { cache } from "react";
import { prismadb } from "@/lib/prisma";

export const getAccountProducts = cache(async (accountId: string) => {
  const assignments = await prismadb.crm_AccountProducts.findMany({
    where: { accountId },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          type: true,
          status: true,
          unit_price: true,
          unit: true,
          is_recurring: true,
          billing_period: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return assignments;
});
```

- [ ] **Step 9: Commit**

```bash
git add actions/crm/account-products/
git commit -m "feat(products): add server actions for Account-Product assignments"
```

---

## Task 4: CSV Bulk Import Server Action

**Files:**
- Create: `actions/crm/products/import-products.ts`

- [ ] **Step 1: Create the import server action**

Create `actions/crm/products/import-products.ts`:

```typescript
"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import Papa from "papaparse";
import { writeAuditLog } from "@/lib/audit-log";
import { revalidatePath } from "next/cache";

const REQUIRED_FIELDS = ["name", "type", "unit_price", "currency"];
const MAX_ROWS = 500;

export async function importProducts(
  formData: FormData
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;
  const file = formData.get("file") as File | null;
  if (!file) throw new Error("No file provided");

  const text = await file.text();
  const { data } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (data.length > MAX_ROWS) {
    throw new Error(`Import limited to ${MAX_ROWS} rows. File contains ${data.length} rows.`);
  }

  // Load lookup data
  const [categories, currencies, existingSkus] = await Promise.all([
    prismadb.crm_ProductCategories.findMany({ where: { isActive: true } }),
    prismadb.currency.findMany({ where: { isEnabled: true } }),
    prismadb.crm_Products.findMany({
      where: { sku: { not: null } },
      select: { sku: true },
    }),
  ]);

  const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
  const currencyCodes = new Set(currencies.map((c) => c.code));
  const existingSkuSet = new Set(existingSkus.map((p) => p.sku?.toLowerCase()));
  const seenSkus = new Set<string>();

  const valid: any[] = [];
  const errors: string[] = [];

  data.forEach((row, index) => {
    const rowNum = index + 2; // +2 for header + 0-index

    // Check required fields
    const missing = REQUIRED_FIELDS.filter((f) => !row[f]?.trim());
    if (missing.length > 0) {
      errors.push(`Row ${rowNum}: missing required fields: ${missing.join(", ")}`);
      return;
    }

    // Validate type
    const type = row.type?.trim().toUpperCase();
    if (type !== "PRODUCT" && type !== "SERVICE") {
      errors.push(`Row ${rowNum}: invalid type "${row.type}" (must be PRODUCT or SERVICE)`);
      return;
    }

    // Validate currency
    const currency = row.currency?.trim().toUpperCase();
    if (!currencyCodes.has(currency)) {
      errors.push(`Row ${rowNum}: unknown currency "${row.currency}"`);
      return;
    }

    // Validate unit_price is a number
    const unitPrice = parseFloat(row.unit_price);
    if (isNaN(unitPrice) || unitPrice < 0) {
      errors.push(`Row ${rowNum}: invalid unit_price "${row.unit_price}"`);
      return;
    }

    // Validate unit_cost if provided
    let unitCost: number | undefined;
    if (row.unit_cost?.trim()) {
      unitCost = parseFloat(row.unit_cost);
      if (isNaN(unitCost) || unitCost < 0) {
        errors.push(`Row ${rowNum}: invalid unit_cost "${row.unit_cost}"`);
        return;
      }
    }

    // Validate tax_rate if provided
    let taxRate: number | undefined;
    if (row.tax_rate?.trim()) {
      taxRate = parseFloat(row.tax_rate);
      if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
        errors.push(`Row ${rowNum}: invalid tax_rate "${row.tax_rate}" (must be 0-100)`);
        return;
      }
    }

    // Validate SKU uniqueness
    const sku = row.sku?.trim() || null;
    if (sku) {
      const skuLower = sku.toLowerCase();
      if (existingSkuSet.has(skuLower)) {
        errors.push(`Row ${rowNum}: SKU "${sku}" already exists`);
        return;
      }
      if (seenSkus.has(skuLower)) {
        errors.push(`Row ${rowNum}: duplicate SKU "${sku}" in file`);
        return;
      }
      seenSkus.add(skuLower);
    }

    // Validate category if provided
    let categoryId: string | undefined;
    if (row.category?.trim()) {
      categoryId = categoryMap.get(row.category.trim().toLowerCase());
      if (!categoryId) {
        errors.push(`Row ${rowNum}: unknown category "${row.category}"`);
        return;
      }
    }

    // Validate is_recurring and billing_period
    const isRecurring = row.is_recurring?.trim().toLowerCase() === "true";
    let billingPeriod: string | undefined;
    if (isRecurring) {
      billingPeriod = row.billing_period?.trim().toUpperCase();
      if (!["MONTHLY", "QUARTERLY", "ANNUALLY", "ONE_TIME"].includes(billingPeriod || "")) {
        errors.push(`Row ${rowNum}: recurring product requires valid billing_period (MONTHLY, QUARTERLY, ANNUALLY, ONE_TIME)`);
        return;
      }
    }

    valid.push({
      name: row.name.trim(),
      description: row.description?.trim() || null,
      sku,
      type,
      status: "DRAFT",
      unit_price: unitPrice,
      unit_cost: unitCost ?? null,
      currency,
      tax_rate: taxRate ?? null,
      unit: row.unit?.trim() || null,
      is_recurring: isRecurring,
      billing_period: isRecurring ? billingPeriod : null,
      categoryId: categoryId ?? null,
      createdBy: userId,
      updatedBy: userId,
    });
  });

  if (valid.length > 0) {
    await prismadb.crm_Products.createMany({
      data: valid,
      skipDuplicates: true,
    });

    await writeAuditLog({
      entityType: "product",
      entityId: "bulk_import",
      action: "imported",
      changes: { count: valid.length },
      userId,
    });
  }

  revalidatePath("/[locale]/(routes)/crm/products", "page");
  return { imported: valid.length, skipped: errors.length, errors };
}
```

- [ ] **Step 2: Commit**

```bash
git add actions/crm/products/import-products.ts
git commit -m "feat(products): add CSV bulk import server action"
```

---

## Task 5: Table Data Schema and Columns

**Files:**
- Create: `app/[locale]/(routes)/crm/products/table-data/schema.tsx`
- Create: `app/[locale]/(routes)/crm/products/table-data/data.tsx`
- Create: `app/[locale]/(routes)/crm/products/table-components/columns.tsx`
- Create: `app/[locale]/(routes)/crm/products/table-components/data-table-column-header.tsx`
- Create: `app/[locale]/(routes)/crm/products/table-components/data-table-toolbar.tsx`
- Create: `app/[locale]/(routes)/crm/products/table-components/data-table-pagination.tsx`
- Create: `app/[locale]/(routes)/crm/products/table-components/data-table-faceted-filter.tsx`
- Create: `app/[locale]/(routes)/crm/products/table-components/data-table-view-options.tsx`
- Create: `app/[locale]/(routes)/crm/products/table-components/data-table-row-actions.tsx`
- Create: `app/[locale]/(routes)/crm/products/table-components/data-table.tsx`

- [ ] **Step 1: Create table data schema**

Create `app/[locale]/(routes)/crm/products/table-data/schema.tsx`:

```typescript
import { z } from "zod";

export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  sku: z.string().nullable(),
  type: z.string(),
  status: z.string(),
  unit_price: z.union([z.number(), z.bigint()]).transform((val) =>
    typeof val === "bigint" ? Number(val) : val
  ),
  unit_cost: z.union([z.number(), z.bigint()]).nullable().transform((val) =>
    val !== null && typeof val === "bigint" ? Number(val) : val
  ),
  currency: z.string(),
  tax_rate: z.union([z.number(), z.bigint()]).nullable().transform((val) =>
    val !== null && typeof val === "bigint" ? Number(val) : val
  ),
  unit: z.string().nullable(),
  is_recurring: z.boolean(),
  billing_period: z.string().nullable(),
  category: z.object({
    id: z.string(),
    name: z.string(),
  }).nullable(),
  created_by_user: z.object({
    id: z.string(),
    name: z.string().nullable(),
  }).nullable(),
  _count: z.object({
    accountProducts: z.number(),
  }),
  createdAt: z.date(),
});

export type Product = z.infer<typeof productSchema>;
```

- [ ] **Step 2: Create filter data**

Create `app/[locale]/(routes)/crm/products/table-data/data.tsx`:

```typescript
export const productTypes = [
  { value: "PRODUCT", label: "Product" },
  { value: "SERVICE", label: "Service" },
];

export const productStatuses = [
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "ARCHIVED", label: "Archived" },
];

export const billingPeriods = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "ANNUALLY", label: "Annually" },
  { value: "ONE_TIME", label: "One Time" },
];
```

- [ ] **Step 3: Copy table infrastructure files from contracts module**

Copy these files from `app/[locale]/(routes)/crm/contracts/table-components/` to `app/[locale]/(routes)/crm/products/table-components/`, keeping them identical (they are generic table utilities):

- `data-table-column-header.tsx`
- `data-table-pagination.tsx`
- `data-table-faceted-filter.tsx`
- `data-table-view-options.tsx`

Run:
```bash
mkdir -p "app/[locale]/(routes)/crm/products/table-components"
cp "app/[locale]/(routes)/crm/contracts/table-components/data-table-column-header.tsx" "app/[locale]/(routes)/crm/products/table-components/"
cp "app/[locale]/(routes)/crm/contracts/table-components/data-table-pagination.tsx" "app/[locale]/(routes)/crm/products/table-components/"
cp "app/[locale]/(routes)/crm/contracts/table-components/data-table-faceted-filter.tsx" "app/[locale]/(routes)/crm/products/table-components/"
cp "app/[locale]/(routes)/crm/contracts/table-components/data-table-view-options.tsx" "app/[locale]/(routes)/crm/products/table-components/"
```

- [ ] **Step 4: Create columns definition**

Create `app/[locale]/(routes)/crm/products/table-components/columns.tsx`:

```tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

import { DataTableColumnHeader } from "./data-table-column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import { Product } from "../table-data/schema";
import { formatCurrency } from "@/lib/currency";

export const columns: ColumnDef<Product>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <Link
        href={`/crm/products/${row.original.id}`}
        className="font-medium hover:underline"
      >
        {row.getValue("name")}
      </Link>
    ),
  },
  {
    accessorKey: "sku",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="SKU" />
    ),
    cell: ({ row }) => row.getValue("sku") || "—",
  },
  {
    accessorKey: "type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" />
    ),
    cell: ({ row }) => {
      const type = row.getValue("type") as string;
      return (
        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
          type === "PRODUCT"
            ? "bg-blue-50 text-blue-700"
            : "bg-purple-50 text-purple-700"
        }`}>
          {type === "PRODUCT" ? "Product" : "Service"}
        </span>
      );
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const colors: Record<string, string> = {
        DRAFT: "bg-gray-50 text-gray-700",
        ACTIVE: "bg-green-50 text-green-700",
        ARCHIVED: "bg-yellow-50 text-yellow-700",
      };
      return (
        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${colors[status] || ""}`}>
          {status.charAt(0) + status.slice(1).toLowerCase()}
        </span>
      );
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "unit_price",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Price" />
    ),
    cell: ({ row }) => {
      const price = row.getValue("unit_price") as number;
      const currency = row.original.currency;
      return formatCurrency(price, currency);
    },
  },
  {
    accessorKey: "category",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Category" />
    ),
    cell: ({ row }) => {
      const category = row.original.category;
      return category?.name || "—";
    },
  },
  {
    accessorKey: "_count",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Accounts" />
    ),
    cell: ({ row }) => row.original._count.accountProducts,
  },
  {
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];
```

- [ ] **Step 5: Create data-table-toolbar**

Create `app/[locale]/(routes)/crm/products/table-components/data-table-toolbar.tsx`:

```tsx
"use client";

import { Table } from "@tanstack/react-table";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTableFacetedFilter } from "./data-table-faceted-filter";
import { DataTableViewOptions } from "./data-table-view-options";

import { productTypes, productStatuses } from "../table-data/data";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Filter by name..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {table.getColumn("type") && (
          <DataTableFacetedFilter
            column={table.getColumn("type")}
            title="Type"
            options={productTypes}
          />
        )}
        {table.getColumn("status") && (
          <DataTableFacetedFilter
            column={table.getColumn("status")}
            title="Status"
            options={productStatuses}
          />
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  );
}
```

- [ ] **Step 6: Create data-table-row-actions**

Create `app/[locale]/(routes)/crm/products/table-components/data-table-row-actions.tsx`:

```tsx
"use client";

import { Row } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { productSchema } from "../table-data/schema";
import { deleteProduct } from "@/actions/crm/products/delete-product";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const product = productSchema.parse(row.original);
  const router = useRouter();

  const handleDelete = async () => {
    const result = await deleteProduct(product.id);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Product deleted");
      router.refresh();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex h-8 w-8 p-0 data-[state=open]:bg-muted">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        <DropdownMenuItem onClick={() => router.push(`/crm/products/${product.id}`)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDelete} className="text-red-600">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 7: Create data-table component**

Create `app/[locale]/(routes)/crm/products/table-components/data-table.tsx`:

```tsx
"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { DataTablePagination } from "./data-table-pagination";
import { DataTableToolbar } from "./data-table-toolbar";

interface ProductsDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function ProductsDataTable<TData, TValue>({
  columns,
  data,
}: ProductsDataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  return (
    <div className="space-y-4">
      <DataTableToolbar table={table} />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No products found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}
```

- [ ] **Step 8: Commit**

```bash
git add "app/[locale]/(routes)/crm/products/table-data/" "app/[locale]/(routes)/crm/products/table-components/"
git commit -m "feat(products): add table components with columns, filters, and row actions"
```

---

## Task 6: Product Forms (Create and Update)

**Files:**
- Create: `app/[locale]/(routes)/crm/products/_forms/create-product.tsx`
- Create: `app/[locale]/(routes)/crm/products/_forms/update-product.tsx`

- [ ] **Step 1: Create the New Product form**

Create `app/[locale]/(routes)/crm/products/_forms/create-product.tsx`:

```tsx
"use client";

import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { crm_ProductCategories } from "@prisma/client";

import { useAction } from "@/hooks/use-action";
import { createProduct } from "@/actions/crm/products/create-product";

import { FormInput } from "@/components/form/form-input";
import FormSheet from "@/components/sheets/form-sheet";
import { FormSubmit } from "@/components/form/form-submit";
import { FormTextarea } from "@/components/form/form-textarea";
import { FormSelect } from "@/components/form/from-select";

const CreateProductForm = ({
  categories,
  currencies = [],
}: {
  categories: crm_ProductCategories[];
  currencies?: { code: string; name: string; symbol: string }[];
}) => {
  const router = useRouter();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [isRecurring, setIsRecurring] = useState(false);

  const { execute, fieldErrors, isLoading } = useAction(createProduct, {
    onSuccess: () => {
      toast.success("Product created successfully");
      closeRef.current?.click();
      router.refresh();
    },
    onError: (error) => {
      toast.error(error);
    },
  });

  const onAction = async (formData: FormData) => {
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const sku = formData.get("sku") as string;
    const type = formData.get("type") as string;
    const status = formData.get("status") as string;
    const unit_price = formData.get("unit_price") as string;
    const unit_cost = formData.get("unit_cost") as string;
    const currency = formData.get("currency") as string;
    const tax_rate = formData.get("tax_rate") as string;
    const unit = formData.get("unit") as string;
    const billing_period = formData.get("billing_period") as string;
    const categoryId = formData.get("categoryId") as string;

    await execute({
      name,
      description: description || undefined,
      sku: sku || undefined,
      type: type as "PRODUCT" | "SERVICE",
      status: (status as "DRAFT" | "ACTIVE" | "ARCHIVED") || "DRAFT",
      unit_price,
      unit_cost: unit_cost || undefined,
      currency,
      tax_rate: tax_rate || undefined,
      unit: unit || undefined,
      is_recurring: isRecurring,
      billing_period: isRecurring
        ? (billing_period as "MONTHLY" | "QUARTERLY" | "ANNUALLY" | "ONE_TIME")
        : undefined,
      categoryId: categoryId || undefined,
    });
  };

  return (
    <FormSheet
      trigger={"+"}
      title="Create Product"
      description="Add a new product or service to the catalog"
      onClose={closeRef}
    >
      <form action={onAction} className="space-y-4">
        <FormInput id="name" label="Name" type="text" errors={fieldErrors} />
        <FormInput id="sku" label="SKU" type="text" errors={fieldErrors} />
        <FormSelect
          id="type"
          label="Type"
          type="hidden"
          data={[
            { id: "PRODUCT", name: "Product" },
            { id: "SERVICE", name: "Service" },
          ]}
          errors={fieldErrors}
        />
        <FormSelect
          id="status"
          label="Status"
          type="hidden"
          data={[
            { id: "DRAFT", name: "Draft" },
            { id: "ACTIVE", name: "Active" },
            { id: "ARCHIVED", name: "Archived" },
          ]}
          errors={fieldErrors}
          defaultValue="DRAFT"
        />
        <div className="grid grid-cols-2 gap-4">
          <FormInput id="unit_price" label="Unit Price" type="text" errors={fieldErrors} />
          <FormInput id="unit_cost" label="Unit Cost" type="text" errors={fieldErrors} />
        </div>
        <FormSelect
          id="currency"
          label="Currency"
          type="hidden"
          data={currencies.map((c) => ({
            id: c.code,
            name: `${c.symbol} ${c.code} — ${c.name}`,
          }))}
          errors={fieldErrors}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormInput id="tax_rate" label="Tax Rate (%)" type="text" errors={fieldErrors} />
          <FormInput id="unit" label="Unit" type="text" errors={fieldErrors} />
        </div>
        {categories.length > 0 && (
          <FormSelect
            id="categoryId"
            label="Category"
            type="hidden"
            data={categories.map((c) => ({ id: c.id, name: c.name }))}
            errors={fieldErrors}
          />
        )}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="is_recurring_checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="is_recurring_checkbox" className="text-sm font-medium">
            Recurring
          </label>
        </div>
        {isRecurring && (
          <FormSelect
            id="billing_period"
            label="Billing Period"
            type="hidden"
            data={[
              { id: "MONTHLY", name: "Monthly" },
              { id: "QUARTERLY", name: "Quarterly" },
              { id: "ANNUALLY", name: "Annually" },
              { id: "ONE_TIME", name: "One Time" },
            ]}
            errors={fieldErrors}
          />
        )}
        <FormTextarea id="description" label="Description" errors={fieldErrors} />
        <FormSubmit className="w-full">
          {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Create"}
        </FormSubmit>
      </form>
    </FormSheet>
  );
};

export default CreateProductForm;
```

- [ ] **Step 2: Create the Update Product form**

Create `app/[locale]/(routes)/crm/products/_forms/update-product.tsx`:

```tsx
"use client";

import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { crm_ProductCategories } from "@prisma/client";

import { useAction } from "@/hooks/use-action";
import { updateProduct } from "@/actions/crm/products/update-product";

import { FormInput } from "@/components/form/form-input";
import FormSheet from "@/components/sheets/form-sheet";
import { FormSubmit } from "@/components/form/form-submit";
import { FormTextarea } from "@/components/form/form-textarea";
import { FormSelect } from "@/components/form/from-select";

interface UpdateProductFormProps {
  product: {
    id: string;
    name: string;
    description: string | null;
    sku: string | null;
    type: string;
    status: string;
    unit_price: number;
    unit_cost: number | null;
    currency: string;
    tax_rate: number | null;
    unit: string | null;
    is_recurring: boolean;
    billing_period: string | null;
    categoryId: string | null;
  };
  categories: crm_ProductCategories[];
  currencies?: { code: string; name: string; symbol: string }[];
}

const UpdateProductForm = ({
  product,
  categories,
  currencies = [],
}: UpdateProductFormProps) => {
  const router = useRouter();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [isRecurring, setIsRecurring] = useState(product.is_recurring);

  const { execute, fieldErrors, isLoading } = useAction(updateProduct, {
    onSuccess: () => {
      toast.success("Product updated successfully");
      closeRef.current?.click();
      router.refresh();
    },
    onError: (error) => {
      toast.error(error);
    },
  });

  const onAction = async (formData: FormData) => {
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const sku = formData.get("sku") as string;
    const type = formData.get("type") as string;
    const status = formData.get("status") as string;
    const unit_price = formData.get("unit_price") as string;
    const unit_cost = formData.get("unit_cost") as string;
    const currency = formData.get("currency") as string;
    const tax_rate = formData.get("tax_rate") as string;
    const unit = formData.get("unit") as string;
    const billing_period = formData.get("billing_period") as string;
    const categoryId = formData.get("categoryId") as string;

    await execute({
      id: product.id,
      name,
      description: description || undefined,
      sku: sku || undefined,
      type: type as "PRODUCT" | "SERVICE",
      status: status as "DRAFT" | "ACTIVE" | "ARCHIVED",
      unit_price,
      unit_cost: unit_cost || undefined,
      currency,
      tax_rate: tax_rate || undefined,
      unit: unit || undefined,
      is_recurring: isRecurring,
      billing_period: isRecurring
        ? (billing_period as "MONTHLY" | "QUARTERLY" | "ANNUALLY" | "ONE_TIME")
        : null,
      categoryId: categoryId || null,
    });
  };

  return (
    <FormSheet
      trigger="Edit"
      title="Update Product"
      description="Modify product details"
      onClose={closeRef}
    >
      <form action={onAction} className="space-y-4">
        <FormInput id="name" label="Name" type="text" errors={fieldErrors} defaultValue={product.name} />
        <FormInput id="sku" label="SKU" type="text" errors={fieldErrors} defaultValue={product.sku || ""} />
        <FormSelect
          id="type"
          label="Type"
          type="hidden"
          data={[
            { id: "PRODUCT", name: "Product" },
            { id: "SERVICE", name: "Service" },
          ]}
          errors={fieldErrors}
          defaultValue={product.type}
        />
        <FormSelect
          id="status"
          label="Status"
          type="hidden"
          data={[
            { id: "DRAFT", name: "Draft" },
            { id: "ACTIVE", name: "Active" },
            { id: "ARCHIVED", name: "Archived" },
          ]}
          errors={fieldErrors}
          defaultValue={product.status}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormInput id="unit_price" label="Unit Price" type="text" errors={fieldErrors} defaultValue={String(product.unit_price)} />
          <FormInput id="unit_cost" label="Unit Cost" type="text" errors={fieldErrors} defaultValue={product.unit_cost ? String(product.unit_cost) : ""} />
        </div>
        <FormSelect
          id="currency"
          label="Currency"
          type="hidden"
          data={currencies.map((c) => ({
            id: c.code,
            name: `${c.symbol} ${c.code} — ${c.name}`,
          }))}
          errors={fieldErrors}
          defaultValue={product.currency}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormInput id="tax_rate" label="Tax Rate (%)" type="text" errors={fieldErrors} defaultValue={product.tax_rate ? String(product.tax_rate) : ""} />
          <FormInput id="unit" label="Unit" type="text" errors={fieldErrors} defaultValue={product.unit || ""} />
        </div>
        {categories.length > 0 && (
          <FormSelect
            id="categoryId"
            label="Category"
            type="hidden"
            data={categories.map((c) => ({ id: c.id, name: c.name }))}
            errors={fieldErrors}
            defaultValue={product.categoryId || ""}
          />
        )}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="is_recurring_checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="is_recurring_checkbox" className="text-sm font-medium">
            Recurring
          </label>
        </div>
        {isRecurring && (
          <FormSelect
            id="billing_period"
            label="Billing Period"
            type="hidden"
            data={[
              { id: "MONTHLY", name: "Monthly" },
              { id: "QUARTERLY", name: "Quarterly" },
              { id: "ANNUALLY", name: "Annually" },
              { id: "ONE_TIME", name: "One Time" },
            ]}
            errors={fieldErrors}
            defaultValue={product.billing_period || ""}
          />
        )}
        <FormTextarea id="description" label="Description" errors={fieldErrors} defaultValue={product.description || ""} />
        <FormSubmit className="w-full">
          {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Update"}
        </FormSubmit>
      </form>
    </FormSheet>
  );
};

export default UpdateProductForm;
```

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/(routes)/crm/products/_forms/"
git commit -m "feat(products): add create and update product form components"
```

---

## Task 7: Products List Page and View Component

**Files:**
- Create: `app/[locale]/(routes)/crm/products/page.tsx`
- Create: `app/[locale]/(routes)/crm/components/ProductsView.tsx`

- [ ] **Step 1: Create the ProductsView component**

Create `app/[locale]/(routes)/crm/components/ProductsView.tsx`:

```tsx
"use client";

import Link from "next/link";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { columns } from "../products/table-components/columns";
import { ProductsDataTable } from "../products/table-components/data-table";
import CreateProductForm from "../products/_forms/create-product";

import type { crm_ProductCategories } from "@prisma/client";

interface ProductsViewProps {
  data: any[];
  categories: crm_ProductCategories[];
  currencies?: { code: string; name: string; symbol: string }[];
}

const ProductsView = ({ data, categories, currencies = [] }: ProductsViewProps) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between">
          <CardTitle>
            <Link href="/crm/products" className="hover:underline">
              Product Catalog
            </Link>
          </CardTitle>
          <div className="flex space-x-2">
            <CreateProductForm categories={categories} currencies={currencies} />
          </div>
        </div>
        <Separator />
      </CardHeader>
      <CardContent>
        {!data || data.length === 0 ? (
          "No products found. Create your first product to get started."
        ) : (
          <ProductsDataTable data={data} columns={columns} />
        )}
      </CardContent>
    </Card>
  );
};

export default ProductsView;
```

- [ ] **Step 2: Create the products list page**

Create `app/[locale]/(routes)/crm/products/page.tsx`:

```tsx
import { Suspense } from "react";

import CrmTableSkeleton from "@/components/skeletons/crm-table-skeleton";
import Container from "../../components/ui/Container";
import ProductsView from "../components/ProductsView";
import { getProductsFull } from "@/actions/crm/products/get-products";
import { getProductCategories } from "@/actions/crm/products/get-product-categories";
import { getAllCrmData } from "@/actions/crm/get-crm-data";
import { serializeDecimalsList } from "@/lib/serialize-decimals";

const ProductsPage = async () => {
  const [products, categories, crmData] = await Promise.all([
    getProductsFull(),
    getProductCategories(),
    getAllCrmData(),
  ]);

  return (
    <Container
      title="Product Catalog"
      description="Manage your products and services"
    >
      <Suspense fallback={<CrmTableSkeleton />}>
        <ProductsView
          data={serializeDecimalsList(products)}
          categories={categories}
          currencies={crmData.currencies.map((c: { code: string; name: string; symbol: string }) => ({
            code: c.code,
            name: c.name,
            symbol: c.symbol,
          }))}
        />
      </Suspense>
    </Container>
  );
};

export default ProductsPage;
```

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/(routes)/crm/products/page.tsx" "app/[locale]/(routes)/crm/components/ProductsView.tsx"
git commit -m "feat(products): add products list page and view component"
```

---

## Task 8: Product Detail Page

**Files:**
- Create: `app/[locale]/(routes)/crm/products/[productId]/page.tsx`
- Create: `app/[locale]/(routes)/crm/products/[productId]/components/BasicView.tsx`
- Create: `app/[locale]/(routes)/crm/products/[productId]/components/AccountsTab.tsx`
- Create: `app/[locale]/(routes)/crm/products/[productId]/components/HistoryTab.tsx`

- [ ] **Step 1: Create the BasicView component**

Create `app/[locale]/(routes)/crm/products/[productId]/components/BasicView.tsx`:

```tsx
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";

interface BasicViewProps {
  data: {
    id: string;
    name: string;
    description: string | null;
    sku: string | null;
    type: string;
    status: string;
    unit_price: number;
    unit_cost: number | null;
    currency: string;
    tax_rate: number | null;
    unit: string | null;
    is_recurring: boolean;
    billing_period: string | null;
    category: { id: string; name: string } | null;
    created_by_user: { id: string; name: string | null } | null;
    createdAt: Date;
    updatedAt: Date | null;
  };
}

export const BasicView = ({ data }: BasicViewProps) => {
  const margin =
    data.unit_cost !== null
      ? ((data.unit_price - data.unit_cost) / data.unit_price) * 100
      : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Product Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">{data.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">SKU</span>
            <span className="font-medium">{data.sku || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Type</span>
            <span className="font-medium">{data.type === "PRODUCT" ? "Product" : "Service"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className="font-medium">{data.status.charAt(0) + data.status.slice(1).toLowerCase()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Category</span>
            <span className="font-medium">{data.category?.name || "—"}</span>
          </div>
          {data.description && (
            <div>
              <span className="text-muted-foreground">Description</span>
              <p className="mt-1 text-sm">{data.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Unit Price</span>
            <span className="font-medium">{formatCurrency(data.unit_price, data.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Unit Cost</span>
            <span className="font-medium">
              {data.unit_cost !== null ? formatCurrency(data.unit_cost, data.currency) : "—"}
            </span>
          </div>
          {margin !== null && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Margin</span>
              <span className="font-medium">{margin.toFixed(1)}%</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax Rate</span>
            <span className="font-medium">{data.tax_rate !== null ? `${data.tax_rate}%` : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Unit</span>
            <span className="font-medium">{data.unit || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Recurring</span>
            <span className="font-medium">
              {data.is_recurring
                ? data.billing_period
                  ? data.billing_period.charAt(0) + data.billing_period.slice(1).toLowerCase()
                  : "Yes"
                : "No"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
```

- [ ] **Step 2: Create the AccountsTab component**

Create `app/[locale]/(routes)/crm/products/[productId]/components/AccountsTab.tsx`:

```tsx
"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/currency";

interface AccountsTabProps {
  assignments: {
    id: string;
    quantity: number;
    custom_price: number | null;
    currency: string;
    status: string;
    start_date: Date;
    end_date: Date | null;
    renewal_date: Date | null;
    account: {
      id: string;
      name: string;
    };
  }[];
  productPrice: number;
  productCurrency: string;
}

export const AccountsTab = ({ assignments, productPrice, productCurrency }: AccountsTabProps) => {
  if (assignments.length === 0) {
    return <p className="text-muted-foreground py-4">No accounts have this product assigned.</p>;
  }

  const statusColors: Record<string, string> = {
    ACTIVE: "bg-green-50 text-green-700",
    PENDING: "bg-yellow-50 text-yellow-700",
    EXPIRED: "bg-gray-50 text-gray-700",
    CANCELLED: "bg-red-50 text-red-700",
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Account</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Qty</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>Start</TableHead>
          <TableHead>End</TableHead>
          <TableHead>Renewal</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assignments.map((a) => (
          <TableRow key={a.id}>
            <TableCell>
              <Link href={`/crm/accounts/${a.account.id}`} className="hover:underline font-medium">
                {a.account.name}
              </Link>
            </TableCell>
            <TableCell>
              <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${statusColors[a.status] || ""}`}>
                {a.status.charAt(0) + a.status.slice(1).toLowerCase()}
              </span>
            </TableCell>
            <TableCell>{a.quantity}</TableCell>
            <TableCell>
              {a.custom_price !== null
                ? formatCurrency(a.custom_price, a.currency)
                : formatCurrency(productPrice, productCurrency)}
            </TableCell>
            <TableCell>{new Date(a.start_date).toLocaleDateString()}</TableCell>
            <TableCell>{a.end_date ? new Date(a.end_date).toLocaleDateString() : "—"}</TableCell>
            <TableCell>{a.renewal_date ? new Date(a.renewal_date).toLocaleDateString() : "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
```

- [ ] **Step 3: Create the HistoryTab component**

Create `app/[locale]/(routes)/crm/products/[productId]/components/HistoryTab.tsx`:

```tsx
import { getAuditLogs } from "@/lib/audit-log";

interface HistoryTabProps {
  productId: string;
}

export const HistoryTab = async ({ productId }: HistoryTabProps) => {
  const logs = await getAuditLogs({ entityType: "product", entityId: productId });

  if (!logs || logs.length === 0) {
    return <p className="text-muted-foreground py-4">No history available.</p>;
  }

  return (
    <div className="space-y-3">
      {logs.map((log: any) => (
        <div key={log.id} className="flex items-start gap-3 border-b pb-3">
          <div className="flex-1">
            <p className="text-sm font-medium capitalize">{log.action}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(log.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
```

- [ ] **Step 4: Create the product detail page**

Create `app/[locale]/(routes)/crm/products/[productId]/page.tsx`:

```tsx
import Container from "@/app/[locale]/(routes)/components/ui/Container";
import { getProduct } from "@/actions/crm/products/get-product";
import { getProductCategories } from "@/actions/crm/products/get-product-categories";
import { getAllCrmData } from "@/actions/crm/get-crm-data";
import { serializeDecimalsList } from "@/lib/serialize-decimals";
import { BasicView } from "./components/BasicView";
import { AccountsTab } from "./components/AccountsTab";
import { HistoryTab } from "./components/HistoryTab";
import UpdateProductForm from "../_forms/update-product";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ProductDetailPageProps {
  params: Promise<{
    productId: string;
  }>;
}

const ProductDetailPage = async (props: ProductDetailPageProps) => {
  const params = await props.params;
  const { productId } = params;

  const [product, categories, crmData] = await Promise.all([
    getProduct(productId),
    getProductCategories(),
    getAllCrmData(),
  ]);

  if (!product) return <div>Product not found</div>;

  const serializedProduct = {
    ...product,
    unit_price: Number(product.unit_price),
    unit_cost: product.unit_cost !== null ? Number(product.unit_cost) : null,
    tax_rate: product.tax_rate !== null ? Number(product.tax_rate) : null,
  };

  const serializedAssignments = product.accountProducts.map((a) => ({
    ...a,
    custom_price: a.custom_price !== null ? Number(a.custom_price) : null,
  }));

  return (
    <Container
      title={`Product: ${product.name}`}
      description="Product details and account assignments"
    >
      <div className="flex justify-end mb-4">
        <UpdateProductForm
          product={serializedProduct}
          categories={categories}
          currencies={crmData.currencies.map((c: { code: string; name: string; symbol: string }) => ({
            code: c.code,
            name: c.name,
            symbol: c.symbol,
          }))}
        />
      </div>
      <Tabs defaultValue="basic">
        <TabsList>
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="accounts">
            Accounts ({serializedAssignments.length})
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="basic">
          <BasicView data={serializedProduct} />
        </TabsContent>
        <TabsContent value="accounts">
          <AccountsTab
            assignments={serializedAssignments}
            productPrice={serializedProduct.unit_price}
            productCurrency={serializedProduct.currency}
          />
        </TabsContent>
        <TabsContent value="history">
          <HistoryTab productId={productId} />
        </TabsContent>
      </Tabs>
    </Container>
  );
};

export default ProductDetailPage;
```

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/(routes)/crm/products/[productId]/"
git commit -m "feat(products): add product detail page with basic view, accounts tab, and history"
```

---

## Task 9: CSV Import UI Component

**Files:**
- Create: `app/[locale]/(routes)/crm/products/components/ImportProductsDialog.tsx`

- [ ] **Step 1: Create the import dialog component**

Create `app/[locale]/(routes)/crm/products/components/ImportProductsDialog.tsx`:

```tsx
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { importProducts } from "@/actions/crm/products/import-products";

const CSV_TEMPLATE = `name,sku,type,category,description,unit_price,unit_cost,currency,tax_rate,unit,is_recurring,billing_period
"Cloud Hosting Basic","SKU-001","SERVICE","Software","Basic cloud hosting plan",99.00,45.00,"USD",20,"per month",true,MONTHLY
"Office Chair","SKU-002","PRODUCT","Hardware","Ergonomic office chair",299.00,150.00,"USD",20,"per unit",false,`;

export const ImportProductsDialog = () => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleDownloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setResult(null);

    const text = await selectedFile.text();
    const lines = text.split("\n").filter((l) => l.trim());
    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    const rows = lines.slice(1, 6).map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = values[i] || "";
      });
      return row;
    });

    setPreview(rows);
  };

  const handleImport = async () => {
    if (!file) return;
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await importProducts(formData);
      setResult(res);

      if (res.imported > 0) {
        toast.success(`Imported ${res.imported} products`);
        router.refresh();
      }
      if (res.skipped > 0) {
        toast.warning(`Skipped ${res.skipped} rows with errors`);
      }
    } catch (error: any) {
      toast.error(error.message || "Import failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setPreview([]);
    setFile(null);
    setResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="mr-2 h-4 w-4" />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Products</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import products. Max 500 rows.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Download CSV Template
          </Button>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>

          {preview.length > 0 && (
            <>
              <div className="text-sm text-muted-foreground">
                Preview (first {preview.length} rows):
              </div>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(preview[0]).map((key) => (
                        <TableHead key={key} className="whitespace-nowrap text-xs">
                          {key}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((row, i) => (
                      <TableRow key={i}>
                        {Object.values(row).map((val, j) => (
                          <TableCell key={j} className="text-xs whitespace-nowrap">
                            {val || "—"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {!result && (
                <Button onClick={handleImport} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    "Confirm Import"
                  )}
                </Button>
              )}
            </>
          )}

          {result && (
            <div className="space-y-2 rounded-md border p-4">
              <p className="font-medium">Import Complete</p>
              <p className="text-sm text-green-600">Imported: {result.imported}</p>
              <p className="text-sm text-yellow-600">Skipped: {result.skipped}</p>
              {result.errors.length > 0 && (
                <div className="max-h-40 overflow-y-auto">
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-600">
                      {err}
                    </p>
                  ))}
                </div>
              )}
              <Button variant="outline" size="sm" onClick={handleClose}>
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

- [ ] **Step 2: Add import button to ProductsView**

Modify `app/[locale]/(routes)/crm/components/ProductsView.tsx` — add the import button next to the create button. Update the imports and the JSX:

Add import at top:
```tsx
import { ImportProductsDialog } from "../products/components/ImportProductsDialog";
```

Replace the `<div className="flex space-x-2">` section:
```tsx
          <div className="flex space-x-2">
            <ImportProductsDialog />
            <CreateProductForm categories={categories} currencies={currencies} />
          </div>
```

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/(routes)/crm/products/components/ImportProductsDialog.tsx" "app/[locale]/(routes)/crm/components/ProductsView.tsx"
git commit -m "feat(products): add CSV import dialog with preview and template download"
```

---

## Task 10: Sidebar Navigation and Account Detail Integration

**Files:**
- Modify: `app/[locale]/(routes)/components/menu-items/Crm.tsx`
- Modify: `app/[locale]/(routes)/crm/accounts/[accountId]/page.tsx`
- Create: `app/[locale]/(routes)/crm/accounts/[accountId]/components/AccountProductsView.tsx`
- Create: `app/[locale]/(routes)/crm/accounts/[accountId]/components/AssignProductForm.tsx`

- [ ] **Step 1: Add Products to CRM sidebar**

Modify `app/[locale]/(routes)/components/menu-items/Crm.tsx`:

Add `products: string` to the `localizations` type:

```typescript
type Props = {
  localizations: {
    title: string;
    accounts: string;
    contacts: string;
    leads: string;
    opportunities: string;
    contracts: string;
    products: string;
  };
};
```

Add the products item after contracts in the items array:

```typescript
      {
        title: localizations.contracts,
        url: "/crm/contracts",
      },
      {
        title: localizations.products,
        url: "/crm/products",
      },
```

- [ ] **Step 2: Update the parent component that passes localizations**

Find where `getCrmMenuItem` is called and add the `products` localization. This is in `app/[locale]/(routes)/components/app-sidebar.tsx`. Add `products: t("products")` (or the appropriate i18n key) to the localizations object passed to `getCrmMenuItem`. The exact key depends on the existing i18n setup — check the file for the existing pattern and follow it.

- [ ] **Step 3: Add Products tab to Account detail page**

Modify `app/[locale]/(routes)/crm/accounts/[accountId]/page.tsx`:

Add imports at the top:
```tsx
import { getAccountProducts } from "@/actions/crm/account-products/get-account-products";
import { getProductsFull } from "@/actions/crm/products/get-products";
import AccountProductsView from "./components/AccountProductsView";
```

Add data fetching inside the component (alongside existing parallel fetches):
```tsx
const accountProducts = serializeDecimalsList(await getAccountProducts(accountId));
const allProducts = await getProductsFull();
const activeProducts = allProducts
  .filter((p) => p.status === "ACTIVE")
  .map((p) => ({ id: p.id, name: p.name, currency: p.currency }));
```

Add the AccountProductsView component inside the overview tab `<div className="space-y-5">`, after the existing DocumentsView:
```tsx
            <AccountProductsView
              data={accountProducts}
              accountId={accountId}
              crmData={crmData}
              activeProducts={activeProducts}
            />
```

- [ ] **Step 4: Create the AssignProductForm component**

Create `app/[locale]/(routes)/crm/accounts/[accountId]/components/AssignProductForm.tsx`:

```tsx
"use client";

import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useAction } from "@/hooks/use-action";
import { assignProduct } from "@/actions/crm/account-products/assign-product";

import { FormInput } from "@/components/form/form-input";
import FormSheet from "@/components/sheets/form-sheet";
import { FormSubmit } from "@/components/form/form-submit";
import { FormSelect } from "@/components/form/from-select";
import { FormDatePicker } from "@/components/form/form-datepicker";
import { FormTextarea } from "@/components/form/form-textarea";

interface AssignProductFormProps {
  accountId: string;
  products: { id: string; name: string; currency: string }[];
  currencies: { code: string; name: string; symbol: string }[];
}

const AssignProductForm = ({ accountId, products, currencies }: AssignProductFormProps) => {
  const router = useRouter();
  const closeRef = useRef<HTMLButtonElement>(null);

  const { execute, fieldErrors, isLoading } = useAction(assignProduct, {
    onSuccess: () => {
      toast.success("Product assigned to account");
      closeRef.current?.click();
      router.refresh();
    },
    onError: (error) => {
      toast.error(error);
    },
  });

  const onAction = async (formData: FormData) => {
    const productId = formData.get("productId") as string;
    const quantity = parseInt(formData.get("quantity") as string) || 1;
    const custom_price = formData.get("custom_price") as string;
    const currency = formData.get("currency") as string;
    const status = formData.get("status") as string;
    const start_date = new Date(formData.get("start_date") as string);
    const end_date = formData.get("end_date") ? new Date(formData.get("end_date") as string) : undefined;
    const renewal_date = formData.get("renewal_date") ? new Date(formData.get("renewal_date") as string) : undefined;
    const notes = formData.get("notes") as string;

    await execute({
      accountId,
      productId,
      quantity,
      custom_price: custom_price || undefined,
      currency,
      status: (status as "ACTIVE" | "PENDING") || "ACTIVE",
      start_date,
      end_date,
      renewal_date,
      notes: notes || undefined,
    });
  };

  return (
    <FormSheet
      trigger={"+"}
      title="Assign Product"
      description="Assign a product or service to this account"
      onClose={closeRef}
    >
      <form action={onAction} className="space-y-4">
        <FormSelect
          id="productId"
          label="Product"
          type="hidden"
          data={products.map((p) => ({ id: p.id, name: p.name }))}
          errors={fieldErrors}
        />
        <FormInput id="quantity" label="Quantity" type="number" errors={fieldErrors} defaultValue="1" />
        <FormInput id="custom_price" label="Custom Price (optional)" type="text" errors={fieldErrors} />
        <FormSelect
          id="currency"
          label="Currency"
          type="hidden"
          data={currencies.map((c) => ({ id: c.code, name: `${c.symbol} ${c.code} — ${c.name}` }))}
          errors={fieldErrors}
        />
        <FormSelect
          id="status"
          label="Status"
          type="hidden"
          data={[
            { id: "ACTIVE", name: "Active" },
            { id: "PENDING", name: "Pending" },
          ]}
          errors={fieldErrors}
          defaultValue="ACTIVE"
        />
        <FormDatePicker id="start_date" label="Start Date" type="hidden" errors={fieldErrors} />
        <FormDatePicker id="end_date" label="End Date (optional)" type="hidden" errors={fieldErrors} />
        <FormDatePicker id="renewal_date" label="Renewal Date (optional)" type="hidden" errors={fieldErrors} />
        <FormTextarea id="notes" label="Notes" errors={fieldErrors} />
        <FormSubmit className="w-full">
          {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Assign"}
        </FormSubmit>
      </form>
    </FormSheet>
  );
};

export default AssignProductForm;
```

- [ ] **Step 5: Create the AccountProductsView component**

Create `app/[locale]/(routes)/crm/accounts/[accountId]/components/AccountProductsView.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { formatCurrency } from "@/lib/currency";
import { removeAssignment } from "@/actions/crm/account-products/remove-assignment";
import AssignProductForm from "./AssignProductForm";

import type { getAllCrmData } from "@/actions/crm/get-crm-data";

type CrmData = Awaited<ReturnType<typeof getAllCrmData>>;

interface AccountProductsViewProps {
  data: any[];
  accountId: string;
  crmData: CrmData;
  activeProducts: { id: string; name: string; currency: string }[];
}

const AccountProductsView = ({ data, accountId, crmData, activeProducts }: AccountProductsViewProps) => {
  const router = useRouter();

  const statusColors: Record<string, string> = {
    ACTIVE: "bg-green-50 text-green-700",
    PENDING: "bg-yellow-50 text-yellow-700",
    EXPIRED: "bg-gray-50 text-gray-700",
    CANCELLED: "bg-red-50 text-red-700",
  };

  const handleRemove = async (assignmentId: string) => {
    const result = await removeAssignment(assignmentId);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Product assignment cancelled");
      router.refresh();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between">
          <CardTitle>
            <Link href="/crm/products" className="hover:underline">
              Products
            </Link>
          </CardTitle>
          <div className="flex space-x-2">
            <AssignProductForm
              accountId={accountId}
              products={activeProducts}
              currencies={crmData.currencies.map((c: { code: string; name: string; symbol: string }) => ({
                code: c.code,
                name: c.name,
                symbol: c.symbol,
              }))}
            />
          </div>
        </div>
        <Separator />
      </CardHeader>
      <CardContent>
        {!data || data.length === 0 ? (
          "No products assigned to this account."
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Link href={`/crm/products/${a.product.id}`} className="hover:underline font-medium">
                      {a.product.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs">
                    {a.product.type === "PRODUCT" ? "Product" : "Service"}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${statusColors[a.status] || ""}`}>
                      {a.status.charAt(0) + a.status.slice(1).toLowerCase()}
                    </span>
                  </TableCell>
                  <TableCell>{a.quantity}</TableCell>
                  <TableCell>
                    {a.custom_price !== null
                      ? formatCurrency(a.custom_price, a.currency)
                      : formatCurrency(Number(a.product.unit_price), a.currency)}
                  </TableCell>
                  <TableCell>{new Date(a.start_date).toLocaleDateString()}</TableCell>
                  <TableCell>{a.end_date ? new Date(a.end_date).toLocaleDateString() : "—"}</TableCell>
                  <TableCell>
                    {(a.status === "ACTIVE" || a.status === "PENDING") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 text-xs"
                        onClick={() => handleRemove(a.id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default AccountProductsView;
```

- [ ] **Step 6: Commit**

```bash
git add "app/[locale]/(routes)/components/menu-items/Crm.tsx" "app/[locale]/(routes)/crm/accounts/[accountId]/" "app/[locale]/(routes)/components/app-sidebar.tsx"
git commit -m "feat(products): add sidebar nav, account detail products tab with assign form"
```

---

## Task 11: Add Products to CRM Data Fetching

**Files:**
- Modify: `actions/crm/get-crm-data.ts`

- [ ] **Step 1: Add product categories to getAllCrmData**

Modify `actions/crm/get-crm-data.ts` to include product categories in the parallel fetch. Add `productCategories` to the destructuring and Promise.all:

Add to the destructuring array:
```typescript
    productCategories,
```

Add to Promise.all:
```typescript
    prismadb.crm_ProductCategories.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
```

Add to the returned data object:
```typescript
    productCategories,
```

- [ ] **Step 2: Commit**

```bash
git add actions/crm/get-crm-data.ts
git commit -m "feat(products): add product categories to CRM data fetching"
```

---

## Task 12: Verify Build and Fix Issues

**Files:** Various (depending on issues found)

- [ ] **Step 1: Run type check**

Run:
```bash
pnpm tsc --noEmit
```

Expected: No new errors related to products module. Fix any type errors found.

- [ ] **Step 2: Run the dev server and verify pages load**

Run:
```bash
pnpm dev
```

Manually verify:
- `/crm/products` — products list page loads with empty state
- `/crm/products` — create product form opens and submits
- Products sidebar link appears in CRM navigation
- Account detail page shows Products section

- [ ] **Step 3: Test CSV import**

1. Go to `/crm/products`
2. Click "Import" button
3. Download CSV template
4. Fill with test data
5. Upload and verify preview shows
6. Confirm import
7. Verify products appear in the list

- [ ] **Step 4: Test Account Assignment flow**

1. Create an ACTIVE product
2. Go to an Account detail page
3. Verify products section appears
4. (Assignment UI for creating new assignments from the Account page will need a separate form — for now verify the view component renders)

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix(products): resolve build and type issues"
```
