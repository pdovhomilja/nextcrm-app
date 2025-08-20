# Phase 2: Data Migration Strategy

## 1. Objective

The objective of this phase is to safely and accurately migrate the existing data from the old single-tenant structure to the new multi-tenant schema. This involves creating companies from the old `cid` field, establishing user memberships, and correctly associating every existing `Board` with its new parent `Company`. This is a critical, one-time operation that must be handled with care to ensure data integrity.

## 2. Pre-requisites

- Phase 1 (Database Schema Redesign) must be complete.
- A migration file (e.g., `xxxxxxxx_init_multitenancy_schema`) must have been created.
- **A full backup of the production database must be taken before running this migration.**

## 3. Migration Approach: A Single, Transactional Script

To ensure atomicity (all changes succeed or none do), this entire migration should be executed within a single database transaction. Prisma migrations handle this by default. The logic described below can be implemented in a standalone TypeScript script that uses the Prisma client, or directly within the migration's SQL file if the logic is simple enough (though a script is recommended for clarity).

**File to Create**: `prisma/scripts/migrate-to-multitenancy.ts` (This is a temporary script, not part of the main application code).

## 4. Step-by-Step Migration Logic

### Step 4.1: Apply Schema Changes

This is the first step of the migration process.

**Instructions:**
Run the `migrate dev` command to apply the pending schema changes from Phase 1. This will create the `Company` and `CompanyMembership` tables and add the (initially nullable) `companyId` column to the `Board` table.

```bash
pnpm prisma migrate dev --name init-multitenancy-schema
```

_Note: For the migration to work, you may need to temporarily define the new `companyId` on `Board` as nullable and then make it non-nullable in a subsequent migration after the data is backfilled._

### Step 4.2: Backfill `Company` Table

**Goal:** Create a unique `Company` record for each distinct `cid` found in the `User` table.

**Implementation (in `migrate-to-multitenancy.ts`):**

```typescript
// 1. Get all unique company identifiers from the old User schema.
const distinctCompanies = await prisma.user.groupBy({
  by: ["cid", "companyName"],
  where: {
    cid: {
      not: null,
    },
  },
});

// 2. Create a map for easy lookup later.
const cidToCompanyIdMap = new Map<string, string>();

// 3. Create a new Company for each one.
for (const company of distinctCompanies) {
  if (company.cid) {
    const newCompany = await prisma.company.create({
      data: {
        // Use companyName if available, otherwise fallback to the cid.
        name: company.companyName || company.cid,
      },
    });
    cidToCompanyIdMap.set(company.cid, newCompany.id);
  }
}
```

### Step 4.3: Backfill `CompanyMembership` Table

**Goal:** Link every user to their newly created company and assign them an `OWNER` role.

**Implementation (in `migrate-to-multitenancy.ts`):**

```typescript
// 1. Get all users who have an old cid.
const users = await prisma.user.findMany({
  where: {
    cid: {
      not: null,
    },
  },
});

// 2. Create a membership link for each user.
for (const user of users) {
  if (user.cid) {
    const companyId = cidToCompanyIdMap.get(user.cid);
    if (companyId) {
      await prisma.companyMembership.create({
        data: {
          userId: user.id,
          companyId: companyId,
          role: "OWNER", // Assign initial users as Owners.
        },
      });
    }
  }
}
```

### Step 4.4: Backfill `companyId` in `Board` Table

**Goal:** Associate every existing `Board` with the correct `Company`.

**Implementation (in `migrate-to-multitenancy.ts`):**

```typescript
// 1. Get all boards that don't have a companyId yet.
const boards = await prisma.board.findMany({
  where: {
    companyId: null,
  },
  include: {
    // We need the user who created the board to find their company.
    createdBy: true,
  },
});

// 2. Update each board with the company ID of its creator.
for (const board of boards) {
  // Find the company membership for the user who created the board.
  const membership = await prisma.companyMembership.findFirst({
    where: {
      userId: board.createdBy.id,
    },
  });

  if (membership) {
    await prisma.board.update({
      where: {
        id: board.id,
      },
      data: {
        companyId: membership.companyId,
      },
    });
  } else {
    // Handle orphaned boards if necessary (e.g., assign to a default company or log an error).
    console.warn(
      `Could not find company for board ${board.id} created by user ${board.createdBy.id}`
    );
  }
}
```

## 5. Post-Migration Steps

1.  **Final Schema Change**: After the backfill script has been successfully run on all environments, create a new migration to make the `companyId` on the `Board` table non-nullable.
    ```bash
    pnpm prisma migrate dev --name make-board-companyid-nonnullable
    ```
2.  **Deprecation**: In a future release, after the new system is stable, create another migration to drop the now-unused `cid` and `companyName` columns from the `User` table.

## 6. Data Safety Guarantees

This migration is designed to be **additive only**.

- **No `DELETE` or `TRUNCATE` operations** are performed.
- The process involves `INSERT`ing into the new `Company` and `CompanyMembership` tables.
- It then `UPDATE`s the new `companyId` column on the `Board` table.
- Existing data in `User`, `Board`, `Task`, etc., is only read from, not modified (other than the `Board` backfill).
- The old `cid` field on the `User` table is explicitly left in place for rollback purposes and will only be removed in a much later, separate migration once the new system is proven stable in production. The requirement for a **database backup** before starting is a critical safety net.

## 7. Definition of Done

- The migration script (`migrate-to-multitenancy.ts`) is created and tested in a development environment.
- The `prisma migrate dev` command runs successfully, applying the initial schema changes.
- The migration script executes successfully, backfilling all required data.
- **Verification**:
- - `Company` table contains one entry for each unique old `cid`.
- - `CompanyMembership` table links all existing users to a company.
- - Every single row in the `Board` table has a non-null `companyId`.
