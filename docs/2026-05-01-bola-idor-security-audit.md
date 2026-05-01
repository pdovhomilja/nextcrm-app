# BOLA/IDOR Security Audit

Date: 2026-05-01

Scope: GitHub advisory `GHSA-mg5f-m89f-4gmc`, all `app/api/**/route.ts` handlers, and server actions containing `"use server"` under `actions/**` and `app/**/_actions/**`.

No code changes were made as part of this audit.

## GitHub Advisory Verification

`GHSA-mg5f-m89f-4gmc` is present in GitHub Security Advisories for `pdovhomilja/nextcrm-app`.

- Summary: BOLA/IDOR in `PATCH /api/crm/contacts/[id]` allowing cross-tenant CRM data tampering
- State: triage
- Severity: high
- CVSS: 7.1, `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:H/A:N`
- CWE: `CWE-639`, Authorization Bypass Through User-Controlled Key
- Affected package: `nextcrm-app`
- Affected versions: `<= 0.10.1`
- Reporter: `@xIllunight`
- Published: not published at the time of review
- Last updated in GitHub: 2026-04-22

The advisory description confirms the vulnerable pattern in `app/api/crm/contacts/[id]/route.ts` and notes the same issue in the target update endpoint.

## Executive Summary

The reported vulnerability is confirmed. `PATCH` handlers for CRM contacts and targets verify that a user is authenticated, but do not verify that the authenticated user is allowed to modify the specific object identified by the URL parameter.

This pattern is broader than the original advisory. Several API routes and server actions either:

- perform mutations using caller-controlled IDs without object-level authorization,
- expose reads/downloads for arbitrary IDs to any authenticated user,
- queue background enrichment or campaign jobs for arbitrary records,
- or have no server-side session/admin check at all.

The project currently appears to use a single shared CRM namespace rather than a tenant-scoped data model. No consistent `organizationId` / `tenantId` field was found across core CRM models. Because of that, authorization must currently be enforced as application policy using roles and ownership fields such as `assigned_to`, `created_by`, `createdBy`, invoice `createdBy`, document visibility, board ownership, and admin status.

## Confirmed API Route Findings

### High: CRM Contacts PATCH IDOR

File: `app/api/crm/contacts/[id]/route.ts`

Handler: `PATCH`

Risky operation:

```ts
await prismadb.crm_Contacts.update({
  where: { id },
  data: { ...updates, updatedBy: session.user.id },
});
```

The route checks `getSession()`, but the `where` clause only scopes by the path `id`. There is no check against `assigned_to`, `created_by`, `createdBy`, linked account access, admin status, or tenant boundary.

Impact: any authenticated user with a known contact UUID can modify allowed enrichment fields such as phone, LinkedIn, social links, website, position, and description.

Suggested policy: allow mutation only for admin, assignee, creator, or a user with access to the linked account. Prefer an atomic scoped update or a pre-check followed by update.

### High: CRM Targets PATCH IDOR

File: `app/api/crm/targets/[id]/route.ts`

Handler: `PATCH`

Risky operation:

```ts
await prismadb.crm_Targets.update({
  where: { id },
  data: { ...updates, updatedBy: session.user.id },
});
```

Same pattern as contacts. The path `id` is trusted after session verification.

Impact: any authenticated user can modify another target's enrichment fields if they know the UUID.

Suggested policy: targets do not appear to have `assigned_to`; use admin or `created_by` / `createdBy` style ownership policy.

### High: Campaign Targets PATCH Re-export

File: `app/api/campaigns/targets/[id]/route.ts`

This route re-exposes the CRM target PATCH behavior under a campaign URL prefix. Treat it as the same vulnerability surface as `app/api/crm/targets/[id]/route.ts`.

### High: Create Target Contact for Arbitrary Target

File: `app/api/crm/targets/[id]/contacts/route.ts`

Handler: `POST`

Risky operation:

```ts
await prismadb.crm_Target_Contact.create({
  data: { targetId, ... },
});
```

The route requires a session, but does not verify the caller can modify the target identified by the path `id`.

Impact: any authenticated user can attach manual contacts to arbitrary targets.

Suggested policy: verify write access to the target before creating related contacts.

### High: Contact Enrichment for Arbitrary Contact

File: `app/api/crm/contacts/enrich/route.ts`

Handler: `POST`

Risky operations:

```ts
await prismadb.crm_Contacts.findUnique({
  where: { id: contactId },
  select: { id: true, email: true },
});

await prismadb.crm_Contact_Enrichment.create({
  data: { contactId, triggeredBy: session.user.id, ... },
});
```

