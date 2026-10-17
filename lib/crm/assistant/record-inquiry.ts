import { prismadb } from "@/lib/prisma";
import { createWebLead } from "@/lib/crm/create-web-lead";
import { normalizeEmail, normalizePhone, phoneMatchVariants, splitName } from "./normalize";
import type { AssistantInquiry } from "./schema";

// A claim older than this that never completed belongs to a crashed/timed-out
// request (Vercel's function limit is 300s); it is reclaimed rather than 409ing forever.
const STALE_CLAIM_MS = 6 * 60 * 1000;

// Each assistant channel has its own lead source, so leads from the AI chat and the AI
// phone line can be told apart from web-form leads (and from each other) in reports.
// The rows are created by migration 20261018120000_assistant_lead_sources; a name
// with no row would leave the lead with no source at all (createWebLead looks it up).
export const LEAD_SOURCE_BY_CHANNEL: Record<AssistantInquiry["source"], string> = {
  website_chat: "AI Website Chat",
  voice_call: "AI Phone Assistant",
};

const CHANNEL_LABEL: Record<AssistantInquiry["source"], string> = {
  website_chat: "AI website chat",
  voice_call: "AI phone call",
};

export type InquiryResult = {
  leadId: string;
  activityId: string;
  leadCreated: boolean;
  duplicate: boolean;
};

export type RecordInquiryOutcome =
  | ({ kind: "ok" } & InquiryResult)
  | { kind: "in_progress" };

type ClaimRow = {
  id: string;
  leadId: string | null;
  activityId: string | null;
  leadCreated: boolean;
  completedAt: Date | null;
  createdAt: Date;
};

const isUniqueViolation = (e: unknown) =>
  typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";

/**
 * Leads are the only entity matched: the website forms and this endpoint both
 * feed crm_Leads, and the response contract is a leadId. Email wins over phone;
 * on multiple matches the oldest lead is the canonical one. Read-only lookup —
 * nothing about the matched lead is returned beyond its id.
 */
export async function findExistingLeadId(
  contact: AssistantInquiry["contact"]
): Promise<string | null> {
  const email = normalizeEmail(contact.email);
  if (email) {
    const byEmail = await prismadb.crm_Leads.findFirst({
      where: { deletedAt: null, email: { equals: email, mode: "insensitive" } },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (byEmail) return byEmail.id;
  }

  const variants = phoneMatchVariants(normalizePhone(contact.phone));
  if (variants.length > 0) {
    // Stored phones are free-form text, so compare on digits only.
    const rows = await prismadb.$queryRaw<{ id: string }[]>`
      SELECT id FROM "crm_Leads"
      WHERE "deletedAt" IS NULL
        AND phone IS NOT NULL
        AND regexp_replace(phone, '[^0-9]', '', 'g') = ANY(${variants})
      ORDER BY "createdAt" ASC NULLS LAST
      LIMIT 1`;
    if (rows[0]) return rows[0].id;
  }

  return null;
}

function replay(row: ClaimRow): RecordInquiryOutcome | null {
  if (row.completedAt && row.leadId && row.activityId) {
    return {
      kind: "ok",
      leadId: row.leadId,
      activityId: row.activityId,
      leadCreated: row.leadCreated,
      duplicate: true,
    };
  }
  if (Date.now() - row.createdAt.getTime() < STALE_CLAIM_MS) return { kind: "in_progress" };
  return null; // stale claim — caller reclaims it
}

/** Claims the key, or returns the outcome of whoever already holds it. */
async function claim(input: AssistantInquiry): Promise<RecordInquiryOutcome | "claimed"> {
  const { idempotencyKey } = input;
  for (let attempt = 0; attempt < 2; attempt++) {
    const existing = await prismadb.crm_Assistant_Inquiries.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      const outcome = replay(existing);
      if (outcome) return outcome;
      await prismadb.crm_Assistant_Inquiries.deleteMany({
        where: { id: existing.id, completedAt: null },
      });
    }
    try {
      await prismadb.crm_Assistant_Inquiries.create({
        data: { idempotencyKey, source: input.source, sessionId: input.sessionId },
      });
      return "claimed";
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
      // Lost the race to a concurrent request with the same key — loop and replay it.
    }
  }
  return { kind: "in_progress" };
}

/**
 * Records one assistant conversation: find-or-create the lead, then a completed
 * activity linked to it. Idempotent on `idempotencyKey` — a repeat returns the
 * original ids with `duplicate: true` and writes nothing.
 */
export async function recordAssistantInquiry(
  input: AssistantInquiry
): Promise<RecordInquiryOutcome> {
  const claimed = await claim(input);
  if (claimed !== "claimed") return claimed;

  const { idempotencyKey, source, sessionId, contact, inquiry, booking } = input;
  try {
    let leadId = await findExistingLeadId(contact);
    const leadCreated = !leadId;
    if (!leadId) {
      const lead = await createWebLead({
        ...splitName(contact.name),
        company: contact.company,
        email: normalizeEmail(contact.email) ?? undefined,
        phone: normalizePhone(contact.phone) ?? undefined,
        description: `Created by the ${CHANNEL_LABEL[source]} assistant.`,
        lead_source: LEAD_SOURCE_BY_CHANNEL[source],
      });
      leadId = lead.id;
    }
    const resolvedLeadId = leadId;

    const urgent = inquiry.urgency === "urgent";
    const activityId = await prismadb.$transaction(async (tx) => {
      const activity = await tx.crm_Activities.create({
        data: {
          type: source === "voice_call" ? "call" : "note",
          title: `${urgent ? "URGENT · " : ""}${CHANNEL_LABEL[source]}: ${inquiry.intent} inquiry`,
          description: inquiry.summary,
          date: new Date(),
          status: "completed",
          outcome: booking ? "Booking made" : undefined,
          metadata: {
            origin: "ai_assistant",
            source,
            sessionId: sessionId ?? null,
            intent: inquiry.intent,
            urgency: inquiry.urgency,
            serviceInterest: inquiry.serviceInterest ?? null,
            booking: booking ?? null,
            contact: {
              name: contact.name ?? null,
              email: normalizeEmail(contact.email),
              phone: normalizePhone(contact.phone),
              company: contact.company ?? null,
            },
            idempotencyKey,
          },
        },
      });
      await tx.crm_ActivityLinks.create({
        data: { activityId: activity.id, entityType: "lead", entityId: resolvedLeadId },
      });
      await tx.crm_Assistant_Inquiries.update({
        where: { idempotencyKey },
        data: {
          leadId: resolvedLeadId,
          activityId: activity.id,
          leadCreated,
          completedAt: new Date(),
        },
      });
      return activity.id;
    });

    return { kind: "ok", leadId: resolvedLeadId, activityId, leadCreated, duplicate: false };
  } catch (error) {
    // Release the claim so the caller's retry can run. A lead created before the
    // failure is matched (by email/phone) on that retry rather than duplicated.
    await prismadb.crm_Assistant_Inquiries
      .deleteMany({ where: { idempotencyKey, completedAt: null } })
      .catch(() => undefined);
    throw error;
  }
}
