const mockHandler = jest.fn(async () => new Response("handled"));
jest.mock("mcp-handler", () => ({ createMcpHandler: () => mockHandler }));
jest.mock("@/lib/mcp/auth", () => ({ getMcpUser: jest.fn() }));
jest.mock("@/lib/mcp/tools", () => ({ allTools: [] }));
jest.mock("@/lib/mcp/run-tool", () => ({ runMcpToolCall: jest.fn() }));

import { GET, POST } from "../route";

const req = (path: string, method = "GET") =>
  new Request(`http://localhost/api/mcp/${path}`, { method });

beforeEach(() => {
  mockHandler.mockClear();
  delete process.env.REDIS_URL;
  delete process.env.KV_URL;
});

describe("MCP route transports", () => {
  it.each([
    ["sse", GET, "GET"],
    ["message", POST, "POST"],
  ] as const)("returns 501 JSON for /%s without Redis", async (path, fn, method) => {
    const res = await fn(req(path, method));
    expect(res.status).toBe(501);
    expect((await res.json()).error).toMatch(/\/api\/mcp\/mcp/);
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it("serves Streamable HTTP without Redis", async () => {
    const res = await POST(req("mcp", "POST"));
    expect(await res.text()).toBe("handled");
  });

  it.each(["REDIS_URL", "KV_URL"])("passes SSE through when %s is set", async (name) => {
    process.env[name] = "redis://localhost:6379";
    const res = await GET(req("sse"));
    expect(await res.text()).toBe("handled");
  });
});
