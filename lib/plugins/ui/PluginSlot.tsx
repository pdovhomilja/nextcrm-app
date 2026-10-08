import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import type { Actor, Locale, PluginContext } from "@nextcrm/plugin-sdk";
import type { RegisteredPlugin } from "../registry";
import { createPluginContext } from "../context";
import { writePluginLog } from "../log";
import { PluginErrorBoundary } from "./PluginErrorBoundary";

export async function PluginSlot(props: { plugin: RegisteredPlugin; actor: Actor; render: (ctx: PluginContext) => ReactNode | Promise<ReactNode> }) {
  const t = await getTranslations("Plugins");
  const id = props.plugin.definition.id;
  let content: ReactNode;
  try {
    const ctx = await createPluginContext({ plugin: props.plugin, actor: props.actor, locale: (await getLocale()) as Locale });
    content = await props.render(ctx);
  } catch (e) {
    writePluginLog(id, "error", `UI render failed: ${String(e)}`);
    return <p className="text-sm text-muted-foreground">{t("sectionUnavailable")}</p>;
  }
  return <PluginErrorBoundary pluginId={id} fallback={t("sectionUnavailable")}>{content}</PluginErrorBoundary>;
}
