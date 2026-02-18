/**
 * System Modules Enabled model transformer
 * Transforms MongoDB system_Modules_Enabled documents to PostgreSQL format
 */

import { toBoolean } from '../utils';

export function transformSystemModulesEnabled(mongoRecord: any, uuidMapper: any): any {
  const newUuid = uuidMapper.generateAndMapUuid(mongoRecord._id);

  return {
    id: newUuid,
    v: mongoRecord.__v || 0,
    name: mongoRecord.name, // Required field
    enabled: toBoolean(mongoRecord.enabled), // Required field
    position: mongoRecord.position || 0, // Required field
  };
}
