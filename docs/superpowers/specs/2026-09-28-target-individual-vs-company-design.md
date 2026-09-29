# Target Type: Individual vs Company — Design

**Date:** 2026-09-28
**Branch:** `feat/target-type`
**Status:** Design — awaiting approval before implementation planning

## Problem & Intent

`crm_Targets` is person-centric: `last_name` was historically required, and the UI
mixes person fields (first/last name, position, personal email/phones/website) with
company fields (industry, employees, company website) on every record. The result:
a **company** target (e.g. the 28 Overland Park/Olathe prospects) shows a person's
"last name" as its title and a wall of person-only "N/A" fields.

The user prospects **both** standalone individuals **and** companies, roughly equally
(**co-equal kinds** — chosen in brainstorming). A target should be explicitly one or
the other, and each surface (create/edit form, detail page, list, MCP, CSV import)
should show and require only the fields appropriate to that type.

### Success criteria
- A target has an explicit type: `INDIVIDUAL` or `COMPANY`.
- Forms, detail view, and list render only the fields relevant to the type.
- Required identity is enforced **server-side**: `COMPANY` requires a company name;
  `INDIVIDUAL` requires a last name.
- The list is unified, with a Type badge, an adaptive Name column, and a Type filter.
- Existing data (the 28 + demos, all companies) is backfilled to `COMPANY`, and the
  `last_name = company` duplication from the MCP load is cleaned up.

### Non-goals (YAGNI)
- No separate per-type tables (single-table discriminator).
- No wiring `type` into enrichment presets (they already split company/personal;
  noted as a future follow-up).
- No destructive wipe of now-hidden fields when a user toggles type on an existing
  record.

## Approach (selected)

