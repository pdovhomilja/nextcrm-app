import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

//Endpoint: /api/my-account

//Endpoint for adding my account data
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { message: "Unauthorized" },
      {
        status: 401,
      }
    );
  }

  const body = await req.json();

  const {
    company_name,
    is_person,
    email,
    email_accountant,
    phone_prefix,
    phone,
    mobile_prefix,
    mobile,
    fax_prefix,
    fax,
    website,
    street,
    city,
    state,
    zip,
    country,
    country_code,
    billing_street,
    billing_city,
    billing_state,
    billing_zip,
    billing_country,
    billing_country_code,
    currency,
    currency_symbol,
    VAT_number,
    TAX_number,
    bank_name,
    bank_account,
    bank_code,
    bank_IBAN,
    bank_SWIFT,
  } = body;

  await prismadb.myAccount.create({
    data: {
      v: 0,
      company_name,
      is_person,
      email,
      email_accountant,
      phone_prefix,
      phone,
      mobile_prefix,
      mobile,
      fax_prefix,
      fax,
      website,
      street,
      city,
      state,
      zip,
      country,
      country_code,
      billing_street,
      billing_city,
      billing_state,
      billing_zip,
      billing_country,
      billing_country_code,
      currency,
      currency_symbol,
      VAT_number,
      TAX_number,
      bank_name,
      bank_account,
      bank_code,
      bank_IBAN,
      bank_SWIFT,
    },
  });

  return NextResponse.json({ message: "PUT" }, { status: 200 });
}
//Endpoint for updating my account
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { message: "Unauthorized" },
      {
        status: 401,
      }
    );
  }

  const body = await req.json();
  console.log(body, "body");

  if (!body.id) {
    return NextResponse.json(
      { message: "Misssing ID in body, ID is required" },
      {
        status: 400,
      }
    );
  }

  const {
    id,
    company_name,
    is_person,
    email,
    email_accountant,
    phone_prefix,
    phone,
    mobile_prefix,
    mobile,
    fax_prefix,
    fax,
    website,
    street,
    city,
    state,
    zip,
    country,
    country_code,
    billing_street,
    billing_city,
    billing_state,
    billing_zip,
    billing_country,
    billing_country_code,
    currency,
    currency_symbol,
    VAT_number,
    TAX_number,
    bank_name,
    bank_account,
    bank_code,
    bank_IBAN,
    bank_SWIFT,
  } = body;

  await prismadb.myAccount.update({
    where: { id: id },
    data: {
      company_name,
      is_person,
      email,
      email_accountant,
      phone_prefix,
      phone,
      mobile_prefix,
      mobile,
      fax_prefix,
      fax,
      website,
      street,
      city,
      state,
      zip,
      country,
      country_code,
      billing_street,
      billing_city,
      billing_state,
      billing_zip,
      billing_country,
      billing_country_code,
      currency,
      currency_symbol,
      VAT_number,
      TAX_number,
      bank_name,
      bank_account,
      bank_code,
      bank_IBAN,
      bank_SWIFT,
    },
  });

  return NextResponse.json({ message: "PUT" }, { status: 200 });
}
