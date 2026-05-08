# Permission-Driven Authorization Migration Design Spec

- **Date:** 2026-05-01
- **Project:** nextcrm-app
- **Target branch:** `dev`
- **Status:** Draft for review
- **Related audit:** `docs/2026-05-01-bola-idor-security-audit.md`

## 1. Purpose

Migrate NextCRM from ad hoc authentication checks to a permission-driven authorization model with three roles:

1. **user**
2. **manager**
3. **admin**

The immediate driver is `GHSA-mg5f-m89f-4gmc`, which confirmed BOLA/IDOR in CRM contact and target update routes. The broader audit found the same class of issue across API routes and server actions: session-only checks, missing object ownership checks, inconsistent admin checks, and several server actions with no auth guard at all.

This spec defines the target authorization model, resource ownership rules, helper architecture, API route and server action migration requirements, database changes, and testing plan.

## 2. Target Role Semantics

### 2.1 Role definitions

| Role | Meaning | Administration access | Data visibility |
| --- | --- | --- | --- |
| `user` | Standard authenticated user | No | Only their own allowed records |
| `manager` | Organization-wide business user | No | All non-admin business data |
| `admin` | System administrator | Yes | Everything |

### 2.2 User role

A `user` can log in and access only records that are in their personal scope.

In scope for `user`:

- CRM accounts
- CRM leads
- CRM contacts
- CRM opportunities
- CRM contracts
- Products
- Campaigns
- Documents
- Invoices

For each resource, "own" means one of:

- directly assigned to the user,
- created by the user,
- explicitly shared with the user,
- linked to another in-scope resource,
- or otherwise allowed by a resource-specific policy in this spec.

The `user` role must not access `/admin` pages, admin route handlers, admin server actions, system settings, global user administration, invoice settings, tax-rate settings, currency administration, or global CRM configuration.

### 2.3 Manager role

A `manager` can access and operate on all non-admin business data.

Managers can:

- see all CRM accounts, leads, contacts, opportunities, contracts, targets, and related records,
- see all products,
- see all campaigns and campaign templates,
- see all documents,
- see all invoices,
- see reports across the business dataset,
- operate on ordinary business workflows.

Managers cannot:

- access `/admin`,
- call `app/api/admin/**`,
- call admin server actions,
- manage users or roles,
- mutate global settings, tax rates, invoice series, currencies, system API keys, CRM config dictionaries, or invoice settings.

### 2.4 Admin role

An `admin` can do everything.

Admins can access:

- all business data,
- all `/admin` pages,
- all admin route handlers,
- all admin server actions,
- global settings,
- user and role management,
- system API keys,
- invoice settings,
- tax rates,
- invoice series,
- currencies,
- CRM settings,
- audit-log administration.

## 3. Current-State Findings

This spec was prepared after reading `docs/2026-05-01-bola-idor-security-audit.md` and inventorying all `app/api/**/route.ts` handlers plus all `"use server"` modules under `actions/**` and `app/**/_actions/**`.

### 3.1 Current role model is inconsistent

Current code uses multiple sources for authorization:

- `Users.role` in Prisma, defaulting to `"member"`.
- `Users.is_admin`.
- `Users.is_account_admin`.
- Better Auth admin plugin roles: `admin`, `member`, `viewer`.
- Route/action checks using `session.user.role === "admin"`.
- Invoice/admin checks using DB-backed `user.is_admin`.

This creates conflicting states. A user can have `role === "admin"` while `is_admin === false`, or the reverse, depending on how the account was created or updated.

### 3.2 Current helper layer is insufficient

Existing helpers:

- `getSession()` in `lib/auth-server.ts`
- `getUser()` in `actions/get-user.ts`
- `requireAdmin()` and `requireOwnerOrAdmin()` in `lib/auth-guards.ts`
- invoice permission helpers in `lib/invoices/permissions.ts`

Problems:

- `getSession()` only proves login.
- `getUser()` loads a DB user but does not enforce a role.
- `lib/auth-guards.ts` is not consistently used.
- invoice helpers are good but isolated.
- there is no shared object-level authorization layer for CRM, campaigns, documents, reports, projects, API routes, or server actions.

### 3.3 Server actions are not protected by UI layout

Server actions must perform their own authorization checks. A page being under `/admin` or behind an authenticated layout is not enough.

The audit found admin actions under:

- `app/[locale]/(routes)/admin/crm-settings/_actions/crm-settings.ts`
- `app/[locale]/(routes)/admin/currencies/_actions/currencies.ts`

with no explicit session or admin checks in the action files.

### 3.4 BOLA/IDOR exists beyond the advisory route

Confirmed high-risk patterns include:

- updating contacts by path ID after only `getSession()`,
- updating targets by path ID after only `getSession()`,
- creating target contacts under arbitrary target IDs,
- enriching arbitrary contact and target IDs,
- fetching invoice PDFs by arbitrary invoice ID,
- duplicating invoices by arbitrary invoice ID,
- deleting contacts by arbitrary contact ID,
- global reads in CRM, reports, documents, dashboard counts, similarity search, activities, and audit logs.

## 4. Canonical Authorization Model

### 4.1 Source of truth

`Users.role` must become the canonical source of truth.

Allowed role values:

```ts
type AppRole = "user" | "manager" | "admin";
```

Implementation options:

1. Preferred: Prisma enum or PostgreSQL check constraint.
2. Acceptable: string field with strict zod validation and application-level checks.

