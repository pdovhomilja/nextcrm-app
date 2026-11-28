jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({ prismadb: { users: { findUnique: jest.fn() } } }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("next-intl/server", () => ({ getLocale: jest.fn(async () => "en") }));
jest.mock("@/lib/plugins/state", () => ({ getPluginState: jest.fn() }));
jest.mock("@/lib/plugins/registry", () => ({ findPlugin: jest.fn() }));
jest.mock("@/lib/plugins/context", () => ({ createPluginContext: jest.fn(async () => ({ id: "ctx" })) }));
jest.mock("@/lib/plugins/log", () => ({ writePluginLog: jest.fn() }));

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { getPluginState } from "@/lib/plugins/state";
import { findPlugin } from "@/lib/plugins/registry";
import { createPluginContext } from "@/lib/plugins/context";
import { writePluginLog } from "@/lib/plugins/log";
import { runPluginPageActionAction } from "@/app/[locale]/(routes)/p/_actions/page-actions";

const as = (role: string) => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id: "u1" } });
  ((prismadb as any).users.findUnique as jest.Mock).mockResolvedValue({ id: "u1", role, userStatus: "ACTIVE" });
};
const handler = jest.fn(async () => "Linked");
beforeEach(() => {
  jest.clearAllMocks();
  (findPlugin as jest.Mock).mockReturnValue({ definition: { id: "p", extensions: { pageActions: [{ id: "confirm", roles: ["manager", "admin"], handler }] } } });
  (getPluginState as jest.Mock).mockResolvedValue({ status: "ENABLED" });
});

it.each(["manager", "admin"])("runs a page action for a %s with the given input, as that user", async (role) => {
  as(role);
  await expect(runPluginPageActionAction("p", "confirm", { id: "7" })).resolves.toEqual({ ok: true, message: "Linked" });
  expect(handler).toHaveBeenCalledWith({ id: "ctx" }, { id: "7" });
  expect(createPluginContext).toHaveBeenCalledWith(expect.objectContaining({ actor: { type: "user", userId: "u1", role } }));
});

it("refuses a role the action does not list, a disabled plugin and an unknown action", async () => {
  as("user");
  await expect(runPluginPageActionAction("p", "confirm", { id: "7" })).resolves.toEqual({ ok: false, error: "Forbidden" });
  as("manager");
  (getPluginState as jest.Mock).mockResolvedValue({ status: "DISABLED" });
  await expect(runPluginPageActionAction("p", "confirm", { id: "7" })).resolves.toEqual({ ok: false, error: "Not found" });
  (getPluginState as jest.Mock).mockResolvedValue({ status: "ENABLED" });
  await expect(runPluginPageActionAction("p", "nope", { id: "7" })).resolves.toEqual({ ok: false, error: "Not found" });
  expect(handler).not.toHaveBeenCalled();
});

it("refuses partners and input that is not a flat object of strings", async () => {
  as("partner");
  await expect(runPluginPageActionAction("p", "confirm", { id: "7" })).resolves.toEqual({ ok: false, error: "Unauthorized" });
  as("admin");
  for (const bad of [null, "x", ["7"], { id: 7 }, { id: { in: [] } }]) {
    await expect(runPluginPageActionAction("p", "confirm", bad as never)).resolves.toEqual({ ok: false, error: "Invalid input" });
  }
  expect(handler).not.toHaveBeenCalled();
});

it("reports and logs a failing action", async () => {
  as("admin");
  handler.mockRejectedValueOnce(new Error("Proposal is gone"));
  await expect(runPluginPageActionAction("p", "confirm", { id: "7" })).resolves.toEqual({ ok: false, error: "Proposal is gone" });
  expect(writePluginLog).toHaveBeenCalledWith("p", "error", expect.stringContaining("confirm"));
});
