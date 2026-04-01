import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { id: targetId } = await params;
  const { name, email, phone, linkedinUrl } = await request.json() as {
    name?: string; email?: string; phone?: string; linkedinUrl?: string;
  };

  if (!name && !email) {
    return new NextResponse("name or email required", { status: 400 });
  }

  const contact = await prismadb.crm_Target_Contact.create({
    data: {
      targetId,
      name: name ?? null,
      email: email ?? null,
      phone: phone || null,
      linkedinUrl: linkedinUrl || null,
      source: "manual",
      enrichStatus: "PENDING",
    },
  });

  return NextResponse.json(contact);
}
