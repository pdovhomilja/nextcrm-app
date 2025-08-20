# TaskHQ Multi-Tenancy Implementation Plan

## 1. Executive Summary

This document outlines a comprehensive plan to re-architect the TaskHQ application into a full multi-tenant platform. The current architecture, which infers tenancy indirectly through user relationships, has proven to be a critical security vulnerability, leading to potential data leaks between companies.

The core of this initiative is to introduce a first-class `Company` entity and establish explicit, direct relationships between companies and their associated data resources (e.g., boards, tasks). This "explicit tenancy" model is a security best practice that will ensure strict data isolation and prevent unauthorized cross-tenant data access.

The plan also details the implementation of features essential for a multi-tenant system, including company membership management, user roles, invitations, and a seamless company switching mechanism for users who belong to multiple organizations. The implementation will be broken down into distinct phases: database redesign, data migration, backend refactoring, frontend implementation, and security testing.

## 2. Guiding Principles

- **Security by Default**: The architecture must prevent cross-tenant data access by design. All data queries must be scoped to a specific company ID at the lowest possible level (i.e., in the database query itself).
- **Explicit Tenancy**: Data ownership must be explicit. Core resources like `Board` will have a non-nullable `companyId` field. Indirect or inferred tenancy is to be eliminated.
- **Centralized Authorization**: Tenancy checks must be enforced centrally, ideally in middleware or a shared data access layer, to avoid omissions in individual API endpoints.
- **Seamless User Experience**: For users who are members of multiple companies, the process of switching between company contexts should be simple, intuitive, and fast.
- **Data Preservation**: All migration steps must be non-destructive to existing data. The process will be additive (creating new tables, adding new columns, and backfilling data) without deleting or truncating existing records.
- **Transactional Integrity**: Data migration and changes to user roles/memberships must be performed in transactions to ensure data consistency.

## 3. Phase 1: Database Schema Redesign

The foundation of this plan is a new database schema that properly supports multi-tenancy.

### 3.1. New Models

#### `Company` Model

A new table to store company information.

```prisma
model Company {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // A company has many members
  memberships CompanyMembership[]

  // A company owns many boards
  boards      Board[]
}
```

#### `CompanyMembership` Model (Join Table)

This model connects `User` and `Company` in a many-to-many relationship and stores the user's role within that company.

```prisma
enum CompanyRole {
  MEMBER
  ADMIN
  OWNER
}

model CompanyMembership {
  companyId String
  userId    String
  role      CompanyRole @default(MEMBER)
  createdAt DateTime    @default(now())

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([companyId, userId])
}
```

### 3.2. Model Modifications

#### `User` Model

- The existing `cid` field will be **deprecated and removed** after migration.
- A new relation to `CompanyMembership` is added.

```prisma
model User {
  // ... existing fields like id, name, email
  // cid       String? // DEPRECATED - to be removed

  memberships CompanyMembership[]

  // A user's active company context will be stored in the session, not the DB.
}
```

#### `Board` Model

- Add a **non-nullable** `companyId` foreign key to explicitly associate each board with a company.

```prisma
model Board {
  id        String @id @default(cuid())
  // ... other fields

  companyId String
  company   Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
}
```

- **Note**: `Task` tenancy will be handled through its parent `Board`. A task belongs to the same company as its board. This avoids redundant `companyId` fields on every single task.

## 4. Phase 2: Data Migration Strategy

This phase must be executed in a single, transactional script to ensure data integrity.

1.  **Create New Tables**: Apply the schema changes to create the `Company` and `CompanyMembership` tables.
2.  **Backfill `Company` Table**:
    - Execute `SELECT DISTINCT cid, companyName FROM "User" WHERE cid IS NOT NULL`.
    - For each distinct `cid`, create a new record in the `Company` table.
