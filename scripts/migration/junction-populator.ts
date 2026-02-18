/**
 * Junction Table Population Logic
 * Extracts array-based relationships from MongoDB and populates PostgreSQL junction tables
 */

import { JunctionTableRecord } from './types';
import { UuidMapper } from './uuid-mapper';

/**
 * Helper function to convert MongoDB ObjectId to string
 */
function toObjectIdString(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value.toString) return value.toString();
  return String(value);
}

/**
 * Extract document relationships from MongoDB Documents records
 */
export function extractDocumentRelationships(mongoDocument: any, uuidMapper: UuidMapper): {
  invoices: JunctionTableRecord[];
  opportunities: JunctionTableRecord[];
  contacts: JunctionTableRecord[];
  tasks: JunctionTableRecord[];
  crmAccountsTasks: JunctionTableRecord[];
  leads: JunctionTableRecord[];
  accounts: JunctionTableRecord[];
} {
  const documentUuid = uuidMapper.getUuidForMongoId(toObjectIdString(mongoDocument._id));
  if (!documentUuid) {
    console.warn(`No UUID found for document: ${mongoDocument._id}`);
    return {
      invoices: [],
      opportunities: [],
      contacts: [],
      tasks: [],
      crmAccountsTasks: [],
      leads: [],
      accounts: [],
    };
  }

  // Extract related entity IDs from MongoDB arrays/references
  // Note: These fields might be stored differently in MongoDB depending on implementation
  // Adjust based on actual MongoDB schema structure

  const result = {
    invoices: [] as JunctionTableRecord[],
    opportunities: [] as JunctionTableRecord[],
    contacts: [] as JunctionTableRecord[],
    tasks: [] as JunctionTableRecord[],
    crmAccountsTasks: [] as JunctionTableRecord[],
    leads: [] as JunctionTableRecord[],
    accounts: [] as JunctionTableRecord[],
  };

  // DocumentsToInvoices
  if (mongoDocument.invoices && Array.isArray(mongoDocument.invoices)) {
    mongoDocument.invoices.forEach((invoiceId: any) => {
      const invoiceUuid = uuidMapper.getUuidForMongoId(toObjectIdString(invoiceId));
      if (invoiceUuid) {
        result.invoices.push({
          field1Name: 'document_id',
          field1Value: documentUuid,
          field2Name: 'invoice_id',
          field2Value: invoiceUuid,
        });
      }
    });
  }

  // DocumentsToOpportunities
  if (mongoDocument.opportunities && Array.isArray(mongoDocument.opportunities)) {
    mongoDocument.opportunities.forEach((opportunityId: any) => {
      const opportunityUuid = uuidMapper.getUuidForMongoId(toObjectIdString(opportunityId));
      if (opportunityUuid) {
        result.opportunities.push({
          field1Name: 'document_id',
          field1Value: documentUuid,
          field2Name: 'opportunity_id',
          field2Value: opportunityUuid,
        });
      }
    });
  }

  // DocumentsToContacts
  if (mongoDocument.contacts && Array.isArray(mongoDocument.contacts)) {
    mongoDocument.contacts.forEach((contactId: any) => {
      const contactUuid = uuidMapper.getUuidForMongoId(toObjectIdString(contactId));
      if (contactUuid) {
        result.contacts.push({
          field1Name: 'document_id',
          field1Value: documentUuid,
          field2Name: 'contact_id',
          field2Value: contactUuid,
        });
      }
    });
  }

  // DocumentsToTasks
  if (mongoDocument.tasks && Array.isArray(mongoDocument.tasks)) {
    mongoDocument.tasks.forEach((taskId: any) => {
      const taskUuid = uuidMapper.getUuidForMongoId(toObjectIdString(taskId));
      if (taskUuid) {
        result.tasks.push({
          field1Name: 'document_id',
          field1Value: documentUuid,
          field2Name: 'task_id',
          field2Value: taskUuid,
        });
      }
    });
  }

  // DocumentsToCrmAccountsTasks
  if (mongoDocument.crm_accounts_tasks && Array.isArray(mongoDocument.crm_accounts_tasks)) {
    mongoDocument.crm_accounts_tasks.forEach((taskId: any) => {
      const taskUuid = uuidMapper.getUuidForMongoId(toObjectIdString(taskId));
      if (taskUuid) {
        result.crmAccountsTasks.push({
          field1Name: 'document_id',
          field1Value: documentUuid,
          field2Name: 'crm_accounts_task_id',
          field2Value: taskUuid,
        });
      }
    });
  }

  // DocumentsToLeads
  if (mongoDocument.leads && Array.isArray(mongoDocument.leads)) {
    mongoDocument.leads.forEach((leadId: any) => {
      const leadUuid = uuidMapper.getUuidForMongoId(toObjectIdString(leadId));
      if (leadUuid) {
        result.leads.push({
          field1Name: 'document_id',
          field1Value: documentUuid,
          field2Name: 'lead_id',
          field2Value: leadUuid,
        });
      }
    });
  }

  // DocumentsToAccounts
  if (mongoDocument.accounts && Array.isArray(mongoDocument.accounts)) {
    mongoDocument.accounts.forEach((accountId: any) => {
      const accountUuid = uuidMapper.getUuidForMongoId(toObjectIdString(accountId));
      if (accountUuid) {
        result.accounts.push({
          field1Name: 'document_id',
          field1Value: documentUuid,
          field2Name: 'account_id',
          field2Value: accountUuid,
        });
      }
    });
  }

  return result;
}

