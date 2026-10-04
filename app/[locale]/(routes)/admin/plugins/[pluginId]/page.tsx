import type { ReactElement } from "react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@nextcrm/plugin-sdk";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/authz";
import { findPlugin } from "@/lib/plugins/registry";
import { getPluginState, listPluginsForAdmin } from "@/lib/plugins/state";
import { describeSettingsSchema, parseStoredSettings } from "@/lib/plugins/settings";
import { getUninstallSummary } from "@/lib/plugins/lifecycle";
import { createPluginContext } from "@/lib/plugins/context";
import { PluginErrorBoundary } from "@/lib/plugins/ui/PluginErrorBoundary";
import { getSecretFlags } from "../_actions/plugins";
import { PluginSettingsForm } from "../_components/PluginSettingsForm";
import { PluginStatusControls } from "../_components/PluginStatusControls";
import { UninstallDialog } from "../_components/UninstallDialog";
import { PluginLogTable } from "../_components/PluginLogTable";

export default async function PluginDetailPage({ params }: { params: Promise<{ pluginId: string }> }) {
  const { pluginId } = await params;
  const admin = await requireRole(["admin"]);
  const t = await getTranslations("Plugins.admin");
  const row = (await listPluginsForAdmin()).find((p) => p.id === pluginId);
  if (!row) notFound();
  const plugin = findPlugin(pluginId);
  const state = await getPluginState(pluginId);
  const summary = state ? await getUninstallSummary(pluginId) : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>{row.name}</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>{row.description}</p>
          {state && plugin && state.version !== plugin.definition.version && (
            <p>{t("upgradePending", { from: state.version, to: plugin.definition.version })}</p>
          )}
          {row.status === "MISSING" && <p>{t("missing")}</p>}
          <div className="flex flex-wrap gap-2">
            {state && plugin && <PluginStatusControls pluginId={pluginId} enabled={state.status === "ENABLED"} />}
            {state && summary && <UninstallDialog pluginId={pluginId} name={row.name} entries={summary.entries} records={summary.records} />}
          </div>
        </CardContent>
      </Card>

      {plugin && (
        <Card>
          <CardHeader><CardTitle>{t("settings")}</CardTitle></CardHeader>
          <CardContent>
            <PluginSettingsForm
              pluginId={pluginId}
              mode={state ? "save" : "install"}
              fields={describeSettingsSchema(plugin.definition.settings)}
              secretFields={describeSettingsSchema(plugin.definition.secrets)}
              values={state ? parseStoredSettings(plugin.definition.settings, state.settings, () => {}) : {}}
              secretFlags={state ? await getSecretFlags(pluginId) : {}}
              permissions={plugin.definition.permissions}
            />
          </CardContent>
        </Card>
      )}

      {plugin && state?.status === "ENABLED" && plugin.definition.extensions.adminSections.length > 0 && (
        <AdminSections pluginId={pluginId} userId={admin.id} />
      )}

      {state && (
        <Card>
          <CardHeader><CardTitle>{t("log")}</CardTitle></CardHeader>
          <CardContent><PluginLogTable pluginId={pluginId} /></CardContent>
        </Card>
      )}
    </div>
  );
}

async function AdminSections({ pluginId, userId }: { pluginId: string; userId: string }) {
  const plugin = findPlugin(pluginId)!;
  const t = await getTranslations("Plugins");
  const ctx = await createPluginContext({ plugin, actor: { type: "user", userId, role: "admin" }, locale: (await getLocale()) as Locale });
  return (
    <>
      {plugin.definition.extensions.adminSections.map((section, i) => {
        // Async server component: React types in this TS version don't accept Promise<ReactNode> as a JSX type
        const Section = section as unknown as (props: { ctx: typeof ctx }) => Promise<ReactElement>;
        return (
          <PluginErrorBoundary key={i} pluginId={pluginId} fallback={t("sectionUnavailable")}>
            <Section ctx={ctx} />
          </PluginErrorBoundary>
        );
      })}
    </>
  );
}
