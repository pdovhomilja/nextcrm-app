import { prismadb } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import {
  unsubscribeConfirmPage,
  unsubscribedPage,
  unsubscribePageResponse,
} from "@/lib/email/unsubscribe-page";

// Public endpoint (no auth) — the unguessable per-email token is the capability.
//
// GET  = safe: shows a confirmation form, NEVER mutates (mail scanners and link
//        prefetchers auto-GET links in emails and must not unsubscribe prospects).
// POST = mutates: sets do_not_email on every non-deleted target sharing the address
//        (email-wide, case-insensitive — mirrors app/api/campaigns/unsubscribe).
//        Serviced both by the form's button click and by RFC 8058 one-click.
// Unknown/missing/malformed tokens get the same generic 200 page (no enumeration).
// The token column is @db.Uuid, so a non-UUID is rejected BEFORE any query (a raw
// lookup would throw Prisma P2007 -> 500).

const ACTION = "/api/crm/targets/unsubscribe";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (t: string | null): t is string => !!t && UUID_RE.test(t);

export async function GET(req: Request): Promise<Response> {
  const token = new URL(req.url).searchParams.get("token");
  // Deliberately no DB read/write: the same page is shown for any token.
  return unsubscribePageResponse(unsubscribeConfirmPage(ACTION, token));
}

export async function POST(req: Request): Promise<Response> {
  let token = new URL(req.url).searchParams.get("token");
  if (!token) {
    try {
      const form = await req.formData();
      const t = form.get("token");
      if (typeof t === "string" && t) token = t;
    } catch {
      // no/invalid body — fall through to the generic page
    }
  }
  if (!isUuid(token)) return unsubscribePageResponse(unsubscribedPage());

  const row = await prismadb.crm_Target_Email.findUnique({ where: { unsubscribe_token: token } });
  if (row) {
    const target = await prismadb.crm_Targets.findUnique({
      where: { id: row.targetId },
      select: { email: true },
    });
    const data = { do_not_email: true, do_not_email_at: new Date() };
    if (target?.email) {
      await prismadb.crm_Targets.updateMany({
        where: { email: { equals: target.email, mode: "insensitive" }, deletedAt: null },
        data,
      });
    } else {
      await prismadb.crm_Targets.update({ where: { id: row.targetId }, data });
    }
    await writeAuditLog({
      entityType: "target",
      entityId: row.targetId,
      action: "updated",
      changes: [{ field: "do_not_email", old: false, new: true }],
      userId: null,
    });
  }
  return unsubscribePageResponse(unsubscribedPage());
}
