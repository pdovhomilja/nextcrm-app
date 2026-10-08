jest.mock("@/lib/authz", () => ({
  requireRole: jest.fn(async () => ({ id: "admin-1", role: "admin" })),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
const exportPluginData = jest.fn(async (id: string) => ({ pluginId: id }));
jest.mock("@/lib/plugins/lifecycle", () => ({ exportPluginData }));

import { GET } from "../route";

const call = (id: string) => GET(new Request("http://x"), { params: Promise.resolve({ pluginId: id }) });

it("returns 404 for an invalid plugin id and never exports", async () => {
  const res = await call('x"; evil=".json');
  expect(res.status).toBe(404);
  expect(exportPluginData).not.toHaveBeenCalled();
});

it("exports for a valid id", async () => {
  const res = await call("demo");
  expect(res.status).toBe(200);
  expect(res.headers.get("Content-Disposition")).toContain('filename="demo-export.json"');
});