The codebase should stop making authorization decisions from `is_admin` and `is_account_admin` after migration.

### 4.2 Legacy role mapping

Use this one-time mapping:

| Current value | New value |
| --- | --- |
| `admin` | `admin` |
| `member` | `manager` |
| `viewer` | `user` |

This mapping preserves broad access for existing `member` users while introducing the new restricted `user` role from existing `viewer` accounts.

If the product owner wants existing members to become restricted users instead, use `member -> user` and manually promote trusted users to `manager`. That migration is safer from a least-privilege perspective but more disruptive.

### 4.3 Legacy booleans

During the migration:

- keep `is_admin` temporarily,
- backfill `is_admin = true` where `role = "admin"`,
- backfill `is_admin = false` otherwise,
- stop writing `is_account_admin` for authorization,
- remove boolean-based checks from code.

After code migration:

- remove `is_admin` and `is_account_admin`, or keep them only as derived compatibility fields that are never manually edited.

### 4.4 Session role consistency

All authorization helpers should use one of two patterns consistently:

1. **Session role strategy:** trust `session.user.role`, and force session refresh after role changes.
2. **DB role strategy:** load the user row for every protected operation and use `Users.role`.

Recommendation: use the DB role strategy for server actions and route handlers. It costs one query but avoids stale-role escalation after a user's role changes.

## 5. Authorization Helper Architecture

Create a small centralized authorization layer.

Recommended files:

```text
lib/authz/
├── roles.ts
├── session.ts
├── errors.ts
├── route.ts
├── scopes/
│   ├── crm.ts
│   ├── campaigns.ts
│   ├── documents.ts
│   ├── invoices.ts
│   ├── products.ts
│   ├── projects.ts
│   ├── reports.ts
│   └── users.ts
└── index.ts
```

### 5.1 Core role helpers

Required helpers:

```ts
export interface AuthzUser {
  id: string;
  role: "user" | "manager" | "admin";
}

export async function requireAuthenticated(): Promise<AuthzUser>;

export async function requireRole(
  allowedRoles: ReadonlyArray<AuthzUser["role"]>
): Promise<AuthzUser>;

export function isAdmin(user: AuthzUser): boolean;

export function isManagerOrAdmin(user: AuthzUser): boolean;
```

Behavior:

- unauthenticated route handlers return `401`,
- authenticated but unauthorized route handlers return `403`,
- server actions throw or return consistent action errors,
- object not found or not visible may return `404` for IDOR-sensitive routes.

### 5.2 Route handler helpers

Route handlers need `NextResponse`-friendly wrappers.

Recommended helpers:

```ts
export function unauthorizedResponse(): NextResponse;

export function forbiddenResponse(): NextResponse;

export function notFoundOrForbiddenResponse(): NextResponse;
```

Use `404` for user-controlled IDs when revealing resource existence would leak data.

### 5.3 Scope predicates

Every resource family should expose two layers:

1. `where` builders for list queries.
2. assertion helpers for read/write/delete by ID.

Example shape:

```ts
export function accountScopeWhere(user: AuthzUser): Prisma.crm_AccountsWhereInput;

export async function assertCanReadAccount(user: AuthzUser, accountId: string): Promise<void>;

export async function assertCanWriteAccount(user: AuthzUser, accountId: string): Promise<void>;
```

`manager` and `admin` should usually return unscoped business-data filters. `admin` alone should pass admin/system checks.

### 5.4 Mutating by ID

For object mutations by caller-controlled ID, use one of:

1. Pre-check:
   - load the minimal row,
   - check policy,
   - mutate.
2. Atomic scoped mutation:
   - use `updateMany` / `deleteMany` with scoped `where`,
   - treat `count === 0` as `404` or `403`.

For simple high-risk patches such as contact/target enrichment field updates, prefer atomic scoped mutation.

## 6. Resource Scope Rules

### 6.1 CRM accounts

Model: `crm_Accounts`

User scope:

- `assigned_to === user.id`, or
- `createdBy === user.id`, or
- user is an `AccountWatchers` watcher.

Manager scope:

- all non-deleted accounts.

Admin scope:

- all accounts, including restore/admin views.

Applies to:

- account list/search/detail,
- account create/update/delete/restore,
- account watch/unwatch,
- account tasks,
- account product assignment,
- contacts/leads/opportunities/contracts linked through the account.

### 6.2 CRM leads

Model: `crm_Leads`

User scope:

- `assigned_to === user.id`, or
- `createdBy === user.id`, or
- linked `accountsIDs` is an in-scope account.

Manager scope:

- all non-deleted leads.

Admin scope:

- all leads, including restore.

### 6.3 CRM contacts

Model: `crm_Contacts`

User scope:

- `assigned_to === user.id`, or
- `createdBy === user.id`, or
- `created_by === user.id`, or
- linked `account` is an in-scope account.

Manager scope:

- all non-deleted contacts.

Admin scope:

- all contacts, including restore.

Special rules:

- contact enrichment requires write/enrich permission to the contact,
- contact unlink from opportunity requires permission to both the contact and the opportunity,
- contact delete must use the same write policy as update.

### 6.4 CRM opportunities

Model: `crm_Opportunities`

User scope:

- `assigned_to === user.id`, or
- `createdBy === user.id`, or
- `created_by === user.id`, or
- linked `account` is an in-scope account.

Manager scope:

