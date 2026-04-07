# MCP Server Full Parity Design

> Expand the MCP server to expose all CRM functionality so a bot can operate the app identically to a frontend user.

## Architecture

**Approach:** Hybrid — flat tool files per domain + shared helpers.

- `lib/mcp/helpers.ts` — shared pagination, soft-delete, search, and response utilities
- `lib/mcp/tools/*.ts` — one file per domain, each exporting a tool array
- `lib/mcp/tools/index.ts` — barrel that re-exports all tool arrays + a flat `allTools` array
- `app/api/mcp/[transport]/route.ts` — simplified to import `allTools` from barrel

No service-layer extraction. MCP handlers contain Prisma logic directly, using shared helpers to reduce repetition. Can evolve toward a service layer later.

## Tool Inventory (~95 tools)

### CRM Core

#### Accounts (6 tools)

| Tool | Description |
|------|-------------|
| `crm_list_accounts` | List with pagination |
| `crm_get_account` | Get by ID |
| `crm_search_accounts` | Search by name/website |
| `crm_create_account` | Create |
| `crm_update_account` | Update |
| `crm_delete_account` | Soft delete |

#### Contacts (6 tools)

| Tool | Description |
|------|-------------|
| `crm_list_contacts` | List with pagination |
| `crm_get_contact` | Get by ID |
| `crm_search_contacts` | Search by name/email/phone |
| `crm_create_contact` | Create |
| `crm_update_contact` | Update |
| `crm_delete_contact` | Soft delete |

#### Leads (6 tools)

| Tool | Description |
|------|-------------|
| `crm_list_leads` | List with pagination |
| `crm_get_lead` | Get by ID |
| `crm_search_leads` | Search |
| `crm_create_lead` | Create |
| `crm_update_lead` | Update |
| `crm_delete_lead` | Soft delete |

#### Opportunities (6 tools)

| Tool | Description |
|------|-------------|
| `crm_list_opportunities` | List with pagination |
| `crm_get_opportunity` | Get by ID |
| `crm_search_opportunities` | Search |
| `crm_create_opportunity` | Create |
| `crm_update_opportunity` | Update |
| `crm_delete_opportunity` | Soft delete |

#### Products (5 tools)

| Tool | Description |
|------|-------------|
| `crm_list_products` | List products |
| `crm_get_product` | Get by ID |
| `crm_create_product` | Create |
| `crm_update_product` | Update |
| `crm_delete_product` | Soft delete (ARCHIVED) |

#### Contracts (5 tools)

| Tool | Description |
|------|-------------|
| `crm_list_contracts` | List contracts |
| `crm_get_contract` | Get with line items |
| `crm_create_contract` | Create with line items |
| `crm_update_contract` | Update |
| `crm_delete_contract` | Soft delete |

### Activities (5 tools)

| Tool | Description |
|------|-------------|
| `crm_list_activities` | List by entity or all, with filters |
| `crm_get_activity` | Get by ID with links |
| `crm_create_activity` | Create + link to entities |
| `crm_update_activity` | Update |
| `crm_delete_activity` | Soft delete |

### Documents (8 tools)

| Tool | Description |
|------|-------------|
| `crm_list_documents` | List, optionally by linked entity |
| `crm_get_document` | Get by ID |
| `crm_create_document` | Create record + get presigned upload URL |
| `crm_get_upload_url` | Get presigned upload URL for existing doc |
| `crm_get_download_url` | Get presigned download URL |
| `crm_link_document` | Link doc to entity (account/contact/lead/opp/task) |
| `crm_unlink_document` | Remove link |
| `crm_delete_document` | Soft delete |

### Targets & Target Lists (13 tools)

| Tool | Description |
|------|-------------|
| `crm_list_targets` | List with pagination |
| `crm_get_target` | Get by ID |
| `crm_search_targets` | Search |
| `crm_create_target` | Create |
| `crm_update_target` | Update |
| `crm_delete_target` | Soft delete |
| `crm_list_target_lists` | List target lists |
| `crm_get_target_list` | Get with members |
| `crm_create_target_list` | Create |
| `crm_update_target_list` | Update |
| `crm_delete_target_list` | Soft delete |
| `crm_add_to_target_list` | Add targets to list |
| `crm_remove_from_target_list` | Remove targets from list |

