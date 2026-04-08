---
name: nextcrm
description: Connect to NextCRM MCP server to manage CRM data — accounts, contacts, leads, opportunities, targets, products, contracts, activities, documents, target lists, enrichment, email accounts, campaigns, projects, and reports.
---

# NextCRM MCP Server Skill

Use the NextCRM MCP server to read and write CRM data. This skill documents all available tools and how to use them.

## Connection Setup

Add this to your MCP client configuration:

```json
{
  "mcpServers": {
    "nextcrm": {
      "url": "https://YOUR_NEXTCRM_URL/api/mcp/sse",
      "headers": { "Authorization": "Bearer YOUR_API_TOKEN" }
    }
  }
}
```

- Replace `YOUR_NEXTCRM_URL` with your NextCRM instance URL
- Replace `YOUR_API_TOKEN` with a token generated from Profile > Developer > API Tokens
- Token prefix: `nxtc__`
- Both SSE (`/api/mcp/sse`) and HTTP (`/api/mcp/http`) transports are supported

## Authentication

All tools require a valid Bearer token. Tokens are generated from the Developer tab in your profile settings. Each token is SHA-256 hashed — the raw value is shown only once at creation.

## Available Tools

### Accounts (6 tools)

- **crm_list_accounts** — List CRM accounts assigned to the authenticated user
- **crm_get_account** — Get a single CRM account by ID
- **crm_search_accounts** — Search accounts by name or website (substring match)
- **crm_create_account** — Create a new CRM account
- **crm_update_account** — Update an existing CRM account by ID
- **crm_delete_account** — Soft-delete a CRM account by ID (sets deletedAt timestamp)

### Contacts (6 tools)

- **crm_list_contacts** — List CRM contacts assigned to the authenticated user
- **crm_get_contact** — Get a single CRM contact by ID
- **crm_search_contacts** — Search contacts by name, email, or phone (substring match)
- **crm_create_contact** — Create a new CRM contact
- **crm_update_contact** — Update an existing CRM contact by ID
- **crm_delete_contact** — Soft-delete a CRM contact by ID (sets deletedAt timestamp)

### Leads (6 tools)

- **crm_list_leads** — List CRM leads assigned to the authenticated user
- **crm_get_lead** — Get a single CRM lead by ID
- **crm_search_leads** — Search leads by name, company, or email (substring match)
- **crm_create_lead** — Create a new CRM lead
- **crm_update_lead** — Update an existing CRM lead by ID
- **crm_delete_lead** — Soft-delete a CRM lead by ID (sets deletedAt timestamp)

### Opportunities (6 tools)

- **crm_list_opportunities** — List CRM opportunities assigned to the authenticated user
- **crm_get_opportunity** — Get a single CRM opportunity by ID
- **crm_search_opportunities** — Search opportunities by name or description (substring match)
- **crm_create_opportunity** — Create a new CRM opportunity
- **crm_update_opportunity** — Update an existing CRM opportunity by ID
- **crm_delete_opportunity** — Soft-delete a CRM opportunity by ID

### Targets (6 tools)

- **crm_list_targets** — List CRM targets created by the authenticated user
- **crm_get_target** — Get a single CRM target by ID
- **crm_search_targets** — Search targets by name, email, or company (substring match)
- **crm_create_target** — Create a new CRM target
- **crm_update_target** — Update an existing CRM target by ID
- **crm_delete_target** — Soft-delete a CRM target by ID (sets deletedAt timestamp)

### Products (5 tools)

- **crm_list_products** — List CRM products (org-wide catalog)
- **crm_get_product** — Get a single CRM product by ID
- **crm_create_product** — Create a new CRM product
- **crm_update_product** — Update an existing CRM product by ID
- **crm_delete_product** — Soft-delete a CRM product (sets deletedAt timestamp)

### Contracts (5 tools)

- **crm_list_contracts** — List CRM contracts (org-wide)
- **crm_get_contract** — Get a single CRM contract by ID with line items
- **crm_create_contract** — Create a new CRM contract with optional line items
- **crm_update_contract** — Update an existing CRM contract by ID (does not modify line items)
- **crm_delete_contract** — Soft-delete a CRM contract (sets deletedAt timestamp)

### Activities (5 tools)

- **crm_list_activities** — List CRM activities created by the authenticated user, optionally filtered by linked entity
- **crm_get_activity** — Get a single CRM activity by ID with entity links
- **crm_create_activity** — Create a CRM activity (call/meeting/note/email) and link to entities
- **crm_update_activity** — Update an existing CRM activity by ID
- **crm_delete_activity** — Soft-delete a CRM activity by ID (sets deletedAt timestamp)

### Documents (8 tools)

- **crm_list_documents** — List documents, optionally filtered by linked entity type and ID
- **crm_get_document** — Get a single document by ID
- **crm_create_document** — Create a document record and get a presigned upload URL
- **crm_get_upload_url** — Get a presigned upload URL for an existing document
- **crm_get_download_url** — Get a presigned download URL for a document
- **crm_link_document** — Link a document to an entity (account, contact, lead, opportunity, or task)
- **crm_unlink_document** — Remove a document link from an entity
- **crm_delete_document** — Soft-delete a document (sets status to DELETED)

