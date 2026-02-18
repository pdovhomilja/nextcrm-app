/**
 * CRM Accounts model transformer
 * Transforms MongoDB crm_Accounts documents to PostgreSQL format
 */

import { convertDateToISO, nullableString } from '../utils';

export function transformCrmAccounts(mongoRecord: any, uuidMapper: any): any {
  const newUuid = uuidMapper.generateAndMapUuid(mongoRecord._id);

  return {
    id: newUuid,
    v: mongoRecord.__v || 0,
    createdAt: convertDateToISO(mongoRecord.createdAt) || new Date().toISOString(),
    createdBy: uuidMapper.transformForeignKey(mongoRecord.createdBy),
    updatedAt: convertDateToISO(mongoRecord.updatedAt),
    updatedBy: uuidMapper.transformForeignKey(mongoRecord.updatedBy),
    annual_revenue: nullableString(mongoRecord.annual_revenue),
    assigned_to: uuidMapper.transformForeignKey(mongoRecord.assigned_to),
    billing_city: nullableString(mongoRecord.billing_city),
    billing_country: nullableString(mongoRecord.billing_country),
    billing_postal_code: nullableString(mongoRecord.billing_postal_code),
    billing_state: nullableString(mongoRecord.billing_state),
    billing_street: nullableString(mongoRecord.billing_street),
    company_id: nullableString(mongoRecord.company_id),
    description: nullableString(mongoRecord.description),
    email: nullableString(mongoRecord.email),
    employees: nullableString(mongoRecord.employees),
    fax: nullableString(mongoRecord.fax),
    industry: uuidMapper.transformForeignKey(mongoRecord.industry),
    member_of: nullableString(mongoRecord.member_of),
    name: mongoRecord.name, // Required field
    office_phone: nullableString(mongoRecord.office_phone),
    shipping_city: nullableString(mongoRecord.shipping_city),
    shipping_country: nullableString(mongoRecord.shipping_country),
    shipping_postal_code: nullableString(mongoRecord.shipping_postal_code),
    shipping_state: nullableString(mongoRecord.shipping_state),
    shipping_street: nullableString(mongoRecord.shipping_street),
    status: nullableString(mongoRecord.status) || 'Inactive',
    type: nullableString(mongoRecord.type) || 'Customer',
    vat: nullableString(mongoRecord.vat),
    website: nullableString(mongoRecord.website),
  };
}
