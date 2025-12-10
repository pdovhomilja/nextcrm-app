/**
 * CRM Leads model transformer
 * Transforms MongoDB crm_Leads documents to PostgreSQL format
 */

import { convertDateToISO, nullableString } from '../utils';

export function transformCrmLeads(mongoRecord: any, uuidMapper: any): any {
  const newUuid = uuidMapper.generateAndMapUuid(mongoRecord._id);

  return {
    id: newUuid,
    v: mongoRecord.__v || 0,
    createdAt: convertDateToISO(mongoRecord.createdAt),
    createdBy: uuidMapper.transformForeignKey(mongoRecord.createdBy),
    updatedAt: convertDateToISO(mongoRecord.updatedAt),
    updatedBy: uuidMapper.transformForeignKey(mongoRecord.updatedBy),
    firstName: nullableString(mongoRecord.firstName),
    lastName: mongoRecord.lastName, // Required field
    company: nullableString(mongoRecord.company),
    jobTitle: nullableString(mongoRecord.jobTitle),
    email: nullableString(mongoRecord.email),
    phone: nullableString(mongoRecord.phone),
    description: nullableString(mongoRecord.description),
    lead_source: nullableString(mongoRecord.lead_source),
    refered_by: nullableString(mongoRecord.refered_by),
    campaign: nullableString(mongoRecord.campaign),
    status: nullableString(mongoRecord.status) || 'NEW',
    type: nullableString(mongoRecord.type) || 'DEMO',
    assigned_to: uuidMapper.transformForeignKey(mongoRecord.assigned_to),
    accountsIDs: uuidMapper.transformForeignKey(mongoRecord.accountsIDs),
  };
}
