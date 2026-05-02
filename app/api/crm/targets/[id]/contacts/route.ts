import { NextRequest, NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  assertCanWriteTarget,
  unauthorizedResponse,
  notFoundOrForbiddenResponse,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: targetId } = await params;

  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return unauthorizedResponse();
    throw e;
  }
  try {
    await assertCanWriteTarget(user, targetId);
  } catch (e) {
    if (e instanceof AuthorizationError) return notFoundOrForbiddenResponse();
    throw e;
  }

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
