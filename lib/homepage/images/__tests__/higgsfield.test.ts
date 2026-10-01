import { higgsfieldProvider } from "@/lib/homepage/images/higgsfield";

const KEY = "HIGGSFIELD_API_KEY";
const spec = {
  token: "__RADE_IMG_1__",
  role: "hero" as const,
  prompt: "p",
  alt: "a",
  aspectRatio: "16:9" as const,
};

const submitOk = {
  ok: true,
  json: async () => ({
    status: "queued",
    request_id: "r1",
    status_url: "https://api.higgsfield.ai/requests/r1/status",
  }),
};

beforeEach(() => {
  process.env[KEY] = "id:secret";
  jest.restoreAllMocks();
});
afterEach(() => {
  delete process.env[KEY];
  jest.useRealTimers();
});

it("isConfigured reflects the key", () => {
  expect(higgsfieldProvider("soul-v2").isConfigured()).toBe(true);
  delete process.env[KEY];
  expect(higgsfieldProvider("soul-v2").isConfigured()).toBe(false);
});

it("submits, polls to completion, downloads image bytes", async () => {
  const png = Buffer.from("PNGDATA");
  const fetchMock = jest
    .spyOn(global, "fetch" as any)
    .mockResolvedValueOnce(submitOk as any)
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "completed", images: [{ url: "https://cdn.example.com/x.png" }] }),
    } as any)
    .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => png.buffer } as any);
  const out = await higgsfieldProvider("soul-v2").generateImage(spec);
  expect(Buffer.isBuffer(out)).toBe(true);
  // submit: soul v2 endpoint, Key auth, prompt + aspect_ratio body
  const [submitUrl, submitInit] = fetchMock.mock.calls[0] as [string, any];
  expect(submitUrl).toBe("https://api.higgsfield.ai/higgsfield-ai/soul/v2/standard");
  expect(submitInit.headers["Authorization"]).toBe("Key id:secret");
  expect(JSON.parse(submitInit.body)).toEqual({ prompt: "p", aspect_ratio: "16:9" });
  // poll uses status_url with auth
  expect(fetchMock.mock.calls[1][0]).toBe("https://api.higgsfield.ai/requests/r1/status");
  // download from the CDN must NOT carry the API key
  expect(fetchMock.mock.calls[2][0]).toBe("https://cdn.example.com/x.png");
  expect(JSON.stringify(fetchMock.mock.calls[2][1] ?? {})).not.toContain("secret");
});

it("keeps polling while queued / in_progress", async () => {
  jest.useFakeTimers();
  const fetchMock = jest
    .spyOn(global, "fetch" as any)
    .mockResolvedValueOnce(submitOk as any)
    .mockResolvedValueOnce({ ok: true, json: async () => ({ status: "queued" }) } as any)
    .mockResolvedValueOnce({ ok: true, json: async () => ({ status: "in_progress" }) } as any)
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "completed", images: [{ url: "https://cdn.example.com/x.png" }] }),
    } as any)
    .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => Buffer.from("X").buffer } as any);
  const p = higgsfieldProvider("soul-v2").generateImage(spec);
  await jest.advanceTimersByTimeAsync(10_000);
  expect(Buffer.isBuffer(await p)).toBe(true);
  expect(fetchMock).toHaveBeenCalledTimes(5);
});

it("falls back to the soul-v2 endpoint for an unknown model", async () => {
  const fetchMock = jest
    .spyOn(global, "fetch" as any)
    .mockResolvedValueOnce({ ok: false, status: 500, text: async () => "boom" } as any);
  await expect(higgsfieldProvider("../../evil").generateImage(spec)).rejects.toThrow();
  expect(fetchMock.mock.calls[0][0]).toBe("https://api.higgsfield.ai/higgsfield-ai/soul/v2/standard");
});

it("throws when not configured", async () => {
  delete process.env[KEY];
  const fetchMock = jest.spyOn(global, "fetch" as any);
  await expect(higgsfieldProvider("soul-v2").generateImage(spec)).rejects.toThrow(/not configured/i);
  expect(fetchMock).not.toHaveBeenCalled();
});

it("throws on provider error status", async () => {
  jest
    .spyOn(global, "fetch" as any)
    .mockResolvedValueOnce({ ok: false, status: 500, text: async () => "boom" } as any);
  await expect(higgsfieldProvider("soul-v2").generateImage(spec)).rejects.toThrow();
});

it.each(["failed", "nsfw", "canceled"])("throws on terminal status %s", async (status) => {
  jest
    .spyOn(global, "fetch" as any)
    .mockResolvedValueOnce(submitOk as any)
    .mockResolvedValueOnce({ ok: true, json: async () => ({ status }) } as any);
  await expect(higgsfieldProvider("soul-v2").generateImage(spec)).rejects.toThrow(new RegExp(status));
});

it("rejects a non-https result url", async () => {
  jest
    .spyOn(global, "fetch" as any)
    .mockResolvedValueOnce(submitOk as any)
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "completed", images: [{ url: "http://169.254.169.254/x" }] }),
    } as any);
  await expect(higgsfieldProvider("soul-v2").generateImage(spec)).rejects.toThrow(/https/i);
});

it.each([
  "https://evil.example.com/requests/r1/status", // cross-host
  "http://api.higgsfield.ai/requests/r1/status", // cleartext
  "https://api.higgsfield.ai.evil.com/status", // look-alike suffix
])("rejects an untrusted status_url (%s) and never polls it with the key", async (status_url) => {
  const fetchMock = jest
    .spyOn(global, "fetch" as any)
    .mockResolvedValueOnce({ ok: true, json: async () => ({ request_id: "r1", status_url }) } as any);
  await expect(higgsfieldProvider("soul-v2").generateImage(spec)).rejects.toThrow(/trusted https host/i);
  // only the submit fetch ran; the untrusted status_url was never polled (key not sent to it)
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("times out if never completed", async () => {
  jest.useFakeTimers();
  jest
    .spyOn(global, "fetch" as any)
    .mockResolvedValueOnce(submitOk as any)
    .mockResolvedValue({ ok: true, json: async () => ({ status: "in_progress" }) } as any);
  const p = higgsfieldProvider("soul-v2").generateImage(spec);
  const assertion = expect(p).rejects.toThrow(/timed out/i);
  await jest.advanceTimersByTimeAsync(120_000);
  await assertion;
});
