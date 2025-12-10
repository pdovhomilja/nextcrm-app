/**
 * CRM Campaigns model transformer
 * Transforms MongoDB crm_campaigns documents to PostgreSQL format
 */

import { nullableString } from '../utils';

export function transformCrmCampaigns(mongoRecord: any, uuidMapper: any): any {
  const newUuid = uuidMapper.generateAndMapUuid(mongoRecord._id);

  return {
    id: newUuid,
    v: mongoRecord.__v || 0,
    name: mongoRecord.name, // Required field
    description: nullableString(mongoRecord.description),
    status: nullableString(mongoRecord.status),
  };
}