The route requires a session and user API keys, but does not verify the caller can read or enrich the contact.

Impact: a user can trigger enrichment on another user's contact, read whether the contact exists and has an email, and spend enrichment resources against unauthorized records.

Suggested policy: check contact read/write/enrich permission before reading the email or creating an enrichment record.

### Medium-High: Unauthenticated Contact Enrichment Cancel

File: `app/api/crm/contacts/enrich/route.ts`

Handler: `DELETE`

Risky operation:

```ts
await prismadb.crm_Contact_Enrichment.update({
  where: { id: entry.enrichmentId },
  data: { status: "FAILED", error: "Cancelled by user" },
});
```

The cancel endpoint accepts `sessionId` and does not call `getSession()`.

Impact: anyone with a valid active enrichment `sessionId` can cancel and mark that enrichment as failed. The `sessionId` is random and short-lived, but it is still an unauthenticated mutation endpoint.

Suggested policy: require session and bind active sessions to `session.user.id`; only the creator or admin should cancel.

### High: Target Enrichment Surfaces

Files:

- `app/api/crm/targets/enrich/route.ts`
- `app/api/crm/targets/enrich-bulk/route.ts`
- `app/api/crm/targets/[id]/enrich/route.ts`
- `app/api/crm/targets/[id]/contacts/[contactId]/enrich/route.ts`
- campaign route re-exports under `app/api/campaigns/targets/**`

Pattern: routes require a session but do not consistently verify ownership/access for the target or contact IDs before queueing enrichment work.

Impact: arbitrary enrichment job creation and possible cross-record metadata exposure or resource abuse.

Suggested policy: verify read/enrich permission for each target/contact ID before queueing Inngest events or starting enrichment.

### High: Bulk Contact Enrichment for Arbitrary IDs

File: `app/api/crm/contacts/enrich-bulk/route.ts`

Pattern: accepts client-supplied `contactIds` and queues background enrichment after session verification only.

Impact: authenticated users can queue enrichment for records they may not own.

Suggested policy: filter IDs to authorized contacts and fail closed if any requested ID is unauthorized.

### Medium: Invoice PDF IDOR

File: `app/api/invoices/[invoiceId]/pdf/route.ts`

Handler: `GET`

Risky operation:

```ts
await prismadb.invoices.findUnique({
  where: { id: invoiceId },
  select: { pdfStorageKey: true },
});
```

The route requires a session, then redirects to a presigned PDF URL for any known invoice ID.

Impact: any authenticated user can access another user's invoice PDF if they know or obtain the invoice UUID.

Suggested policy: reuse invoice permission logic from `lib/invoices/permissions.ts`; require invoice creator or admin, and consider account-level authorization if invoices should follow account access.

### Medium: Global Report Export

File: `app/api/reports/export/route.ts`

Handler: `GET`

Pattern: requires a session, then delegates to report actions. Sampled report actions appear to aggregate global CRM data without user or role scoping.

Impact: any authenticated user may export global sales, lead, account, activity, campaign, or user metrics.

Suggested policy: require report permission / admin role, or scope report data to the user's accessible records.

## Server Action Findings

### Critical: Campaign Actions Without Session Checks

Files include:

- `actions/campaigns/send-campaign-now.ts`
- `actions/campaigns/pause-campaign.ts`
- `actions/campaigns/schedule-campaign.ts`
- `actions/campaigns/delete-campaign.ts`
- `actions/campaigns/update-campaign.ts`
- `actions/campaigns/templates/update-template.ts`
- `actions/campaigns/templates/get-template.ts`
- `actions/campaigns/templates/get-templates.ts`
- `actions/campaigns/get-campaign.ts`
- `actions/campaigns/get-campaigns.ts`

Example:

```ts
await prismadb.crm_campaigns.update({
  where: { id },
  data: { status: "sending", scheduled_at: now },
});
```

Impact: these actions can mutate or disclose campaign data without an explicit server-side auth gate. `sendCampaignNow` can also trigger real campaign sending through Inngest.

Suggested policy: require session for all campaign actions; restrict mutations to campaign creator, admin, or a dedicated campaign role.

### Critical: Unauthenticated Campaign Creation

File: `actions/campaigns/create-campaign.ts`

Pattern:

```ts
const session = await getSession();
created_by: session?.user?.id ?? null;
```

The action reads the session but does not require it. A campaign can be created with `created_by: null`.

