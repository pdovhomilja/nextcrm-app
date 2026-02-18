/**
 * CRM Contracts model transformer
 * Transforms MongoDB crm_Contracts documents to PostgreSQL format
 */

import { convertDateToISO, nullableString, validateEnum } from '../utils';

const VALID_CONTRACT_STATUS = ['NOTSTARTED', 'INPROGRESS', 'SIGNED'] as const;

export function transformCrmContracts(mongoRecord: any, uuidMapper: any): any {
  const newUuid = uuidMapper.generateAndMapUuid(mongoRecord._id);

  return {
    id: newUuid,
    v: mongoRecord.__v || 0,
    title: mongoRecord.title, // Required field
    value: mongoRecord.value || 0, // Required field
    startDate: convertDateToISO(mongoRecord.startDate) || new Date().toISOString(),
    endDate: convertDateToISO(mongoRecord.endDate),
    renewalReminderDate: convertDateToISO(mongoRecord.renewalReminderDate),
    customerSignedDate: convertDateToISO(mongoRecord.customerSignedDate),
    companySignedDate: convertDateToISO(mongoRecord.companySignedDate),
    description: nullableString(mongoRecord.description),
    account: uuidMapper.transformForeignKey(mongoRecord.account),
    assigned_to: uuidMapper.transformForeignKey(mongoRecord.assigned_to),
    createdAt: convertDateToISO(mongoRecord.createdAt),
    createdBy: uuidMapper.transformForeignKey(mongoRecord.createdBy),
    updatedAt: convertDateToISO(mongoRecord.updatedAt),
    updatedBy: uuidMapper.transformForeignKey(mongoRecord.updatedBy),
    status: validateEnum(mongoRecord.status, VALID_CONTRACT_STATUS, 'NOTSTARTED'),
    type: nullableString(mongoRecord.type),
  };
}
