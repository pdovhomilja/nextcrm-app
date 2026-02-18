/**
 * CRM Industry Type model transformer
 * Transforms MongoDB crm_Industry_Type documents to PostgreSQL format
 */

export function transformCrmIndustryType(mongoRecord: any, uuidMapper: any): any {
  const newUuid = uuidMapper.generateAndMapUuid(mongoRecord._id);

  return {
    id: newUuid,
    v: mongoRecord.__v || 0,
    name: mongoRecord.name, // Required field
  };
}
