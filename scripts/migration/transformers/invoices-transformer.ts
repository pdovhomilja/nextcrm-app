/**
 * Invoices model transformer
 * Transforms MongoDB Invoices documents to PostgreSQL format
 */

import { convertDateToISO, nullableString, toBoolean } from '../utils';

export function transformInvoices(mongoRecord: any, uuidMapper: any): any {
  const newUuid = uuidMapper.generateAndMapUuid(mongoRecord._id);

  // Handle invoice_items as JSONB
  const invoice_items = mongoRecord.invoice_items || null;

  return {
    id: newUuid,
    v: mongoRecord.__v,
    date_created: convertDateToISO(mongoRecord.date_created) || new Date().toISOString(),
    last_updated: convertDateToISO(mongoRecord.last_updated) || new Date().toISOString(),
    last_updated_by: uuidMapper.transformForeignKey(mongoRecord.last_updated_by),
    date_received: convertDateToISO(mongoRecord.date_received),
    date_of_case: convertDateToISO(mongoRecord.date_of_case),
    date_tax: convertDateToISO(mongoRecord.date_tax),
    date_due: convertDateToISO(mongoRecord.date_due),
    description: nullableString(mongoRecord.description),
    document_type: nullableString(mongoRecord.document_type),
    favorite: toBoolean(mongoRecord.favorite),
    variable_symbol: nullableString(mongoRecord.variable_symbol),
    constant_symbol: nullableString(mongoRecord.constant_symbol),
    specific_symbol: nullableString(mongoRecord.specific_symbol),
    order_number: nullableString(mongoRecord.order_number),
    internal_number: nullableString(mongoRecord.internal_number),
    invoice_number: nullableString(mongoRecord.invoice_number),
    invoice_amount: nullableString(mongoRecord.invoice_amount),
    invoice_file_mimeType: mongoRecord.invoice_file_mimeType, // Required field
    invoice_file_url: mongoRecord.invoice_file_url, // Required field
    invoice_items,
    invoice_type: nullableString(mongoRecord.invoice_type),
    invoice_currency: nullableString(mongoRecord.invoice_currency),
    invoice_language: nullableString(mongoRecord.invoice_language),
    partner: nullableString(mongoRecord.partner),
    partner_street: nullableString(mongoRecord.partner_street),
    partner_city: nullableString(mongoRecord.partner_city),
    partner_zip: nullableString(mongoRecord.partner_zip),
    partner_country: nullableString(mongoRecord.partner_country),
    partner_country_code: nullableString(mongoRecord.partner_country_code),
    partner_business_street: nullableString(mongoRecord.partner_business_street),
    partner_business_city: nullableString(mongoRecord.partner_business_city),
    partner_business_zip: nullableString(mongoRecord.partner_business_zip),
    partner_business_country: nullableString(mongoRecord.partner_business_country),
    partner_business_country_code: nullableString(mongoRecord.partner_business_country_code),
    partner_VAT_number: nullableString(mongoRecord.partner_VAT_number),
    partner_TAX_number: nullableString(mongoRecord.partner_TAX_number),
    partner_TAX_local_number: nullableString(mongoRecord.partner_TAX_local_number),
    partner_phone_prefix: nullableString(mongoRecord.partner_phone_prefix),
    partner_phone_number: nullableString(mongoRecord.partner_phone_number),
    partner_fax_prefix: nullableString(mongoRecord.partner_fax_prefix),
    partner_fax_number: nullableString(mongoRecord.partner_fax_number),
    partner_email: nullableString(mongoRecord.partner_email),
    partner_website: nullableString(mongoRecord.partner_website),
    partner_is_person: toBoolean(mongoRecord.partner_is_person),
    partner_bank: nullableString(mongoRecord.partner_bank),
    partner_account_number: nullableString(mongoRecord.partner_account_number),
    partner_account_bank_number: nullableString(mongoRecord.partner_account_bank_number),
    partner_IBAN: nullableString(mongoRecord.partner_IBAN),
    partner_SWIFT: nullableString(mongoRecord.partner_SWIFT),
    partner_BIC: nullableString(mongoRecord.partner_BIC),
    rossum_status: nullableString(mongoRecord.rossum_status),
    rossum_annotation_id: nullableString(mongoRecord.rossum_annotation_id),
    rossum_annotation_url: nullableString(mongoRecord.rossum_annotation_url),
    rossum_document_id: nullableString(mongoRecord.rossum_document_id),
    rossum_document_url: nullableString(mongoRecord.rossum_document_url),
    rossum_annotation_json_url: nullableString(mongoRecord.rossum_annotation_json_url),
    rossum_annotation_xml_url: nullableString(mongoRecord.rossum_annotation_xml_url),
    money_s3_url: nullableString(mongoRecord.money_s3_url),
    status: nullableString(mongoRecord.status),
    invoice_state_id: uuidMapper.transformForeignKey(mongoRecord.invoice_state_id),
    assigned_user_id: uuidMapper.transformForeignKey(mongoRecord.assigned_user_id),
    assigned_account_id: uuidMapper.transformForeignKey(mongoRecord.assigned_account_id),
    visibility: toBoolean(mongoRecord.visibility !== undefined ? mongoRecord.visibility : true),
  };
}
