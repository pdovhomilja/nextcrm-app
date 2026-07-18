import { addBusinessDays } from "./business-days";

const DAY = 24 * 60 * 60 * 1000;

// Instance-grade timing knobs; the spec's numbers are the defaults, the
// live values come from crm_FunnelSettings (Admin -> Funnel settings) via
// lib/crm/funnel-settings.ts. This module stays prisma-free and pure.
export type FunnelTimingSettings = {
  killAfterDays: number;
  recycleAfterDays: number;
  cadenceTouch1BusinessDays: number;
  cadenceTouch2OffsetDays: number;
  cadenceTouch3OffsetDays: number;
  cadenceTouch4OffsetDays: number;
  cadenceTouch5OffsetDays: number;
  careCheckinDays: number;
  careReferralDays: number;
  careQuarterIntervalDays: number;
  careQuarterCount: number;
  renewalWindowDays: number;
};

export const DEFAULT_FUNNEL_SETTINGS: FunnelTimingSettings = {
  killAfterDays: 45,
  recycleAfterDays: 90,
  cadenceTouch1BusinessDays: 3,
  cadenceTouch2OffsetDays: 7,
  cadenceTouch3OffsetDays: 10,
  cadenceTouch4OffsetDays: 15,
  cadenceTouch5OffsetDays: 45,
  careCheckinDays: 30,
  careReferralDays: 90,
  careQuarterIntervalDays: 90,
  careQuarterCount: 8,
  renewalWindowDays: 30,
};

export type CadenceTouch = {
  touch: number;
  date: Date;
  kind: "call" | "email";
  title: string;
  content: string;
};

// Spec §3.5 follow-up cadence, anchored on Qualified-stage entry (quote sent).
export function cadenceSchedule(
  qualifiedEntry: Date,
  s: FunnelTimingSettings = DEFAULT_FUNNEL_SETTINGS,
): CadenceTouch[] {
  const t1 = addBusinessDays(qualifiedEntry, s.cadenceTouch1BusinessDays);
  const t2 = new Date(t1.getTime() + s.cadenceTouch2OffsetDays * DAY);
  const t3 = new Date(t2.getTime() + s.cadenceTouch3OffsetDays * DAY);
  const t4 = new Date(t3.getTime() + s.cadenceTouch4OffsetDays * DAY);
  const t5 = new Date(t3.getTime() + s.cadenceTouch5OffsetDays * DAY);
  return [
    {
      touch: 1, date: t1, kind: "call",
      title: "Cadence 1/5: Call — confirm quote receipt",
      content: "Call the client: confirm they received the quote/SOW and ask for questions.",
    },
    {
      touch: 2, date: t2, kind: "email",
      title: "Cadence 2/5: Email check-in",
      content: "Send a short check-in email about the outstanding quote.",
    },
    {
      touch: 3, date: t3, kind: "email",
      title: "Cadence 3/5: Email or call",
      content: "Reach out (email or call) — surface objections, offer a walkthrough.",
    },
    {
      touch: 4, date: t4, kind: "call",
      title: "Cadence 4/5: Call (day 15 of retention window)",
      content: "Call the client — the quote has been out ~5 weeks; probe timeline and blockers.",
    },
    {
      touch: 5, date: t5, kind: "email",
      title: "Cadence 5/5: Final reminder — offer 15-day quote extension",
      content: "Send the final reminder email; offer to extend the quote validity by 15 days if they need more time.",
    },
  ];
}

export function resolveLastClientActivity(d: {
  stageEnteredAt: Date | null;
  lastInboundEmailAt: Date | null;
  lastLoggedActivityAt: Date | null;
}): Date | null {
  const dates = [d.stageEnteredAt, d.lastInboundEmailAt, d.lastLoggedActivityAt]
    .filter((x): x is Date => x != null);
  if (dates.length === 0) return null;
  return new Date(Math.max(...dates.map((x) => x.getTime())));
}

export function isKillDue(
  lastActivity: Date | null,
  now: Date,
  s: FunnelTimingSettings = DEFAULT_FUNNEL_SETTINGS,
): boolean {
  if (!lastActivity) return false;
  return now.getTime() - lastActivity.getTime() >= s.killAfterDays * DAY;
}

export type CareEntry = { date: Date; title: string; content: string };

// Spec §3.8: check-in, referral ask, then bounded quarterly touchpoints —
// all intervals instance-configurable.
export function careSchedule(
  careEntry: Date,
  s: FunnelTimingSettings = DEFAULT_FUNNEL_SETTINGS,
): CareEntry[] {
  const entries: CareEntry[] = [
    {
      date: new Date(careEntry.getTime() + s.careCheckinDays * DAY),
      title: `Care: ${s.careCheckinDays}-day check-in`,
      content: "Check in with the client — satisfaction, issues, quick wins since deployment.",
    },
    {
      date: new Date(careEntry.getTime() + s.careReferralDays * DAY),
      title: "Care: referral ask",
      content: "Results should be measurable by now — ask for a referral and probe upsell openings.",
    },
  ];
  for (let q = 1; q <= s.careQuarterCount; q++) {
    entries.push({
      date: new Date(
        careEntry.getTime() + (s.careReferralDays + q * s.careQuarterIntervalDays) * DAY,
      ),
      title: `Care: quarterly check-in (Q${q})`,
      content: "Quarterly relationship check-in — satisfaction, renewals, expansion opportunities.",
    });
  }
  return entries;
}

export function renewalWindowEnd(
  now: Date,
  s: FunnelTimingSettings = DEFAULT_FUNNEL_SETTINGS,
): Date {
  return new Date(now.getTime() + s.renewalWindowDays * DAY);
}
