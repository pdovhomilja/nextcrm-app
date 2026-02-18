/**
 * OpenAI Keys model transformer
 * Transforms MongoDB openAi_keys documents to PostgreSQL format
 */

export function transformOpenAiKeys(mongoRecord: any, uuidMapper: any): any {
  const newUuid = uuidMapper.generateAndMapUuid(mongoRecord._id);

  return {
    id: newUuid,
    v: mongoRecord.__v || 0,
    user: uuidMapper.transformForeignKey(mongoRecord.user) || '', // Required foreign key
    organization_id: mongoRecord.organization_id, // Required field
    api_key: mongoRecord.api_key, // Required field
  };
}
