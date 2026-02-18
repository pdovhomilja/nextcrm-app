/**
 * Invoice States model transformer
 * Transforms MongoDB invoice_States documents to PostgreSQL format
 */

export function transformInvoiceStates(mongoRecord: any, uuidMapper: any): any {
  const newUuid = uuidMapper.generateAndMapUuid(mongoRecord._id);

  return {
    id: newUuid,
    name: mongoRecord.name, // Required field
  };
}