### Target Lists (7 tools)

- **crm_list_target_lists** — List target lists (org-wide)
- **crm_get_target_list** — Get a target list by ID with its members
- **crm_create_target_list** — Create a new target list
- **crm_update_target_list** — Update a target list by ID
- **crm_delete_target_list** — Soft-delete a target list (sets deletedAt timestamp)
- **crm_add_to_target_list** — Add one or more targets to a target list
- **crm_remove_from_target_list** — Remove one or more targets from a target list

### Enrichment (4 tools)

- **crm_enrich_contact** — Enrich a single contact using Firecrawl + AI (requires API keys configured)
- **crm_enrich_contact_bulk** — Enrich multiple contacts in bulk (max 100, dispatches async jobs)
- **crm_enrich_target** — Enrich a single target using Firecrawl + AI (requires API keys configured)
- **crm_enrich_target_bulk** — Enrich multiple targets in bulk (max 100, dispatches async jobs)

### Email Accounts (1 tool)

- **crm_list_email_accounts** — List the authenticated user's connected email accounts

### Campaigns (18 tools)

- **campaigns_list** — List campaigns (org-wide)
- **campaigns_get** — Get a campaign by ID with steps and stats summary
- **campaigns_create** — Create a new campaign
- **campaigns_update** — Update a campaign by ID
- **campaigns_delete** — Soft-delete a campaign (sets deletedAt timestamp)
- **campaigns_send** — Trigger sending a campaign (must be in draft or scheduled status)
- **campaigns_pause** — Pause an active/sending campaign
- **campaigns_resume** — Resume a paused campaign
- **campaigns_list_templates** — List campaign email templates (org-wide)
- **campaigns_get_template** — Get a campaign template by ID
- **campaigns_create_template** — Create a campaign email template
- **campaigns_update_template** — Update a campaign template by ID
- **campaigns_delete_template** — Soft-delete a campaign template (sets deletedAt timestamp)
- **campaigns_create_step** — Add a step to a campaign sequence
- **campaigns_update_step** — Update a campaign step by ID
- **campaigns_delete_step** — Delete a campaign step by ID
- **campaigns_assign_target_list** — Assign a target list to a campaign
- **campaigns_remove_target_list** — Remove a target list from a campaign
- **campaigns_get_stats** — Get send/open/click/unsubscribe stats for a campaign

### Projects (18 tools)

- **projects_list_boards** — List project boards the user owns or is shared with
- **projects_get_board** — Get a project board with its sections and tasks
- **projects_create_board** — Create a new project board
- **projects_update_board** — Update a project board by ID
- **projects_delete_board** — Soft-delete a project board (sets deletedAt timestamp)
- **projects_create_section** — Add a section (column) to a board
- **projects_update_section** — Update a section title or position
- **projects_delete_section** — Delete a section (must be empty)
- **projects_list_tasks** — List tasks, optionally filtered by board, section, user, or status
- **projects_get_task** — Get a task by ID with comments and documents
- **projects_create_task** — Create a task in a board section
- **projects_update_task** — Update a task by ID
- **projects_move_task** — Move a task to a different section and/or position
- **projects_delete_task** — Soft-delete a task
- **projects_add_comment** — Add a comment to a task
- **projects_list_comments** — List comments on a task
- **projects_assign_document** — Link a document to a task
- **projects_watch_board** — Watch or unwatch a project board

### Reports (2 tools)

- **reports_list** — List available report configurations
- **reports_run** — Run a report by category and get the data

## Common Workflows

### Research a company and create an account
1. `crm_search_accounts` — check if it already exists
2. `crm_create_account` — create the account with company details
3. `crm_create_contact` — add key contacts
4. `crm_create_activity` — log the research as a note

### Build a prospecting campaign
1. `crm_create_target_list` — create a target list
2. `crm_create_target` (repeated) — add prospects
3. `crm_add_to_target_list` — add targets to the list
4. `campaigns_create` — create the campaign
5. `campaigns_create_template` — create email template
6. `campaigns_create_step` — add sequence steps
7. `campaigns_assign_target_list` — connect target list to campaign
8. `campaigns_send` — launch the campaign

### Track a deal pipeline
1. `crm_list_opportunities` — review current pipeline
2. `crm_create_opportunity` — add new deal
3. `crm_create_activity` — log meetings and calls
4. `crm_link_document` — attach proposals
5. `crm_update_opportunity` — update stage/amount as deal progresses

### Enrich contacts with AI
1. `crm_list_targets` or `crm_search_targets` — find targets to enrich
2. `crm_enrich_target_bulk` — enrich up to 100 targets at once
3. `crm_get_target` — check enrichment results

### Project management
1. `projects_create_board` — create a project board
2. `projects_create_section` — add columns (To Do, In Progress, Done)
3. `projects_create_task` — add tasks
4. `projects_move_task` — move tasks between sections
5. `projects_add_comment` — discuss tasks

## Notes

- All list operations support pagination (cursor-based)
- Search operations use substring matching
- Delete operations are soft-deletes (set `deletedAt`, recoverable via admin audit log)
- Data is scoped to the authenticated user where applicable
- Enrichment tools require API keys (OpenAI + Firecrawl) configured at system or user level
