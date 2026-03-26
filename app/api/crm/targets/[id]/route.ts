import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";

const FIELD_MAP: Record<string, string> = {
  position:         "position",
  company:          "company",
  company_website:  "company_website",
  personal_website: "personal_website",
  mobile_phone:     "mobile_phone",
  office_phone:     "office_phone",
  social_linkedin:  "social_linkedin",
  social_x:         "social_x",
  social_instagram: "social_instagram",
  social_facebook:  "social_facebook",
  personal_email:   "personal_email",
  company_email:    "company_email",
  company_phone:    "company_phone",
  industry:         "industry",
  employees:        "employees",
  description:      "description",
  city:             "city",
  country:          "country",
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { enrichmentFields } = await request.json();
  if (!enrichmentFields || typeof enrichmentFields !== "object") {
    return NextResponse.json({ error: "enrichmentFields required" }, { status: 400 });
  }

  const updates: Record<string, string> = {};
  for (const [key, value] of Object.entries(enrichmentFields)) {
    const column = FIELD_MAP[key];
    if (column) updates[column] = String(value);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const target = await prismadb.crm_Targets.update({
    where: { id },
    data: { ...updates, updatedBy: session.user.id },
    select: { id: true },
  });

  return NextResponse.json({ success: true, id: target.id });
}
