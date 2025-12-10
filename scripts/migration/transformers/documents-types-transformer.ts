/**
 * Documents Types model transformer
 * Transforms MongoDB Documents_Types documents to PostgreSQL format
 */

export function transformDocumentsTypes(mongoRecord: any, uuidMapper: any): any {
  const newUuid = uuidMapper.generateAndMapUuid(mongoRecord._id);

  return {
    id: newUuid,
    v: mongoRecord.__v || 0,
    name: mongoRecord.name, // Required field
  };
}
