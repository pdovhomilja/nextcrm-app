import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { parseLinkedInLeadPayload } from "@/lib/linkedin-leads";

const LEAD_SOURCE = "LinkedIn Lead Sync";

export async function POST(req: Request) {
  const secret = process.env.LINKEDIN_LEADS_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ message: "LinkedIn lead sync is not configured" }, { status: 503 });
  }

  const auth = req.headers.get("authorization")?.trim();
  if (auth !== `Bearer ${secret}` && auth !== secret) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const lead = parseLinkedInLeadPayload(body);
  if (!lead) {
    return NextResponse.json({ message: "Missing lead last name" }, { status: 400 });
  }

  if (lead.externalId) {
    const existing = await prismadb.crm_Leads.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { externalId: lead.externalId },
          { campaign: `linkedin-lead:${lead.externalId}` },
        ],
      },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ message: "Lead already synced", id: existing.id });
    }
  }

  const newStatus = await prismadb.crm_Lead_Statuses.findFirst({
    where: { name: { equals: "New", mode: "insensitive" } },
    select: { id: true },
  });

  const created = await prismadb.crm_Leads.create({
    data: {
      v: 1,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      jobTitle: lead.jobTitle,
      externalId: lead.externalId ?? undefined,
      lead_status_id: newStatus?.id,
      refered_by: LEAD_SOURCE,
      campaign: lead.externalId ? `linkedin-lead:${lead.externalId}` : LEAD_SOURCE,
      description: "Imported from LinkedIn Lead Sync webhook (AI qualification pending)",
    },
    select: { id: true },
  });

  const aiEnabled = process.env.LINKEDIN_AI_QUALIFY?.trim() !== "0";
  if (aiEnabled) {
    void inngest.send({
      name: "linkedin/lead.imported",
      data: { lead_id: created.id, raw_payload: body },
    });
  } else {
    void inngest.send({ name: "crm/lead.saved", data: { record_id: created.id } });
  }

  return NextResponse.json({ message: "Lead created", id: created.id }, { status: 201 });
}
