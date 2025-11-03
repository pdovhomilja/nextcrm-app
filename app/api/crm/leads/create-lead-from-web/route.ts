import { prismadb } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { canCreateLead } from "@/lib/quota-enforcement";

export async function POST(req: Request) {
  if (req.headers.get("content-type") !== "application/json") {
    return NextResponse.json(
      { message: "Invalid content-type" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const headers = req.headers;

  if (!body) {
    return NextResponse.json({ message: "No body" }, { status: 400 });
  }
  if (!headers) {
    return NextResponse.json({ message: "No headers" }, { status: 400 });
  }

  const {
    firstName,
    lastName,
    account,
    job,
    email,
    phone,
    lead_source,
    organizationId,
  } = body;

  //Validate auth with token from .env.local
  const token = headers.get("authorization");

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.NEXTCRM_TOKEN) {
    return NextResponse.json(
      { message: "NEXTCRM_TOKEN not defined in .env.local file" },
      { status: 401 }
    );
  }

  if (token.trim() !== process.env.NEXTCRM_TOKEN.trim()) {
    console.log("Unauthorized");
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  } else {
    if (!lastName || !organizationId) {
      return NextResponse.json(
        { message: "Missing required fields (including organizationId)" },
        { status: 400 }
      );
    }
    try {
      // Check quota before creating lead
      const quotaCheck = await canCreateLead(organizationId);
      if (!quotaCheck.allowed) {
        return NextResponse.json(
          {
            error: quotaCheck.reason || "Lead limit reached",
            requiresUpgrade: true,
            code: "QUOTA_EXCEEDED",
          },
          { status: 403 }
        );
      }

      await prismadb.crm_Leads.create({
        data: {
          v: 1,
          organizationId,
          firstName,
          lastName,
          company: account,
          jobTitle: job,
          email,
          phone,
          lead_source,
          status: "NEW",
          type: "DEMO",
        },
      });

      return NextResponse.json({ message: "New lead created successfully" });
      //return res.status(200).json({ json: "newContact" });
    } catch (error) {
      console.log(error);
      return NextResponse.json(
        { message: "Error creating new lead" },
        { status: 500 }
      );
    }
  }
}
