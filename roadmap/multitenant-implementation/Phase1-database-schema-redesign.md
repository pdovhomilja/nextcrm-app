# Phase 1: Database Schema Redesign

## 1. Objective

The primary objective of this phase is to modify the Prisma database schema to establish a robust, explicit multi-tenancy architecture. This involves creating new models for `Company` and `CompanyMembership` and updating existing models (`User`, `Board`) to support direct company ownership of data. This is the foundational step upon which all subsequent security and feature development will be built.

## 2. Technical Implementation Details

**File to Modify**: `prisma/schema.prisma`

### 2.1. Add `Company` Model

This model will be the central authority for tenancy. Each company is a distinct tenant in the system.

**Instructions:**
Add the following model definition to your Prisma schema. It's a top-level entity, similar to `User`.

```prisma
model Company {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relational Fields
  memberships CompanyMembership[]
  boards      Board[]
}
```

### 2.2. Add `CompanyRole` Enum

This enum defines the different levels of permissions a user can have within a company.

**Instructions:**
Add the following enum definition to your Prisma schema.

```prisma
enum CompanyRole {
  MEMBER
  ADMIN
  OWNER
}
```

### 2.3. Add `CompanyMembership` Model

This is a critical join table that creates a many-to-many relationship between `User` and `Company`. It defines which users belong to which companies and what their role is.

**Instructions:**
Add the following model definition. It uses a composite primary key (`@@id([companyId, userId])`) to ensure a user can only have one membership entry per company.

```prisma
model CompanyMembership {
  companyId String
  userId    String
  role      CompanyRole @default(MEMBER)
  createdAt DateTime    @default(now())

  // Relations
  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([companyId, userId])
}
```

- **`onDelete: Cascade`**: This is crucial. If a User or Company is deleted, their memberships are automatically cleaned up, preventing orphaned records.

### 2.4. Modify the `User` Model

We need to remove the old, insecure `cid` field and link the `User` to the new `CompanyMembership` model.

**Instructions:**

1.  Find the `User` model.
2.  **Comment out or delete** the `cid` and `companyName` fields. We will physically remove them in a later migration after the data has been moved. For now, commenting is sufficient to indicate deprecation.
3.  Add the new `memberships` relation.

**Before:**

```prisma
model User {
  // ...
  cid         String?
  companyName String?
  // ...
}
```

**After:**

```prisma
model User {
  // ...
  // cid         String? // DEPRECATED: To be removed in a future migration
  // companyName String? // DEPRECATED: To be removed in a future migration

  // New Relation
  memberships CompanyMembership[]
  // ...
}
```

### 2.5. Modify the `Board` Model

This is a key security change. We are adding a non-nullable foreign key to the `Company` model, making tenancy explicit.

**Instructions:**

1.  Find the `Board` model.
2.  Add the `companyId` field and the corresponding `@relation`.

**Before:**

```prisma
model Board {
  id          String   @id @default(cuid())
  name        String
  description String?
  // ... potentially other fields
}
```

**After:**

```prisma
model Board {
  id          String   @id @default(cuid())
  name        String
  description String?
  // ...

  // New Tenancy Fields
  companyId String
  company   Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
}
```

- **`onDelete: Cascade`**: Ensures that if a company is deleted, all of its associated boards (and by extension, their tasks and sections) are also deleted. This is the expected behavior for data isolation.

## 3. Post-Implementation Steps

1.  **Generate Prisma Client**: After saving the schema changes, run the following command to generate the updated Prisma client with the new models and types.
    ```bash
    pnpm prisma generate
    ```
2.  **Create Migration File**: Create a new database migration file. This will not be run yet, but it prepares the SQL needed for the database changes.
    ```bash
    pnpm prisma migrate dev --create-only --name init-multitenancy-schema
    ```
    This command creates a new migration directory (e.g., `prisma/migrations/xxxxxxxx_init_multitenancy_schema/`) containing a `migration.sql` file. Review this file to ensure the generated SQL matches the intended schema changes.

## 4. Data Safety

This phase is purely declarative and does not alter or delete any existing data. It defines the _target_ schema. The migration file created by `prisma migrate dev --create-only` is a plan for changes and does not execute anything against the database. All existing user and board data remains untouched.

## 5. Definition of Done

- The `prisma/schema.prisma` file is updated with the new `Company` and `CompanyMembership` models and the `CompanyRole` enum.
- The `User` and `Board` models are modified as specified.
- `pnpm prisma generate` runs successfully.
- A new migration file is successfully created using `prisma migrate dev --create-only`.
