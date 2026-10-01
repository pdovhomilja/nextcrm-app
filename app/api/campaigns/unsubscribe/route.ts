import { prismadb } from "@/lib/prisma";
import {
  unsubscribeConfirmPage,
  unsubscribedPage,
  unsubscribePageResponse,
} from "@/lib/email/unsubscribe-page";

// Public endpoint (no auth) — the unguessable per-send token is the capability.
//
// GET  = safe: shows a confirmation form, NEVER mutates. Mail scanners and link
//        prefetchers (Outlook Safe Links, spam filters, chat unfurlers) auto-GET
//        links in emails and must not unsubscribe recipients. (Previously this
//        route unsubscribed on GET — a scanner could silently opt people out.)
// POST = mutates: stamps unsubscribed_at on the send and sets do_not_email on every
//        non-deleted target sharing the address (email-wide, case-insensitive).
//        Serviced by the form button AND RFC 8058 one-click (List-Unsubscribe-Post).
// Unknown/missing tokens get the same generic 200 page (no enumeration).

const ACTION = "/api/campaigns/unsubscribe";

export async function GET(req: Request): Promise<Response> {
  const token = new URL(req.url).searchParams.get("token");
  // Deliberately no DB read/write: the same confirm page is shown for any token.
  return unsubscribePageResponse(unsubscribeConfirmPage(ACTION, token));
}

export async function POST(req: Request): Promise<Response> {
  let token = new URL(req.url).searchParams.get("token");
  if (!token) {
    // Form button / one-click providers put the token in the body.
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("form-urlencoded") || ct.includes("form-data")) {
      try {
        const form = await req.formData();
        const t = form.get("token");
        token = typeof t === "string" ? t : null;
      } catch {
        /* no parseable body */
      }
    }
  }
  if (!token) return unsubscribePageResponse(unsubscribedPage()); // generic (no enumeration)

  const send = await prismadb.crm_campaign_sends.findUnique({
    where: { unsubscribe_token: token },
  });

  if (send) {
    if (!send.unsubscribed_at) {
      await prismadb.crm_campaign_sends.update({
        where: { unsubscribe_token: token },
        data: { unsubscribed_at: new Date() },
      });
    }
    // Global suppression: never email this address again, from any campaign.
    // Best-effort — the confirmation must not fail on a transient secondary write.
    try {
      await prismadb.crm_Targets.updateMany({
        where: {
          do_not_email: false,
          OR: [
            { id: send.target_id },
            { email: { equals: send.email, mode: "insensitive" } },
          ],
        },
        data: { do_not_email: true, do_not_email_at: new Date() },
      });
    } catch (error) {
      console.error("[unsubscribe] global suppression failed:", error);
    }
  }

  return unsubscribePageResponse(unsubscribedPage()); // same page regardless
}
