# Soft-Delete Report

Updated: 2026-04-06 — All models migrated to `deletedAt` pattern.

## All Models — Using `deletedAt DateTime?` + `deletedBy String?`

| Model | MCP Delete Tool | Frontend Action |
|-------|-----------------|-----------------|
| crm_Accounts | crm_delete_account | aligned |
| crm_Contacts | crm_delete_contact | aligned |
| crm_Leads | crm_delete_lead | aligned |
| crm_Opportunities | crm_delete_opportunity | aligned |
| crm_Targets | crm_delete_target | aligned |
| crm_Products | crm_delete_product | aligned |
| crm_Contracts | crm_delete_contract | aligned |
| crm_Activities | crm_delete_activity | aligned |
| crm_campaigns | campaigns_delete | aligned |
| crm_campaign_templates | campaigns_delete_template | aligned |
| Boards | projects_delete_board | aligned |
| Documents | crm_delete_document | aligned |
| crm_TargetLists | crm_delete_target_list | aligned |

## Models Without Soft Delete (by design)

| Model | Reason |
|-------|--------|
| Tasks | Uses `taskStatus: COMPLETE` (completion semantic, not deletion) |
| Sections | Hard delete allowed when empty |
| crm_campaign_steps | Hard delete (cascade from campaign) |
| tasksComments | No delete exposed |
