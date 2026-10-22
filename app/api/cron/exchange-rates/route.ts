import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { persistFrankfurterRates } from "@/lib/currency/persist-frankfurter-rates";

export const maxDuration = 300;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const received = Buffer.from(header);
  const wanted = Buffer.from(expected);
  if (received.length !== wanted.length) return false;
  return timingSafeEqual(received, wanted);
}

/** Hobby Cron: once a day. Vercel sends Authorization: Bearer $CRON_SECRET. */
export async function GET(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const updated = await persistFrankfurterRates();
    revalidateTag("platform-currencies", "max");
    revalidateTag("crm-config", "max");
    return Response.json({ ok: true, updated });
  } catch (error) {
    console.error("exchange-rates cron failed", error);
    return Response.json({ ok: false }, { status: 500 });
  }
}
