/**
 * Employees model transformer
 * Transforms MongoDB Employees documents to PostgreSQL format
 */

import { nullableString } from '../utils';

export function transformEmployees(mongoRecord: any, uuidMapper: any): any {
  const newUuid = uuidMapper.generateAndMapUuid(mongoRecord._id);

  return {
    id: newUuid,
    v: mongoRecord.__v || 0,
    avatar: mongoRecord.avatar, // Required field
    email: nullableString(mongoRecord.email),
    name: mongoRecord.name, // Required field
    salary: mongoRecord.salary || 0, // Required field
    status: mongoRecord.status, // Required field
  };
}
