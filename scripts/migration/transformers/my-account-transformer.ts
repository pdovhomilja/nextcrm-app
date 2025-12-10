/**
 * My Account model transformer
 * Transforms MongoDB MyAccount documents to PostgreSQL format
 */

import { nullableString, toBoolean } from '../utils';

export function transformMyAccount(mongoRecord: any, uuidMapper: any): any {
  const newUuid = uuidMapper.generateAndMapUuid(mongoRecord._id);

  return {
    id: newUuid,
    v: mongoRecord.__v || 0,
    company_name: mongoRecord.company_name, // Required field
    is_person: toBoolean(mongoRecord.is_person),
    email: nullableString(mongoRecord.email),
    email_accountant: nullableString(mongoRecord.email_accountant),
    phone_prefix: nullableString(mongoRecord.phone_prefix),
    phone: nullableString(mongoRecord.phone),
    mobile_prefix: nullableString(mongoRecord.mobile_prefix),
    mobile: nullableString(mongoRecord.mobile),
    fax_prefix: nullableString(mongoRecord.fax_prefix),
    fax: nullableString(mongoRecord.fax),
    website: nullableString(mongoRecord.website),
    street: nullableString(mongoRecord.street),
    city: nullableString(mongoRecord.city),
    state: nullableString(mongoRecord.state),
    zip: nullableString(mongoRecord.zip),
    country: nullableString(mongoRecord.country),
    country_code: nullableString(mongoRecord.country_code),
    billing_street: nullableString(mongoRecord.billing_street),
    billing_city: nullableString(mongoRecord.billing_city),
    billing_state: nullableString(mongoRecord.billing_state),
    billing_zip: nullableString(mongoRecord.billing_zip),
    billing_country: nullableString(mongoRecord.billing_country),
    billing_country_code: nullableString(mongoRecord.billing_country_code),
    currency: nullableString(mongoRecord.currency),
    currency_symbol: nullableString(mongoRecord.currency_symbol),
    VAT_number: mongoRecord.VAT_number, // Required field
    TAX_number: nullableString(mongoRecord.TAX_number),
    bank_name: nullableString(mongoRecord.bank_name),
    bank_account: nullableString(mongoRecord.bank_account),
    bank_code: nullableString(mongoRecord.bank_code),
    bank_IBAN: nullableString(mongoRecord.bank_IBAN),
    bank_SWIFT: nullableString(mongoRecord.bank_SWIFT),
  };
}
