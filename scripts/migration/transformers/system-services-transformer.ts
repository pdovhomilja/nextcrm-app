/**
 * System Services model transformer
 * Transforms MongoDB systemServices documents to PostgreSQL format
 */

import { nullableString } from '../utils';

export function transformSystemServices(mongoRecord: any, uuidMapper: any): any {
  const newUuid = uuidMapper.generateAndMapUuid(mongoRecord._id);

  return {
    id: newUuid,
    v: mongoRecord.__v || 0,
    name: mongoRecord.name, // Required field
    serviceUrl: nullableString(mongoRecord.serviceUrl),
    serviceId: nullableString(mongoRecord.serviceId),
    serviceKey: nullableString(mongoRecord.serviceKey),
    servicePassword: nullableString(mongoRecord.servicePassword),
    servicePort: nullableString(mongoRecord.servicePort),
    description: nullableString(mongoRecord.description),
  };
}
