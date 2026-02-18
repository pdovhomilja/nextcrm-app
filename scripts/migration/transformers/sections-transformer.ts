/**
 * Sections model transformer
 * Transforms MongoDB Sections documents to PostgreSQL format
 */

import { nullableNumber } from '../utils';

export function transformSections(mongoRecord: any, uuidMapper: any): any {
  const newUuid = uuidMapper.generateAndMapUuid(mongoRecord._id);

  return {
    id: newUuid,
    v: mongoRecord.__v || 0,
    board: uuidMapper.transformForeignKey(mongoRecord.board) || '', // Required foreign key
    title: mongoRecord.title, // Required field
    position: nullableNumber(mongoRecord.position),
  };
}
