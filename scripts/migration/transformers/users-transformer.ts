/**
 * Users model transformer
 * Transforms MongoDB Users documents to PostgreSQL format
 */

import { convertDateToISO, validateEnum, nullableString, toBoolean } from '../utils';

const VALID_USER_STATUS = ['ACTIVE', 'INACTIVE', 'PENDING'] as const;
const VALID_LANGUAGES = ['cz', 'en', 'de', 'uk'] as const;

export function transformUsers(mongoRecord: any, uuidMapper: any): any {
  const newUuid = uuidMapper.generateAndMapUuid(mongoRecord._id);

  return {
    id: newUuid,
    v: mongoRecord.__v || 0,
    account_name: nullableString(mongoRecord.account_name),
    avatar: nullableString(mongoRecord.avatar),
    email: mongoRecord.email, // Required field
    is_account_admin: toBoolean(mongoRecord.is_account_admin),
    is_admin: toBoolean(mongoRecord.is_admin),
    created_on: convertDateToISO(mongoRecord.created_on) || new Date().toISOString(),
    lastLoginAt: convertDateToISO(mongoRecord.lastLoginAt),
    name: nullableString(mongoRecord.name),
    password: nullableString(mongoRecord.password),
    username: nullableString(mongoRecord.username),
    userStatus: validateEnum(mongoRecord.userStatus, VALID_USER_STATUS, 'PENDING'),
    userLanguage: validateEnum(mongoRecord.userLanguage, VALID_LANGUAGES, 'en'),
  };
}
