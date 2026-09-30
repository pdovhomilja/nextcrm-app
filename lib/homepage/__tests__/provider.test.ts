jest.mock("@/lib/api-keys", () => ({ getApiKey: jest.fn() }));
import { extractJsonObject } from "@/lib/ai/anthropic-json";
import { generateHomepage, GENERATE_FETCH_TIMEOUT_MS } from "@/lib/homepage/provider";

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ content: [{ type: "text", text: "```json\n{\"critique\":\"dated\",\"html\":\"<main>new</main>\"}\n```" }] }),
  }) as unknown as typeof fetch;
});

it("extractJsonObject strips fences", () => {
  expect(extractJsonObject("```json\n{\"a\":1}\n```")).toBe('{"a":1}');
  expect(extractJsonObject("no json")).toBeNull();
});

it("generateHomepage returns html + critique and sends an image block when a screenshot is given", async () => {
  const out = await generateHomepage({ apiKey: "k", system: "S", model: "claude-sonnet-5-5", maxTokens: 20000, brief: "Acme", prompt: "modern", sourceScreenshotB64: "AAAA" });
  expect(out).toEqual({ html: "<main>new</main>", critique: "dated" });
  const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
  expect(body.model).toBe("claude-sonnet-5-5");
  expect(body.max_tokens).toBe(20000);
  expect(body.system).toBe("S");
  const parts = body.messages[0].content;
  expect(parts.some((p: { type: string }) => p.type === "image")).toBe(true);
  expect(parts[parts.length - 1].type).toBe("text");
  const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers;
  expect(headers["x-api-key"]).toBe("k");
  expect(headers["anthropic-version"]).toBe("2023-06-01");
});

it("sends no image block without screenshots and includes previous html", async () => {
  await generateHomepage({ apiKey: "k", system: "S", model: "claude-sonnet-5-5", maxTokens: 20000, brief: "Acme", prompt: "modern", previousHtml: "<p>old</p>" });
  const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
  const parts = body.messages[0].content;
  expect(parts.some((p: { type: string }) => p.type === "image")).toBe(false);
  expect(parts[0].text).toContain("<p>old</p>");
});

it("throws a RETRIABLE error on a 5xx response", async () => {
  (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
  const err = await generateHomepage({ apiKey: "k", system: "S", model: "claude-sonnet-5-5", maxTokens: 20000, brief: "b", prompt: "p" }).catch((e) => e);
  expect(err).toBeInstanceOf(Error);
  expect(err.name).not.toBe("NonRetriableError");
});

it("throws NonRetriableError on a 4xx response (won't burn retries)", async () => {
  (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
  const err = await generateHomepage({ apiKey: "k", system: "S", model: "claude-sonnet-5-5", maxTokens: 20000, brief: "b", prompt: "p" }).catch((e) => e);
  expect(err.name).toBe("NonRetriableError");
  expect(err.message).toContain("401");
});

it.each([429, 408, 409])("keeps %d RETRIABLE (transient) — F1", async (status) => {
  (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status, json: async () => ({}) });
  const err = await generateHomepage({ apiKey: "k", system: "S", model: "claude-sonnet-5-5", maxTokens: 20000, brief: "b", prompt: "p" }).catch((e) => e);
  expect(err).toBeInstanceOf(Error);
  expect(err.name).not.toBe("NonRetriableError");
  expect(err.message).toContain(String(status));
});

it("throws NonRetriableError when the response was cut off at max_tokens", async () => {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ stop_reason: "max_tokens", content: [{ type: "text", text: '{"critique":"x","html":"<main>tr' }] }),
  });
  const err = await generateHomepage({ apiKey: "k", system: "S", model: "claude-sonnet-5-5", maxTokens: 20000, brief: "b", prompt: "p" }).catch((e) => e);
  expect(err.name).toBe("NonRetriableError");
  expect(err.message).toMatch(/cut off|max_tokens/i);
});

it("throws on malformed or missing fields", async () => {
  (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ content: [{ type: "text", text: "nope" }] }) });
  await expect(generateHomepage({ apiKey: "k", system: "S", model: "claude-sonnet-5-5", maxTokens: 20000, brief: "b", prompt: "p" })).rejects.toThrow();
  (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ content: [{ type: "text", text: '{"critique":"x"}' }] }) });
  await expect(generateHomepage({ apiKey: "k", system: "S", model: "claude-sonnet-5-5", maxTokens: 20000, brief: "b", prompt: "p" })).rejects.toThrow();
});

it("passes an AbortSignal to fetch and aborts the request after the fetch budget", async () => {
  jest.useFakeTimers();
  try {
    (global.fetch as jest.Mock).mockImplementation(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_res, rej) => {
          init.signal.addEventListener("abort", () => rej(new Error("aborted")));
        }),
    );
    const p = generateHomepage({ apiKey: "k", system: "S", model: "claude-sonnet-5-5", maxTokens: 20000, brief: "b", prompt: "p" });
    const assertion = expect(p).rejects.toThrow("aborted");
    const signal = (global.fetch as jest.Mock).mock.calls[0][1].signal as AbortSignal;
    expect(signal.aborted).toBe(false);
    await jest.advanceTimersByTimeAsync(GENERATE_FETCH_TIMEOUT_MS - 1_000);
    expect(signal.aborted).toBe(false);
    await jest.advanceTimersByTimeAsync(2_000);
    expect(signal.aborted).toBe(true);
    await assertion;
  } finally {
    jest.useRealTimers();
  }
});

it("clears the abort timer on success (no pending timers)", async () => {
  jest.useFakeTimers();
  try {
    await generateHomepage({ apiKey: "k", system: "S", model: "claude-sonnet-5-5", maxTokens: 20000, brief: "b", prompt: "p" });
    expect(jest.getTimerCount()).toBe(0);
  } finally {
    jest.useRealTimers();
  }
});
