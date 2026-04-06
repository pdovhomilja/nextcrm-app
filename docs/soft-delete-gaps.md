# Soft-Delete Gaps Report

Generated: 2026-04-06

This documents which Prisma models can support soft delete today and which need schema migrations.

## Ready (have status/deletedAt field)

| Model | Field | Current Values | Soft Delete Value |
|-------|-------|----------------|-------------------|
| `crm_Accounts` | `status` (String) | "Active", etc. | "DELETED" |
| `crm_Opportunities` | `status` (enum) | ACTIVE, INACTIVE, PENDING, CLOSED | Add DELETED to enum |
| `crm_Products` | `status` (enum) + `deletedAt` | DRAFT, ACTIVE, ARCHIVED | ARCHIVED + deletedAt |
| `crm_Contracts` | `status` (enum) + `deletedAt` | NOTSTARTED, INPROGRESS, SIGNED | deletedAt timestamp |
| `crm_campaigns` | `status` (String) | draft, scheduled, sending, sent, paused, deleted | "deleted" (already exists) |
| `Documents` | `status` (String) | various | "DELETED" |
| `Tasks` | `taskStatus` (enum) | ACTIVE, PENDING, COMPLETE | Using COMPLETE as soft delete |
| `crm_TargetLists` | `status` (Boolean) | true/false | false = deleted |

## Gaps (need schema migration)

| Model | Recommended Change | MCP Behavior Today |
|-------|-------------------|--------------------|
| `crm_Contacts` | Add `status` String field with default "Active" | `crm_delete_contact` throws CONFLICT |
| `crm_Leads` | Add `status` String field with default "Active" | `crm_delete_lead` throws CONFLICT |
| `crm_Targets` | Add `status` String field with default "Active" | `crm_delete_target` throws CONFLICT |
| `crm_Activities` | Add `deletedAt` DateTime field | `crm_delete_activity` throws CONFLICT |
| `crm_campaign_templates` | Add `deletedAt` DateTime field | `campaigns_delete_template` throws CONFLICT |
| `Boards` | Add `deletedAt` DateTime field | `projects_delete_board` throws CONFLICT |
| `Sections` | No soft delete needed (hard delete if empty) | Hard delete (checks for tasks first) |
| `tasksComments` | No soft delete needed | Not exposed for deletion |
| `crm_campaign_steps` | No soft delete needed (hard delete, cascade) | Hard delete |

## Migration Priority

1. **crm_Contacts** — most commonly used entity
2. **crm_Leads** — part of core sales flow
3. **crm_Targets** — needed for campaign management
4. **crm_Activities** — activity logs should never be hard deleted
5. **crm_campaign_templates** — useful but lower priority
6. **Boards** — project management