- all non-deleted opportunities.

Admin scope:

- all opportunities, including restore.

Special rules:

- opportunity line-item actions require write access to the parent opportunity,
- `setInactiveOpportunity` should use the same opportunity scope helper instead of a one-off `assigned_to` check.

### 6.5 CRM contracts

Model: `crm_Contracts`

User scope:

- assigned to user, or
- created by user, or
- linked account is in scope.

Manager scope:

- all non-deleted contracts.

Admin scope:

- all contracts, including restore.

Special rules:

- contract line-item actions require write access to the parent contract,
- copy-from-opportunity requires read access to the source opportunity and write access to the target contract.

### 6.6 Products

Model: `crm_Products`

User scope:

- users can read products,
- users can create/edit/delete only products they created, unless product management is made manager-only.

Recommended policy:

- read: user, manager, admin,
- create/update/delete/import: manager and admin only.

Reason: products are usually catalog data shared by invoices, contracts, account products, and opportunity line items. Allowing standard users to mutate shared products can affect other users' business data.

If the product owner wants user-owned products, use:

- `createdBy === user.id` for user writes,
- manager/admin for all writes.

### 6.7 Account-product assignments

Models: `crm_AccountProducts` and related account-product actions.

User scope:

- user must have write access to the account.

Manager scope:

- all accounts.

Admin scope:

- all accounts.

### 6.8 Targets and target lists

Models:

- `crm_Targets`
- `crm_TargetLists`
- `TargetsToTargetLists`
- `crm_Target_Contact`

User scope:

- target/list `created_by === user.id`,
- target belongs to a list created by user,
- target contact belongs to an in-scope target.

Manager scope:

- all targets and lists.

Admin scope:

- all targets and lists.

Special rules:

- target enrichment requires target scope,
- target-contact enrichment requires both target and target-contact linkage validation,
- bulk target enrichment must validate every target ID before queueing.

### 6.9 Campaigns

Models:

- `crm_campaigns`
- `crm_campaign_templates`
- `crm_campaign_steps`
- `crm_campaign_sends`
- `CampaignToTargetLists`

User scope:

- campaigns where `created_by === user.id`,
- campaign templates where `created_by === user.id`,
- target lists attached to a campaign must also be in user scope.

Manager scope:

- all campaigns and templates.

Admin scope:

- all campaigns and templates.

Recommended action policy:

| Capability | user | manager | admin |
| --- | --- | --- | --- |
| Read own campaigns | Yes | Yes | Yes |
| Create campaign | Yes | Yes | Yes |
| Update own draft campaign | Yes | Yes | Yes |
| Delete own campaign | Yes | Yes | Yes |
| Schedule campaign | No, unless explicitly allowed | Yes | Yes |
| Send campaign now | No, unless explicitly allowed | Yes | Yes |
| Pause campaign | Own campaigns only | Yes | Yes |
| Manage templates | Own templates only | Yes | Yes |

Reason: send and schedule operations can trigger external email delivery and quota usage.

### 6.10 Documents

Model: `Documents`

User scope:

- `created_by_user === user.id`, or
- `assigned_user === user.id`, or
- document is linked to an in-scope account, lead, contact, opportunity, contract, project, or task, or
- document visibility explicitly allows access.

Manager scope:

- all documents.

Admin scope:

- all documents.

Special rules:

- bulk document actions must validate every document ID,
- linking a document to an account requires write access to both the document and the target account,
- document version actions inherit parent document permissions,
- retry enrichment requires write access to the document.

### 6.11 Invoices

Model: `Invoices`

Current good reference:

- `lib/invoices/permissions.ts`

Target policy:

| Capability | user | manager | admin |
| --- | --- | --- | --- |
| Read invoice | creator or linked account in scope | Yes | Yes |
| Create invoice | Yes, if account in scope | Yes | Yes |
| Edit draft invoice | creator and draft | Yes, if draft | Yes, if draft |
| Issue invoice | creator and draft | Yes | Yes |
| Cancel invoice | creator and allowed status | Yes | Yes |
| Add/delete payment | creator and allowed status | Yes | Yes |
| Send invoice email | creator and allowed status | Yes | Yes |
| Regenerate PDF | creator and allowed status | Yes | Yes |
| Duplicate invoice | readable source invoice | Yes | Yes |
| Fetch PDF | readable source invoice | Yes | Yes |

Add account-scope enforcement to invoice creation and reads:

- a user can only create invoices for accounts in their scope,
- a user can only read invoice PDFs for invoices they can read.

### 6.12 Projects

Models:

- `Boards`
- `Sections`
- `Tasks`

User scope:

- board owner,
- board shared with user,
- board visibility allows user,
- task assigned to user,
- task belongs to an in-scope board.

Manager scope:

- all boards, sections, and tasks.

Admin scope:

- all boards, sections, and tasks.

Special rules:

- section mutations require board write access,
- task mutations require board write access or task assignment policy,
- `watchProject` and `unwatchProject` must verify board visibility before mutation.

### 6.13 Reports

Models:

- report config tables,
- report schedules,
- underlying report datasets.

User scope:

- own report configs and shared configs,
- exports and dashboards scoped to accessible records only.

Manager scope:

- global business reports.

Admin scope:

- global business and admin reports.

Special rules:

- user-level report exports must pass scoped filters into report action helpers,
- user growth and user-directory style reports should be manager/admin or admin-only depending on sensitivity,
- schedule creation must verify the report config is readable by the caller.