### Enrichment (4 tools)

| Tool | Description |
|------|-------------|
| `crm_enrich_contact` | Single contact enrichment via Firecrawl |
| `crm_enrich_contact_bulk` | Bulk contact enrichment |
| `crm_enrich_target` | Single target enrichment |
| `crm_enrich_target_bulk` | Bulk target enrichment |

### Campaigns (19 tools)

| Tool | Description |
|------|-------------|
| `campaigns_list` | List campaigns |
| `campaigns_get` | Get with steps/stats |
| `campaigns_create` | Create campaign |
| `campaigns_update` | Update |
| `campaigns_delete` | Soft delete |
| `campaigns_send` | Trigger send |
| `campaigns_pause` | Pause active campaign |
| `campaigns_resume` | Resume paused campaign |
| `campaigns_list_templates` | List email templates |
| `campaigns_get_template` | Get template |
| `campaigns_create_template` | Create template (HTML + JSON) |
| `campaigns_update_template` | Update template |
| `campaigns_delete_template` | Soft delete |
| `campaigns_create_step` | Add step to campaign |
| `campaigns_update_step` | Update step |
| `campaigns_delete_step` | Remove step |
| `campaigns_assign_target_list` | Assign target list to campaign |
| `campaigns_remove_target_list` | Remove target list |
| `campaigns_get_stats` | Get send/open/click stats |

### Projects (18 tools)

| Tool | Description |
|------|-------------|
| `projects_list_boards` | List boards |
| `projects_get_board` | Get board with sections + tasks |
| `projects_create_board` | Create board |
| `projects_update_board` | Update board |
| `projects_delete_board` | Soft delete |
| `projects_create_section` | Add section to board |
| `projects_update_section` | Update section title/order |
| `projects_delete_section` | Delete section |
| `projects_list_tasks` | List tasks (filterable) |
| `projects_get_task` | Get task with comments/docs |
| `projects_create_task` | Create task in section |
| `projects_update_task` | Update task |
| `projects_move_task` | Move task between sections |
| `projects_delete_task` | Soft delete |
| `projects_add_comment` | Add comment to task |
| `projects_list_comments` | List task comments |
| `projects_assign_document` | Link document to task |
| `projects_watch_board` | Watch/unwatch board |

### Reports (2 tools)

| Tool | Description |
|------|-------------|
| `reports_list` | List available report configs |
| `reports_run` | Trigger report + get presigned URL to result |

### Email Accounts (1 tool)

| Tool | Description |
|------|-------------|
| `crm_list_email_accounts` | List connected email accounts |

## Naming Convention

All tools use `{domain}_{action}_{entity}` format:

- `crm_` prefix: Accounts, Contacts, Leads, Opportunities, Products, Contracts, Activities, Documents, Targets, Target Lists, Enrichment, Email Accounts
- `campaigns_` prefix: Campaigns, Templates, Steps, Stats
- `projects_` prefix: Boards, Sections, Tasks, Comments, Watchers
- `reports_` prefix: Reports

Breaking rename of existing 25 tools (drop unprefixed names).

## Shared Helpers (`lib/mcp/helpers.ts`)

```typescript
// Pagination
paginationSchema    // z.object({ limit, offset }) with defaults
paginationArgs(args)  // { take, skip }

// Soft delete
softDeleteUpdate(userId)  // { status: "DELETED", updatedBy, updatedAt }
isNotDeleted()            // { status: { not: "DELETED" } }

// Search
ilike(field, value)  // { [field]: { contains, mode: "insensitive" } }

// Response
listResponse(data, total, offset)  // { data, total, offset }
itemResponse(data)                 // { data }

// Errors
notFound(entity)  // throws Error("NOT_FOUND")
conflict(msg)     // throws Error("CONFLICT")
validationError(msg)  // throws Error("VALIDATION_ERROR")
externalError(msg)    // throws Error("EXTERNAL_ERROR")
```

## Authorization & Data Scoping

