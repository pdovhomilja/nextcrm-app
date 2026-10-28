// Every MCP tool that takes a record id must apply the same per-object check
// as the web UI for that action (Sentinel F1). This inventory lists each such
// tool with how its ids are checked; a new tool with an id argument fails here
// until someone has reviewed it and added a line. Behaviour is tested in
// __tests__/authz/mcp-object-scope.test.ts and the other *-scope tests.
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));

import { z } from "zod";
import { allTools } from "@/lib/mcp/tools";

const REVIEWED: Record<string, string> = {
  crm_get_account: "accountReadScopeWhere",
  crm_update_account: "assertCanWriteAccount; assigned_to: assertAssignableUser",
  crm_delete_account: "assertCanWriteAccount",
  crm_get_contact: "contactReadScopeWhere",
  crm_update_contact: "assertCanWriteContact; account: assertCanWriteAccount; assigned_to: assertAssignableUser",
  crm_delete_contact: "assertCanWriteContact",
  crm_get_lead: "leadReadScopeWhere",
  crm_create_lead: "lead option ids: assertLeadOptions (global lookup tables)",
  crm_update_lead: "assertCanWriteLead; assigned_to: assertAssignableUser; options: assertLeadOptions",
  crm_delete_lead: "assertCanWriteLead",
  crm_get_opportunity: "opportunityReadScopeWhere",
  crm_update_opportunity: "assertCanWriteOpportunity; account/contact: linkable asserts; assigned_to: assertAssignableUser",
  crm_delete_opportunity: "assertCanWriteOpportunity",
  crm_get_target: "created_by = caller",
  crm_update_target: "created_by = caller",
  crm_delete_target: "created_by = caller",
  crm_get_product: "products are a global catalog",
  crm_create_product: "assertCanManageProducts",
  crm_update_product: "assertCanManageProducts + assertProductWritable",
  crm_delete_product: "assertCanManageProducts + assertProductWritable",
  crm_get_price_list: "price lists are global; writes need assertCanWritePriceList",
  crm_get_price: "accountId: accountReadScopeWhere; price list / product ids are global",
  crm_update_price_list: "assertCanWritePriceList",
  crm_archive_price_list: "assertCanWritePriceList",
  crm_upsert_price_list_rule: "assertCanWritePriceList",
  crm_delete_price_list_rule: "assertCanWritePriceList",
  crm_list_orders: "orderReadScopeWhere (lib/orders/service)",
  crm_get_order: "orderReadScopeWhere (lib/orders/service)",
  crm_create_order: "assertCanWriteAccount + contact must sit on that account (lib/orders/service)",
  crm_update_order: "lib/orders/service (same as the UI)",
  crm_submit_order: "lib/orders/workflow (same as the UI)",
  crm_decide_order_approval: "lib/orders/workflow (same as the UI)",
  crm_set_order_status: "lib/orders/workflow (same as the UI)",
  crm_cancel_order: "lib/orders/workflow (same as the UI)",
  crm_list_contracts: "contractReadScopeWhere",
  crm_get_contract: "contractReadScopeWhere",
  crm_create_contract: "account: assertCanWriteAccount (as createContract)",
  crm_update_contract: "assertCanWriteContract (as updateContract); a newly given account is NOT checked yet, same as the UI: follow-up F1b",
  crm_delete_contract: "assertCanWriteContract (as deleteContract)",
  crm_list_activities: "entityId: assertCanReadActivityForEntity",
  crm_get_activity: "createdBy = caller",
  crm_create_activity: "links: assertCanWrite<Entity> (as createActivity)",
  crm_update_activity: "createdBy = caller",
  crm_delete_activity: "createdBy = caller",
  crm_list_documents: "documentReadScopeWhere",
  crm_get_document: "documentReadScopeWhere",
  crm_get_upload_url: "created_by_user = caller",
  crm_get_download_url: "documentReadScopeWhere",
  crm_link_document: "document + entity write asserts",
  crm_unlink_document: "document + entity write asserts",
  crm_delete_document: "created_by_user = caller",
  crm_get_target_list: "targetListReadScopeWhere",
  crm_update_target_list: "target list in caller's scope",
  crm_delete_target_list: "target list in caller's scope",
  crm_add_to_target_list: "list in scope; target_ids: filterAuthorizedTargetIds (as addTargetsToList)",
  crm_remove_from_target_list: "list in scope (as removeTargetFromList)",
  crm_enrich_contact: "assertCanWriteContact (as /api/crm/contacts/enrich)",
  crm_enrich_contact_bulk: "filterWritableContactIds, all or nothing (as enrich-bulk route)",
  crm_enrich_target: "assertCanWriteTarget (as /api/crm/targets/enrich)",
  crm_enrich_target_bulk: "filterAuthorizedTargetIds, all or nothing (as enrich-bulk route)",
  campaigns_get: "campaignReadScopeWhere",
  campaigns_create: "template_id: assertCanReadTemplate (as createCampaign)",
  campaigns_update: "campaign in scope; template_id: assertCanReadTemplate",
  campaigns_delete: "campaign in scope",
  campaigns_send: "campaign in scope",
  campaigns_pause: "campaign in scope",
  campaigns_resume: "campaign in scope",
  campaigns_get_template: "campaignTemplateReadScopeWhere",
  campaigns_update_template: "campaignTemplateReadScopeWhere",
  campaigns_delete_template: "campaignTemplateReadScopeWhere",
  campaigns_create_step: "campaign in scope; template_id: assertCanReadTemplate",
  campaigns_update_step: "parent campaign in scope; template_id: assertCanReadTemplate",
  campaigns_delete_step: "parent campaign in scope",
  campaigns_assign_target_list: "campaign in scope; assertCanReadTargetList (as createCampaign)",
  campaigns_remove_target_list: "campaign in scope",
  campaigns_get_stats: "campaign in scope",
  projects_get_board: "boardReadScopeWhere",
  projects_update_board: "assertCanWriteBoard",
  projects_delete_board: "assertCanWriteBoard",
  projects_create_section: "assertCanWriteBoard",
  projects_update_section: "assertCanWriteBoard",
  projects_delete_section: "assertCanWriteBoard",
  projects_list_tasks: "boardReadScopeWhere",
  projects_get_task: "assertCanReadTask",
  projects_create_task: "assertCanWriteBoard",
  projects_update_task: "assertCanWriteTask",
  projects_move_task: "assertCanWriteTask + assertCanWriteBoard",
  projects_delete_task: "assertCanWriteTask",
  projects_add_comment: "assertCanWriteTask",
  projects_list_comments: "assertCanReadTask",
  projects_assign_document: "assertCanWriteTask + assertCanReadDocument",
  projects_watch_board: "assertCanReadBoard",
};

