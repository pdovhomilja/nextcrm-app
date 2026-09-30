import { prismadb } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";

// Public endpoint (no auth) — the unguessable per-email token is the capability.
//
// GET  = safe: shows a confirmation form, NEVER mutates (mail scanners and link
//        prefetchers auto-GET links in emails and must not unsubscribe prospects).
// POST = mutates: sets do_not_email on every non-deleted target sharing the address
//        (email-wide, case-insensitive — mirrors app/api/campaigns/unsubscribe). Serviced both by the form's
//        button click and by RFC 8058 one-click (List-Unsubscribe-Post) providers.
// Unknown/missing/malformed tokens get the same generic 200 page (no enumeration).
// The token column is @db.Uuid, so a non-UUID is rejected BEFORE any query (a raw
// lookup would throw Prisma P2007 -> 500).

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (t: string | null): t is string => !!t && UUID_RE.test(t);

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const PAGE = (body: string) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe</title></head><body style="font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center"><h2>Rade Engineering</h2>${body}</body></html>`;

const html = (body: string) =>
  new Response(PAGE(body), {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      // The GET URL carries a capability token: never cache or index it.
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  });

const confirmForm = (token: string | null) =>
  html(
    `<p>Click the button below to stop receiving emails from us.</p>` +
      `<form method="POST" action="/api/crm/targets/unsubscribe${
        token ? `?token=${encodeURIComponent(token)}` : ""
      }"><input type="hidden" name="token" value="${escapeHtml(token ?? "")}">` +
      `<button type="submit" style="padding:10px 24px;font-size:16px;cursor:pointer">Unsubscribe</button></form>`
  );

const unsubscribed = () =>
  html("<p>You have been unsubscribed. You will not receive further emails from us.</p>");

export async function GET(req: Request): Promise<Response> {
  const token = new URL(req.url).searchParams.get("token");
  // Deliberately no DB read/write: the same page is shown for any token.
  return confirmForm(token);
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
  if (!isUuid(token)) return unsubscribed();

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
  return unsubscribed();
}
