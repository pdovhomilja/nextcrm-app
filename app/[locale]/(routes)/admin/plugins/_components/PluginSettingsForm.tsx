"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import type { SettingsField } from "@/lib/plugins/settings";
import { installPluginAction, savePluginSettingsAction } from "../_actions/plugins";

interface Props {
  pluginId: string;
  mode: "install" | "save";
  fields: SettingsField[];
  secretFields: SettingsField[];
  values: Record<string, unknown>;
  secretFlags: Record<string, boolean>;
  permissions: string[];
}

export function PluginSettingsForm({ pluginId, mode, fields, secretFields, values, secretFlags, permissions }: Props) {
  const t = useTranslations("Plugins.admin");
  const [pending, start] = useTransition();
  const [granted, setGranted] = useState(mode === "save");
  const [state, setState] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, values[f.key] ?? f.defaultValue ?? (f.kind === "boolean" ? false : "")])),
  );
  const [secrets, setSecrets] = useState<Record<string, string>>({});

  const coerce = () =>
    Object.fromEntries(fields.map((f) => {
      const v = state[f.key];
      if (f.kind === "number") return [f.key, v === "" ? undefined : Number(v)];
      if (v === "" && !f.required) return [f.key, undefined];
      return [f.key, v];
    }));

  const submit = () =>
    start(async () => {
      const action = mode === "install" ? installPluginAction : savePluginSettingsAction;
      const res = await action(pluginId, coerce(), secrets);
      if (res.ok) toast.success(t("saved")); else toast.error(res.error ?? "Error");
    });

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      {fields.map((f) => (
        <div key={f.key} className="space-y-1">
          <Label htmlFor={`setting-${f.key}`}>{f.key}{f.required ? " *" : ""}</Label>
          {f.kind === "boolean" ? (
            <Switch id={`setting-${f.key}`} checked={Boolean(state[f.key])} onCheckedChange={(v) => setState({ ...state, [f.key]: v })} />
          ) : f.kind === "enum" ? (
            <select id={`setting-${f.key}`} className="border rounded-md h-9 px-2 bg-background" value={String(state[f.key] ?? "")}
              onChange={(e) => setState({ ...state, [f.key]: e.target.value })}>
              {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <Input id={`setting-${f.key}`} type={f.kind === "number" ? "number" : "text"} value={String(state[f.key] ?? "")}
              onChange={(e) => setState({ ...state, [f.key]: e.target.value })} />
          )}
        </div>
      ))}
      {secretFields.length > 0 && <h3 className="text-sm font-medium pt-2">{t("secrets")}</h3>}
      {secretFields.map((f) => (
        <div key={f.key} className="space-y-1">
          <Label htmlFor={`secret-${f.key}`}>{f.key}{f.required ? " *" : ""}</Label>
          <Input id={`secret-${f.key}`} type="password" autoComplete="off"
            placeholder={secretFlags[f.key] ? t("secretSet") : ""}
            value={secrets[f.key] ?? ""} onChange={(e) => setSecrets({ ...secrets, [f.key]: e.target.value })} />
        </div>
      ))}
      {mode === "install" && (
        <div className="space-y-2 border rounded-md p-3">
          <p className="text-sm font-medium">{t("permissions")}</p>
          <ul className="text-sm list-disc pl-5">{permissions.map((p) => <li key={p}><code>{p}</code></li>)}</ul>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox id="grant-permissions" checked={granted} onCheckedChange={(v) => setGranted(v === true)} />
            {t("confirmPermissions")}
          </label>
        </div>
      )}
      <Button type="submit" disabled={pending || !granted}>{mode === "install" ? t("install") : t("save")}</Button>
    </form>
  );
}