### 6.14 Users and profile

User scope:

- update own profile,
- update own language,
- manage own API keys,
- view limited user directory fields only if required for assignment UI.

Manager scope:

- user directory read if needed for business assignment flows,
- no role or user administration.

Admin scope:

- user administration,
- role changes,
- activation/deactivation,
- delete users,
- send mail to all users.

Special rules:

- `getUserById` should allow self, manager directory access, or admin.
- `searchUsers` should be limited to fields needed for assignment.
- role changes must invalidate sessions or force refresh.

### 6.15 Email integration

Email accounts are personal by default.

User scope:

- own email accounts and messages.

Manager scope:

- own email accounts only, unless shared mailbox support is intentionally added.

Admin scope:

- system-level email settings if present, but not personal mailbox contents by default.

### 6.16 MCP and API tokens

MCP requests authenticated by API token must enforce the same permissions as the token owner.

Rules:

- token owner role determines access,
- user tokens are scoped to the user's own records,
- manager tokens can access business-wide non-admin data,
- admin tokens can access admin tools only if explicitly created with admin capability,
- dev-only session fallback must never apply in production.

## 7. API Route Migration Matrix

All `app/api/**/route.ts` files were inventoried.

### 7.1 Auth and framework routes

| File | Methods | Target policy |
| --- | --- | --- |
| `app/api/auth/[...all]/route.ts` | GET, POST | Keep public Better Auth handler |
| `app/api/auth/test-otp/route.ts` | GET | Non-production only; add CI/test secret if needed |
| `app/api/inngest/route.ts` | GET, POST, PUT | Provider-authenticated; job handlers must enforce row access |
| `app/api/mcp/[transport]/route.ts` | GET, POST | Token owner permissions apply to tools |

### 7.2 Integration and webhook routes

| File | Methods | Target policy |
| --- | --- | --- |
| `app/api/campaigns/webhooks/resend/route.ts` | POST | Keep HMAC verification; no user role |
| `app/api/campaigns/unsubscribe/route.ts` | GET | Keep token-based capability URL |
| `app/api/crm/leads/create-lead-from-web/route.ts` | POST | Keep integration secret; rate limit and rotate secret |
| `app/api/crm/contacts/create-from-remote/route.ts` | POST | Keep integration secret; rate limit and rotate secret |

### 7.3 Admin routes

| File | Methods | Target policy |
| --- | --- | --- |
| `app/api/admin/invoices/tax-rates/route.ts` | GET, POST | admin only |
| `app/api/admin/invoices/tax-rates/[id]/route.ts` | PATCH, DELETE | admin only |
| `app/api/admin/invoices/series/route.ts` | GET, POST | admin only |
| `app/api/admin/invoices/series/[id]/route.ts` | PATCH, DELETE | admin only |

Managers must receive `403` on all `app/api/admin/**` routes.

### 7.4 CRM and campaign target routes

| File | Methods | user | manager | admin | Notes |
| --- | --- | --- | --- | --- | --- |
| `app/api/crm/contacts/[id]/route.ts` | PATCH | scoped contact write | all | all | Fix advisory-confirmed IDOR |
| `app/api/crm/targets/[id]/route.ts` | PATCH | scoped target write | all | all | Fix target IDOR |
| `app/api/campaigns/targets/[id]/route.ts` | PATCH | same as CRM target | all | all | Re-export; fix at source |
| `app/api/crm/targets/[id]/contacts/route.ts` | POST | scoped parent target write | all | all | Validate target ID |
| `app/api/crm/targets/[id]/enrich/route.ts` | POST | scoped target enrich | all | all | Validate before Inngest event |
| `app/api/campaigns/targets/[id]/enrich/route.ts` | POST | same as CRM route | all | all | Re-export |
| `app/api/crm/targets/[id]/contacts/[contactId]/enrich/route.ts` | POST | scoped target and contact | all | all | Validate linkage |

### 7.5 Enrichment routes

| File | Methods | Target policy |
| --- | --- | --- |
| `app/api/crm/contacts/enrich/route.ts` | POST | require contact scope before reading email or creating enrichment |
| `app/api/crm/contacts/enrich/route.ts` | DELETE | require session and bind `sessionId` to triggering user |
| `app/api/crm/contacts/enrich-bulk/route.ts` | POST | validate every `contactId` before queueing |
| `app/api/crm/targets/enrich/route.ts` | POST | require target scope before enrichment |
| `app/api/crm/targets/enrich/route.ts` | DELETE | require session and bind `sessionId` to triggering user |
| `app/api/crm/targets/enrich-bulk/route.ts` | POST | validate every `targetId` before queueing |
| `app/api/campaigns/targets/enrich/route.ts` | POST, DELETE | same as CRM target enrich |
| `app/api/campaigns/targets/enrich-bulk/route.ts` | POST | same as CRM target bulk enrich |

### 7.6 Invoices, reports, and uploads

| File | Methods | Target policy |
| --- | --- | --- |
| `app/api/invoices/[invoiceId]/pdf/route.ts` | GET | require invoice read permission |
| `app/api/reports/export/route.ts` | GET | user gets scoped data, manager/admin get global business reports |
| `app/api/upload/presigned-url/route.ts` | POST | require auth and bind upload folder/key to user or entity permission |

## 8. Server Action Migration Matrix

### 8.1 CRM accounts

Files:

