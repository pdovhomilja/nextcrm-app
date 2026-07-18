jest.mock("@/lib/prisma", () => ({
  prismadb: { crm_FunnelSettings: { findFirst: jest.fn() } },
}));

import { prismadb } from "@/lib/prisma";
import {
  cadenceSchedule,
  resolveLastClientActivity,
  isKillDue,
  careSchedule,
  renewalWindowEnd,
  DEFAULT_FUNNEL_SETTINGS,
} from "@/lib/crm/funnel-timers";
import { getFunnelSettings } from "@/lib/crm/funnel-settings";
import { addBusinessDays } from "@/lib/crm/business-days";

const DAY = 24 * 60 * 60 * 1000;

describe("cadenceSchedule", () => {
  // Wed 2026-07-15
  const entry = new Date("2026-07-15T09:00:00Z");
  const s = cadenceSchedule(entry);

  it("produces 5 touches with spec timings", () => {
    expect(s).toHaveLength(5);
    const t1 = addBusinessDays(entry, 3);
    expect(s[0]).toMatchObject({ touch: 1, kind: "call", date: t1 });
    expect(s[1]).toMatchObject({ touch: 2, kind: "email", date: new Date(t1.getTime() + 7 * DAY) });
    const t3 = new Date(t1.getTime() + 17 * DAY);
    expect(s[2]).toMatchObject({ touch: 3, kind: "email", date: t3 });
    expect(s[3]).toMatchObject({ touch: 4, kind: "call", date: new Date(t3.getTime() + 15 * DAY) });
    expect(s[4]).toMatchObject({ touch: 5, kind: "email", date: new Date(t3.getTime() + 45 * DAY) });
  });

  it("every touch has a non-empty title and content", () => {
    for (const t of s) {
      expect(t.title.length).toBeGreaterThan(0);
      expect(t.content.length).toBeGreaterThan(0);
    }
  });
});

describe("resolveLastClientActivity / isKillDue", () => {
  const now = new Date("2026-07-18T00:00:00Z");

  it("takes the max of available dates", () => {
    expect(
      resolveLastClientActivity({
        stageEnteredAt: new Date("2026-01-01"),
        lastInboundEmailAt: new Date("2026-06-01"),
        lastLoggedActivityAt: new Date("2026-03-01"),
      }),
    ).toEqual(new Date("2026-06-01"));
  });

  it("returns null when nothing is known", () => {
    expect(
      resolveLastClientActivity({
        stageEnteredAt: null, lastInboundEmailAt: null, lastLoggedActivityAt: null,
      }),
    ).toBeNull();
  });

  it("kill is due at 45+ days of silence, not before, never on null", () => {
    expect(isKillDue(new Date(now.getTime() - 46 * DAY), now)).toBe(true);
    expect(isKillDue(new Date(now.getTime() - 45 * DAY), now)).toBe(true);
    expect(isKillDue(new Date(now.getTime() - 44 * DAY), now)).toBe(false);
    expect(isKillDue(null, now)).toBe(false);
  });
});

describe("careSchedule", () => {
  const entry = new Date("2026-07-01T09:00:00Z");
  const s = careSchedule(entry);

  it("is +30d check-in, +90d referral, then 8 quarterly entries", () => {
    expect(s).toHaveLength(10);
    expect(s[0].date).toEqual(new Date(entry.getTime() + 30 * DAY));
    expect(s[1].date).toEqual(new Date(entry.getTime() + 90 * DAY));
    expect(s[2].date).toEqual(new Date(entry.getTime() + 180 * DAY));
    expect(s[9].date).toEqual(new Date(entry.getTime() + (90 + 8 * 90) * DAY));
  });
});

describe("renewalWindowEnd", () => {
  it("is now + 30 days", () => {
    const now = new Date("2026-07-18T00:00:00Z");
    expect(renewalWindowEnd(now)).toEqual(new Date(now.getTime() + 30 * DAY));
  });
});

describe("settings overrides", () => {
  it("cadenceSchedule honors configured offsets", () => {
    const entry = new Date("2026-07-15T09:00:00Z"); // Wed
    const s = cadenceSchedule(entry, {
      ...DEFAULT_FUNNEL_SETTINGS,
      cadenceTouch1BusinessDays: 1,
      cadenceTouch2OffsetDays: 2,
    });
    const t1 = addBusinessDays(entry, 1);
    expect(s[0].date).toEqual(t1);
    expect(s[1].date).toEqual(new Date(t1.getTime() + 2 * DAY));
  });

  it("isKillDue honors a configured threshold", () => {
    const now = new Date("2026-07-18T00:00:00Z");
    const s = { ...DEFAULT_FUNNEL_SETTINGS, killAfterDays: 10 };
    expect(isKillDue(new Date(now.getTime() - 11 * DAY), now, s)).toBe(true);
    expect(isKillDue(new Date(now.getTime() - 9 * DAY), now, s)).toBe(false);
  });

  it("careSchedule honors configured quarter count", () => {
    const s = careSchedule(new Date("2026-07-01T09:00:00Z"), {
      ...DEFAULT_FUNNEL_SETTINGS,
      careQuarterCount: 2,
    });
    expect(s).toHaveLength(4);
  });
});

describe("getFunnelSettings", () => {
  it("returns defaults when no settings row exists", async () => {
    (prismadb.crm_FunnelSettings.findFirst as jest.Mock).mockResolvedValue(null);
    expect(await getFunnelSettings()).toEqual(DEFAULT_FUNNEL_SETTINGS);
  });

  it("maps a stored row to camelCase settings", async () => {
    (prismadb.crm_FunnelSettings.findFirst as jest.Mock).mockResolvedValue({
      kill_after_days: 30, recycle_after_days: 60,
      cadence_touch1_business_days: 2, cadence_touch2_offset_days: 5,
      cadence_touch3_offset_days: 7, cadence_touch4_offset_days: 10,
      cadence_touch5_offset_days: 30, care_checkin_days: 14,
      care_referral_days: 60, care_quarter_interval_days: 60,
      care_quarter_count: 4, renewal_window_days: 21,
    });
    const s = await getFunnelSettings();
    expect(s.killAfterDays).toBe(30);
    expect(s.renewalWindowDays).toBe(21);
  });
});
