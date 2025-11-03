import { NextRequest, NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sendEmail from "@/lib/sendmail";
import { canCreateOpportunity } from "@/lib/quota-enforcement";
import { rateLimited } from "@/middleware/with-rate-limit";

async function handlePOST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }
  try {
    const body = await req.json();
    const userId = session.user.id;

    if (!body) {
      return new NextResponse("No form data", { status: 400 });
    }

    const {
      account,
      assigned_to,
      budget,
      campaign,
      close_date,
      contact,
      currency,
      description,
      expected_revenue,
      name,
      next_step,
      sales_stage,
      type,
    } = body;

    //console.log(req.body, "req.body");

    if (!session.user.organizationId) {
      return new NextResponse("User organization not found", { status: 401 });
    }

    // Check quota before creating opportunity
    const quotaCheck = await canCreateOpportunity(
      session.user.organizationId
    );
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        {
          error: quotaCheck.reason || "Opportunity limit reached",
          requiresUpgrade: true,
          code: "QUOTA_EXCEEDED",
        },
        { status: 403 }
      );
    }

    const newOpportunity = await prismadb.crm_Opportunities.create({
      data: {
        organizationId: session.user.organizationId,
        account: account,
        assigned_to: assigned_to,
        budget: Number(budget),
        campaign: campaign,
        close_date: close_date,
        contact: contact,
        created_by: userId,
        last_activity_by: userId,
        updatedBy: userId,
        currency: currency,
        description: description,
        expected_revenue: Number(expected_revenue),
        name: name,
        next_step: next_step,
        sales_stage: sales_stage,
        status: "ACTIVE",
        type: type,
      },
    });

    if (assigned_to !== userId) {
      const notifyRecipient = await prismadb.users.findFirst({
        where: {
          id: assigned_to,
        },
      });

      if (!notifyRecipient) {
        return new NextResponse("No user found", { status: 400 });
      }

      await sendEmail({
        from: process.env.EMAIL_FROM as string,
        to: notifyRecipient.email || "info@softbase.cz",
        subject:
          notifyRecipient.userLanguage === "en"
            ? `New opportunity ${name} has been added to the system and assigned to you.`
            : `Nová příležitost ${name} byla přidána do systému a přidělena vám.`,
        text:
          notifyRecipient.userLanguage === "en"
            ? `New opportunity ${name} has been added to the system and assigned to you. You can click here for detail: ${process.env.NEXT_PUBLIC_APP_URL}/crm/opportunities/${newOpportunity.id}`
            : `Nová příležitost ${name} byla přidána do systému a přidělena vám. Detaily naleznete zde: ${process.env.NEXT_PUBLIC_APP_URL}/crm/opportunities/${newOpportunity.id}`,
      });
    }

    return NextResponse.json({ newOpportunity }, { status: 200 });
  } catch (error) {
    console.log("[NEW_OPPORTUNITY_POST]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}
async function handlePUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }
  try {
    const body = await req.json();
    const userId = session.user.id;

    if (!body) {
      return new NextResponse("No form data", { status: 400 });
    }

    const {
      id,
      account,
      assigned_to,
      budget,
      campaign,
      close_date,
      contact,
      currency,
      description,
      expected_revenue,
      name,
      next_step,
      sales_stage,
      type,
    } = body;

    //console.log(req.body, "req.body");

    if (!session.user.organizationId) {
      return new NextResponse("User organization not found", { status: 401 });
    }

    // Verify the opportunity belongs to the user's organization
    const existingOpportunity = await prismadb.crm_Opportunities.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
    });

    if (!existingOpportunity) {
      return new NextResponse("Opportunity not found or unauthorized", {
        status: 404,
      });
    }

    const updatedOpportunity = await prismadb.crm_Opportunities.update({
      where: { id },
      data: {
        account: account,
        assigned_to: assigned_to,
        budget: Number(budget),
        campaign: campaign,
        close_date: close_date,
        contact: contact,
        updatedBy: userId,
        currency: currency,
        description: description,
        expected_revenue: Number(expected_revenue),
        name: name,
        next_step: next_step,
        sales_stage: sales_stage,
        status: "ACTIVE",
        type: type,
      },
    });

    /* if (assigned_to !== userId) {
      const notifyRecipient = await prismadb.users.findFirst({
        where: {
          id: assigned_to,
        },
      });

      if (!notifyRecipient) {
        return new NextResponse("No user found", { status: 400 });
      }

      await sendEmail({
        from: process.env.EMAIL_FROM as string,
        to: notifyRecipient.email || "info@softbase.cz",
        subject:
          notifyRecipient.userLanguage === "en"
            ? `New opportunity ${name} has been added to the system and assigned to you.`
            : `Nová příležitost ${name} byla přidána do systému a přidělena vám.`,
        text:
          notifyRecipient.userLanguage === "en"
            ? `New opportunity ${name} has been added to the system and assigned to you. You can click here for detail: ${process.env.NEXT_PUBLIC_APP_URL}/crm/opportunities/${newOpportunity.id}`
            : `Nová příležitost ${name} byla přidána do systému a přidělena vám. Detaily naleznete zde: ${process.env.NEXT_PUBLIC_APP_URL}/crm/opportunities/${newOpportunity.id}`,
      });
    } */

    return NextResponse.json({ updatedOpportunity }, { status: 200 });
  } catch (error) {
    console.log("[UPDATED_OPPORTUNITY_PUT]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

async function handleGET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  if (!session.user.organizationId) {
    return new NextResponse("User organization not found", { status: 401 });
  }

  try {
    const users = await prismadb.users.findMany({
      where: {
        organizationId: session.user.organizationId,
      },
    });
    const accounts = await prismadb.crm_Accounts.findMany({
      where: {
        organizationId: session.user.organizationId,
      },
    });
    const contacts = await prismadb.crm_Contacts.findMany({
      where: {
        organizationId: session.user.organizationId,
      },
    });
    const saleTypes = await prismadb.crm_Opportunities_Type.findMany({});
    const saleStages = await prismadb.crm_Opportunities_Sales_Stages.findMany(
      {}
    );
    const campaigns = await prismadb.crm_campaigns.findMany({});
    const industries = await prismadb.crm_Industry_Type.findMany({});

    const data = {
      users,
      accounts,
      contacts,
      saleTypes,
      saleStages,
      campaigns,
      industries,
    };

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.log("[GET_OPPORTUNITIES]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

// Apply rate limiting to all endpoints
export const GET = rateLimited(handleGET);
export const POST = rateLimited(handlePOST);
export const PUT = rateLimited(handlePUT);