- `actions/crm/accounts/get-accounts.ts`
- `actions/crm/accounts/get-account-by-id.ts`
- `actions/crm/accounts/search-accounts.ts`
- `actions/crm/accounts/create-account.ts`
- `actions/crm/accounts/update-account.ts`
- `actions/crm/accounts/delete-account.ts`
- `actions/crm/accounts/restore-account.ts`
- `actions/crm/accounts/watch-account.ts`
- `actions/crm/accounts/unwatch-account.ts`
- `actions/crm/accounts/create-task.ts`

Required migration:

- add `requireAuthenticated()` to read actions with no auth,
- apply `accountScopeWhere(user)` to list/search,
- apply `assertCanReadAccount` to detail,
- apply `assertCanWriteAccount` to update/delete/task/watch operations,
- keep restore admin-only.

### 8.2 CRM leads

Files:

- `actions/crm/leads/create-lead.ts`
- `actions/crm/leads/update-lead.ts`
- `actions/crm/leads/delete-lead.ts`
- `actions/crm/leads/restore-lead.ts`

Required migration:

- user can mutate only scoped leads,
- manager can mutate all leads,
- admin can mutate and restore,
- account links must be validated against account scope for user.

### 8.3 CRM contacts

Files:

- `actions/crm/contacts/create-contact.ts`
- `actions/crm/contacts/update-contact.ts`
- `actions/crm/contacts/delete-contact.ts`
- `actions/crm/contacts/restore-contact.ts`
- `actions/crm/contacts/unlink-opportunity.ts`

Required migration:

- use contact scope for update/delete/restore/read,
- validate account assignment and opportunity unlink,
- make restore admin-only unless explicitly allowing managers.

### 8.4 CRM opportunities

Files:

- `actions/crm/opportunities/create-opportunity.ts`
- `actions/crm/opportunities/update-opportunity.ts`
- `actions/crm/opportunities/delete-opportunity.ts`
- `actions/crm/opportunities/restore-opportunity.ts`
- `actions/crm/opportunity/dashboard/set-inactive.ts`
- `actions/crm/get-opportunities-with-includes.ts`

Required migration:

- apply opportunity scope to list/detail/mutations,
- replace one-off `setInactiveOpportunity` logic with shared helper,
- validate linked account/contact/campaign IDs.

### 8.5 CRM contracts and contract line items

Files:

- `actions/crm/get-contract.ts`
- `actions/crm/get-contracts.ts`
- `actions/crm/contracts/create-new-contract/index.ts`
- `actions/crm/contracts/update-contract/index.ts`
- `actions/crm/contracts/delete-contract/index.ts`
- `actions/crm/contracts/restore-contract/index.ts`
- `actions/crm/contract-line-items/add-line-item/index.ts`
- `actions/crm/contract-line-items/update-line-item/index.ts`
- `actions/crm/contract-line-items/remove-line-item/index.ts`
- `actions/crm/contract-line-items/reorder-line-items/index.ts`
- `actions/crm/contract-line-items/copy-from-opportunity/index.ts`

Required migration:

- add auth to contract read actions,
- apply contract scope,
- validate parent contract for every line-item operation,
- validate source opportunity for copy-from-opportunity,
- keep restore admin-only unless explicitly allowing managers.

### 8.6 CRM products and account products

Files:

- `actions/crm/products/create-product/index.ts`
- `actions/crm/products/update-product/index.ts`
- `actions/crm/products/delete-product/index.ts`
- `actions/crm/products/import-products.ts`
- `actions/crm/account-products/assign-product/index.ts`
- `actions/crm/account-products/update-assignment/index.ts`
- `actions/crm/account-products/remove-assignment/index.ts`

Required migration:

- allow all roles to read products,
- prefer manager/admin for product creation, update, delete, and import,
- require account write access for account-product assignments.

### 8.7 CRM targets and target lists

Files:

- `actions/crm/get-target.ts`
- `actions/crm/get-targets.ts`
- `actions/crm/get-target-list.ts`
- `actions/crm/get-target-lists.ts`
- `actions/crm/targets/create-target.ts`
- `actions/crm/targets/update-target.ts`
- `actions/crm/targets/delete-target.ts`
- `actions/crm/targets/import-targets.ts`
- `actions/crm/targets/convert-target.ts`
- `actions/crm/targets/suggest-mapping.ts`
- `actions/crm/target-lists/create-target-list.ts`
- `actions/crm/target-lists/update-target-list.ts`
- `actions/crm/target-lists/delete-target-list.ts`
- `actions/crm/target-lists/add-targets-to-list.ts`
- `actions/crm/target-lists/remove-target-from-list.ts`

Required migration:

- add auth to target reads,
- user sees only created targets/lists,
- manager/admin see all,
- validate every target ID in bulk list operations,
- import and convert should be manager/admin unless user-owned targets remain a supported workflow.

### 8.8 CRM activities and audit logs

Files:

- `actions/crm/activities/create-activity.ts`
- `actions/crm/activities/update-activity.ts`
- `actions/crm/activities/delete-activity.ts`
- `actions/crm/activities/get-activities-by-entity.ts`
- `actions/crm/audit-log/get-audit-log-admin.ts`
- `actions/crm/audit-log/get-audit-log-by-entity.ts`

Required migration:

- add auth to `getActivitiesByEntity` and `getAuditLogByEntity`,
- resolve `entityType` and `entityId` to the underlying entity scope,
- user sees activity/audit only for scoped entities,
- manager sees business activity/audit,
- admin sees all audit logs.

