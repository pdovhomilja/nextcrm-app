"use client";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setPluginEnabledAction } from "../_actions/plugins";

export function PluginStatusControls({ pluginId, enabled }: { pluginId: string; enabled: boolean }) {
  const t = useTranslations("Plugins.admin");
  const [pending, start] = useTransition();
  const toggle = () => start(async () => {
    const res = await setPluginEnabledAction(pluginId, !enabled);
    if (!res.ok) toast.error(res.error ?? "Error");
  });
  return <Button variant="outline" disabled={pending} onClick={toggle}>{enabled ? t("disable") : t("enable")}</Button>;
}
