/**
 * Image Upload model transformer
 * Transforms MongoDB ImageUpload documents to PostgreSQL format
 */

export function transformImageUpload(mongoRecord: any, uuidMapper: any): any {
  const newUuid = uuidMapper.generateAndMapUuid(mongoRecord._id);

  return {
    id: newUuid,
  };
}
