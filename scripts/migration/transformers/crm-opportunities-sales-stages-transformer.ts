/**
 * CRM Opportunities Sales Stages model transformer
 * Transforms MongoDB crm_Opportunities_Sales_Stages documents to PostgreSQL format
 */

import { nullableNumber } from '../utils';

export function transformCrmOpportunitiesSalesStages(mongoRecord: any, uuidMapper: any): any {
  const newUuid = uuidMapper.generateAndMapUuid(mongoRecord._id);

  return {
    id: newUuid,
    v: mongoRecord.__v || 0,
    name: mongoRecord.name, // Required field
    probability: nullableNumber(mongoRecord.probability),
    order: nullableNumber(mongoRecord.order),
  };
}
