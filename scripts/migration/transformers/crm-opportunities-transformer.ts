/**
 * CRM Opportunities model transformer
 * Transforms MongoDB crm_Opportunities documents to PostgreSQL format
 */

import { convertDateToISO, nullableString, nullableNumber, validateEnum } from '../utils';

const VALID_OPPORTUNITY_STATUS = ['ACTIVE', 'INACTIVE', 'PENDING', 'CLOSED'] as const;

export function transformCrmOpportunities(mongoRecord: any, uuidMapper: any): any {
  const newUuid = uuidMapper.generateAndMapUuid(mongoRecord._id);

  return {
    id: newUuid,
    v: mongoRecord.__v || 0,
    account: uuidMapper.transformForeignKey(mongoRecord.account),
    assigned_to: uuidMapper.transformForeignKey(mongoRecord.assigned_to),
    budget: nullableNumber(mongoRecord.budget) || 0,
    campaign: uuidMapper.transformForeignKey(mongoRecord.campaign),
    close_date: convertDateToISO(mongoRecord.close_date),
    contact: uuidMapper.transformForeignKey(mongoRecord.contact),
    created_by: uuidMapper.transformForeignKey(mongoRecord.created_by),
    createdBy: uuidMapper.transformForeignKey(mongoRecord.createdBy),
    created_on: convertDateToISO(mongoRecord.created_on),
    createdAt: convertDateToISO(mongoRecord.createdAt) || new Date().toISOString(),
    last_activity: convertDateToISO(mongoRecord.last_activity),
    updatedAt: convertDateToISO(mongoRecord.updatedAt),
    updatedBy: uuidMapper.transformForeignKey(mongoRecord.updatedBy),
    last_activity_by: uuidMapper.transformForeignKey(mongoRecord.last_activity_by),
    currency: nullableString(mongoRecord.currency),
    description: nullableString(mongoRecord.description),
    expected_revenue: nullableNumber(mongoRecord.expected_revenue) || 0,
    name: nullableString(mongoRecord.name),
    next_step: nullableString(mongoRecord.next_step),
    sales_stage: uuidMapper.transformForeignKey(mongoRecord.sales_stage),
    type: uuidMapper.transformForeignKey(mongoRecord.type),
    status: validateEnum(mongoRecord.status, VALID_OPPORTUNITY_STATUS, 'ACTIVE'),
  };
}
