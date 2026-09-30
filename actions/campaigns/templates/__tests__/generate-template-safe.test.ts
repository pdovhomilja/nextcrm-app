jest.mock("@/actions/campaigns/templates/generate-template", () => ({
  generateTemplate: jest.fn(),
}));

import { generateTemplate } from "@/actions/campaigns/templates/generate-template";
import { generateTemplateSafe } from "@/actions/campaigns/templates/generate-template-safe";

const upstream = generateTemplate as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("generateTemplateSafe", () => {
  it("returns {data} on success (passes the upstream payload through)", async () => {
    upstream.mockResolvedValue({ html: "<p>H</p>", json: {}, subject: "S" });
    const res = await generateTemplateSafe("write a welcome");
    expect(res).toEqual({ data: { html: "<p>H</p>", json: {}, subject: "S" } });
  });

  // The whole point: a THROW becomes a friendly RETURNED error (never redacted).
  it("maps an OpenAI 429 (Too Many Requests) to a friendly rate-limit message", async () => {
    upstream.mockRejectedValue(new Error("OpenAI error: Too Many Requests"));
    const res = await generateTemplateSafe("p");
    expect(res).toHaveProperty("error");
    expect((res as { error: string }).error).toMatch(/rate-limit/i);
    expect((res as { error: string }).error).not.toMatch(/digest|Server Components/i);
  });

  it("maps an OpenAI 401/Unauthorized to a key message", async () => {
    upstream.mockRejectedValue(new Error("OpenAI error: Unauthorized"));
    expect((await generateTemplateSafe("p") as { error: string }).error).toMatch(/API key/i);
  });

  it("maps an abort/timeout to a timeout message", async () => {
    const e = new Error("aborted");
    e.name = "AbortError";
    upstream.mockRejectedValue(e);
    expect((await generateTemplateSafe("p") as { error: string }).error).toMatch(/timed out/i);
  });

  it("passes the 'no API key' guidance through unchanged", async () => {
    upstream.mockRejectedValue(new Error("No OpenAI API key configured. Add one in Profile → LLMs."));
    expect((await generateTemplateSafe("p") as { error: string }).error).toMatch(/Profile → LLMs/);
  });

  it("falls back to a generic friendly message for anything else", async () => {
    upstream.mockRejectedValue(new Error("kaboom"));
    const res = await generateTemplateSafe("p") as { error: string };
    expect(res.error).toMatch(/try again/i);
    expect(res.error).not.toMatch(/kaboom/);
  });
});