### 8.9 CRM opportunity line items and account tasks

Files:

- `actions/crm/opportunity-line-items/add-line-item/index.ts`
- `actions/crm/opportunity-line-items/update-line-item/index.ts`
- `actions/crm/opportunity-line-items/remove-line-item/index.ts`
- `actions/crm/opportunity-line-items/reorder-line-items/index.ts`
- `actions/crm/tasks/add-comment.ts`
- `actions/crm/tasks/delete-task.ts`
- `actions/crm/tasks/assign-document.ts`

Required migration:

- validate parent opportunity or account task,
- validate linked document on document assignment,
- manager/admin can operate globally.

### 8.10 CRM similarity and reference actions

Files:

- `actions/crm/similarity/get-similar-accounts.ts`
- `actions/crm/similarity/get-similar-contacts.ts`
- `actions/crm/similarity/get-similar-leads.ts`
- `actions/crm/similarity/get-similar-opportunities.ts`
- `actions/crm/get-industries.ts`
- `actions/crm/get-currencies.ts`

Required migration:

- add auth to similarity actions,
- verify the base record is in scope before returning similar records,
- filter similar records to user scope,
- reference data can be authenticated-read for all roles.

### 8.11 Campaigns

Files:

- `actions/campaigns/create-campaign.ts`
- `actions/campaigns/update-campaign.ts`
- `actions/campaigns/delete-campaign.ts`
- `actions/campaigns/pause-campaign.ts`
- `actions/campaigns/schedule-campaign.ts`
- `actions/campaigns/send-campaign-now.ts`
- `actions/campaigns/get-campaign.ts`
- `actions/campaigns/get-campaigns.ts`
- `actions/campaigns/templates/create-template.ts`
- `actions/campaigns/templates/update-template.ts`
- `actions/campaigns/templates/delete-template.ts`
- `actions/campaigns/templates/get-template.ts`
- `actions/campaigns/templates/get-templates.ts`
- `actions/campaigns/templates/generate-template.ts`

Required migration:

- add auth to all campaign actions,
- fail closed when session is missing,
- prevent `created_by: null`,
- user sees and edits own campaigns/templates,
- manager/admin see all campaigns/templates,
- schedule/send actions should be manager/admin by default,
- validate target list and template IDs before linking.

### 8.12 Documents

Files:

- `actions/documents/get-documents.ts`
- `actions/documents/search-documents.ts`
- `actions/documents/get-document-versions.ts`
- `actions/documents/create-document.ts`
- `actions/documents/create-document-version.ts`
- `actions/documents/delete-document.ts`
- `actions/documents/bulk-delete-documents.ts`
- `actions/documents/bulk-link-to-account.ts`
- `actions/documents/bulk-change-type.ts`
- `actions/documents/unlink-from-account.ts`
- `actions/documents/check-duplicate.ts`
- `actions/documents/retry-enrichment.ts`

Required migration:

- apply document scope to list/search/detail,
- validate all IDs in bulk operations,
- validate linked accounts and parent document versions,
- manager/admin see all documents.

### 8.13 Invoices

Files:

- `actions/invoices/create-invoice.ts`
- `actions/invoices/update-invoice.ts`
- `actions/invoices/duplicate-invoice.ts`
- `actions/invoices/cancel-invoice.ts`
- `actions/invoices/issue-invoice.ts`
- `actions/invoices/add-payment.ts`
- `actions/invoices/delete-payment.ts`
- `actions/invoices/send-invoice-email.ts`
- `actions/invoices/regenerate-pdf.ts`

Required migration:

- update `lib/invoices/permissions.ts` to understand `user`, `manager`, `admin`,
- replace `is_admin` inputs with role-aware context,
- validate `accountId` on create/update,
- validate source invoice on duplicate,
- use the same invoice read policy in PDF route.

### 8.14 Projects

Files:

- `actions/projects/create-project.ts`
- `actions/projects/update-project.ts`
- `actions/projects/delete-project.ts`
- `actions/projects/watch-project.ts`
- `actions/projects/unwatch-project.ts`
- `actions/projects/create-section.ts`
- `actions/projects/update-section-title.ts`
- `actions/projects/delete-section.ts`
- `actions/projects/create-task.ts`
- `actions/projects/create-task-in-board.ts`
- `actions/projects/update-task.ts`
- `actions/projects/delete-task.ts`
- `actions/projects/mark-task-done.ts`
- `actions/projects/update-kanban-position.ts`
- `actions/projects/add-comment-to-task.ts`
- `actions/projects/assign-document-to-task.ts`

Required migration:

- add shared board/task scope helpers,
- require board read/write access for section and task mutations,
- validate document assignment,
- manager/admin can operate globally.

### 8.15 Reports

Files:

- `actions/reports/config.ts`
- `actions/reports/schedule.ts`
- report helper modules used by `app/api/reports/export/route.ts`

Required migration:

- keep own/shared report config behavior for users,
- validate config access before schedule creation,
- scope report datasets for users,
- manager/admin can use global business reports.

### 8.16 Dashboard and full-text search

Files:

- `actions/dashboard/get-tasks-count.ts`
- `actions/fulltext/unified-search.ts`

Required migration:

- add auth to dashboard counts,
- user counts are scoped,
- manager/admin counts can be global,
- apply per-entity scope filters to unified search,
- restrict user-directory search facet based on role.

