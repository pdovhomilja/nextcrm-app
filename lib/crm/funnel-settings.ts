import { prismadb } from "@/lib/prisma";
import {
  DEFAULT_FUNNEL_SETTINGS,
  type FunnelTimingSettings,
} from "./funnel-timers";

// Singleton-by-convention read of the instance funnel settings. No row
// yet (fresh install) -> spec defaults.
export async function getFunnelSettings(): Promise<FunnelTimingSettings> {
  const row = await prismadb.crm_FunnelSettings.findFirst();
  if (!row) return DEFAULT_FUNNEL_SETTINGS;
  return {
    killAfterDays: row.kill_after_days,
    recycleAfterDays: row.recycle_after_days,
    cadenceTouch1BusinessDays: row.cadence_touch1_business_days,
    cadenceTouch2OffsetDays: row.cadence_touch2_offset_days,
    cadenceTouch3OffsetDays: row.cadence_touch3_offset_days,
    cadenceTouch4OffsetDays: row.cadence_touch4_offset_days,
    cadenceTouch5OffsetDays: row.cadence_touch5_offset_days,
    careCheckinDays: row.care_checkin_days,
    careReferralDays: row.care_referral_days,
    careQuarterIntervalDays: row.care_quarter_interval_days,
    careQuarterCount: row.care_quarter_count,
    renewalWindowDays: row.renewal_window_days,
  };
}
