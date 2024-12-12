import { prismadb } from "@/lib/prisma";
import { NextResponse } from "next/server";

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

  const { name, surname, email, phone, company, message, tag } = body;
  if (!name || !surname || !email || !phone || !company || !message || !tag) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  try {
    await prismadb.crm_Contacts.create({
      data: {
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
