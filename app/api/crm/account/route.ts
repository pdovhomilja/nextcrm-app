import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canCreateAccount } from "@/lib/quota-enforcement";

//Create new account route
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }
  try {
    const body = await req.json();
    const {
      name,
      office_phone,
      website,
      fax,
      company_id,
      vat,
      email,
      billing_street,
      billing_postal_code,
      billing_city,
      billing_state,
      billing_country,
      shipping_street,
      shipping_postal_code,
      shipping_city,
      shipping_state,
      shipping_country,
      description,
      assigned_to,
      status,
      annual_revenue,
      member_of,
      industry,
    } = body;

    if (!session.user.organizationId) {
      return new NextResponse("User organization not found", { status: 401 });
    }

    // Check quota before creating account
    const quotaCheck = await canCreateAccount(session.user.organizationId);
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        {
          error: quotaCheck.reason || "Account limit reached",
          requiresUpgrade: true,
          code: "QUOTA_EXCEEDED",
        },
        { status: 403 }
      );
    }

    const newAccount = await prismadb.crm_Accounts.create({
      data: {
        v: 0,
        organizationId: session.user.organizationId,
        createdBy: session.user.id,
        updatedBy: session.user.id,
        name,
        office_phone,
        website,
        fax,
        company_id,
        vat,
        email,
        billing_street,
        billing_postal_code,
        billing_city,
        billing_state,
        billing_country,
        shipping_street,
        shipping_postal_code,
        shipping_city,
        shipping_state,
        shipping_country,
        description,
        assigned_to,
        status: "Active",
        annual_revenue,
        member_of,
        industry,
      },
    });

    return NextResponse.json({ newAccount }, { status: 200 });
  } catch (error) {
    console.log("[NEW_ACCOUNT_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

//Update account route
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }
  try {
    const body = await req.json();
    const {
      id,
      name,
      office_phone,
      website,
      fax,
      company_id,
      vat,
      email,
      billing_street,
      billing_postal_code,
      billing_city,
      billing_state,
      billing_country,
      shipping_street,
      shipping_postal_code,
      shipping_city,
      shipping_state,
      shipping_country,
      description,
      assigned_to,
      status,
      annual_revenue,
      member_of,
      industry,
    } = body;

    if (!session.user.organizationId) {
      return new NextResponse("User organization not found", { status: 401 });
    }

    // Verify the account belongs to the user's organization
    const existingAccount = await prismadb.crm_Accounts.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
    });

    if (!existingAccount) {
      return new NextResponse("Account not found or unauthorized", {
        status: 404,
      });
    }

    const newAccount = await prismadb.crm_Accounts.update({
      where: {
        id,
      },
      data: {
        v: 0,
        updatedBy: session.user.id,
        name,
        office_phone,
        website,
        fax,
        company_id,
        vat,
        email,
        billing_street,
        billing_postal_code,
        billing_city,
        billing_state,
        billing_country,
        shipping_street,
        shipping_postal_code,
        shipping_city,
        shipping_state,
        shipping_country,
        description,
        assigned_to,
        status: status,
        annual_revenue,
        member_of,
        industry,
      },
    });

    return NextResponse.json({ newAccount }, { status: 200 });
  } catch (error) {
    console.log("[UPDATE_ACCOUNT_PUT]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

//GET all accounts route
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  if (!session.user.organizationId) {
    return new NextResponse("User organization not found", { status: 401 });
  }

  try {
    const accounts = await prismadb.crm_Accounts.findMany({
      where: {
        organizationId: session.user.organizationId,
      },
    });

    return NextResponse.json(accounts, { status: 200 });
  } catch (error) {
    console.log("[ACCOUNTS_GET]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}