### 8.17 User, profile, API tokens, and feedback

Files:

- `actions/user/get-user-by-id.ts`
- `actions/user/search-users.ts`
- `actions/user/update-profile.ts`
- `actions/user/update-profile-photo.ts`
- `actions/user/set-language.ts`
- `actions/api-tokens.ts`
- `app/[locale]/(routes)/profile/actions/api-keys.ts`
- `actions/feedback/send-feedback.ts`

Required migration:

- self-only for profile and personal API keys,
- limited user directory for assignment workflows,
- manager can search users if needed for assignment,
- admin can manage users through admin actions,
- feedback remains allowed for authenticated users.

### 8.18 Admin actions

Files:

- `actions/admin/users/activate-user.ts`
- `actions/admin/users/deactivate-user.ts`
- `actions/admin/users/delete-user.ts`
- `actions/admin/users/invite-user.ts`
- `actions/admin/users/set-role.ts`
- `actions/admin/send-mail-to-all/index.ts`
- `app/[locale]/(routes)/admin/actions/api-keys.ts`
- `app/[locale]/(routes)/admin/currencies/_actions/currencies.ts`
- `app/[locale]/(routes)/admin/crm-settings/_actions/crm-settings.ts`
- `app/[locale]/(routes)/admin/invoices/settings/_actions/invoice-settings.ts`

Required migration:

- require admin for every export,
- explicitly reject managers,
- update role setter to accept only `user`, `manager`, `admin`,
- sync or remove legacy `is_admin`,
- fix `activate-user.ts`, which currently lacks the same admin guard as the other user admin actions.

## 9. Admin Route and Navigation Rules

### 9.1 UI route protection

The `/admin` route tree must be gated by canonical role:

```ts
if (user.role !== "admin") redirect("/");
```

Do not use `is_admin` after migration.

### 9.2 Navigation

Sidebar/admin navigation should show Administration only for `admin`.

Managers must not see admin navigation even though they can see business-wide data.

### 9.3 API and server action protection

UI gating is not enough. Every admin route handler and server action must call `requireRole(["admin"])`.

## 10. Error Handling and Response Policy

### 10.1 Route handlers

Use:

- `401 Unauthorized` when no authenticated session exists,
- `403 Forbidden` for role failures on non-ID-sensitive endpoints,
- `404 Not Found` for object-level IDOR-sensitive reads/mutations when the resource exists but is outside scope,
- `400 Bad Request` for malformed input.

### 10.2 Server actions

Use one consistent style per action family:

- throw typed `AuthorizationError`, or
- return `{ error: "Unauthorized" }` / `{ error: "Forbidden" }`.

Recommendation: use typed errors internally and map to UI-friendly messages at call sites.

### 10.3 Audit logging

For sensitive denials, log:

- actor user ID,
- role,
- attempted resource,
- attempted action,
- resource ID,
- decision.

Do not log secrets, session tokens, API keys, webhook signatures, or full request bodies containing PII.

## 11. Database Migration Plan

### 11.1 Schema changes

Add or enforce canonical role values:

```prisma
enum UserRole {
  user
  manager
  admin
}
```

Preferred final field:

```prisma
role UserRole @default(user)
```

If Prisma enum migration is too disruptive, keep `String` initially and add validation plus a database check constraint.

### 11.2 Data migration

Migration mapping:

```text
admin  -> admin
member -> manager
viewer -> user
null/unknown -> user
```

Then sync compatibility flags:

```text
is_admin = (role = admin)
is_account_admin = false
```

### 11.3 Indexes

Add an index on `Users.role` if role-filtered user administration or reporting queries are common.

### 11.4 Future multi-tenancy

This spec does not add `tenantId` or `organizationId`.

The current app appears to use a shared CRM namespace. If multi-tenant isolation is required later, add tenant/workspace IDs to all tenant-owned rows and enforce them in every scope helper. Until then, `manager` means business-wide access inside this single shared namespace.

## 12. Implementation Phases

### Phase 1: Role foundation

- Add canonical role values.
- Update Better Auth role definitions.
- Update set-role action to use `user`, `manager`, `admin`.
- Backfill legacy roles.
- Add `requireAuthenticated` and `requireRole`.
- Update admin layout and sidebar to use canonical role.
- Keep compatibility with `is_admin` only where not yet migrated.

### Phase 2: High-risk API route fixes

- Fix contact PATCH.
- Fix target PATCH.
- Fix target re-export routes.
- Fix target contact create.
- Fix enrichment POST/DELETE/bulk routes.
- Fix invoice PDF route.
- Fix reports export scoping.

### Phase 3: Admin server action lockdown

- Add admin guard to CRM settings actions.
- Add admin guard to currency actions.
- Add admin guard to invoice settings actions if needed.
- Fix `activate-user.ts`.
- Normalize admin user actions.

### Phase 4: CRM scope helpers and action migration

- Implement account, lead, contact, opportunity, contract, target, activity, audit-log scope helpers.
- Apply them to CRM read actions.
- Apply them to CRM mutation actions.
- Apply them to similarity search and unified search.

### Phase 5: Business modules

- Migrate products and account-product actions.
- Migrate campaigns and campaign templates.
- Migrate documents.
- Migrate invoices and invoice permissions.
- Migrate projects.
- Migrate reports and dashboard counts.

### Phase 6: Cleanup

