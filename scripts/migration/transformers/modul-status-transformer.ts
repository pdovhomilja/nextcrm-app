/**
 * Module Status model transformer
 * Transforms MongoDB modulStatus documents to PostgreSQL format
 */

import { toBoolean } from '../utils';

export function transformModulStatus(mongoRecord: any, uuidMapper: any): any {
  const newUuid = uuidMapper.generateAndMapUuid(mongoRecord._id);

  return {
    id: newUuid,
    name: mongoRecord.name, // Required field
    isVisible: toBoolean(mongoRecord.isVisible), // Required field
  };
}
