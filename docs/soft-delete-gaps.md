# Soft-Delete Gaps Report

Generated: 2026-04-06 (updated after universal deletedAt migration)

## Completed — Using `deletedAt` Pattern

All major CRM models now use `deletedAt DateTime?` + `deletedBy String?`:

| Model | Pattern | MCP Delete Tool |
|-------|---------|-----------------|
| `crm_Accounts` | `deletedAt` (migrated from status) | `crm_delete_account` |
| `crm_Contacts` | `deletedAt` | `crm_delete_contact` |
| `crm_Leads` | `deletedAt` | `crm_delete_lead` |
| `crm_Targets` | `deletedAt` | `crm_delete_target` |
| `crm_Activities` | `deletedAt` | `crm_delete_activity` |
| `crm_Products` | `deletedAt` (pre-existing) | `crm_delete_product` |
| `crm_Contracts` | `deletedAt` (pre-existing) | `crm_delete_contract` |
| `crm_campaigns` | `deletedAt` (migrated from status) | `campaigns_delete` |
| `crm_campaign_templates` | `deletedAt` | `campaigns_delete_template` |
| `Boards` | `deletedAt` | `projects_delete_board` |

## Remaining — Different Patterns

| Model | Current Pattern | MCP Behavior |
|-------|----------------|-------------|
| `crm_Opportunities` | Enum status (no DELETED value) | `crm_delete_opportunity` throws CONFLICT |
| `Tasks` | `taskStatus: COMPLETE` | `projects_delete_task` sets COMPLETE (semantic: completed, not deleted) |
| `Documents` | `status: "DELETED"` (String) | `crm_delete_document` sets status |
| `crm_TargetLists` | `status: Boolean` (false = deleted) | `crm_delete_target_list` sets false |

These use legacy patterns that still work but could be migrated to `deletedAt` in a future cleanup.
