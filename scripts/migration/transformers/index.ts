/**
 * Model Transformers Index
 *
 * This file exports all model-specific transformation functions.
 * Each transformer converts a MongoDB document to a PostgreSQL-compatible record.
 */

export { transformUsers } from './users-transformer';
export { transformCrmAccounts } from './crm-accounts-transformer';
export { transformCrmContacts } from './crm-contacts-transformer';
export { transformCrmLeads } from './crm-leads-transformer';
export { transformCrmOpportunities } from './crm-opportunities-transformer';
export { transformCrmContracts } from './crm-contracts-transformer';
export { transformCrmCampaigns } from './crm-campaigns-transformer';
export { transformCrmOpportunitiesSalesStages } from './crm-opportunities-sales-stages-transformer';
export { transformCrmOpportunitiesType } from './crm-opportunities-type-transformer';
export { transformCrmIndustryType } from './crm-industry-type-transformer';
export { transformTasks } from './tasks-transformer';
export { transformCrmAccountsTasks } from './crm-accounts-tasks-transformer';
export { transformTasksComments } from './tasks-comments-transformer';
export { transformSections } from './sections-transformer';
export { transformBoards } from './boards-transformer';
export { transformDocuments } from './documents-transformer';
export { transformDocumentsTypes } from './documents-types-transformer';
export { transformInvoices } from './invoices-transformer';
export { transformInvoiceStates } from './invoice-states-transformer';
export { transformSystemModulesEnabled } from './system-modules-enabled-transformer';
export { transformModulStatus } from './modul-status-transformer';
export { transformSystemServices } from './system-services-transformer';
export { transformMyAccount } from './my-account-transformer';
export { transformEmployees } from './employees-transformer';
export { transformImageUpload } from './image-upload-transformer';
export { transformTodoList } from './todo-list-transformer';
export { transformGptModels } from './gpt-models-transformer';
export { transformSecondBrainNotions } from './second-brain-notions-transformer';
export { transformOpenAiKeys } from './openai-keys-transformer';

// Import all transformers to use in the registry
import { transformUsers } from './users-transformer';
import { transformCrmAccounts } from './crm-accounts-transformer';
import { transformCrmContacts } from './crm-contacts-transformer';
import { transformCrmLeads } from './crm-leads-transformer';
import { transformCrmOpportunities } from './crm-opportunities-transformer';
import { transformCrmContracts } from './crm-contracts-transformer';
import { transformCrmCampaigns } from './crm-campaigns-transformer';
import { transformCrmOpportunitiesSalesStages } from './crm-opportunities-sales-stages-transformer';
import { transformCrmOpportunitiesType } from './crm-opportunities-type-transformer';
import { transformCrmIndustryType } from './crm-industry-type-transformer';
import { transformTasks } from './tasks-transformer';
import { transformCrmAccountsTasks } from './crm-accounts-tasks-transformer';
import { transformTasksComments } from './tasks-comments-transformer';
import { transformSections } from './sections-transformer';
import { transformBoards } from './boards-transformer';
import { transformDocuments } from './documents-transformer';
import { transformDocumentsTypes } from './documents-types-transformer';
import { transformInvoices } from './invoices-transformer';
import { transformInvoiceStates } from './invoice-states-transformer';
import { transformSystemModulesEnabled } from './system-modules-enabled-transformer';
import { transformModulStatus } from './modul-status-transformer';
import { transformSystemServices } from './system-services-transformer';
import { transformMyAccount } from './my-account-transformer';
import { transformEmployees } from './employees-transformer';
import { transformImageUpload } from './image-upload-transformer';
import { transformTodoList } from './todo-list-transformer';
import { transformGptModels } from './gpt-models-transformer';
import { transformSecondBrainNotions } from './second-brain-notions-transformer';
import { transformOpenAiKeys } from './openai-keys-transformer';

/**
 * Type definition for transformer function
 */
export type TransformerFunction<TInput = any, TOutput = any> = (
  mongoRecord: TInput,
  uuidMapper: {
    generateAndMapUuid: (mongoId: string) => string;
    getUuidForMongoId: (mongoId: string) => string | undefined;
    transformForeignKey: (mongoId: string | null | undefined) => string | null;
    transformForeignKeyArray: (mongoIds: string[] | null | undefined) => string[];
  }
) => TOutput;

/**
 * Transformer registry mapping table names to their transformation functions
 */
export const TRANSFORMERS: Record<string, TransformerFunction> = {
  Users: transformUsers,
  crm_Accounts: transformCrmAccounts,
  crm_Contacts: transformCrmContacts,
  crm_Leads: transformCrmLeads,
  crm_Opportunities: transformCrmOpportunities,
  crm_Contracts: transformCrmContracts,
  crm_campaigns: transformCrmCampaigns,
  crm_Opportunities_Sales_Stages: transformCrmOpportunitiesSalesStages,
  crm_Opportunities_Type: transformCrmOpportunitiesType,
  crm_Industry_Type: transformCrmIndustryType,
  Tasks: transformTasks,
  crm_Accounts_Tasks: transformCrmAccountsTasks,
  tasksComments: transformTasksComments,
  Sections: transformSections,
  Boards: transformBoards,
  Documents: transformDocuments,
  Documents_Types: transformDocumentsTypes,
  Invoices: transformInvoices,
  invoice_States: transformInvoiceStates,
  system_Modules_Enabled: transformSystemModulesEnabled,
  modulStatus: transformModulStatus,
  systemServices: transformSystemServices,
  MyAccount: transformMyAccount,
  Employees: transformEmployees,
  ImageUpload: transformImageUpload,
  TodoList: transformTodoList,
  gpt_models: transformGptModels,
  secondBrain_notions: transformSecondBrainNotions,
  openAi_keys: transformOpenAiKeys,
};

/**
 * Get transformer function for a given table
 */
export function getTransformer(tableName: string): TransformerFunction {
  const transformer = TRANSFORMERS[tableName];
  if (!transformer) {
    throw new Error(`No transformer found for table: ${tableName}`);
  }
  return transformer;
}
