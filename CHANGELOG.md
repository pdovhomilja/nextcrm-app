# Changelog

All notable changes to NextCRM are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0](https://github.com/pdovhomilja/nextcrm-app/compare/v0.1.0...v0.2.0) (2026-04-03)


### Features

* **footer:** read app version from package.json ([0052e17](https://github.com/pdovhomilja/nextcrm-app/commit/0052e17aadf5283299da88bc695c4b4124fa48fd))
* **footer:** read app version from package.json instead of env var ([003a728](https://github.com/pdovhomilja/nextcrm-app/commit/003a728b56429230d40058622e7d0f6fb925e150))

## [0.1.0] - 2026-04-03

This release is a major milestone — it replaces the entire authentication system, adds a full reporting module, CRM activity tracking, audit logging, soft delete, configurable CRM settings, and AI-powered contact enrichment via E2B sandboxes.

### Added

#### Authentication (better-auth)
- Replaced next-auth with better-auth (Google OAuth + Email OTP login)
- Role-based access control (RBAC) — admin / member / viewer roles
- Server-side `getSession` helper and admin plugins
- Email OTP authentication flow with magic link support
- Admin UI for role management (replaces activate/deactivate toggles)
- Idempotent role backfill migration script
- better-auth session, account, and verification tables in database

#### Reports Module
- Full reporting dashboard with KPI cards (sales, leads, accounts, activity, campaigns, users)
- Sub-pages: Sales, Leads, Accounts, Activity, Campaigns, Users
- Date range picker and filter bar
- CSV export via API route
- PDF export with Inngest-scheduled email delivery
- Save report configurations and schedule recurring reports
- shadcn/ui chart components replacing Tremor

#### CRM Activities
- Activity tracking on all 5 CRM entity detail pages (accounts, contacts, leads, opportunities, contracts)
- `ActivityForm` sheet for creating/editing activities
- `ActivitiesView` paginated feed with compound cursor pagination
- `crm_Activities` and `crm_ActivityLinks` database models

#### CRM Audit Log & Soft Delete
- Soft delete on accounts, contacts, leads, opportunities, contracts
- `crm_AuditLog` model tracking all field changes with before/after diffs
- History tab on all CRM entity detail pages
- Admin audit log page with global filterable table and restore actions

#### CRM Settings (Admin)
- Admin page with 7-tab configuration UI for CRM field values
- Configurable: Contact Types, Lead Sources, Lead Statuses, Lead Types
- CRUD dialogs for each config category
- CRM Settings link in admin sidebar

#### AI Enrichment (E2B Agent)
- E2B sandbox agent enrichment for campaign targets
- Multi-field enrichment with preset selector
- Company-name-only enrichment path (no email required)
- Bulk enrichment modal with field selector
- `crm_Target_Contact` model for multi-contact per target
- 8 new enrichment fields: personal email, LinkedIn, Twitter, phone, title, department, location, bio
- Skip-list cache (5-min TTL) to avoid re-enriching recently processed targets

#### Target Enrichment & Conversion
- Convert Target → Account/Contact flow
- Conversion tracking fields in `crm_Targets`
- Gmail quick-connect with App Password guide and folder discovery
- `TargetContactsTable` with add-contact and enrich actions

#### Contracts
- Contracts detail page with BasicView
- Contracts listed in admin audit log

### Fixed

- Auth: Critical authorization bypass patched
- Auth: Operator precedence bugs in session checks
- Auth: Redirect to sign-in after sign-out
- Auth: better-auth schema compatibility and modelName mapping for Users table
- Reports: Chart colors using `hsl()` wrapper and purple palette
- Reports: Prisma field names aligned across all report actions
- Reports: `created_on` vs `createdAt` field name in campaigns action
- CRM: `assigned_to_user` null guard in account BasicView
- CRM: UUID constraints in update forms (`z.uuid()` replacing `max(30)`)
- CRM: Operator precedence in leads name column cell
- CRM: Soft-delete columns migration made idempotent
- Campaigns: Targets import validation relaxed (last_name or company required)
- Enrichment: Company domain discovery before agent runs
- Enrichment: Personal email vs company domain routing
- Enrichment: Null upsert key guard and DB updates wrapped in `step.run`
- Inngest: `gen_random_uuid()` added to embedding INSERT statements
- Inngest: v4 API compatibility fixes
- Build: All TypeScript errors resolved (operator precedence, missing imports, type safety)

### Changed

- Login page rewritten — credentials/register flow removed, Google OAuth + Email OTP only
- All server actions migrated from next-auth to better-auth session
- All API routes migrated to better-auth session
- Admin `isAdmin`/`is_admin` checks replaced with role-based RBAC
- CRM lead/contact forms now use DB-backed FK select values
- Reports page replaced static view with live KPI dashboard
- Tremor chart library removed — replaced with shadcn/ui charts

### Security

- Critical authorization bypass fixed in auth middleware
- Password removed from invite email template
- Session token strategy updated to better-auth cookie-based auth

### Removed

- next-auth package and all type definitions
- Register page and password reset flow
- Credentials-based login
- Tremor (`@tremor/react`) dependency

---

## [0.0.3-beta] - 2024

- Initial beta releases with MongoDB → PostgreSQL migration
- Basic CRM modules: Accounts, Contacts, Leads, Opportunities
- Campaign management with target lists
- AI document processing (OCR, PDF, DOCX)
- Vector embeddings with pgvector

[0.1.0]: https://github.com/pdovhomilja/nextcrm-app/compare/v0.0.3-beta...v0.1.0
[0.0.3-beta]: https://github.com/pdovhomilja/nextcrm-app/releases/tag/v0.0.3-beta
