const mockHandler = jest.fn(async () => new Response("handled"));
const mockCreate = jest.fn((..._args: unknown[]) => mockHandler);
jest.mock("mcp-handler", () => ({ createMcpHandler: (...args: unknown[]) => mockCreate(...args) }));
jest.mock("@/lib/mcp/auth", () => ({ getMcpUser: jest.fn() }));
jest.mock("@/lib/mcp/tools", () => ({ allTools: [] }));
jest.mock("@/lib/mcp/run-tool", () => ({ runMcpToolCall: jest.fn() }));

import { GET, POST } from "../route";

const req = (path: string, method = "GET") =>
  new Request(`http://localhost/api/mcp/${path}`, { method });

beforeEach(() => mockHandler.mockClear());
afterEach(() => {
  delete process.env.REDIS_URL;
  delete process.env.KV_URL;
});

describe("MCP route transports", () => {
  it.each([
    ["sse", GET, "GET", undefined],
    ["message", POST, "POST", undefined],
    ["sse", GET, "GET", "REDIS_URL"],
    ["message", POST, "POST", "KV_URL"],
  ] as const)("returns 501 JSON for /%s (%s, %s set)", async (path, fn, method, env) => {
    if (env) process.env[env] = "redis://localhost:6379";
    const res = await fn(req(path, method));
    expect(res.status).toBe(501);
    expect((await res.json()).error).toMatch(/\/api\/mcp\/mcp/);
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it("serves Streamable HTTP", async () => {
    const res = await POST(req("mcp", "POST"));
    expect(await res.text()).toBe("handled");
  });

  it("builds the handler with SSE disabled", () => {
    expect(mockCreate).toHaveBeenCalledWith(
      expect.any(Function),
      expect.anything(),
      expect.objectContaining({ disableSse: true }),
    );
  });
});
