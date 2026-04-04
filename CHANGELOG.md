# Changelog

All notable changes to NextCRM are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.1](https://github.com/pdovhomilja/nextcrm-app/compare/v0.3.0...v0.3.1) (2026-04-04)


### Bug Fixes

* **auth:** resolve Google OAuth user creation failures ([844389a](https://github.com/pdovhomilja/nextcrm-app/commit/844389a689c0f20ab8d75bdf10648beeb829c5e3))
* **auth:** resolve Google OAuth user creation failures ([094e7ee](https://github.com/pdovhomilja/nextcrm-app/commit/094e7ee715c034b7c023a574241871690cee68ad))

## [0.3.0](https://github.com/pdovhomilja/nextcrm-app/compare/v0.2.0...v0.3.0) (2026-04-04)


### Features

* **documents:** add batch actions bar for bulk delete, type change, and account linking ([7ed7cfa](https://github.com/pdovhomilja/nextcrm-app/commit/7ed7cfa0ef97bd7281605a390a7b212fc3aa1324))
* **documents:** add bulk actions, versioning, and account linking server actions ([6a8908a](https://github.com/pdovhomilja/nextcrm-app/commit/6a8908a39580f20e99e232fc03f944d381b1265f))
* **documents:** add document detail panel with summary, metadata, and version history ([9fd00f1](https://github.com/pdovhomilja/nextcrm-app/commit/9fd00f1a0785e7715aaf4e4e6c70457e7256efee))
* **documents:** add enrichment fields, chunks table, and embeddings model ([c58a1e6](https://github.com/pdovhomilja/nextcrm-app/commit/c58a1e657b23795504cdc9708682ab6e5d69178c))
* **documents:** add Inngest enrichment orchestrator with text extraction, embedding, summary, classification ([a7216cb](https://github.com/pdovhomilja/nextcrm-app/commit/a7216cbb1a0a5370096560a5a513ec0e732b1743))
* **documents:** add name/content search toggle on documents page ([8043818](https://github.com/pdovhomilja/nextcrm-app/commit/8043818bc1c2756ceb4cf7d3dd19f0fabe8de461))
* **documents:** add processing status badge component ([514fa69](https://github.com/pdovhomilja/nextcrm-app/commit/514fa6963c9c4c7946bd4f08ac4d634110f68dc2))
* **documents:** add thumbnail generator and register Inngest functions ([b0b406e](https://github.com/pdovhomilja/nextcrm-app/commit/b0b406ea4be6e75d865b0f85f1f21ccb5a693365))
* **documents:** add upload-from-account-context with auto-linking ([cb3a096](https://github.com/pdovhomilja/nextcrm-app/commit/cb3a0963573e6ca5d38e4bb2d731b639dce09ee0))
* **documents:** redesign columns with type badges, summaries, status, and filters ([9ecd298](https://github.com/pdovhomilja/nextcrm-app/commit/9ecd2984127f91fdcbe50616a5ae21afcf8eb64d))
* **documents:** replace 3 upload buttons with single bulk upload modal ([dde3a47](https://github.com/pdovhomilja/nextcrm-app/commit/dde3a477e01ded54ba52953ed80da2baa8099e4e))
* **documents:** update createDocument with Inngest event, add checkDuplicate action ([90c2bbc](https://github.com/pdovhomilja/nextcrm-app/commit/90c2bbc3021ba54eb3133a89fe6df9c9c8ecdfef))
* **documents:** update Zod schema and static filter data for enrichment fields ([4ce71b3](https://github.com/pdovhomilja/nextcrm-app/commit/4ce71b37a63ab09999ba4d7283a8d1a4850fb6bc))
* **search:** add document search to command palette ([a0a5bbe](https://github.com/pdovhomilja/nextcrm-app/commit/a0a5bbe064b358933f33fa8ad1b43c039c64659d))
* **search:** add documents to unified search with keyword + vector similarity ([299736f](https://github.com/pdovhomilja/nextcrm-app/commit/299736fd74c539b65472db021cc8cfe0f1335abd))


### Bug Fixes

* **documents:** check upload response status in bulk upload modal ([d71dbf5](https://github.com/pdovhomilja/nextcrm-app/commit/d71dbf52edb03144ba89f3b20e2dc5b4ef9deca1))
* **documents:** exclude pdf-parse and pdfjs-dist from Turbopack server bundle ([6ea7e4b](https://github.com/pdovhomilja/nextcrm-app/commit/6ea7e4bec671046ea396e29930d132dcbe10d6f0))
* **documents:** replace next/image with img tag in DocumentViewModal ([3d2dafd](https://github.com/pdovhomilja/nextcrm-app/commit/3d2dafdae168a2dccc6826d0b897a99351d0c901))
* **documents:** use pdf-parse v2 class-based API for text extraction ([2825f90](https://github.com/pdovhomilja/nextcrm-app/commit/2825f90efc4f2cf97c65901f7c1f7d9f4125db25))
* **documents:** use row.original directly instead of Zod parse in row actions ([20a6016](https://github.com/pdovhomilja/nextcrm-app/commit/20a601665e0e7b24b6a9555eeb298460c4468505))
* update @vercel/mcp-adapter to v1.0.0 and add to trusted builds ([e1583c2](https://github.com/pdovhomilja/nextcrm-app/commit/e1583c2a7d87f6fc1790f0e0432d4812308988a7))

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
