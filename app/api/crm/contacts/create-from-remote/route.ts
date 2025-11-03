import { prismadb } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { canCreateContact } from "@/lib/quota-enforcement";

export async function POST(req: Request) {
  const apiKey = req.headers.get("NEXTCRM_TOKEN");

  // Get API key from headers
  if (!apiKey) {
    return NextResponse.json({ error: "API key is missing" }, { status: 401 });
  }

  // Here you would typically check the API key against a stored value
  // For example, you could fetch it from a database or environment variable
  const storedApiKey = process.env.NEXTCRM_TOKEN; // Example of fetching from env
  if (apiKey !== storedApiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();

  console.log(body, "body");

  const { name, surname, email, phone, company, message, tag, organizationId } =
    body;
  if (
    !name ||
    !surname ||
    !email ||
    !phone ||
    !company ||
    !message ||
    !tag ||
    !organizationId
  ) {
    return NextResponse.json(
      { error: "Missing required fields (including organizationId)" },
      { status: 400 }
    );
  }

  try {
    // Check quota before creating contact
    const quotaCheck = await canCreateContact(organizationId);
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        {
          error: quotaCheck.reason || "Contact limit reached",
          requiresUpgrade: true,
          code: "QUOTA_EXCEEDED",
        },
        { status: 403 }
      );
    }

    await prismadb.crm_Contacts.create({
      data: {
        organizationId,
        first_name: name,
        last_name: surname,
        email,
        mobile_phone: phone,
        type: "Prospect",
        tags: [tag],
        notes: ["Account: " + company, "Message: " + message],
      },
    });
    return NextResponse.json({ message: "Contact created" });
  } catch (error) {
    console.log("Error creating contact:", error);
    return NextResponse.json(
      { error: "Error creating contact" },
      { status: 500 }
    );
  }
}
