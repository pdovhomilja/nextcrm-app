// The host refuses partners itself, even if the session gate ever let one through and a plugin lists "partner".
jest.mock("@/lib/authz", () => ({ AuthenticationError: class extends Error {}, requireAuthenticated: jest.fn(async () => ({ id: "pt", role: "partner" })) }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("next-intl/server", () => ({ getLocale: jest.fn(async () => "en") }));
jest.mock("@/lib/plugins/state", () => ({ getPluginState: jest.fn(async () => ({ status: "ENABLED" })) }));
jest.mock("@/lib/plugins/registry", () => ({ findPlugin: jest.fn() }));
jest.mock("@/lib/plugins/context", () => ({ createPluginContext: jest.fn(async () => ({ id: "ctx" })) }));
jest.mock("@/lib/plugins/log", () => ({ writePluginLog: jest.fn() }));

import { findPlugin } from "@/lib/plugins/registry";
import { runPluginPageActionAction } from "@/app/[locale]/(routes)/p/_actions/page-actions";

it("refuses a partner even when the plugin lists partner", async () => {
  const handler = jest.fn(async () => "Linked");
  (findPlugin as jest.Mock).mockReturnValue({ definition: { id: "p", extensions: { pageActions: [{ id: "confirm", roles: ["partner", "manager"], handler }] } } });
  await expect(runPluginPageActionAction("p", "confirm", { id: "7" })).resolves.toEqual({ ok: false, error: "Forbidden" });
  expect(handler).not.toHaveBeenCalled();
});
