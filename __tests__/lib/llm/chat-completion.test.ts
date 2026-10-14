jest.mock("@/lib/api-keys", () => ({ getApiKey: jest.fn() }));

import { getApiKey } from "@/lib/api-keys";
import { completeChat } from "@/lib/llm/chat-completion";

const okBody = (content: string) => ({
  ok: true,
  json: async () => ({ choices: [{ message: { content } }] }),
});

describe("completeChat provider chain", () => {
  const origEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...origEnv };
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GROQ_API_KEY;
    (getApiKey as jest.Mock).mockResolvedValue(null);
    global.fetch = jest.fn() as jest.Mock;
  });

  afterAll(() => {
    process.env = origEnv;
  });

  it("uses OpenRouter when key is set", async () => {
    process.env.OPENROUTER_API_KEY = "sk-or-test";
    (global.fetch as jest.Mock).mockResolvedValueOnce(okBody("hello"));

    const result = await completeChat({
      task: "campaign-email",
      messages: [{ role: "user", content: "hi" }],
    });

    expect(result.provider).toBe("openrouter");
    expect(result.content).toBe("hello");
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain("openrouter.ai");
    expect(init.headers.Authorization).toBe("Bearer sk-or-test");
  });

  it("falls back to OpenRouter when Groq fails", async () => {
    process.env.OPENROUTER_API_KEY = "sk-or-test";
    (getApiKey as jest.Mock).mockImplementation(async (p: string) =>
      p === "GROQ" ? "gsk-test" : null
    );
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, statusText: "429", json: async () => ({}) })
      .mockResolvedValueOnce(okBody("from openrouter"));

    const result = await completeChat({
      task: "campaign-email",
      messages: [{ role: "user", content: "hi" }],
    });

    expect(result.provider).toBe("openrouter");
    expect(result.content).toBe("from openrouter");
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("throws when no keys configured", async () => {
    await expect(
      completeChat({
        task: "campaign-email",
        messages: [{ role: "user", content: "hi" }],
      })
    ).rejects.toThrow(/No LLM available/);
  });
});
