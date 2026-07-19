"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FunnelTimingSettings } from "@/lib/crm/funnel-timers";
import { updateFunnelSettings } from "../_actions/funnel-settings";

const FIELDS: Array<{ key: keyof FunnelTimingSettings; label: string; group: string }> = [
  { key: "killAfterDays", label: "Close deal after N days of client silence", group: "Kill rule" },
  { key: "recycleAfterDays", label: "Recycle targets N days after sequence end", group: "Recycle" },
  { key: "cadenceTouch1BusinessDays", label: "Touch 1: business days after quote", group: "Follow-up cadence" },
  { key: "cadenceTouch2OffsetDays", label: "Touch 2: days after touch 1", group: "Follow-up cadence" },
  { key: "cadenceTouch3OffsetDays", label: "Touch 3: days after touch 2", group: "Follow-up cadence" },
  { key: "cadenceTouch4OffsetDays", label: "Touch 4: days after touch 3", group: "Follow-up cadence" },
  { key: "cadenceTouch5OffsetDays", label: "Touch 5 (final): days after touch 3", group: "Follow-up cadence" },
  { key: "careCheckinDays", label: "Care check-in after N days", group: "Care & renewals" },
  { key: "careReferralDays", label: "Referral ask after N days", group: "Care & renewals" },
  { key: "careQuarterIntervalDays", label: "Quarterly interval (days)", group: "Care & renewals" },
  { key: "careQuarterCount", label: "Number of quarterly check-ins", group: "Care & renewals" },
  { key: "renewalWindowDays", label: "Surface renewals N days ahead", group: "Care & renewals" },
];

const FunnelSettingsForm = ({ initial }: { initial: FunnelTimingSettings }) => {
  const [values, setValues] = useState<FunnelTimingSettings>(initial);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await updateFunnelSettings(values);
      if (res.error) toast.error(res.error);
      else toast.success("Funnel settings saved");
    } catch {
      toast.error("Failed to save funnel settings");
    } finally {
      setSaving(false);
    }
  };

  const groups = Array.from(new Set(FIELDS.map((f) => f.group)));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Funnel timing — instance settings</CardTitle>
        <p className="text-sm text-muted-foreground">
          Changes apply to future stage entries and the next timer runs;
          already-scheduled cadences keep the timings they started with.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {groups.map((group) => (
          <div key={group} className="space-y-2">
            <h3 className="text-sm font-semibold">{group}</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {FIELDS.filter((f) => f.group === group).map((f) => (
                <label key={f.key} className="space-y-1 text-sm">
                  <span>{f.label}</span>
                  <Input
                    type="number"
                    min={0}
                    value={values[f.key]}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [f.key]: Number(e.target.value) }))
                    }
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default FunnelSettingsForm;
