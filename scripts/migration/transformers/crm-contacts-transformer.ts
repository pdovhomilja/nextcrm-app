/**
 * CRM Contacts model transformer
 * Transforms MongoDB crm_Contacts documents to PostgreSQL format
 */

import { convertDateToISO, nullableString, toBoolean } from '../utils';

export function transformCrmContacts(mongoRecord: any, uuidMapper: any): any {
  const newUuid = uuidMapper.generateAndMapUuid(mongoRecord._id);

  // Handle tags and notes arrays (keep as PostgreSQL arrays)
  const tags = Array.isArray(mongoRecord.tags) ? mongoRecord.tags.map(String) : [];
  const notes = Array.isArray(mongoRecord.notes) ? mongoRecord.notes.map(String) : [];

  return {
    id: newUuid,
    v: mongoRecord.__v || 0,
    account: nullableString(mongoRecord.account),
    assigned_to: uuidMapper.transformForeignKey(mongoRecord.assigned_to),
    birthday: nullableString(mongoRecord.birthday),
    created_by: uuidMapper.transformForeignKey(mongoRecord.created_by),
    createdBy: uuidMapper.transformForeignKey(mongoRecord.createdBy),
    created_on: convertDateToISO(mongoRecord.created_on),
    cratedAt: convertDateToISO(mongoRecord.cratedAt) || convertDateToISO(mongoRecord.created_on),
    last_activity: convertDateToISO(mongoRecord.last_activity) || new Date().toISOString(),
    updatedAt: convertDateToISO(mongoRecord.updatedAt),
    updatedBy: uuidMapper.transformForeignKey(mongoRecord.updatedBy),
    last_activity_by: uuidMapper.transformForeignKey(mongoRecord.last_activity_by),
    description: nullableString(mongoRecord.description),
    email: nullableString(mongoRecord.email),
    personal_email: nullableString(mongoRecord.personal_email),
    first_name: nullableString(mongoRecord.first_name),
    last_name: mongoRecord.last_name, // Required field
    office_phone: nullableString(mongoRecord.office_phone),
    mobile_phone: nullableString(mongoRecord.mobile_phone),
    website: nullableString(mongoRecord.website),
    position: nullableString(mongoRecord.position),
    status: toBoolean(mongoRecord.status !== undefined ? mongoRecord.status : true),
    social_twitter: nullableString(mongoRecord.social_twitter),
    social_facebook: nullableString(mongoRecord.social_facebook),
    social_linkedin: nullableString(mongoRecord.social_linkedin),
    social_skype: nullableString(mongoRecord.social_skype),
    social_instagram: nullableString(mongoRecord.social_instagram),
    social_youtube: nullableString(mongoRecord.social_youtube),
    social_tiktok: nullableString(mongoRecord.social_tiktok),
    type: nullableString(mongoRecord.type) || 'Customer',
    tags,
    notes,
    accountsIDs: uuidMapper.transformForeignKey(mongoRecord.accountsIDs),
  };
}
