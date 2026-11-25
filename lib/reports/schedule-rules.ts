import { prismadb } from "@/lib/prisma";
import { isManagerOrAdmin } from "@/lib/authz/roles";
import type { AuthzUser } from "@/lib/authz/session";

export const MAX_REPORT_RECIPIENTS = 10;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How often a scheduled report goes out: daily, weekly on one weekday, or
 * monthly on one day, all at 9:00 (the Schedule dialog's choices). Any other
 * cron expression is unsupported and returns null: never stored, never sent.
 */
export function scheduleIntervalMs(cron: string): number | null {
  if (cron === "0 9 * * *") return DAY_MS;
  if (/^0 9 \* \* [0-6]$/.test(cron)) return 7 * DAY_MS;
  if (/^0 9 ([1-9]|[12]\d|3[01]) \* \*$/.test(cron)) return 28 * DAY_MS;
  return null;
}

/**
 * Recipients the sender may not mail. Managers and admins may mail any
 * address; everyone else only the e-mail addresses of active users of this
 * instance.
 */
export async function disallowedRecipients(sender: AuthzUser, recipients: string[]): Promise<string[]> {
  if (isManagerOrAdmin(sender)) return [];
  const users = await prismadb.users.findMany({
    where: { email: { in: recipients, mode: "insensitive" }, userStatus: "ACTIVE" },
    select: { email: true },
  });
  const allowed = new Set(users.map((u) => u.email.toLowerCase()));
  return recipients.filter((r) => !allowed.has(r.toLowerCase()));
}