Suggested policy: fail closed without session; set `created_by` only from the authenticated user; validate access to target lists and templates.

### Critical: Admin CRM Settings Actions Without Admin Check

File: `app/[locale]/(routes)/admin/crm-settings/_actions/crm-settings.ts`

Affected exports include:

- `getConfigValues`
- `createConfigValue`
- `updateConfigValue`
- `deleteConfigValue`

Impact: global CRM configuration can be read, created, updated, deleted, or reassigned without `getSession()` or admin verification.

Suggested policy: require admin on every export, including reads if usage counts or system configuration are considered sensitive.

### Critical: Admin Currency Actions Without Admin Check

File: `app/[locale]/(routes)/admin/currencies/_actions/currencies.ts`

Affected exports include:

- `getCurrencies`
- `getExchangeRatesAdmin`
- `createCurrency`
- `toggleCurrency`
- `setDefaultCurrency`
- `updateExchangeRate`
- `getEcbAutoUpdate`
- `setEcbAutoUpdate`

Impact: unauthenticated callers can change currency settings, default currency, exchange rates, and ECB auto-update configuration.

Suggested policy: require admin for all mutators and sensitive readers. `app/[locale]/(routes)/admin/invoices/settings/_actions/invoice-settings.ts` is a useful reference because it already uses user/admin checks.

### High: Contact Delete IDOR

File: `actions/crm/contacts/delete-contact.ts`

Risky operation:

```ts
await prismadb.crm_Contacts.update({
  where: { id: contactId },
  data: { deletedAt: new Date(), deletedBy: session.user.id },
});
```

The action requires session but does not verify object-level permission.

Impact: any authenticated user can soft-delete another contact by ID.

Suggested policy: require admin, assignee, creator, or linked-account access.

### High: Duplicate Invoice IDOR

File: `actions/invoices/duplicate-invoice.ts`

Risky operation:

```ts
const source = await prismadb.invoices.findUniqueOrThrow({
  where: { id: invoiceId },
  include: { lineItems: { orderBy: { position: "asc" } } },
});
```

The action requires a user but does not verify that the user can read or duplicate the source invoice.

Impact: any authenticated user can duplicate another user's invoice into their own draft, copying line items, account ID, bank details, internal notes, totals, and other invoice metadata.

Suggested policy: reuse owner-or-admin checks from `lib/invoices/permissions.ts` before reading and copying invoice content.

### High: Cross-object Invoice Account Binding

File: `actions/invoices/create-invoice.ts`

Pattern: `accountId` comes from the client and the action requires a user, but account-level access was not confirmed.

Impact: users may be able to create invoices linked to arbitrary CRM accounts.

Suggested policy: verify the caller can bill/manage the referenced account before creating the invoice.

### Medium-High: Arbitrary User Lookup

File: `actions/user/get-user-by-id.ts`

Pattern:

```ts
await prismadb.users.findFirst({
  where: { id: userId, userStatus: "ACTIVE" },
  select: { id: true, name: true, avatar: true },
});
```

The action requires session, but allows lookup of any active user.

Impact: user enumeration / profile disclosure. Severity depends on whether this is intended for autocomplete or assignment workflows.

Suggested policy: self, admin, or explicit user-directory permission. If autocomplete is intended, use a dedicated search endpoint with rate limits and minimal fields.

### Medium-High: Global Document Listing

File: `actions/documents/get-documents.ts`

Pattern:

```ts
await prismadb.documents.findMany({
  where: { parent_document_id: null },
  include: { created_by: true, assigned_to_user: true, accounts: true },
});
```

The action requires session, but returns all root documents without filtering by visibility, creator, assignee, account access, or admin.

Impact: authenticated users may see document metadata and linked account information outside their access scope.

Suggested policy: enforce document visibility and assignment rules in the query.

### Medium-High: Global CRM Read Actions

Files flagged for missing session or global session-only reads include:

- `actions/crm/accounts/get-account-by-id.ts`
- `actions/crm/accounts/get-accounts.ts`
- `actions/crm/accounts/search-accounts.ts`
- `actions/crm/get-contract.ts`
- `actions/crm/get-contracts.ts`
- `actions/crm/get-opportunities-with-includes.ts`
- `actions/crm/get-target.ts`
- `actions/crm/get-targets.ts`
- `actions/crm/get-target-list.ts`
- `actions/crm/get-target-lists.ts`
- `actions/crm/activities/get-activities-by-entity.ts`
- `actions/crm/audit-log/get-audit-log-by-entity.ts`
- `actions/crm/similarity/get-similar-accounts.ts`
- `actions/crm/similarity/get-similar-contacts.ts`
- `actions/crm/similarity/get-similar-leads.ts`
- `actions/crm/similarity/get-similar-opportunities.ts`