3.  **Backfill `CompanyMembership` Table**:
    - Iterate through every `User` in the database.
    - For each user, create a `CompanyMembership` record linking them to their corresponding new `Company` (using the user's old `cid`).
    - Assign the role `OWNER` to these initial members, as they were the creators of their "company."
4.  **Add `companyId` to `Board`**: Add the `companyId` column to the `Board` table. It should be nullable initially to allow for a two-step population process.
5.  **Backfill `companyId` in `Board`**:
    - For each `Board`, identify its owning company. The most reliable way is to use the `createdBy` user ID on the board.
    - Find the `CompanyMembership` for that `createdBy` user and get their `companyId`.
    - Update the `Board` record with this `companyId`.
    - After populating all records, alter the column to be **non-nullable**.
6.  **Verification**: Run checks to ensure every user has at least one `CompanyMembership` and every `Board` has a valid `companyId`.
7.  **Deprecation**: Once the new system is stable, the `cid` column on the `User` table can be dropped in a subsequent migration.

## 5. Phase 3: Backend & API Refactoring

### 5.1. Authentication and Session

- **Modify `next-auth` Session**: The `session` object must be updated to include:
  - `activeCompanyId`: The ID of the company the user is currently operating in.
  - `activeCompanyRole`: The user's role within that active company.
  - `memberships`: A list of all companies the user belongs to (`{companyId, role}`).
- **Login Flow**: Upon login, set the `activeCompanyId` to the user's oldest `CompanyMembership` (likely their "home" company) by default.

### 5.2. Authorization Middleware

- Update the existing middleware (`middleware.ts`) or create a new one to perform the following on every authenticated API request:
  1.  Read the `activeCompanyId` from the user's session.
  2.  If the request accesses a resource (e.g., `/api/tasks/[taskId]`), the middleware must ensure that the resource belongs to the `activeCompanyId` before passing the request to the handler. This is the **primary security enforcement point**.

### 5.3. Refactor All Data Access

- Systematically review and update every single function in the `actions/` directory and every API route in `app/api/`.
- **Creation**: When creating a `Board`, the `companyId` must be set to the `activeCompanyId` from the session.
- **Reading/Listing**: All `findMany`, `findFirst`, `findUnique` queries for boards or tasks must be modified to include a `where` clause that filters by `companyId`.
  - _Example for a Task_: `db.task.findFirst({ where: { id: taskId, boardSection: { board: { companyId: session.user.activeCompanyId } } } })`
- **Updating/Deleting**: These operations must use the same secure `where` clause as reads to ensure a user from Company A cannot modify or delete data belonging to Company B.

### 5.4. Company Management Server Actions

Instead of traditional API endpoints, we will use Next.js Server Actions to handle company and membership management, aligning with the project's existing architecture. These actions will be located in a new `actions/company-actions.ts` file.

- `getUserMemberships()`: A server action that returns the list of companies the authenticated user is a member of. To be used for populating the company switcher.
- `switchActiveCompany(companyId: string)`: Verifies the user is a member of the target company and then revalidates the session cookie with the new `activeCompanyId`. The client will then trigger a router refresh to reload data for the new context.
- `inviteUserToCompany(companyId: string, email: string)`: (Admin/Owner only) Generates an invitation, sends an email, and stores a pending invite record.
- `acceptInvitation(token: string)`: Verifies an invitation token and creates a `CompanyMembership` record for the user.
- `getCompanyMembers(companyId: string)`: (Admin/Owner only) Lists all members of a specific company for the settings page.
- `updateMemberRole(companyId: string, userId: string, role: CompanyRole)`: (Admin/Owner only) Updates a member's role.
- `removeMember(companyId: string, userId: string)`: (Admin/Owner only) Removes a user from a company.

## 6. Phase 4: Frontend Implementation

### 6.1. Global State / Context

- Create a `CompanyProvider` React context that wraps the application.
- This provider will store the session information, including the `activeCompany`, user's `role`, and their list of `memberships`.
- A `useCompany()` hook will provide easy access to this context throughout the frontend.

### 6.2. Company Switcher UI

- **Location**: In the main `SiteHeader`.
- **Functionality**:
  - Displays the name of the `activeCompany`.
  - It will be a dropdown (`DropdownMenu` from Shadcn UI).
  - The dropdown lists all other companies the user is a member of (retrieved using the `getUserMemberships` action).
  - On selecting a new company, it will call the `switchActiveCompany(newCompanyId)` Server Action.
  - Upon a successful response from the action, it will trigger a client-side router refresh (e.g., `router.refresh()`) to reload server components and re-fetch data for the new company context. This provides a smoother user experience than a full page reload.

### 6.3. URL Structure

- The `/[cid]/...` URL structure must be updated. The `[cid]` segment should always reflect the `activeCompanyId` from the user's session.
- The middleware (`middleware.ts`) should handle this. If a user's session has `activeCompanyId: "abc"` but they navigate to `/xyz/dashboard`, the middleware should redirect them to `/abc/dashboard`.

### 6.4. Company Settings Page

- Create a new page at `/settings/company`.
- **For Admins/Owners**: This page will allow them to:
  - View and manage a table of company members.
  - Change member roles.
  - Remove members.
  - Invite new members via an email form.
- **For Members**: This page will show a list of members and provide a button to "Leave Company."

## 7. Phase 5: Security Hardening & Testing

- **Unit Tests**: Write unit tests for all new API endpoints, especially focusing on role-based access control (e.g., ensuring a `MEMBER` cannot access admin routes).
- **Integration Tests**: Create end-to-end tests for the following scenarios:
  - **Data Isolation**: Create two companies (A and B) and two users (User A and User B). Log in as User A and attempt to access resources (boards, tasks) belonging to Company B via direct URL manipulation. Assert that all attempts result in a 403 Forbidden or 404 Not Found error.
  - **Role Enforcement**: Log in as a user with a `MEMBER` role and attempt to invite or remove users from the company settings page. Assert that the API rejects these requests.
  - **Invitation Flow**: Test the full invitation lifecycle: send invite, verify token, accept invite, verify new membership is created.
- **Manual Penetration Testing**: Manually perform the tests described above and try to find edge cases.

## 8. Deployment Plan

1.  **Staging Environment First**: Deploy all changes, including the migration script, to a staging environment that mirrors production.
2.  **Run Migration on Staging**: Execute the data migration script on the staging database. Thoroughly verify the migrated data.
3.  **QA on Staging**: Perform all automated and manual tests on the staging environment.
4.  **Production Deployment**:
    - Schedule a maintenance window.
    - Put the application into maintenance mode.
    - Take a full backup of the production database.
    - Run the data migration script on the production database.
    - Deploy the new application code.
    - Perform a quick sanity check to ensure the main features are working.
    - Disable maintenance mode.
5.  **Post-Deployment Monitoring**: Closely monitor application logs and performance metrics for any anomalies.
