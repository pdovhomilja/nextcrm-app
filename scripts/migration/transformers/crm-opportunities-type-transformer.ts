/**
 * CRM Opportunities Type model transformer
 * Transforms MongoDB crm_Opportunities_Type documents to PostgreSQL format
 */

import { nullableNumber } from '../utils';

export function transformCrmOpportunitiesType(mongoRecord: any, uuidMapper: any): any {
  const newUuid = uuidMapper.generateAndMapUuid(mongoRecord._id);

  return {
    id: newUuid,
    v: mongoRecord.__v || 0,
    name: mongoRecord.name, // Required field
    order: nullableNumber(mongoRecord.order),
  };
}
