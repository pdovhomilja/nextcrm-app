// No DOM test environment in this repo: call the component directly with a minimal
// stand-in for React's hooks and drive the returned element tree.
const slots: unknown[] = [];
let slot = 0;
jest.mock("react", () => {
  const actual = jest.requireActual("react");
  return {
    ...actual,
    useState: (init: unknown) => {
      const i = slot++;
      if (!(i in slots)) slots[i] = typeof init === "function" ? (init as () => unknown)() : init;
      return [slots[i], (v: unknown) => { slots[i] = v; }];
    },
    useTransition: () => [false, (fn: () => Promise<void>) => { pending = fn(); }],
  };
});
let pending: Promise<void> = Promise.resolve();
jest.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/components/ui/button", () => ({ Button: () => null }));
jest.mock("@/components/ui/input", () => ({ Input: () => null }));
jest.mock("@/components/ui/label", () => ({ Label: () => null }));
jest.mock("@/components/ui/switch", () => ({ Switch: () => null }));
jest.mock("@/components/ui/checkbox", () => ({ Checkbox: () => null }));
const save = jest.fn(async () => ({ ok: true }));
jest.mock("@/app/[locale]/(routes)/admin/plugins/_actions/plugins", () => ({ installPluginAction: jest.fn(), savePluginSettingsAction: save }));

import React, { type ReactElement } from "react";
import { PluginSettingsForm } from "@/app/[locale]/(routes)/admin/plugins/_components/PluginSettingsForm";

// Jest compiles JSX in classic mode, so the component file needs React in scope.
(global as unknown as { React: typeof React }).React = React;

type El = ReactElement<Record<string, unknown>>;
const find = (node: unknown, match: (p: Record<string, unknown>) => boolean): El | undefined => {
  if (Array.isArray(node)) { for (const n of node) { const f = find(n, match); if (f) return f; } return undefined; }
  if (!node || typeof node !== "object" || !("props" in node)) return undefined;
  const el = node as El;
  return match(el.props) ? el : find(el.props.children, match);
};

const render = () => {
  slot = 0;
  return PluginSettingsForm({
    pluginId: "odoo-connector", mode: "save", permissions: [], values: { url: "https://odoo.test" },
    fields: [{ key: "url", kind: "string", required: true }] as never,
    secretFields: [{ key: "apiKey", kind: "string", required: true }] as never,
    secretFlags: { apiKey: true },
  }) as El;
};
const submit = async () => {
  (find(render(), (p) => typeof p.onSubmit === "function")!.props.onSubmit as (e: unknown) => void)({ preventDefault() {} });
  await pending;
};

it("does not re-send a secret typed before an earlier save (F5)", async () => {
  const key = find(render(), (p) => p.id === "secret-apiKey")!;
  (key.props.onChange as (e: unknown) => void)({ target: { value: "typed-once" } });
  await submit();
  await submit();
  expect(save).toHaveBeenCalledTimes(2);
  expect((save.mock.calls[0] as unknown[])[2]).toEqual({ apiKey: "typed-once" });
  expect((save.mock.calls[1] as unknown[])[2]).toEqual({});
});
