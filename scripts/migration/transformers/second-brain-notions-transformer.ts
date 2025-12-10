/**
 * Second Brain Notions model transformer
 * Transforms MongoDB secondBrain_notions documents to PostgreSQL format
 */

export function transformSecondBrainNotions(mongoRecord: any, uuidMapper: any): any {
  const newUuid = uuidMapper.generateAndMapUuid(mongoRecord._id);

  return {
    id: newUuid,
    v: mongoRecord.__v || 0,
    user: uuidMapper.transformForeignKey(mongoRecord.user) || '', // Required foreign key
    notion_api_key: mongoRecord.notion_api_key, // Required field
    notion_db_id: mongoRecord.notion_db_id, // Required field
  };
}