- Remove `is_admin` decision points.
- Remove `is_account_admin` decision points.
- Remove unused `viewer` / `member` assumptions.
- Update docs and tests.
- Re-run security audit for IDOR/BOLA.

## 13. Testing Strategy

### 13.1 Unit tests

Add focused tests for:

- role parsing and validation,
- `requireRole`,
- every resource `scopeWhere` helper,
- every `assertCanRead*` / `assertCanWrite*` helper,
- invoice permission migration,
- campaign send/schedule policy,
- document visibility policy.

### 13.2 Integration tests for API routes

For each high-risk route, test:

- unauthenticated -> `401`,
- user accessing own resource -> success,
- user accessing another user's resource -> `404` or `403`,
- manager accessing any business resource -> success,
- manager accessing admin route -> `403`,
- admin accessing admin route -> success.

Priority API routes:

- `app/api/crm/contacts/[id]/route.ts`
- `app/api/crm/targets/[id]/route.ts`
- `app/api/crm/targets/[id]/contacts/route.ts`
- `app/api/crm/contacts/enrich/route.ts`
- `app/api/crm/contacts/enrich-bulk/route.ts`
- `app/api/crm/targets/enrich/route.ts`
- `app/api/crm/targets/enrich-bulk/route.ts`
- `app/api/invoices/[invoiceId]/pdf/route.ts`
- `app/api/reports/export/route.ts`
- `app/api/admin/invoices/tax-rates/route.ts`
- `app/api/admin/invoices/series/route.ts`

### 13.3 Server action tests

For every action family, include representative tests:

- user can act on own resource,
- user cannot act on another user's resource,
- manager can act on business-wide resource,
- manager cannot call admin action,
- admin can call admin action.

Priority action families:

- campaign send/schedule/update/delete,
- admin CRM settings,
- admin currencies,
- user activation/deactivation/set-role,
- CRM contact delete/update,
- CRM account reads,
- documents list/search/bulk actions,
- invoice duplicate/create/PDF-related flow,
- unified search,
- dashboard counts.

### 13.4 E2E tests

Add Playwright coverage for:

- user does not see Administration navigation,
- manager does not see Administration navigation,
- admin sees Administration navigation,
- user list pages show only own CRM records,
- manager list pages show all business records,
- user cannot open another user's detail page by direct URL,
- manager can open business detail pages,
- admin can open admin settings.

### 13.5 Security regression tests

Recreate the advisory PoC as automated regression:

- member-equivalent restricted `user` tries to PATCH another user's contact,
- expected result is `404` or `403`,
- victim contact remains unchanged.

Add equivalent regressions for:

- target PATCH,
- contact delete,
- target contact create,
- enrichment queue,
- invoice PDF,
- duplicate invoice.

## 14. Acceptance Criteria

The migration is complete when:

- `Users.role` is the only source of role truth.
- Valid roles are exactly `user`, `manager`, `admin`.
- `member` and `viewer` are gone from authorization decisions.
- `is_admin` and `is_account_admin` are not used for authorization.
- Every API route has an explicit auth decision.
- Every server action has an explicit auth decision.
- Every read/update/delete by caller-controlled ID has object-level authorization.
- `user` sees only own/scoped CRM, products, campaigns, documents, invoices, and projects.
- `manager` sees all non-admin business data.
- `manager` is blocked from `/admin`, `app/api/admin/**`, and admin server actions.
- `admin` can do everything.
- Advisory regression tests pass.
- No unauthenticated server actions remain except intentional integration/webhook/capability-token endpoints.

## 15. Open Product Decisions

These decisions should be confirmed before implementation:

1. Should existing `member` users migrate to `manager` or `user`?
2. Can a `user` create and edit products, or should product mutation be manager/admin only?
3. Can a `user` schedule/send campaigns, or should campaign delivery be manager/admin only?
4. Can managers restore soft-deleted CRM records, or is restore admin-only?
5. Should managers see audit logs, or only admins?
6. Should user-directory search be available to users for assignment workflows?
7. Should project data follow the same user/manager/admin model even though projects were not in the original role description?
8. Should reports for `user` be scoped or entirely manager/admin only?

## 16. Non-goals

This migration does not:

- introduce tenant/workspace IDs,
- implement PostgreSQL row-level security,
- redesign CRM ownership fields,
- redesign the UI layout,
- remove all legacy fields in the first phase,
- change webhook and integration-token behavior except where explicitly noted.

## 17. Risks

- Role migration can lock out existing admins if `role` and `is_admin` are not synced before deployment.
- Tightening list queries can reveal UI assumptions where components expect global data.
- Manager-wide access must be carefully separated from admin/system access.
- Server actions under admin routes may appear safe in the UI but remain callable unless guarded.
- Inngest jobs can reintroduce IDOR if queued IDs are trusted without worker-side validation.
- Unified search and reports can leak data even after individual CRUD actions are fixed.

## 18. Recommended First Implementation Slice

Start with the smallest slice that closes the advisory and establishes reusable patterns:

1. Add canonical authz helpers.
2. Add `user`, `manager`, `admin` role validation.
3. Implement contact and target scope helpers.
4. Patch contact PATCH and target PATCH routes.
5. Add regression tests for cross-user contact and target PATCH.
6. Add admin guard helper and apply it to admin CRM settings and currency actions.

This creates the foundation for the rest of the migration without trying to rewrite every action at once.
