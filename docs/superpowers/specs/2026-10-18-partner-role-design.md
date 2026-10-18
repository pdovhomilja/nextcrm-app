# Partner role: external users who see only their own accounts — Design

**Date:** 2026-10-18
**Status:** Decided (Pavel, 2026-10-18, "yes to all"); ticket 1 in progress
**First client:** OXO (Petr Schubert, distributor). The feature is generic: NextCRM is one product, no OXO-specific code.

## Problem

OXO wants to give a distributor a NextCRM login that shows only his customers and their CRM data, never other distributors' accounts or OXO's internal customers. NextCRM has three roles (`user`, `manager`, `admin`). `user` is already owner-scoped (`lib/authz/scopes/crm.ts`: assigned_to / createdBy / watchers, children through the account), but it is built for colleagues, not outsiders:

- making the distributor `assigned_to` would replace the internal owner;
- `visibility: "public"` documents are readable by every user;
- dashboard counters (`actions/dashboard/*`) return global counts;
- the user directory and assignee pickers list the whole team;
- MCP `crm_list_contracts` / `crm_get_contract` are unscoped ("org-wide");
- invoices: list scoped by `createdBy`, but `get-invoices-by-accountId` returns every invoice on a readable account;
- campaigns, boards, projects, reports, emails, admin are not meant for an outsider.

Separately, and for every user today: uploaded documents are stored as public MinIO URLs (`app/api/upload/presigned-url/route.ts`), so a file is readable by anyone with the link.

## Decisions (Pavel 2026-10-18)

1. New role `partner`, separate from the account owner: the internal owner (`assigned_to`) stays; a new account field names the partner.
2. One partner per account.
3. A partner may create accounts; they get him as partner and appear on the existing "Needs owner" page for an internal owner.
4. Orders: a partner can see orders of his accounts; creating orders is a later decision (needs a price decision: list prices vs his own).
5. The partner's own customer account (e.g. Petr Schubert with branches) is visible to him read-only. Refined (Pavel 2026-10-18): on his own account he sees the account record, its contacts, its orders and its invoices. Leads, deals/opportunities, contracts, documents, CRM tasks and activities on it stay hidden.
6. No API tokens / MCP for partners for now.
7. Document files become private for everyone, shipped first as its own security PR.

## Design

### Model
- `AppRole` gets `partner`.
- `crm_Accounts.partnerUserId String? @db.Uuid` → `Users` (relation "AccountPartner"), index. One partner per account.
- Read-only own account: `Users.partnerAccountId String? @db.Uuid` → `crm_Accounts` (the partner's own company). Visible read-only, never writable by him.

### Visibility (deny by default)
A partner sees:
- accounts where `partnerUserId = me` (his partner accounts, `partnerAccountWhere`), plus his `partnerAccountId` (read-only);
- on his partner accounts: contacts, leads, opportunities, contracts, orders, invoices, documents, CRM tasks, activities **only through those accounts** (not through createdBy / watchers / public visibility);
- on his own account (`partnerVisibleAccountWhere`): the account record, contacts, orders, invoices only. His own account is never one of his partner accounts, even if an admin also names him its partner.
- records he created only if they hang off one of those accounts.

A partner never sees: other users (directory, pickers show only himself and the account's internal owner name as text), global counters (dashboard shows his own counts), public documents not linked to his accounts, campaigns, targets, boards/projects, reports beyond his scope, emails module, admin, API tokens, plugin admin.

**Deny by default** is the core rule: every scope helper and assert must treat a role it does not explicitly handle as "no rows", so a forgotten code path returns nothing instead of falling back to `user` rules. A partner is never handled by the `admin || manager` branch nor by the `user` branch.

### Writes
- May create and edit contacts, leads, opportunities, tasks, activities on his accounts; may edit his accounts' ordinary fields.
- May create accounts → `partnerUserId = me`, `assigned_to = null`. Core has no "Needs owner" page (the one in `oxo-erp-connector` lists only ERP-linked accounts), so the new account is simply unowned and visible to admins and managers in Accounts.
- Write asserts let a partner through only when the call site passes `PARTNER_EDIT` (create/edit of contacts, leads, opportunities, CRM tasks, activities on his partner accounts; ordinary fields of those accounts). Every other caller (deletes, restores, contracts, invoices, line items, products, documents, enrichment) refuses him by default.
- Assignee: on create the record is assigned to the partner himself; on edit his `assigned_to` input is ignored.
- May not: change `partnerUserId` or `assigned_to`, delete or restore anything, touch his own `partnerAccountId` account, change roles, create API tokens.

### Admin
- Admin users page: role select includes `partner`; set `partnerAccountId`.
- Account form/detail: "Partner" picker (admins and managers only), listing users with role `partner`.

### Proof
- Fixture: partner A, partner B, internal-only account, A's own customer account; each with contacts, leads, opportunities, contracts, invoices, documents (one public), tasks, activities, orders.
- Key test (jest at the scope layer + Playwright e2e for the pages): A sees exactly A's set, B exactly B's, neither sees the internal account; counters equal his own counts; directory returns only himself; public document of another account invisible; every write outside his accounts refused; his own customer account readable, not writable.
- A coverage test that fails when a scope helper in `lib/authz` does not handle `partner` explicitly (enforce, don't instruct).

## Tickets (vertical slices, in order)

0. **Private document files (security, all users).** Files served through an authenticated route or short-lived presigned GET checked against `assertCanReadDocument`; existing public URLs migrated; the bucket no longer public. Own PR, first.
1. **Role + field + admin.** `partner` role, `partnerUserId`, `partnerAccountId`, migration, admin users page and account Partner picker, `set-role` accepts partner. Partner sees nothing yet (deny by default) — test proves it.
2. **Read scope + key test.** Partner branch in `lib/authz/scopes/crm.ts`, `report-scope`, `orders`, `invoices/permissions`; fixture + key jest test + coverage test.
3. **Close leaks.** Dashboard counters, account-child getters (`get-tasks`, `get-documents-by-*`, `get-accounts-by-*`), invoices by account, MCP contracts/documents/activities (and MCP refused for partners), user directory and pickers, unified search, similarity.
4. **Partner app + writes.** Navigation and routes limited to the partner modules (server-side, not just hidden links); create-account → Needs owner; write asserts; e2e for the whole partner journey.

## Out of scope
Partner creating orders, partner price lists, multiple partners per account, partner teams (a distributor with his own staff), partner API access.

## Release
Feature PRs merge into main; it reaches OXO with the next release PR (NextCRM deploys on release). Then Pavel creates Petr Schubert's user, sets role partner, and assigns his accounts.
