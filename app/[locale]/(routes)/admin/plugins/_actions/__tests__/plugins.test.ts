jest.mock("@/lib/authz", () => ({
  requireRole: jest.fn(async () => ({ id: "admin-1", role: "admin" })),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
const lifecycle = {
  installPlugin: jest.fn(), setPluginEnabled: jest.fn(), savePluginSettings: jest.fn(), uninstallPlugin: jest.fn(),
};
jest.mock("@/lib/plugins/lifecycle", () => lifecycle);
jest.mock("@/lib/plugins/state", () => ({ getPluginState: jest.fn(async () => ({ id: "demo", secrets: "cipher" })) }));
jest.mock("@/lib/plugins/settings", () => ({ decryptSecrets: () => ({ apiKey: "very-secret", empty: "" }) }));

import { getSecretFlags, installPluginAction, savePluginSettingsAction } from "../plugins";
import { requireRole, AuthorizationError } from "@/lib/authz";

it("returns only boolean flags for secrets (Review Focus 4)", async () => {
  const flags = await getSecretFlags("demo");
  expect(flags).toEqual({ apiKey: true, empty: false });
  expect(JSON.stringify(flags)).not.toContain("very-secret");
});

it("maps lifecycle errors to { ok: false, error } and never echoes secrets", async () => {
  lifecycle.savePluginSettings.mockRejectedValueOnce(new Error("Invalid input"));
  const res = await savePluginSettingsAction("demo", { days: 1 }, { apiKey: "new-secret" });
  expect(res).toEqual({ ok: false, error: "Invalid input" });
  expect(JSON.stringify(res)).not.toContain("new-secret");
});

it("rejects non-admins", async () => {
  (requireRole as jest.Mock).mockRejectedValueOnce(new (AuthorizationError as any)("no"));
  await expect(installPluginAction("demo", {}, {})).resolves.toEqual({ ok: false, error: "Forbidden" });
  expect(lifecycle.installPlugin).not.toHaveBeenCalled();
});