| Domain | Read Scope | Write Tracking |
|--------|-----------|----------------|
| Accounts, Contacts, Leads, Opportunities, Targets | `assigned_to: userId` | `createdBy` / `updatedBy` |
| Products, Contracts, Campaigns, Target Lists | Org-wide (no user filter) | `createdBy` / `updatedBy` |
| Activities | `createdBy: userId` OR linked to user's entities | `createdBy` |
| Documents | `createdBy: userId` + `visibility` field | `createdBy` |
| Projects/Boards | Board member or creator | `createdBy` |
| Tasks | Within user's boards | `createdBy` |
| Reports | Org-wide (read-only) | N/A |
| Email Accounts | `userId` only | N/A |

## Error Handling

### Error Codes

| Error | When | MCP Code |
|-------|------|----------|
| `NOT_FOUND` | Entity doesn't exist or not accessible | NOT_FOUND |
| `Unauthorized` | Auth failure | UNAUTHORIZED |
| `VALIDATION_ERROR` | Invalid args beyond Zod (e.g., invalid entity type for linking) | INVALID_PARAMS |
| `CONFLICT` | e.g., campaign already sending, can't delete board with tasks | INVALID_REQUEST |
| `EXTERNAL_ERROR` | Enrichment API failure, S3 failure | INTERNAL_ERROR |

### Response Formats

```typescript
// Single item
{ data: { id: "...", name: "...", ... } }

// List
{ data: [...], total: 142, offset: 0 }

// Mutation success
{ data: { id: "...", ...updatedFields } }

// Soft delete
{ data: { id: "...", status: "DELETED" } }

// Presigned URL (documents)
{ data: { id: "...", url: "https://...", expiresIn: 3600 } }

// Campaign stats
{ data: { sent: 100, opened: 45, clicked: 12, unsubscribed: 2 } }

// Report trigger
{ data: { reportId: "...", url: "https://...", format: "csv" } }

// Bulk enrichment (partial results)
{ data: { succeeded: [...], failed: [{ id, error }] } }
```

## Soft Delete Strategy

### Models with existing `status` field (ready):

- `crm_Accounts` — add `DELETED` to enum
- `crm_Opportunities` — add `DELETED` to enum (ACTIVE/INACTIVE/PENDING/CLOSED)
- `crm_Products` — use ARCHIVED or add DELETED (DRAFT/ACTIVE/ARCHIVED)
- `crm_campaigns` — already has `deleted` status
- `Tasks` — add DELETED (ACTIVE/COMPLETED)
- `Documents` — add DELETED to status

### Models without `status` field (gap):

- `crm_Contacts`
- `crm_Leads`
- `crm_Targets`
- `crm_Contracts`
- `crm_Activities`
- `crm_TargetLists`
- `crm_campaign_templates`
- `crm_campaign_steps`
- `Boards` / `Sections`
- `tasksComments`

### Implementation approach:

1. For models with existing status — add `DELETED` value and use it
2. For models without status — delete handler throws `CONFLICT` with message: "Soft delete not yet supported for this entity. See docs/soft-delete-gaps.md"
3. Generate `docs/soft-delete-gaps.md` during implementation with full audit
4. App refactored separately to add status fields, then MCP delete handlers are enabled

## File Organization

```
lib/mcp/
  auth.ts                  (existing, no changes)
  helpers.ts               (new)
  tools/
    crm-accounts.ts        (rename from accounts.ts)
    crm-contacts.ts        (rename from contacts.ts)
    crm-leads.ts           (rename from leads.ts)
    crm-opportunities.ts   (rename from opportunities.ts)
    crm-targets.ts         (rename from targets.ts)
    crm-products.ts        (new)
    crm-contracts.ts       (new)
    crm-activities.ts      (new)
    crm-documents.ts       (new)
    crm-target-lists.ts    (new)
    crm-enrichment.ts      (new)
    crm-email-accounts.ts  (new)
    campaigns.ts           (new)
    projects.ts            (new)
    reports.ts             (new)
    index.ts               (new — barrel export)
```

### Route handler change:

```typescript
// Before: 5 individual imports
import { accountTools } from '@/lib/mcp/tools/accounts';
import { contactTools } from '@/lib/mcp/tools/contacts';
// ...

// After: single import
import { allTools } from '@/lib/mcp/tools';
```

Registration loop unchanged — iterates `allTools` and calls `server.tool()` for each.
