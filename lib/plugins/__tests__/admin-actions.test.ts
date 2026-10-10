jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({ prismadb: { users: { findUnique: jest.fn() } } }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("next-intl/server", () => ({ getLocale: jest.fn(async () => "en") }));
jest.mock("@/lib/plugins/lifecycle", () => ({ installPlugin: jest.fn(), savePluginSettings: jest.fn(), setPluginEnabled: jest.fn(), uninstallPlugin: jest.fn() }));
jest.mock("@/lib/plugins/state", () => ({ getPluginState: jest.fn() }));
jest.mock("@/lib/plugins/settings", () => ({ decryptSecrets: jest.fn() }));
jest.mock("@/lib/plugins/registry", () => ({ findPlugin: jest.fn() }));
jest.mock("@/lib/plugins/context", () => ({ createPluginContext: jest.fn(async () => ({ id: "ctx" })) }));
jest.mock("@/lib/plugins/log", () => ({ writePluginLog: jest.fn() }));

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { getPluginState } from "@/lib/plugins/state";
import { findPlugin } from "@/lib/plugins/registry";
import { writePluginLog } from "@/lib/plugins/log";
import { runPluginAdminActionAction } from "@/app/[locale]/(routes)/admin/plugins/_actions/plugins";

const as = (role: string) => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id: "u1" } });
  ((prismadb as any).users.findUnique as jest.Mock).mockResolvedValue({ id: "u1", role, userStatus: "ACTIVE" });
};
const handler = jest.fn(async () => "Connected");
beforeEach(() => {
  jest.clearAllMocks();
  (findPlugin as jest.Mock).mockReturnValue({ definition: { id: "p", extensions: { adminActions: [{ id: "test", label: "x", handler }] } } });
  (getPluginState as jest.Mock).mockResolvedValue({ status: "ENABLED" });
});

it("runs an admin action for admins on enabled plugins", async () => {
  as("admin");
  await expect(runPluginAdminActionAction("p", "test")).resolves.toEqual({ ok: true, message: "Connected" });
  expect(handler).toHaveBeenCalledWith({ id: "ctx" });
});

it("refuses non-admins, disabled plugins and unknown actions", async () => {
  as("manager");
  await expect(runPluginAdminActionAction("p", "test")).resolves.toEqual({ ok: false, error: "Forbidden" });
  as("admin");
  (getPluginState as jest.Mock).mockResolvedValue({ status: "DISABLED" });
  await expect(runPluginAdminActionAction("p", "test")).resolves.toEqual({ ok: false, error: "Not found" });
  (getPluginState as jest.Mock).mockResolvedValue({ status: "ENABLED" });
  await expect(runPluginAdminActionAction("p", "nope")).resolves.toEqual({ ok: false, error: "Not found" });
  expect(handler).not.toHaveBeenCalled();
});

it("reports and logs a failing action", async () => {
  as("admin");
  handler.mockRejectedValueOnce(new Error("Odoo rejected the API key"));
  await expect(runPluginAdminActionAction("p", "test")).resolves.toEqual({ ok: false, error: "Odoo rejected the API key" });
  expect(writePluginLog).toHaveBeenCalledWith("p", "error", expect.stringContaining("test"));
});