**Fork-owned config module drives everything.** A single new fork-owned module defines
the type taxonomy (which fields belong to each type, required rules, title resolver).
Forms, detail view, list, and validation all read from it. Upstream-owned components get
**thin, insertion-only conditional hooks** that call the config. This keeps the type
logic in one fork-owned place and minimizes/centralizes upstream divergence (per the
fork's additive-first standard). Rejected alternatives: inline conditionals scattered
across 4-5 upstream files (duplication, merge pain); separate per-type components
(excessive new code for a handful of differing fields).

## Data Model & Migration

- New Prisma enum:
  ```prisma
  enum crm_Target_Type {
    INDIVIDUAL
    COMPANY
  }
  ```
- New column on `crm_Targets`:
  ```prisma
  type crm_Target_Type @default(COMPANY)
  @@index([type])
  ```
  Non-null with `@default(COMPANY)` so every existing row backfills to `COMPANY`
  (correct — the 28 and demo targets are all companies). The index backs the list
  Type filter.
- **One-time data cleanup in the same migration:** `UPDATE "crm_Targets" SET last_name = ''
  WHERE last_name = company;` — retires the duplicated `last_name` from the MCP load of
  the 28. (`last_name` is a non-null column; `''` = "no last name".)
- **Migration-first ordering** (additive): the migration PR lands and deploys to QA
  before/with the code that depends on the column. Vercel's build runs
  `prisma migrate deploy`, so the QA deploy applies it — no manual apply.

## The Config Module (`lib/crm/target-type.ts`, new, fork-owned)

Single source of truth, consumed everywhere:

- `export type TargetType = "INDIVIDUAL" | "COMPANY";`
- `resolveTargetTitle(target)` → company name for `COMPANY`, `\`${first} ${last}\`.trim()`
  for `INDIVIDUAL`.
- `requiredIdentityField(type)` → `"company"` for `COMPANY`, `"last_name"` for `INDIVIDUAL`.
- `fieldsForType(type)` → the ordered list of field keys to display for that type.
- `fieldLabel(type, key)` → per-type label disambiguation (e.g. `company` renders as
  "Company name" for a company vs "Employer" for an individual).

### Field taxonomy

| Group | Fields |
|---|---|
| **Shared (both)** | `city`, `country`, `description`, `social_linkedin`, `social_x`, `social_instagram`, `social_facebook`, `status`, triage fields, `tags`, `notes` |
| **Individual only** | `first_name`, `last_name` *(required)*, `position`, `company` *(employer)*, `email`, `personal_email`, `mobile_phone`, `office_phone`, `personal_website` |
| **Company only** | `company` *(name, required)*, `industry`, `employees`, `company_website`, `company_email`, `company_phone` |

Social networks are **shared** (a company has its own LinkedIn/X/Facebook/Instagram).
`company` appears in both groups with a type-specific label and meaning.

## Validation & MCP (server-side enforcement — no RLS)

- **MCP** `crm_create_target` / `crm_update_target` (`lib/mcp/tools/crm-targets.ts`,
  already fork-relaxed): add a `type` param (`INDIVIDUAL | COMPANY`, defaults `COMPANY`
  on create). Replace the current "last_name or company" guard with a **type-aware**
  guard sourced from `requiredIdentityField(type)`: `COMPANY` → `company` required,
  `INDIVIDUAL` → `last_name` required.
- **Web actions** `actions/crm/targets/create-target.ts` / `update-target.ts` and the
  form Zod schemas: add `type` + a `.refine` enforcing the same per-type identity rule.
  Server-side is authoritative; the form mirror is UX only.
- **CSV import** `actions/crm/targets/import-targets.ts` + `suggest-mapping.ts`: accept
  an optional `type` column; default `COMPANY` when absent (import lists are company
  prospecting sets). Additive — existing imports keep working.
- **Errors:** a type/identity mismatch returns the existing 422-style validation error
  shape; the form surfaces it inline on the required field.

## Forms (`NewTargetForm` / `UpdateTargetForm`, upstream-owned → thin hooks)

- A **Type selector** (segmented Individual / Company) at the top. New form defaults to
  **Company**; Update prefills from the record and allows switching.
- Fields render conditionally from `fieldsForType(type)`; per-type required markers and
  labels from the config. Shared fields always show.
- Switching type re-renders the field set; values for now-hidden fields are preserved on
  the record (no destructive wipe).

## Detail View (`BasicView`, upstream-owned → config-driven)

- **Adaptive title** via `resolveTargetTitle` + a **Type badge**.
- Sections render from `fieldsForType`: companies show Company/Industry/Employees/
  Location/Company website/Company email+phone/Socials/Description; individuals show
  Name/Position/Employer/Location/Personal website/Email/Phones/Socials/Description.
- Supersedes the on-hold `feat/target-detail-fields` branch (Description/Industry/
  Location surfacing folds into the config-driven layout here; that branch is dropped).

## List (`columns.tsx` + `data-table-toolbar`, upstream-owned)

- Add a **Type** badge column and an adaptive **Name** column (company name or person
  name via `resolveTargetTitle`); Industry/Website remain (blank for individuals).
- Add a **Type** faceted filter to the toolbar (same pattern as the Triage filter).
- The per-origin column-visibility persistence (shipped in the merged QA-targets PR)
  carries over; Type + Name are visible by default.

## Testing

- **Unit:** `lib/crm/target-type.ts` (`fieldsForType`, `requiredIdentityField`,
  `resolveTargetTitle`, `fieldLabel`); type-aware MCP create/update (company-only ok,
  individual-only ok, reject missing identity per type — extend
  `__tests__/mcp/crm-targets-triage.test.ts` or a new `crm-targets-type.test.ts`).
- **DB integration:** migration applies; existing rows → `COMPANY`; `last_name=company`
  cleanup runs.
- **E2E** `tests/e2e/target-type.spec.ts`: create one target of each type via the form,
  assert conditional fields, the list Type badge + filter, and the adaptive detail title.
  Add matching **manual-test** steps (bidirectional parity per `docs/testing/`).
- **Revert-verify** the identity-required regression (toggle the guard off, confirm the
  new test fails, restore).

## Docs (doc-sync targets)

- This spec; data-model doc; manual-test doc + `docs/testing/e2e-patterns.md`;
  `docs/reference/PROJECT_STRUCTURE.md` (new `lib/crm/target-type.ts`);
  `docs/reference/LESSONS_LEARNED.md` if a gotcha surfaces;
  `docs/reference/UPSTREAM_IMPACT_LOG.md` for every upstream-owned touch (schema, MCP
  tools, web actions, import + suggest-mapping, `NewTargetForm`, `UpdateTargetForm`,
  `BasicView`, `columns.tsx`, `data-table-toolbar`).

## Upstream Impact (files to be touched)

**Fork-owned (no merge risk):** `lib/crm/target-type.ts` (new), tests, docs.

**Upstream-owned (thin, insertion-only where possible; log each):**
`prisma/schema.prisma`, `lib/mcp/tools/crm-targets.ts`, `actions/crm/targets/create-target.ts`,
`actions/crm/targets/update-target.ts`, `actions/crm/targets/import-targets.ts`,
`actions/crm/targets/suggest-mapping.ts`, the two target form components,
`.../[targetId]/components/BasicView.tsx`, `.../table-components/columns.tsx`,
`.../table-components/data-table-toolbar.tsx`, and the table-data `schema.tsx`.

## Rollout

1. Migration + column + config + server enforcement land together (migration-first).
2. Forms / detail / list read the config.
3. Merge → CI on `main` → `advance-qa` → QA deploy applies the migration.
4. Post-deploy: reconnect the QA MCP so the session picks up the `type` param.
