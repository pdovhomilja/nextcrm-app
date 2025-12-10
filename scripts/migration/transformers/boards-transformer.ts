/**
 * Boards model transformer
 * Transforms MongoDB Boards documents to PostgreSQL format
 */

import { convertDateToISO, nullableString, nullableNumber, toBoolean } from '../utils';

export function transformBoards(mongoRecord: any, uuidMapper: any): any {
  const newUuid = uuidMapper.generateAndMapUuid(mongoRecord._id);

  // Handle sharedWith as PostgreSQL UUID array
  const sharedWith = Array.isArray(mongoRecord.sharedWith)
    ? mongoRecord.sharedWith.map((id: string) => uuidMapper.transformForeignKey(id)).filter(Boolean)
    : [];

  return {
    id: newUuid,
    v: mongoRecord.__v || 0,
    description: mongoRecord.description, // Required field
    favourite: toBoolean(mongoRecord.favourite),
    favouritePosition: nullableNumber(mongoRecord.favouritePosition),
    icon: nullableString(mongoRecord.icon),
    position: nullableNumber(mongoRecord.position),
    title: mongoRecord.title, // Required field
    user: uuidMapper.transformForeignKey(mongoRecord.user) || '', // Required foreign key
    visibility: nullableString(mongoRecord.visibility),
    sharedWith,
    createdAt: convertDateToISO(mongoRecord.createdAt),
    createdBy: uuidMapper.transformForeignKey(mongoRecord.createdBy),
    updatedAt: convertDateToISO(mongoRecord.updatedAt),
    updatedBy: uuidMapper.transformForeignKey(mongoRecord.updatedBy),
  };
}
