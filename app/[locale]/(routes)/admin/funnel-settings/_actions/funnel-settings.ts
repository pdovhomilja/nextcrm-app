"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prismadb } from "@/lib/prisma";
import { requireRole, AuthorizationError, AuthenticationError } from "@/lib/authz";
import type { FunnelTimingSettings } from "@/lib/crm/funnel-timers";

const dayField = z.number().int().min(1).max(365);
const settingsSchema = z.object({
  killAfterDays: dayField,
  recycleAfterDays: dayField,
  cadenceTouch1BusinessDays: dayField,
  cadenceTouch2OffsetDays: dayField,
  cadenceTouch3OffsetDays: dayField,
  cadenceTouch4OffsetDays: dayField,
  cadenceTouch5OffsetDays: dayField,
  careCheckinDays: dayField,
  careReferralDays: dayField,
  careQuarterIntervalDays: dayField,
  careQuarterCount: z.number().int().min(0).max(24),
  renewalWindowDays: dayField,
});

export async function updateFunnelSettings(
  values: FunnelTimingSettings,
): Promise<{ error?: string }> {
  let admin;
  try {
    admin = await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthorizationError || e instanceof AuthenticationError) {
      return { error: "Forbidden" };
    }
    throw e;
  }

  const parsed = settingsSchema.safeParse(values);
  if (!parsed.success) return { error: "Invalid values — all fields must be whole days in range." };
  const v = parsed.data;

  const data = {
    kill_after_days: v.killAfterDays,
    recycle_after_days: v.recycleAfterDays,
    cadence_touch1_business_days: v.cadenceTouch1BusinessDays,
    cadence_touch2_offset_days: v.cadenceTouch2OffsetDays,
    cadence_touch3_offset_days: v.cadenceTouch3OffsetDays,
    cadence_touch4_offset_days: v.cadenceTouch4OffsetDays,
    cadence_touch5_offset_days: v.cadenceTouch5OffsetDays,
    care_checkin_days: v.careCheckinDays,
    care_referral_days: v.careReferralDays,
    care_quarter_interval_days: v.careQuarterIntervalDays,
    care_quarter_count: v.careQuarterCount,
    renewal_window_days: v.renewalWindowDays,
    updatedBy: admin.id,
  };

  const existing = await prismadb.crm_FunnelSettings.findFirst({ select: { id: true } });
  if (existing) {
    await prismadb.crm_FunnelSettings.update({ where: { id: existing.id }, data });
  } else {
    await prismadb.crm_FunnelSettings.create({ data });
  }
  revalidatePath("/[locale]/(routes)/admin/funnel-settings", "page");
  return {};
}