// Paths of string arguments that carry a record id: uuid-typed, or named
// id / *_id / *Id (plural or array too).
const ID_NAME = /(^|\.)(id|\w+_id|\w+Id)s?(\[\])?$/;
function idArgs(schema: any, path = ""): string[] {
  if (!schema || typeof schema !== "object") return [];
  if (schema.type === "string" && (schema.format === "uuid" || ID_NAME.test(path))) return [path];
  if (schema.properties) {
    return Object.entries(schema.properties).flatMap(([k, v]) => idArgs(v, path ? `${path}.${k}` : k));
  }
  if (schema.items) return idArgs(schema.items, `${path}[]`);
  for (const key of ["anyOf", "oneOf", "allOf"]) {
    if (schema[key]) return schema[key].flatMap((s: unknown) => idArgs(s, path));
  }
  return [];
}

const toolsWithIds = (allTools as Array<{ name: string; schema: z.ZodType }>)
  .filter((t) => idArgs(z.toJSONSchema(t.schema, { unrepresentable: "any", io: "input" })).length > 0)
  .map((t) => t.name);

it("finds the tools it is meant to police", () => {
  expect(toolsWithIds).toContain("crm_update_contract");
  expect(toolsWithIds).toContain("crm_add_to_target_list");
});

it("every MCP tool that takes a record id has been reviewed for object-level checks", () => {
  expect(toolsWithIds.filter((name) => !Object.hasOwn(REVIEWED, name))).toEqual([]);
});

it("the inventory has no entries for tools that no longer take ids", () => {
  expect(Object.keys(REVIEWED).filter((name) => !toolsWithIds.includes(name))).toEqual([]);
});