/**
 * Extract AccountWatchers relationships from MongoDB crm_Accounts records
 */
export function extractAccountWatchers(mongoAccount: any, uuidMapper: UuidMapper): JunctionTableRecord[] {
  const accountUuid = uuidMapper.getUuidForMongoId(toObjectIdString(mongoAccount._id));
  if (!accountUuid) {
    console.warn(`No UUID found for account: ${mongoAccount._id}`);
    return [];
  }

  const watchers: JunctionTableRecord[] = [];

  if (mongoAccount.watchers && Array.isArray(mongoAccount.watchers)) {
    mongoAccount.watchers.forEach((userId: any) => {
      const userUuid = uuidMapper.getUuidForMongoId(toObjectIdString(userId));
      if (userUuid) {
        watchers.push({
          field1Name: 'account_id',
          field1Value: accountUuid,
          field2Name: 'user_id',
          field2Value: userUuid,
        });
      }
    });
  }

  return watchers;
}

/**
 * Extract BoardWatchers relationships from MongoDB Boards records
 */
export function extractBoardWatchers(mongoBoard: any, uuidMapper: UuidMapper): JunctionTableRecord[] {
  const boardUuid = uuidMapper.getUuidForMongoId(toObjectIdString(mongoBoard._id));
  if (!boardUuid) {
    console.warn(`No UUID found for board: ${mongoBoard._id}`);
    return [];
  }

  const watchers: JunctionTableRecord[] = [];

  if (mongoBoard.watchers && Array.isArray(mongoBoard.watchers)) {
    mongoBoard.watchers.forEach((userId: any) => {
      const userUuid = uuidMapper.getUuidForMongoId(toObjectIdString(userId));
      if (userUuid) {
        watchers.push({
          field1Name: 'board_id',
          field1Value: boardUuid,
          field2Name: 'user_id',
          field2Value: userUuid,
        });
      }
    });
  }

  return watchers;
}

/**
 * Extract ContactsToOpportunities relationships from MongoDB crm_Opportunities records
 */
export function extractContactsToOpportunities(mongoOpportunity: any, uuidMapper: UuidMapper): JunctionTableRecord[] {
  const opportunityUuid = uuidMapper.getUuidForMongoId(toObjectIdString(mongoOpportunity._id));
  if (!opportunityUuid) {
    console.warn(`No UUID found for opportunity: ${mongoOpportunity._id}`);
    return [];
  }

  const contacts: JunctionTableRecord[] = [];

  if (mongoOpportunity.contacts && Array.isArray(mongoOpportunity.contacts)) {
    mongoOpportunity.contacts.forEach((contactId: any) => {
      const contactUuid = uuidMapper.getUuidForMongoId(toObjectIdString(contactId));
      if (contactUuid) {
        contacts.push({
          field1Name: 'contact_id',
          field1Value: contactUuid,
          field2Name: 'opportunity_id',
          field2Value: opportunityUuid,
        });
      }
    });
  }

  return contacts;
}

/**
 * Generic function to convert junction records to Prisma format
 */
export function junctionRecordToPrisma(record: JunctionTableRecord): Record<string, string> {
  return {
    [record.field1Name]: record.field1Value,
    [record.field2Name]: record.field2Value,
  };
}

/**
 * Batch junction records by a fixed size
 */
export function batchJunctionRecords(records: JunctionTableRecord[], batchSize: number): JunctionTableRecord[][] {
  const batches: JunctionTableRecord[][] = [];
  for (let i = 0; i < records.length; i += batchSize) {
    batches.push(records.slice(i, i + batchSize));
  }
  return batches;
}