Impact: depending on the route, unauthenticated or broadly authenticated callers may enumerate CRM accounts, contracts, opportunities, targets, activities, audit logs, and similarity results.

Suggested policy: add session checks where missing; then enforce entity-level read permissions.

### Low or Policy-dependent

- `actions/crm/get-industries.ts`
- `actions/crm/get-currencies.ts`

These appear lower sensitivity and may be acceptable public/reference data. The product should still explicitly decide whether unauthenticated access is intended.

## Patterns That Look Safer

The following patterns are useful references for remediation:

- `actions/crm/opportunity/dashboard/set-inactive.ts` checks that the caller is admin or assigned to the opportunity before updating it.
- `lib/invoices/permissions.ts` centralizes owner-or-admin invoice policy through helpers such as `canEditInvoice`, `canIssueInvoice`, `canCancelInvoice`, and `canAddPayment`.
- Several invoice actions use `getUser()` plus invoice permission helpers before mutation.
- Admin invoice route handlers use DB-backed `is_admin` checks.
- `actions/user/update-profile.ts` follows an owner-or-admin style policy.

## Auth and Authorization Model Notes

Relevant helpers:

- `getSession()` in `lib/auth-server.ts`
- `getUser()` in `actions/get-user.ts`
- `getMcpUser()` in `lib/mcp/auth.ts`
- `requireAdmin()` and `requireOwnerOrAdmin()` in `lib/auth-guards.ts`

Role and admin state appear inconsistent:

- Some code checks `session.user.role === "admin"`.
- Some code checks DB-backed `user.is_admin`.
- `lib/auth-server.ts` has a TODO for `requireRole()` and viewer restriction enforcement.
- `lib/auth-guards.ts` exists but does not appear to be broadly adopted.

Ownership fields observed:

- Contacts: `assigned_to`, `created_by`, `createdBy`, `updatedBy`, linked accounts
- Targets: `created_by`, `updatedBy`
- Opportunities: `assigned_to`, `created_by`, `createdBy`, account/contact/campaign relations
- Campaigns: `created_by`
- Documents: `created_by_user`, `assigned_user`, `visibility`, account/contact/opportunity/task/lead links
- Projects: board owner, shared users, visibility, task assignee
- Invoices: `createdBy`, `accountId`
- Accounts and leads: assignment and creator fields

## Recommended Remediation Order

1. Patch the advisory-confirmed API routes first: `contacts/[id]` PATCH and `targets/[id]` PATCH.
2. Patch duplicate API surfaces that re-export vulnerable target routes.
3. Add object-level checks to enrichment routes before reading records, creating enrichment rows, or queueing jobs.
4. Require auth and ownership binding for enrichment cancel endpoints.
5. Add admin checks to admin `_actions` for CRM settings and currencies.
6. Add session checks to campaign actions and prevent unauthenticated campaign creation.
7. Reuse invoice permissions in invoice PDF and duplicate invoice paths.
8. Add document visibility / assignment scoping to document reads.
9. Add entity-level read checks to CRM global reads, activities, audit logs, and similarity actions.
10. Centralize resource authorization helpers so future routes do not repeat ad hoc checks.

## Suggested Policy Shape

Define one authorization helper per resource family and use it before all reads and mutations:

- Contacts: admin, assignee, creator, or linked-account access
- Targets: admin or creator
- Opportunities: admin or assignee, optionally account access
- Accounts: admin, assignee, creator, watcher, or team/account access
- Campaigns: admin, creator, or campaign manager role
- Documents: admin, creator, assigned user, public visibility, or linked-entity access
- Invoices: admin or creator, optionally account access
- Admin settings: admin only
- Reports: admin/report permission, or scoped to accessible entities

For update/delete operations by ID, prefer one of:

- atomic scoped mutation with `updateMany` and a scoped `where`, returning `404` or `403` when `count === 0`;
- pre-check with a minimal `findUnique` / `findFirst`, explicit permission decision, then mutation in a transaction where needed.

## Residual Risk

This was a static review. It did not include browser testing, direct exploit execution, worker/Inngest function review, MCP tool authorization review, or full report-helper tracing. Those areas should be reviewed before closing the advisory.
