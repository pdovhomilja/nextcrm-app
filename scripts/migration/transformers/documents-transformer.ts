/**
 * Documents model transformer
 * Transforms MongoDB Documents documents to PostgreSQL format
 */

import { convertDateToISO, nullableString, nullableNumber, toBoolean, validateEnum } from '../utils';

const VALID_DOCUMENT_SYSTEM_TYPES = ['INVOICE', 'RECEIPT', 'CONTRACT', 'OFFER', 'OTHER'] as const;

export function transformDocuments(mongoRecord: any, uuidMapper: any): any {
  const newUuid = uuidMapper.generateAndMapUuid(mongoRecord._id);

  // Handle tags as JSONB
  const tags = mongoRecord.tags || null;

  // Handle connected_documents array
  const connected_documents = Array.isArray(mongoRecord.connected_documents)
    ? mongoRecord.connected_documents.map(String)
    : [];

  return {
    id: newUuid,
    v: mongoRecord.__v,
    date_created: convertDateToISO(mongoRecord.date_created),
    createdAt: convertDateToISO(mongoRecord.createdAt) || convertDateToISO(mongoRecord.date_created),
    last_updated: convertDateToISO(mongoRecord.last_updated),
    updatedAt: convertDateToISO(mongoRecord.updatedAt) || convertDateToISO(mongoRecord.last_updated),
    document_name: mongoRecord.document_name, // Required field
    created_by_user: uuidMapper.transformForeignKey(mongoRecord.created_by_user),
    createdBy: uuidMapper.transformForeignKey(mongoRecord.createdBy),
    description: nullableString(mongoRecord.description),
    document_type: uuidMapper.transformForeignKey(mongoRecord.document_type),
    favourite: toBoolean(mongoRecord.favourite),
    document_file_mimeType: mongoRecord.document_file_mimeType, // Required field
    document_file_url: mongoRecord.document_file_url, // Required field
    status: nullableString(mongoRecord.status),
    visibility: nullableString(mongoRecord.visibility),
    tags,
    key: nullableString(mongoRecord.key),
    size: nullableNumber(mongoRecord.size),
    assigned_user: uuidMapper.transformForeignKey(mongoRecord.assigned_user),
    connected_documents,
    document_system_type: validateEnum(mongoRecord.document_system_type, VALID_DOCUMENT_SYSTEM_TYPES, 'OTHER'),
  };
}
